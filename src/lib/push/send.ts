import webpush, { type PushSubscription } from "web-push";
import type { PushMessage } from "./messages";

let configured = false;

function configure() {
  if (configured) return;
  const pub = process.env.VAPID_PUBLIC_KEY;
  const priv = process.env.VAPID_PRIVATE_KEY;
  const subject = process.env.VAPID_SUBJECT;
  if (!pub || !priv || !subject) {
    throw new Error("Set VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY and VAPID_SUBJECT (mailto: or https: URL).");
  }
  webpush.setVapidDetails(subject, pub, priv);
  configured = true;
}

export type SendResult = "sent" | "gone" | "failed";

/** Sends one notification. "gone" means the subscription is dead and should be removed. */
export async function sendPush(sub: PushSubscription, msg: PushMessage): Promise<SendResult> {
  configure();
  try {
    await webpush.sendNotification(sub, JSON.stringify(msg), { TTL: 60 * 60 * 6, urgency: "high" });
    return "sent";
  } catch (e) {
    const status = (e as { statusCode?: number }).statusCode;
    if (status === 404 || status === 410) return "gone";
    console.error("[push] send failed", status, (e as Error).message);
    return "failed";
  }
}
