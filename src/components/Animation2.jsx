
import React from "react";
import * as PIXI from "pixi.js";
import avatar from "../logo.svg";

export class Animation2 extends React.Component {
  constructor(props) {
    super(props); 
    this.pixi_cnt = null;
    this.app = new PIXI.Application({width: 600, height: 600, transparent:false})

    this.state = {
      app: {
        view: undefined,
        stage: {
          addChild: undefined,
        }
      }
    } 
  }

    updatePixiCnt = (element) => {
        // the element is the DOM object that we will use as container to add pixi stage(canvas)
        this.pixi_cnt = element;
        //now we are adding the application to the DOM element which we got from the Ref.
        if(this.pixi_cnt && this.pixi_cnt.children.length<=0) {
          // this.pixi_cnt.appendChild(this.state.app.view);
          //The setup function is a custom function that we created to add the sprites. We will this below
          this.setup();
        }
    };
    
    setup = () => {
      let loader = new PIXI.Loader();
      loader
            .add("avatar",avatar)
            .load(this.initialize);
    };
    
    initialize = () => {
      let loader = new PIXI.Loader();
        //We will create a sprite and then add it to stage and (0,0) position
        this.avatar = new PIXI.Sprite(loader.resources["avatar"].texture);
       //  this.state.app.stage.addChild(this.avatar);
    };
    
render() {
    return <div ref={this.updatePixiCnt} />;
  }
}