import React from "react";
import {Composition} from "remotion";
import {Tutorial} from "./tutorial";

export const Root: React.FC = () => <Composition id="UdaGeminiTutorial" component={Tutorial} durationInFrames={1800} fps={30} width={1920} height={1080}/>;
