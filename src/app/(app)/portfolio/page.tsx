import Link from "next/link";

import { listAccounts, listInstruments, listOrders } from "@/server/kronos";
import { formatMoney, formatQty } from "@/lib/format";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { OrderStatusBadge, Pnl, SideBadge } from "@/components/kronos/badges";
import {
  CancelOrderButton,
  OpenAccountDialog,
  PlaceOrderDialog,
} from "./portfolio-actions";

export const dynamic = "force-dynamic";

export default async function PortfolioPage() {
  const [accounts, instruments, orders] = await Promise.all([
    listAccounts(),
    listInstruments(),
    listOrders(undefined, 40),
  ]);

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="font-serif text-3xl">Portfolio</h1>
          <p className="text-sm text-muted-foreground">
            Paper accounts, live positions marked to the latest close, and the order blotter.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <OpenAccountDialog />
          <PlaceOrderDialog
            accounts={accounts.map((a) => ({ id: a.id, name: a.name }))}
            instruments={instruments.map((i) => ({
              id: i.id,
              symbol: i.symbol,
              lastClose: i.lastClose,
            }))}
          />
        </div>
      </header>

      {accounts.length === 0 ? (
        <Card>
          <CardContent className="p-6 text-sm text-muted-foreground">
            No paper accounts yet. Open one to start placing simulated orders.
          </CardContent>
        </Card>
      ) : (
        accounts.map((a) => (
          <section key={a.id} className="space-y-4">
            <div className="grid gap-4 md:grid-cols-4">
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground">
                    {a.name} · equity
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-4 pt-0 text-2xl font-semibold tabular-nums">
                  {formatMoney(a.equity, a.currency)}
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground">Cash</CardTitle>
                </CardHeader>
                <CardContent className="p-4 pt-0 text-2xl font-semibold tabular-nums">
                  {formatMoney(a.cash, a.currency)}
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground">
                    Total P&amp;L
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-4 pt-0 text-2xl font-semibold">
                  <Pnl value={a.totalPnl} />
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground">Return</CardTitle>
                </CardHeader>
                <CardContent className="p-4 pt-0 text-2xl font-semibold">
                  <Pnl value={a.totalReturnPct} pct />
                </CardContent>
              </Card>
            </div>

            <Card>
              <CardHeader>
                <CardTitle>Open positions ({a.positions.length})</CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                {a.positions.length === 0 ? (
                  <p className="p-6 text-sm text-muted-foreground">
                    Flat — no open positions in this account.
                  </p>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Symbol</TableHead>
                        <TableHead className="text-right">Qty</TableHead>
                        <TableHead className="text-right">Avg cost</TableHead>
                        <TableHead className="text-right">Last</TableHead>
                        <TableHead className="text-right">Value</TableHead>
                        <TableHead className="text-right">Unrealised</TableHead>
                        <TableHead className="text-right">%</TableHead>
                        <TableHead className="text-right">Realised</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {a.positions.map((p) => (
                        <TableRow key={p.id}>
                          <TableCell className="font-medium">
                            <Link href={`/instruments/${p.instrument.id}`} className="hover:underline">
                              {p.instrument.symbol}
                            </Link>
                            {p.quantity < 0 ? (
                              <span className="ml-2 text-xs text-red-600">short</span>
                            ) : null}
                          </TableCell>
                          <TableCell className="text-right tabular-nums">
                            {formatQty(p.quantity)}
                          </TableCell>
                          <TableCell className="text-right tabular-nums">
                            {formatMoney(p.avgCost, p.instrument.currency)}
                          </TableCell>
                          <TableCell className="text-right tabular-nums">
                            {formatMoney(p.lastPrice, p.instrument.currency)}
                          </TableCell>
                          <TableCell className="text-right tabular-nums">
                            {formatMoney(p.marketValue, p.instrument.currency)}
                          </TableCell>
                          <TableCell className="text-right"><Pnl value={p.unrealizedPnl} /></TableCell>
                          <TableCell className="text-right"><Pnl value={p.unrealizedPct} pct /></TableCell>
                          <TableCell className="text-right"><Pnl value={p.realizedPnl} /></TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </section>
        ))
      )}

      <Card>
        <CardHeader><CardTitle>Order blotter ({orders.length})</CardTitle></CardHeader>
        <CardContent className="p-0">
          {orders.length === 0 ? (
            <p className="p-6 text-sm text-muted-foreground">No orders placed yet.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Placed</TableHead>
                  <TableHead>Account</TableHead>
                  <TableHead>Symbol</TableHead>
                  <TableHead>Side</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead className="text-right">Qty</TableHead>
                  <TableHead className="text-right">Fill</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Note</TableHead>
                  <TableHead className="w-12" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {orders.map((o: (typeof orders)[number]) => (
                  <TableRow key={o.id}>
                    <TableCell className="whitespace-nowrap text-xs text-muted-foreground">
                      {o.placedAt.toLocaleString()}
                    </TableCell>
                    <TableCell className="text-muted-foreground">{o.account.name}</TableCell>
                    <TableCell className="font-medium">{o.instrument.symbol}</TableCell>
                    <TableCell><SideBadge side={o.side} /></TableCell>
                    <TableCell className="text-xs text-muted-foreground">
                      {o.type === "LIMIT" && o.limitPrice
                        ? `Limit ${o.limitPrice}`
                        : "Market"}
                    </TableCell>
                    <TableCell className="text-right tabular-nums">{formatQty(o.quantity)}</TableCell>
                    <TableCell className="text-right tabular-nums">
                      {o.filledPrice === null
                        ? "—"
                        : formatMoney(o.filledPrice, o.instrument.currency)}
                    </TableCell>
                    <TableCell><OrderStatusBadge status={o.status} /></TableCell>
                    <TableCell className="max-w-xs truncate text-xs text-muted-foreground">
                      {o.note ?? "—"}
                    </TableCell>
                    <TableCell className="text-right">
                      {o.status === "PENDING" ? <CancelOrderButton id={o.id} /> : null}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
