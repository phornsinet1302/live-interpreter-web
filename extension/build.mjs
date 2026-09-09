import { build } from "esbuild";
import { cpSync, mkdirSync, rmSync, existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";

const root = path.dirname(fileURLToPath(import.meta.url));
const dist = path.join(root, "dist");

rmSync(dist, { recursive: true, force: true });
mkdirSync(dist, { recursive: true });

await build({
  entryPoints: [
    path.join(root, "src/background.ts"),
    path.join(root, "src/content.ts"),
    path.join(root, "src/popup.ts"),
  ],
  outdir: dist,
  bundle: true,
  // IIFE, not esm — everything each entry point imports is local (config.ts)
  // and gets inlined by bundle:true, so there's nothing left to import at
  // runtime. IIFE avoids needing "type": "module" on the background service
  // worker and (more importantly) avoids MV3's separate, more restrictive
  // registration path for ES-module content scripts.
  format: "iife",
  target: "es2022",
  minify: false,
  sourcemap: true,
});

cpSync(path.join(root, "manifest.json"), path.join(dist, "manifest.json"));
cpSync(path.join(root, "popup.html"), path.join(dist, "popup.html"));
cpSync(path.join(root, "src/popover.css"), path.join(dist, "popover.css"));
if (existsSync(path.join(root, "icons"))) {
  cpSync(path.join(root, "icons"), path.join(dist, "icons"), { recursive: true });
}

console.log("Built extension to", dist);
