import { headers } from "next/headers";
import { AlertTriangle } from "lucide-react";

import { getWebhookEndpoint, listAccounts, listStrategies, listWebhookAlerts } from "@/server/kronos";
import { canExportPine, toPineScript } from "@/lib/pine";
import { strategyLabel } from "@/components/kronos/badges";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  CopyButton,
  EndpointSettings,
  PineScriptBlock,
  RotateSecretButton,
  SecretField,
} from "./tradingview-actions";

export const dynamic = "force-dynamic";

/**
 * Build the absolute webhook URL from the request itself.
 *
 * TradingView needs a URL it can reach, and the value shown here has to be the
 * one that actually works — so it is derived from the host the user is browsing
 * rather than from a config constant that could drift.
 */
async function webhookBase(): Promise<{ url: string; reachable: boolean }> {
  const h = await headers();
  const host = h.get("x-forwarded-host") ?? h.get("host") ?? "localhost:3004";
  const proto = h.get("x-forwarded-proto") ?? (host.startsWith("localhost") ? "http" : "https");
  const isLocal = /^(localhost|127\.0\.0\.1|\[::1\])(:|$)/.test(host);
  return { url: `${proto}://${host}`, reachable: !isLocal };
}

function statusVariant(status: string): "default" | "secondary" | "destructive" | "outline" {
  if (status === "FILLED") return "default";
  if (status === "IGNORED") return "secondary";
  return "destructive";
}

export default async function TradingViewPage() {
  const [endpoint, strategies, accounts, alerts, base] = await Promise.all([
    getWebhookEndpoint(),
    listStrategies(),
    listAccounts(),
    listWebhookAlerts(100),
    webhookBase(),
  ]);

  const webhookUrl = `${base.url}/api/webhooks/tradingview/${endpoint.organizationId}`;

  const scripts = (strategies as { id: string; name: string; kind: string; params: unknown }[])
    .filter((s) => canExportPine(s.kind))
    .map((s) => ({
      id: s.id,
      name: s.name,
      kind: s.kind,
      script: toPineScript({
        strategyName: s.name,
        kind: s.kind,
        params: (s.params ?? {}) as Record<string, unknown>,
        webhookUrl,
        secret: endpoint.secret,
        commissionBps: endpoint.commissionBps,
        slippageBps: endpoint.slippageBps,
      }),
    }));

  return (
    <div className="space-y-6">
      <header>
        <h1 className="font-serif text-3xl">TradingView</h1>
        <p className="max-w-3xl text-sm text-muted-foreground">
          Validate a strategy in Kronos, run it on a TradingView chart, and let its alerts fill
          paper orders back here. TradingView&apos;s engine is not this one — bar timing, fills and
          data source all differ — so treat the Pine script as an alerting front-end for a strategy
          Kronos already accepted, not as a second opinion on it.
        </p>
      </header>

      <Card>
        <CardHeader><CardTitle>Endpoint</CardTitle></CardHeader>
        <CardContent className="space-y-5">
          <div className="space-y-2">
            <div className="text-sm font-medium">Webhook URL</div>
            <div className="flex items-center gap-2">
              <code className="flex-1 truncate rounded-md border bg-muted/40 px-3 py-2 font-mono text-xs">
                {webhookUrl}
              </code>
              <CopyButton value={webhookUrl} />
            </div>
            {!base.reachable && (
              <p className="flex items-start gap-2 text-xs text-amber-600 dark:text-amber-500">
                <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                This is a localhost URL — TradingView&apos;s servers cannot reach it. Expose the app
                publicly (or tunnel it) before creating alerts.
              </p>
            )}
          </div>

          <div className="space-y-2">
            <div className="text-sm font-medium">Shared secret</div>
            <SecretField secret={endpoint.secret} />
            <p className="text-xs text-muted-foreground">
              TradingView cannot send custom headers, so the secret travels inside the alert body
              and is baked into the generated script. Anyone holding that script can post signals
              into this paper book.
            </p>
            <RotateSecretButton />
          </div>

          <p className="rounded-md border border-amber-500/40 bg-amber-500/5 p-3 text-xs text-muted-foreground">
            <span className="font-medium text-foreground">Alerts own the position.</span>{" "}
            An alert names a target — long, short or flat — and Kronos trades whatever distance is
            needed to reach it, so a &ldquo;buy&rdquo; on a symbol you already hold manually will{" "}
            <em>resize</em> that holding rather than add to it. Point this at a dedicated paper
            account if you also trade by hand.
          </p>

          <EndpointSettings
            accounts={accounts.map((a: { id: string; name: string }) => ({ id: a.id, name: a.name }))}
            initial={{
              accountId: endpoint.accountId,
              enabled: endpoint.enabled,
              notionalPerTrade: endpoint.notionalPerTrade,
              slippageBps: endpoint.slippageBps,
              commissionBps: endpoint.commissionBps,
            }}
          />

          {!endpoint.accountId && (
            <p className="flex items-start gap-2 text-xs text-amber-600 dark:text-amber-500">
              <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
              No paper account is linked, so every alert will be rejected. Pick one above.
            </p>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>Pine script</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          <ol className="list-decimal space-y-1 pl-5 text-sm text-muted-foreground">
            <li>Copy the script and paste it into TradingView → Pine Editor → Add to chart.</li>
            <li>Create an alert on that script with the condition set to the script itself.</li>
            <li>Trigger: <span className="font-medium">alert() function calls only</span>.</li>
            <li>Notifications → Webhook URL: paste the URL above.</li>
            <li>Leave the alert message box empty — the script supplies its own JSON.</li>
          </ol>
          <PineScriptBlock scripts={scripts} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Alerts received ({alerts.length})</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {alerts.length === 0 ? (
            <p className="p-6 text-sm text-muted-foreground">
              Nothing yet. Every inbound alert is logged here — including ones that were rejected —
              so a strategy that goes quiet overnight leaves evidence.
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Received</TableHead>
                  <TableHead>Symbol</TableHead>
                  <TableHead>Action</TableHead>
                  <TableHead>Strategy</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Detail</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {alerts.map((a) => (
                  <TableRow key={a.id}>
                    <TableCell className="whitespace-nowrap text-xs text-muted-foreground">
                      {a.receivedAt.toISOString().replace("T", " ").slice(0, 19)}
                    </TableCell>
                    <TableCell className="font-medium">{a.symbol || "—"}</TableCell>
                    <TableCell>{a.action || "—"}</TableCell>
                    <TableCell className="text-muted-foreground">{a.strategyName ?? "—"}</TableCell>
                    <TableCell>
                      <Badge variant={statusVariant(a.status)}>{a.status}</Badge>
                    </TableCell>
                    <TableCell className="max-w-md text-xs text-muted-foreground">
                      {a.note ?? "—"}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <p className="text-xs text-muted-foreground">
        {scripts.length} of {strategies.length} strategies can be exported (
        {strategyLabel("SMA_CROSSOVER")}, {strategyLabel("RSI_REVERSION")},{" "}
        {strategyLabel("DONCHIAN_BREAKOUT")}, {strategyLabel("MACD_TREND")}).
      </p>
    </div>
  );
}
