import React from "react";
import { Composition } from "remotion";
import { HoloLandIntro } from "./compositions/HoloLandIntro";
import { BuildingAVRRoom } from "./compositions/BuildingAVRRoom";
import { BabylonAdapterDemo } from "./compositions/BabylonAdapterDemo";
import { ThreeAdapterDemo } from "./compositions/ThreeAdapterDemo";
import { AdapterComparison } from "./compositions/AdapterComparison";
import { PhysicsPlaygroundWalkthrough } from "./compositions/PhysicsPlaygroundWalkthrough";
import { BrittneyAIDemo } from "./compositions/BrittneyAIDemo";
import { ARSpatialAnchors } from "./compositions/ARSpatialAnchors";
import { VRShopExample } from "./compositions/VRShopExample";
import { CollaborativeBuilding } from "./compositions/CollaborativeBuilding";
import { EnchantedForestDemo } from "./compositions/EnchantedForestDemo";

// Each composition: 3s title + 5 steps * 5s = 28s total at 30fps = 840 frames
const DURATION_FRAMES = 840;
const FPS = 30;
const WIDTH = 1920;
const HEIGHT = 1080;

export const RemotionRoot: React.FC = () => {
  return (
    <>
      <Composition
        id="HoloLandIntro"
        component={HoloLandIntro}
        durationInFrames={DURATION_FRAMES}
        fps={FPS}
        width={WIDTH}
        height={HEIGHT}
      />
      <Composition
        id="BuildingAVRRoom"
        component={BuildingAVRRoom}
        durationInFrames={DURATION_FRAMES}
        fps={FPS}
        width={WIDTH}
        height={HEIGHT}
      />
      <Composition
        id="BabylonAdapterDemo"
        component={BabylonAdapterDemo}
        durationInFrames={DURATION_FRAMES}
        fps={FPS}
        width={WIDTH}
        height={HEIGHT}
      />
      <Composition
        id="ThreeAdapterDemo"
        component={ThreeAdapterDemo}
        durationInFrames={DURATION_FRAMES}
        fps={FPS}
        width={WIDTH}
        height={HEIGHT}
      />
      <Composition
        id="AdapterComparison"
        component={AdapterComparison}
        durationInFrames={DURATION_FRAMES}
        fps={FPS}
        width={WIDTH}
        height={HEIGHT}
      />
      <Composition
        id="PhysicsPlaygroundWalkthrough"
        component={PhysicsPlaygroundWalkthrough}
        durationInFrames={DURATION_FRAMES}
        fps={FPS}
        width={WIDTH}
        height={HEIGHT}
      />
      <Composition
        id="BrittneyAIDemo"
        component={BrittneyAIDemo}
        durationInFrames={DURATION_FRAMES}
        fps={FPS}
        width={WIDTH}
        height={HEIGHT}
      />
      <Composition
        id="ARSpatialAnchors"
        component={ARSpatialAnchors}
        durationInFrames={DURATION_FRAMES}
        fps={FPS}
        width={WIDTH}
        height={HEIGHT}
      />
      <Composition
        id="VRShopExample"
        component={VRShopExample}
        durationInFrames={DURATION_FRAMES}
        fps={FPS}
        width={WIDTH}
        height={HEIGHT}
      />
      <Composition
        id="CollaborativeBuilding"
        component={CollaborativeBuilding}
        durationInFrames={DURATION_FRAMES}
        fps={FPS}
        width={WIDTH}
        height={HEIGHT}
      />
      <Composition
        id="EnchantedForestDemo"
        component={EnchantedForestDemo}
        durationInFrames={DURATION_FRAMES}
        fps={FPS}
        width={WIDTH}
        height={HEIGHT}
      />
    </>
  );
};
