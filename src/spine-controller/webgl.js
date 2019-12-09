import { spine } from "../spine-ts/spine-webgl";

var lastFrameTime = Date.now() / 1000;
var canvas;
var shader;
var batcher;
var gl;
var mvp = new spine.webgl.Matrix4();
var assetManager;
var skeletonRenderer;
var skeletons = {
	spineboy: undefined,
};
var activeSkeleton = "spineboy";
var atlasLoader;

function init () {
    // Setup canvas and WebGL context. We pass alpha: false to canvas.getContext() so we don't use premultiplied alpha when
    // loading textures. That is handled separately by PolygonBatcher.
    canvas = document.getElementById("canvas");
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
    var config = { alpha: false };
    gl = canvas.getContext("webgl", config) || canvas.getContext("experimental-webgl", config);
    if (!gl) {
        alert('WebGL is unavailable.');
        return;
    }

    // Create a simple shader, mesh, model-view-projection matrix and SkeletonRenderer.
    shader = spine.webgl.Shader.newTwoColoredTextured(gl);
    batcher = new spine.webgl.PolygonBatcher(gl);
    mvp.ortho2d(0, 0, canvas.width - 1, canvas.height - 1);
    skeletonRenderer = new spine.webgl.SkeletonRenderer(gl);
    assetManager = new spine.webgl.AssetManager(gl);

    // Tell AssetManager to load the resources for each model, including the exported .skel file, the .atlas file and the .png
    // file for the atlas. We then wait until all resources are loaded in the load() method.
    assetManager.loadBinary("assets/spineboy-pro.skel", () => {
        console.log("loaded skel")
    });
    assetManager.loadTextureAtlas("assets/spineboy-pma.atlas", () => {
    	console.log("loaded atlas")
    }, (error) => {
    	console.error(error)
    });
    
    requestAnimationFrame(load);
}

function load () {
	// Wait until the AssetManager has loaded all resources, then load the skeletons.
	if (assetManager.isLoadingComplete()) {
		skeletons["spineboy"] = loadSkeleton("spineboy-pro", "run", true);
		requestAnimationFrame(render);
	} else {
		requestAnimationFrame(load);
	}
}

function loadSkeleton (name, initialAnimation, premultipliedAlpha, skin) {
    if (skin === undefined) skin = "default";

    // Load the texture atlas using name.atlas from the AssetManager.
    var atlas = assetManager.get("assets/spineboy-pma.atlas");
    console.log({atlas})

    // Create a AtlasAttachmentLoader that resolves region, mesh, boundingbox and path attachments
    atlasLoader = new spine.AtlasAttachmentLoader(atlas);

    // Create a SkeletonBinary instance for parsing the .skel file.
    var skeletonBinary = new spine.SkeletonBinary(atlasLoader);

    // Set the scale to apply during parsing, parse the file, and create a new skeleton.
    var skeletonData = skeletonBinary.readSkeletonData(assetManager.get("./assets/spineboy-pro.skel"));
    var skeleton = new spine.Skeleton(skeletonData);
    skeleton.setSkinByName(skin);
    var bounds = calculateBounds(skeleton);

    // Create an AnimationState, and set the initial animation in looping mode.
    var animationStateData = new spine.AnimationStateData(skeleton.data);
    var animationState = new spine.AnimationState(animationStateData);
    if (name === "spineboy") {
        animationStateData.setMix("walk", "jump", 0.4)
        animationStateData.setMix("jump", "run", 0.4);
        animationState.setAnimation(0, "walk", true);
        animationState.addAnimation(0, "run", true, 0);
    } else {
        animationState.setAnimation(0, initialAnimation, true);
    }
    animationState.addListener({
        start: function(track) {
            console.log("Animation on track " + track.trackIndex + " started");
        },
        interrupt: function(track) {
            console.log("Animation on track " + track.trackIndex + " interrupted");
        },
        end: function(track) {
            console.log("Animation on track " + track.trackIndex + " ended");
        },
        disposed: function(track) {
            console.log("Animation on track " + track.trackIndex + " disposed");
        },
        complete: function(track) {
            console.log("Animation on track " + track.trackIndex + " completed");
        },
        event: function(track, event) {
            console.log("Event on track " + track.trackIndex + ": " + JSON.stringify(event));
        }
    })

    // Pack everything up and return to caller.
    return { skeleton: skeleton, state: animationState, bounds: bounds, premultipliedAlpha: premultipliedAlpha };
}

function calculateBounds(skeleton) {
    skeleton.setToSetupPose();
    skeleton.updateWorldTransform();
    var offset = new spine.Vector2();
    var size = new spine.Vector2();
    skeleton.getBounds(offset, size, []);
    return { offset: offset, size: size };
}

function render () {
    var now = Date.now() / 1000;
    var delta = now - lastFrameTime;
    delta = 0.016;
    lastFrameTime = now;

    // Update the MVP matrix to adjust for canvas size changes
    resize();

    gl.clearColor(0.3, 0.3, 0.3, 1);
    gl.clear(gl.COLOR_BUFFER_BIT);

    // Apply the animation state based on the delta time.
    var state = skeletons[activeSkeleton].state;
    var skeleton = skeletons[activeSkeleton].skeleton;
    var premultipliedAlpha = skeletons[activeSkeleton].premultipliedAlpha;
    state.update(delta);
    state.apply(skeleton);
    skeleton.updateWorldTransform();

    // Bind the shader and set the texture and model-view-projection matrix.
    shader.bind();
    shader.setUniformi(spine.webgl.Shader.SAMPLER, 0);
    shader.setUniform4x4f(spine.webgl.Shader.MVP_MATRIX, mvp.values);

    // Start the batch and tell the SkeletonRenderer to render the active skeleton.
    batcher.begin(shader);
    skeletonRenderer.premultipliedAlpha = premultipliedAlpha;
    skeletonRenderer.draw(batcher, skeleton);
    batcher.end();
    shader.unbind();

    requestAnimationFrame(render);
}

function resize () {
    var w = canvas.clientWidth;
    var h = canvas.clientHeight;
    var bounds = skeletons[activeSkeleton].bounds;
    if (canvas.width != w || canvas.height != h) {
        canvas.width = w;
        canvas.height = h;
    }

    // magic
    var centerX = bounds.offset.x + bounds.size.x / 2;
    var centerY = bounds.offset.y + bounds.size.y / 2;
    var scaleX = bounds.size.x / canvas.width;
    var scaleY = bounds.size.y / canvas.height;
    var scale = Math.max(scaleX, scaleY) * 1.2;
    if (scale < 1) scale = 1;
    var width = canvas.width * scale;
    var height = canvas.height * scale;

    mvp.ortho2d(centerX - width / 2, centerY - height / 2, width, height);
    gl.viewport(0, 0, canvas.width, canvas.height);
}

export { init };
