// Builds an upload-ready folder at <repo>/deploy:
//   deploy/app.js        <- whole server in one file (no `npm install` needed on the host)
//   deploy/public/       <- built React frontend
//   deploy/migrations/   <- database schema, applied automatically on startup
//   deploy/package.json  <- minimal, tells Node this is CommonJS
import path from "node:path";
import { fileURLToPath } from "node:url";
import { cp, mkdir, rm, writeFile, copyFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import { build as esbuild } from "esbuild";

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, "../..");
const out = path.join(root, "deploy");
const frontendDist = path.join(root, "artifacts/fitness-app/dist/public");
const migrations = path.join(root, "lib/db/migrations");

if (!existsSync(path.join(frontendDist, "index.html"))) {
  console.error("Frontend not built yet. Run `pnpm run build` from the repo root.");
  process.exit(1);
}

await rm(out, { recursive: true, force: true });
await mkdir(out, { recursive: true });

await esbuild({
  entryPoints: [path.join(here, "src/index.ts")],
  platform: "node",
  target: "node20",
  bundle: true,
  format: "cjs",
  outfile: path.join(out, "app.js"),
  // optional native add-ons that some libraries try to load; not needed
  external: ["pg-native", "bufferutil", "utf-8-validate"],
  minify: false,
  legalComments: "none",
  logLevel: "info",
});

await cp(frontendDist, path.join(out, "public"), { recursive: true });
await cp(migrations, path.join(out, "migrations"), { recursive: true });
await copyFile(path.join(root, ".env.example"), path.join(out, ".env.example"));
await writeFile(
  path.join(out, "package.json"),
  JSON.stringify(
    {
      name: "fitness-app",
      private: true,
      version: "1.0.0",
      main: "app.js",
      scripts: { start: "node app.js" },
      engines: { node: ">=20.12" },
    },
    null,
    2,
  ) + "\n",
);

console.log(`\nDeploy folder ready: ${out}`);
