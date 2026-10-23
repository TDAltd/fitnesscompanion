import pino from "pino";

// Plain JSON logs to stdout/stderr. On cPanel these land in the app's log file.
export const logger = pino({
  level: process.env.LOG_LEVEL ?? "info",
  redact: ["req.headers.authorization", "req.headers.cookie", "res.headers['set-cookie']"],
});
