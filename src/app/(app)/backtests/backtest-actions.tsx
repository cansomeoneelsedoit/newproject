"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import { Play, Trash2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ConfirmDialog } from "@/components/shared/confirm-dialog";
import { deleteBacktest, runBacktest } from "@/server/kronos-actions";

const schema = z.object({
  instrumentId: z.string().min(1, "Pick an instrument"),
  strategyId: z.string().min(1, "Pick a strategy"),
  initialCash: z.string(),
  commissionBps: z.string(),
  slippageBps: z.string(),
});
type Form = z.infer<typeof schema>;

export function RunBacktestDialog({
  instruments,
  strategies,
}: {
  instruments: { id: string; symbol: string }[];
  strategies: { id: string; name: string }[];
}) {
  const [open, setOpen] = useState(false);
  const [pending, startT] = useTransition();
  const router = useRouter();

  const empty: Form = {
    instrumentId: instruments[0]?.id ?? "",
    strategyId: strategies[0]?.id ?? "",
    initialCash: "100000",
    commissionBps: "5",
    slippageBps: "2",
  };
  const form = useForm<Form>({ resolver: zodResolver(schema), defaultValues: empty });

  // Without both an instrument and a strategy there is nothing to test; point
  // the user at the missing half rather than opening an unusable form.
  if (instruments.length === 0 || strategies.length === 0) {
    return (
      <Button asChild variant="outline">
        <a href={instruments.length === 0 ? "/instruments" : "/signals"}>
          {instruments.length === 0 ? "Add an instrument first" : "Create a strategy first"}
        </a>
      </Button>
    );
  }

  function onSubmit(v: Form) {
    startT(async () => {
      const r = await runBacktest({
        instrumentId: v.instrumentId,
        strategyId: v.strategyId,
        initialCash: Number(v.initialCash),
        commissionBps: Number(v.commissionBps),
        slippageBps: Number(v.slippageBps),
      });
      if (r.ok) {
        toast.success("Backtest complete");
        setOpen(false);
        router.refresh();
        if (r.data?.id) router.push(`/backtests/${r.data.id}`);
      } else {
        toast.error(r.error);
      }
    });
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>
          <Play className="h-4 w-4" /> Run backtest
        </Button>
      </DialogTrigger>
      <DialogContent>
        <form onSubmit={form.handleSubmit(onSubmit)}>
          <DialogHeader>
            <DialogTitle>Run backtest</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label>Instrument</Label>
                <Select
                  value={form.watch("instrumentId")}
                  onValueChange={(v) => form.setValue("instrumentId", v)}
                >
                  <SelectTrigger><SelectValue placeholder="Pick one" /></SelectTrigger>
                  <SelectContent>
                    {instruments.map((i) => (
                      <SelectItem key={i.id} value={i.id}>{i.symbol}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Strategy</Label>
                <Select
                  value={form.watch("strategyId")}
                  onValueChange={(v) => form.setValue("strategyId", v)}
                >
                  <SelectTrigger><SelectValue placeholder="Pick one" /></SelectTrigger>
                  <SelectContent>
                    {strategies.map((s) => (
                      <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div className="space-y-2">
                <Label>Starting cash</Label>
                <Input {...form.register("initialCash")} inputMode="numeric" />
              </div>
              <div className="space-y-2">
                <Label>Commission (bps)</Label>
                <Input {...form.register("commissionBps")} inputMode="numeric" />
              </div>
              <div className="space-y-2">
                <Label>Slippage (bps)</Label>
                <Input {...form.register("slippageBps")} inputMode="numeric" />
              </div>
            </div>
            <p className="text-xs text-muted-foreground">
              Targets are executed at the next bar&apos;s open, with slippage applied against you
              and commission charged per side.
            </p>
          </div>
          <DialogFooter>
            <Button type="button" variant="ghost" onClick={() => setOpen(false)} disabled={pending}>
              Cancel
            </Button>
            <Button type="submit" disabled={pending}>{pending ? "Running…" : "Run"}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export function DeleteBacktestButton({ id }: { id: string }) {
  const [open, setOpen] = useState(false);
  const router = useRouter();

  return (
    <>
      <Button variant="ghost" size="sm" onClick={() => setOpen(true)} aria-label="Delete backtest">
        <Trash2 className="h-4 w-4" />
      </Button>
      <ConfirmDialog
        open={open}
        onOpenChange={setOpen}
        title="Delete this backtest?"
        description="The run and its trade list are removed."
        confirmLabel="Delete"
        cancelLabel="Cancel"
        destructive
        onConfirm={async () => {
          const r = await deleteBacktest(id);
          if (r.ok) {
            toast.success("Backtest deleted");
            router.refresh();
          } else {
            toast.error(r.error);
          }
        }}
      />
    </>
  );
}
