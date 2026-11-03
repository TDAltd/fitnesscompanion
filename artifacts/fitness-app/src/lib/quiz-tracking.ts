import { withBase } from "./base-path";

/**
 * Anonymous count of how far people get in the sign-up questions: a random code per phone and
 * the screen name, nothing they answered. Each screen is sent once per phone.
 */
const ID_KEY = "fc-quiz-visitor";
const SENT_KEY = "fc-quiz-sent";

function visitorId(): string | null {
  try {
    let id = localStorage.getItem(ID_KEY);
    if (!id) {
      id = crypto.randomUUID?.() ?? `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 12)}`;
      localStorage.setItem(ID_KEY, id);
    }
    return id;
  } catch {
    return null;
  }
}

export function trackQuizStep(step: string) {
  const visitor = visitorId();
  if (!visitor) return;
  try {
    const sent = new Set<string>(JSON.parse(localStorage.getItem(SENT_KEY) ?? "[]"));
    if (sent.has(step)) return;
    sent.add(step);
    localStorage.setItem(SENT_KEY, JSON.stringify([...sent]));
  } catch {
    /* storage blocked: still send */
  }
  void fetch(withBase("/api/quiz-event"), {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ visitor, step }),
    keepalive: true,
  }).catch(() => undefined);
}
