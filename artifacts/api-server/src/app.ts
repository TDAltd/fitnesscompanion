import express, { type Express, type ErrorRequestHandler } from "express";
import cookieParser from "cookie-parser";
import pinoHttp from "pino-http";
import path from "node:path";
import fs from "node:fs";
import router from "./routes";
import { logger } from "./lib/logger";
import { BASE_PATH } from "./lib/config";

export function createApp(staticDir?: string): Express {
  const app: Express = express();

  // cPanel/Passenger (and most hosts) sit behind a proxy; this makes req.secure / req.ip correct
  app.set("trust proxy", 1);
  app.disable("x-powered-by");

  // When hosted in a folder (e.g. https://tdaproducthub.com/fitnesscompanion/), requests may
  // arrive with the folder at the front. Strip it so the routes below work either way.
  if (BASE_PATH) {
    app.use((req, res, next) => {
      if (req.url === BASE_PATH) {
        res.redirect(301, `${BASE_PATH}/`);
        return;
      }
      if (req.url.startsWith(`${BASE_PATH}/`) || req.url.startsWith(`${BASE_PATH}?`)) {
        req.url = req.url.slice(BASE_PATH.length) || "/";
      }
      next();
    });
  }

  app.use(
    pinoHttp({
      logger,
      autoLogging: { ignore: (req) => !req.url?.startsWith("/api") },
      serializers: {
        req(req) {
          return { id: req.id, method: req.method, url: req.url?.split("?")[0] };
        },
        res(res) {
          return { statusCode: res.statusCode };
        },
      },
    }),
  );
  app.use(cookieParser());
  app.use("/api/nutrition-lookup", express.json({ limit: "4mb" }));
  app.use("/api/import", express.json({ limit: "25mb" }));
  app.use("/api/health-sync", express.json({ limit: "256kb" }));
  // Some Shortcut setups send the body as text; accept it and parse as JSON if possible
  app.use("/api/health-sync", express.text({ type: ["text/*"], limit: "256kb" }), (req, _res, next) => {
    if (typeof req.body === "string") {
      try { req.body = JSON.parse(req.body); } catch { req.body = {}; }
    }
    next();
  });
  app.use(express.json());
  app.use(express.urlencoded({ extended: true }));

  // Which build of the web app is live (the hashed main script in index.html).
  // Open tabs and Home Screen apps compare this with their own and offer a refresh.
  app.get("/api/version", (_req, res) => {
    res.setHeader("Cache-Control", "no-store");
    let build: string | null = null;
    try {
      if (staticDir) build = fs.readFileSync(path.join(staticDir, "index.html"), "utf8").match(/assets\/(index-[\w-]+\.js)/)?.[1] ?? null;
    } catch {
      /* not built */
    }
    res.json({ build });
  });

  app.use("/api", router);
  app.use("/api", (_req, res) => {
    res.status(404).json({ error: "Not found" });
  });

  // Serve the built React app (single-page app: unknown paths fall back to index.html)
  if (staticDir && fs.existsSync(path.join(staticDir, "index.html"))) {
    app.use(express.static(staticDir, { index: false, maxAge: "1h" }));
    app.get(/.*/, (_req, res) => {
      res.setHeader("Cache-Control", "no-cache");
      res.sendFile(path.join(staticDir, "index.html"));
    });
  }

  const onError: ErrorRequestHandler = (err, req, res, _next) => {
    if (err?.name === "ZodError") {
      res.status(400).json({ error: "Some fields are missing or invalid.", issues: err.issues });
      return;
    }
    if (err?.type === "entity.too.large") {
      res.status(413).json({ error: "Upload is too large." });
      return;
    }
    req.log?.error({ err }, "Unhandled error");
    res.status(500).json({ error: "Something went wrong. Please try again." });
  };
  app.use(onError);

  return app;
}
