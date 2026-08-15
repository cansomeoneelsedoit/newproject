import Link from "next/link";

import { listInstruments } from "@/server/kronos";
import { activeProvider } from "@/server/market-data";
import { formatMoney } from "@/lib/format";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Pnl, assetClassLabel } from "@/components/kronos/badges";
import { AddInstrumentDialog, DeleteInstrumentButton, SyncButton } from "./instrument-dialogs";

export const dynamic = "force-dynamic";

export default async function InstrumentsPage() {
  const instruments = await listInstruments();
  const provider = activeProvider();

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="font-serif text-3xl">Instruments</h1>
          <p className="text-sm text-muted-foreground">
            Symbols Kronos tracks, and the price history it holds for each.
          </p>
        </div>
        <AddInstrumentDialog />
      </header>

      {provider === "synthetic" ? (
        <Card className="border-amber-500/50">
          <CardContent className="p-4 text-sm text-muted-foreground">
            <strong className="text-foreground">Simulated prices.</strong> No market-data
            credentials are configured, so Kronos is generating deterministic synthetic price
            series locally. Everything downstream — signals, backtests, P&amp;L — exercises the
            real machinery against fake data. Set{" "}
            <code className="text-xs">MARKET_DATA_PROVIDER=stooq</code> to pull real daily bars.
          </CardContent>
        </Card>
      ) : null}

      <Card>
        <CardHeader>
          <CardTitle>Tracked ({instruments.length})</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {instruments.length === 0 ? (
            <p className="p-6 text-sm text-muted-foreground">
              No instruments yet. Add one to start pulling prices.
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Symbol</TableHead>
                  <TableHead>Name</TableHead>
                  <TableHead>Class</TableHead>
                  <TableHead className="text-right">Last</TableHead>
                  <TableHead className="text-right">1d</TableHead>
                  <TableHead className="text-right">Bars</TableHead>
                  <TableHead>Watchlist</TableHead>
                  <TableHead className="w-28" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {instruments.map((i) => (
                  <TableRow key={i.id}>
                    <TableCell className="font-medium">
                      <Link href={`/instruments/${i.id}`} className="hover:underline">
                        {i.symbol}
                      </Link>
                    </TableCell>
                    <TableCell className="text-muted-foreground">{i.name}</TableCell>
                    <TableCell className="text-muted-foreground">
                      {assetClassLabel(i.assetClass)}
                    </TableCell>
                    <TableCell className="text-right tabular-nums">
                      {i.lastClose === null ? "—" : formatMoney(i.lastClose, i.currency)}
                    </TableCell>
                    <TableCell className="text-right">
                      {i.changePct === null ? (
                        <span className="text-muted-foreground">—</span>
                      ) : (
                        <Pnl value={i.changePct} pct />
                      )}
                    </TableCell>
                    <TableCell className="text-right tabular-nums text-muted-foreground">
                      {i.candleCount}
                    </TableCell>
                    <TableCell>
                      {i.watched ? (
                        <Badge variant="accent">Watched</Badge>
                      ) : (
                        <Badge variant="outline" className="text-muted-foreground">Muted</Badge>
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-1">
                        <SyncButton instrumentId={i.id} />
                        <DeleteInstrumentButton id={i.id} symbol={i.symbol} />
                      </div>
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
