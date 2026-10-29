// Devices people can sync from. Everything goes through the iPhone Health app:
// the device's own app writes to Apple Health, and the "Sync Fitness" Shortcut reads Apple Health.
// The app syncs steps and active calories only (sleep was removed on purpose).
// Menu names change between app versions, so each guide also says what to look for.

export type DeviceId = "iphone" | "apple-watch" | "oraimo" | "xiaomi" | "huawei" | "amazfit" | "ring";

export interface Device {
  id: DeviceId;
  name: string;
  /** Short line under the name in the picker */
  examples: string;
  /** The app that writes to Apple Health ("" = built in) */
  app: string;
  /** What reaches Apple Health from this device */
  gives: { steps: boolean; energy: boolean | "estimate" };
  /** How to turn on sharing to Apple Health, in order */
  setup: string[];
  /** One extra thing worth knowing */
  tip?: string;
}

export const DEVICES: Device[] = [
  {
    id: "iphone",
    name: "iPhone only",
    examples: "No watch or ring",
    app: "",
    gives: { steps: true, energy: "estimate" },
    setup: [
      "Nothing to install: your iPhone counts steps while it's in your pocket or bag.",
      "Check it's on: Settings → Privacy & Security → Motion & Fitness → Fitness Tracking.",
    ],
    tip: "Carry your phone through the day so it counts your steps. Active calories are a rough estimate without a watch.",
  },
  {
    id: "apple-watch",
    name: "Apple Watch",
    examples: "Any model",
    app: "",
    gives: { steps: true, energy: true },
    setup: [
      "Nothing to set up: steps and active calories go to Apple Health automatically.",
    ],
  },
  {
    id: "oraimo",
    name: "Oraimo",
    examples: "Watch 5 Lite, OSW and Tempo series",
    app: "oraimo health",
    gives: { steps: true, energy: true },
    setup: [
      "Open oraimo health and find Apple Health (usually under Me or Settings → third-party / data sharing). Turn it on.",
      "When the Health permission screen opens, tap Turn On All, then Allow.",
      "Open oraimo health each evening so the watch syncs before the Shortcut runs.",
    ],
    tip: "Workouts from oraimo don't reach Apple Health, so log them in Train.",
  },
  {
    id: "xiaomi",
    name: "Xiaomi / Redmi",
    examples: "Smart Band, Redmi Watch, Mi Band",
    app: "Mi Fitness",
    gives: { steps: true, energy: true },
    setup: [
      "Open Mi Fitness → Profile → Third-party data → Apple Health, and turn sync on.",
      "When the Health permission screen opens, tap Turn On All, then Allow.",
      "Older Mi Bands that use the Zepp Life app: Profile → Add accounts → Apple Health.",
    ],
    tip: "If nothing arrives, Xiaomi suggests turning off Low Power Mode and any VPN, then opening Mi Fitness again.",
  },
  {
    id: "huawei",
    name: "Huawei / Honor",
    examples: "Huawei Band, Watch Fit, GT series",
    app: "Huawei Health",
    gives: { steps: true, energy: true },
    setup: [
      "Huawei Health asks to connect to Apple Health when you first set it up: tap Let's go → Turn All Categories On → Allow.",
      "Skipped it? Use the check below: in the iPhone Health app, turn on everything for Huawei Health.",
    ],
  },
  {
    id: "amazfit",
    name: "Amazfit",
    examples: "Bip, GTS, GTR, Active, Balance",
    app: "Zepp",
    gives: { steps: true, energy: true },
    setup: [
      "Open Zepp → Profile → Add accounts (third-party) → Apple Health.",
      "Confirm, then on the Health permission screen tap Turn On All → Allow.",
    ],
  },
  {
    id: "ring",
    name: "Smart ring",
    examples: "Oura, Ultrahuman, RingConn",
    app: "your ring's app",
    gives: { steps: true, energy: true },
    setup: [
      "Oura: menu (top left) → Settings → Apple Health → turn on Connect to Health. Gen3 and newer rings need an active membership.",
      "Ultrahuman or RingConn: open the app's settings, find Apple Health, turn it on, then tap Turn On All → Allow.",
    ],
  },
];

export const deviceById = (id: string | null | undefined) => DEVICES.find((d) => d.id === id) ?? null;

const KEY = "fc-health-device";
export function savedDevice(): DeviceId | null {
  try {
    const v = localStorage.getItem(KEY);
    return deviceById(v)?.id ?? null;
  } catch {
    return null;
  }
}
export function saveDevice(id: DeviceId) {
  try {
    localStorage.setItem(KEY, id);
  } catch {
    /* private mode: fine */
  }
}
