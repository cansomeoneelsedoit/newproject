/**
 * TradingView alert receiver.
 *
 * POST /api/webhooks/tradingview/<organizationId>
 *
 * TradingView cannot send custom headers, so the shared secret travels in the
 * body and the org id is in the path. Anyone holding both can move this org's
 * *paper* book — no real money is reachable from here, and that is a deliberate
 * ceiling on what a leaked Pine script can do.
 *
 * Every alert is recorded, whether or not it trades. When an automated strategy
 * misbehaves overnight, the only useful evidence is what was actually posted,
 * so the raw body is stored verbatim (minus the secret).
 */

import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import type { Prisma } from "@prisma/client";

import { prisma } from "@/server/prisma";
import { recordAction } from "@/server/audit";
import { currentQuantity, settleOrder } from "@/server/fills";
import { deltaOrder, parseAlert, secretMatches, targetPosition } from "@/lib/alerts";
import { round } from "@/lib/format";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type AlertStatus = "FILLED" | "IGNORED" | "REJECTED" | "INVALID";

/** Never persist the caller's secret, even when it was the wrong one. */
function redact(raw: unknown): Prisma.InputJsonValue {
  if (typeof raw === "object" && raw !== null && !Array.isArray(raw)) {
    const o = { ...(raw as Record<string, unknown>) };
    for (const k of ["secret", "key", "passphrase"]) if (k in o) o[k] = "[redacted]";
    return o as Prisma.InputJsonValue;
  }
  return { body: String(raw).slice(0, 4000) } as Prisma.InputJsonValue;
}

async function log(row: {
  organizationId: string;
  endpointId: string | null;
  raw: unknown;
  symbol?: string;
  action?: string;
  price?: number | null;
  strategyName?: string | null;
  status: AlertStatus;
  note?: string | null;
  orderId?: string | null;
}) {
  await prisma.webhookAlert.create({
    data: {
      organizationId: row.organizationId,
      endpointId: row.endpointId,
      raw: redact(row.raw),
      symbol: row.symbol ?? "",
      action: row.action ?? "",
      price: row.price ?? null,
      strategyName: row.strategyName ?? null,
      status: row.status,
      note: row.note ?? null,
      orderId: row.orderId ?? null,
    },
  });
}

export async function POST(
  req: Request,
  { params }: { params: Promise<{ org: string }> },
) {
  const { org } = await params;

  const text = await req.text();
  // TradingView posts the alert message as text/plain; other clients send JSON.
  // Decode once here and hand the same value to the parser either way.
  let body: unknown = text;
  try {
    body = JSON.parse(text);
  } catch {
    /* leave as text — parseAlert reports the problem in user-facing terms */
  }

  const endpoint = await prisma.webhookEndpoint.findUnique({
    where: { organizationId: org },
    select: {
      id: true,
      organizationId: true,
      secret: true,
      enabled: true,
      accountId: true,
      notionalPerTrade: true,
      slippageBps: true,
      commissionBps: true,
    },
  });
  // Unknown org: nothing to attribute the alert to, and nothing to log it
  // against. Say no more than that.
  if (!endpoint) {
    return NextResponse.json({ ok: false, error: "Unknown endpoint" }, { status: 404 });
  }

  const parsed = parseAlert(body);
  if (!parsed.ok) {
    await log({
      organizationId: endpoint.organizationId,
      endpointId: endpoint.id,
      raw: body,
      status: "INVALID",
      note: parsed.error,
    });
    return NextResponse.json({ ok: false, error: parsed.error }, { status: 400 });
  }
  const alert = parsed.alert;

  if (!secretMatches(endpoint.secret, alert.secret)) {
    await log({
      organizationId: endpoint.organizationId,
      endpointId: endpoint.id,
      raw: body,
      symbol: alert.symbol,
      action: alert.action,
      status: "INVALID",
      note: "Secret did not match",
    });
    return NextResponse.json({ ok: false, error: "Bad secret" }, { status: 401 });
  }

  const base = {
    organizationId: endpoint.organizationId,
    endpointId: endpoint.id,
    raw: body,
    symbol: alert.symbol,
    action: alert.action,
    price: alert.price,
    strategyName: alert.strategyName,
  };
  const reject = async (note: string) => {
    await log({ ...base, status: "REJECTED", note });
    return NextResponse.json({ ok: false, error: note }, { status: 200 });
  };

  if (!endpoint.enabled) return reject("Endpoint is disabled");
  if (!endpoint.accountId) return reject("No paper account is linked to this endpoint");

  const instrument = await prisma.instrument.findFirst({
    where: { organizationId: endpoint.organizationId, symbol: alert.symbol },
    select: {
      id: true,
      symbol: true,
      candles: { orderBy: { ts: "desc" }, take: 1, select: { close: true } },
    },
  });
  if (!instrument) {
    return reject(`No instrument named ${alert.symbol} — add it in Kronos first`);
  }

  // Size against Kronos's own last close, not the price TradingView reported,
  // so the target and the fill are computed from the same number. A difference
  // between the two is a data-source disagreement, not something to average.
  const lastClose = instrument.candles[0]?.close;
  if (lastClose === undefined || !(lastClose > 0)) {
    return reject(`No price history for ${alert.symbol} — sync candles first`);
  }

  const target = targetPosition(alert.action, endpoint.notionalPerTrade, lastClose);
  const current = await currentQuantity(
    endpoint.organizationId,
    endpoint.accountId,
    instrument.id,
  );
  const delta = deltaOrder(current, target);
  if (!delta) {
    await log({
      ...base,
      status: "IGNORED",
      note: `Already at the target position (${round(current, 6)})`,
    });
    return NextResponse.json({ ok: true, status: "IGNORED" }, { status: 200 });
  }

  const settled = await settleOrder({
    organizationId: endpoint.organizationId,
    accountId: endpoint.accountId,
    instrumentId: instrument.id,
    side: delta.side,
    type: "MARKET",
    quantity: delta.quantity,
    slippageBps: endpoint.slippageBps,
    commissionBps: endpoint.commissionBps,
  });
  if (!settled.ok) return reject(settled.error);

  await log({
    ...base,
    status: settled.status === "FILLED" ? "FILLED" : "REJECTED",
    note:
      settled.note ??
      `${delta.side} ${round(delta.quantity, 6)} ${instrument.symbol} @ ${settled.fillPrice}`,
    orderId: settled.orderId,
  });

  await recordAction(prisma, {
    type: "webhook.alert",
    entityType: "Order",
    entityId: settled.orderId,
    description: `TradingView ${alert.action} ${instrument.symbol} → ${delta.side} ${round(delta.quantity, 4)}`,
    organizationId: endpoint.organizationId,
    payload: {
      symbol: instrument.symbol,
      action: alert.action,
      strategy: alert.strategyName,
      status: settled.status,
      price: settled.fillPrice,
    },
  });

  for (const p of ["/", "/portfolio", "/alerts"]) revalidatePath(p);

  return NextResponse.json(
    {
      ok: true,
      status: settled.status,
      symbol: instrument.symbol,
      side: delta.side,
      quantity: round(delta.quantity, 6),
      price: settled.fillPrice,
    },
    { status: 200 },
  );
}

/** A human pasting the URL into a browser should get a hint, not a stack trace. */
export async function GET() {
  return NextResponse.json(
    { ok: false, error: "POST a TradingView alert payload to this URL." },
    { status: 405 },
  );
}
