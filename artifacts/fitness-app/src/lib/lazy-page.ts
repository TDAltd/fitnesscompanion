import { lazy, type ComponentType } from "react";

/**
 * Load a page only when it's opened. After an update, an old page file can be gone from the
 * server: then reload once to pick up the new version instead of showing an error.
 */
export function lazyPage<T extends ComponentType<any>>(load: () => Promise<{ default: T }>) {
  return lazy(async () => {
    try {
      const mod = await load();
      try {
        sessionStorage.removeItem("chunk-reload");
      } catch {
        /* storage blocked */
      }
      return mod;
    } catch (err) {
      let reloaded = false;
      try {
        reloaded = sessionStorage.getItem("chunk-reload") === "1";
        if (!reloaded) sessionStorage.setItem("chunk-reload", "1");
      } catch {
        reloaded = true;
      }
      if (!reloaded) {
        window.location.reload();
        return new Promise<never>(() => undefined);
      }
      throw err;
    }
  });
}
