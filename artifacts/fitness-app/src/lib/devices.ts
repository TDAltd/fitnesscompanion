// Devices people can sync from. Everything goes through the iPhone Health app:
// the device's own app writes to Apple Health, and the "Sync Fitness" Shortcut reads Apple Health.
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
  gives: { steps: boolean; sleep: boolean | "needs-setup"; energy: boolean | "estimate" };
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
    gives: { steps: true, sleep: false, energy: "estimate" },
    setup: [
      "Nothing to install: your iPhone counts steps while it's in your pocket or bag.",
      "Check it's on: Settings → Privacy & Security → Motion & Fitness → Fitness Tracking.",
    ],
    tip: "An iPhone on its own can't measure sleep, so sleep will stay empty. Skip the Sleep part of the Shortcut, or add a watch or ring later.",
  },
  {
    id: "apple-watch",
    name: "Apple Watch",
    examples: "Any model",
    app: "",
    gives: { steps: true, sleep: "needs-setup", energy: true },
    setup: [
      "Steps and active calories go to Apple Health automatically.",
      "For sleep: Health app → Browse → Sleep → Get Started (or Full Schedule & Options), set a sleep schedule, and turn on Track Sleep with Apple Watch.",
      "Wear the watch to bed with at least 30% battery.",
    ],
  },
  {
    id: "oraimo",
    name: "Oraimo",
    examples: "Watch 5 Lite, OSW and Tempo series",
    app: "oraimo health",
    gives: { steps: true, sleep: true, energy: true },
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
    gives: { steps: true, sleep: true, energy: true },
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
    gives: { steps: true, sleep: true, energy: true },
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
    gives: { steps: true, sleep: true, energy: true },
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
    gives: { steps: true, sleep: true, energy: true },
    setup: [
      "Oura: menu (top left) → Settings → Apple Health → turn on Connect to Health. Gen3 and newer rings need an active membership.",
      "Ultrahuman or RingConn: open the app's settings, find Apple Health, turn it on, then tap Turn On All → Allow.",
    ],
    tip: "Rings are great for sleep. If you also wear a watch to bed, keep only one sleep tracker in the Shortcut (see below).",
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
