import path from "path";
import { bundle } from "@remotion/bundler";
import { renderMedia, selectComposition } from "@remotion/renderer";

const COMPOSITIONS = [
  "HoloLandIntro",
  "BuildingAVRRoom",
  "BabylonAdapterDemo",
  "ThreeAdapterDemo",
  "AdapterComparison",
  "PhysicsPlaygroundWalkthrough",
  "BrittneyAIDemo",
  "ARSpatialAnchors",
  "VRShopExample",
  "CollaborativeBuilding",
  "EnchantedForestDemo",
];

// Map composition IDs to filter keywords
const FILTER_MAP: Record<string, string[]> = {
  intro: ["HoloLandIntro"],
  brittney: ["BrittneyAIDemo"],
  adapter: ["BabylonAdapterDemo", "ThreeAdapterDemo", "AdapterComparison"],
  physics: ["PhysicsPlaygroundWalkthrough"],
  ar: ["ARSpatialAnchors"],
  shop: ["VRShopExample"],
  collab: ["CollaborativeBuilding"],
  forest: ["EnchantedForestDemo"],
  room: ["BuildingAVRRoom"],
};

async function main() {
  const args = process.argv.slice(2);
  const filterIdx = args.indexOf("--filter");
  const filterKey = filterIdx !== -1 ? args[filterIdx + 1] : null;

  // Determine which compositions to render
  let toRender = COMPOSITIONS;
  if (filterKey) {
    const filtered = FILTER_MAP[filterKey];
    if (!filtered) {
      console.error(`Unknown filter: "${filterKey}". Available: ${Object.keys(FILTER_MAP).join(", ")}`);
      process.exit(1);
    }
    toRender = filtered;
    console.log(`Filter applied — rendering: ${toRender.join(", ")}`);
  } else {
    console.log(`Rendering all ${COMPOSITIONS.length} compositions...`);
  }

  const entryPoint = path.join(__dirname, "../src/index.ts");
  const outDir = path.join(__dirname, "../out");

  console.log("Bundling with Remotion...");
  const bundleLocation = await bundle({
    entryPoint,
    webpackOverride: (config) => config,
  });

  for (const id of toRender) {
    console.log(`\nRendering: ${id}`);
    const composition = await selectComposition({
      serveUrl: bundleLocation,
      id,
    });

    const outPath = path.join(outDir, `${id}.mp4`);
    await renderMedia({
      composition,
      serveUrl: bundleLocation,
      codec: "h264",
      outputLocation: outPath,
      onProgress: ({ progress }) => {
        const pct = Math.round(progress * 100);
        process.stdout.write(`  ${pct}%\r`);
      },
    });

    console.log(`  Done → ${outPath}`);
  }

  console.log(`\nAll renders complete. Output: ${outDir}/`);
}

main().catch((err) => {
  console.error("Render failed:", err);
  process.exit(1);
});
