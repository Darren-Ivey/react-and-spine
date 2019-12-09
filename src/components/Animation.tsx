
import React, { useEffect } from "react";
import { init } from "../spine-controller/webgl";

export const Animation = () => {
    useEffect(() => {
        init();
    }, [])

    return (
        <canvas style={{ position: "absolute", width: "100%", height: "100%" }} id={"canvas"} />
    )
};