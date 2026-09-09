// One-off script (not part of build.mjs) — rasterizes icons/source.svg into
// the PNG sizes MV3's manifest.json requires. Re-run only if source.svg changes.
import sharp from "sharp";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.dirname(fileURLToPath(import.meta.url));
const srcSvg = path.join(root, "..", "icons", "source.svg");
const sizes = [16, 32, 48, 128];

for (const size of sizes) {
  const outPath = path.join(root, "..", "icons", `icon${size}.png`);
  await sharp(srcSvg).resize(size, size).png().toFile(outPath);
  console.log("Wrote", outPath);
}
