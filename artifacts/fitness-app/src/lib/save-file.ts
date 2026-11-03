/**
 * Save a file without leaving the app.
 *
 * On iPhone/iPad, a plain download link inside the Home Screen app replaces the whole app with
 * the file and there's no back button, so the only way out is closing the app. There we open
 * the share sheet instead (Save to Files, AirDrop, WhatsApp, email…). Everywhere else the
 * browser downloads the file normally.
 */
type Nav = Navigator & { canShare?: (d: ShareData) => boolean; standalone?: boolean };

export const isIOS = () =>
  /iPad|iPhone|iPod/.test(navigator.userAgent) || (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);

export const isHomeScreenApp = () =>
  window.matchMedia?.("(display-mode: standalone)").matches || (navigator as Nav).standalone === true;

export type SaveResult = "shared" | "downloaded" | "cancelled" | "opened";

export async function saveFile(file: File, opts: { fallbackUrl?: string } = {}): Promise<SaveResult> {
  const nav = navigator as Nav;
  const phoneShare = isIOS() || (isHomeScreenApp() && /Android/.test(navigator.userAgent));
  if (phoneShare && nav.share && nav.canShare?.({ files: [file] })) {
    try {
      await nav.share({ files: [file], title: file.name });
      return "shared";
    } catch (err) {
      if (err instanceof DOMException && err.name === "AbortError") return "cancelled";
      // Any other share failure: fall through to the other ways below
    }
  }
  if (isIOS() && isHomeScreenApp()) {
    // No share sheet for this file type: open it in Safari's overlay, which has a Done button
    const url = opts.fallbackUrl ?? URL.createObjectURL(file);
    window.open(url, "_blank");
    return "opened";
  }
  const url = URL.createObjectURL(file);
  const a = document.createElement("a");
  a.href = url;
  a.download = file.name;
  a.rel = "noopener";
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 10_000);
  return "downloaded";
}
