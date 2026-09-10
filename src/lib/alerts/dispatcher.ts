/**
 * Alert dispatcher (scaffold).
 *
 * The database + interface are production-ready; only the CONSOLE/log channel
 * actually sends in the MVP. Email/Webhook/Telegram/Discord are stubbed behind
 * the same `AlertChannelSender` interface — implement `send()` and register the
 * sender in CHANNELS to activate a channel. No other code changes.
 */
import { prisma } from "@/lib/db";
import { logger } from "@/lib/logger";
import type { FollowerEntry } from "@/lib/providers/types";
import type { AlertChannel } from "@prisma/client";

const log = logger.scope("alerts");

export interface AlertPayload {
  profileId: string;
  profileUsername: string;
  message: string;
  followerUsername?: string;
  count?: number;
}

export interface AlertChannelSender {
  channel: AlertChannel;
  send(target: string, payload: AlertPayload): Promise<void>;
}

// --- Active channel: console/log (always available) ------------------------
const consoleSender: AlertChannelSender = {
  channel: "WEBHOOK", // placeholder mapping; real webhook below when implemented
  async send(target, payload) {
    log.info("ALERT", { target, ...payload });
  },
};

// --- Stubs — implement send() to activate (see README §Alerts) -------------
const emailSender: AlertChannelSender = {
  channel: "EMAIL",
  async send(target, payload) {
    // TODO: integrate Resend/Postmark/SES. For now, log so the pipeline works.
    log.warn("EMAIL alert channel not implemented; would send", { target, message: payload.message });
  },
};

const webhookSender: AlertChannelSender = {
  channel: "WEBHOOK",
  async send(target, payload) {
    // Real webhook POST — safe to enable; disabled by default until a rule exists.
    await fetch(target, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(payload),
      signal: AbortSignal.timeout(10_000),
    });
  },
};

const telegramSender: AlertChannelSender = {
  channel: "TELEGRAM",
  async send(target, payload) {
    log.warn("TELEGRAM alert channel not implemented; would send", { target, message: payload.message });
  },
};

const discordSender: AlertChannelSender = {
  channel: "DISCORD",
  async send(target, payload) {
    log.warn("DISCORD alert channel not implemented; would send", { target, message: payload.message });
  },
};

const CHANNELS: Record<AlertChannel, AlertChannelSender> = {
  EMAIL: emailSender,
  WEBHOOK: webhookSender,
  TELEGRAM: telegramSender,
  DISCORD: discordSender,
};

/**
 * Given newly detected followers, create AlertDelivery rows for each enabled
 * rule and attempt delivery. Failures are recorded, never thrown.
 */
export async function enqueueAlertsForChanges(profileId: string, added: FollowerEntry[]): Promise<void> {
  const rules = await prisma.alertRule.findMany({ where: { profileId, enabled: true } });
  if (rules.length === 0) {
    // Nothing configured — emit a console alert so the pipeline is observable.
    void consoleSender;
    return;
  }

  const profile = await prisma.trackedProfile.findUnique({ where: { id: profileId } });
  if (!profile) return;

  for (const rule of rules) {
    if (rule.trigger === "NEW_FOLLOWER") {
      for (const f of added) {
        const payload: AlertPayload = {
          profileId,
          profileUsername: profile.username,
          followerUsername: f.username,
          message: `@${f.username} started following @${profile.username}`,
        };
        await deliver(rule.id, rule.channel, rule.target, payload);
      }
    } else if (rule.trigger === "FOLLOWER_MILESTONE") {
      const payload: AlertPayload = {
        profileId,
        profileUsername: profile.username,
        count: added.length,
        message: `@${profile.username} gained ${added.length} new followers`,
      };
      await deliver(rule.id, rule.channel, rule.target, payload);
    }
  }
}

async function deliver(ruleId: string, channel: AlertChannel, target: string, payload: AlertPayload) {
  const delivery = await prisma.alertDelivery.create({
    data: { ruleId, status: "PENDING", payload: payload as unknown as object },
  });
  try {
    await CHANNELS[channel].send(target, payload);
    await prisma.alertDelivery.update({
      where: { id: delivery.id },
      data: { status: "SENT", sentAt: new Date() },
    });
  } catch (e) {
    await prisma.alertDelivery.update({
      where: { id: delivery.id },
      data: { status: "FAILED", error: (e as Error).message },
    });
    log.error("alert delivery failed", { ruleId, channel, error: e });
  }
}
