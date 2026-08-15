"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import { Plus, RefreshCw, Sparkles, Trash2 } from "lucide-react";

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
import {
  createInstrument,
  deleteInstrument,
  generateAnalysis,
  syncCandles,
} from "@/server/kronos-actions";

const ASSET_CLASSES = [
  { value: "EQUITY", label: "Equity" },
  { value: "CRYPTO", label: "Crypto" },
  { value: "FX", label: "FX" },
  { value: "COMMODITY", label: "Commodity" },
  { value: "INDEX", label: "Index" },
] as const;

const schema = z.object({
  symbol: z.string().min(1, "Symbol is required"),
  name: z.string().min(1, "Name is required"),
  assetClass: z.enum(["EQUITY", "CRYPTO", "FX", "COMMODITY", "INDEX"]),
  currency: z.string().length(3, "Use a 3-letter code"),
  bars: z.string(),
});
type Form = z.infer<typeof schema>;

const EMPTY: Form = {
  symbol: "",
  name: "",
  assetClass: "EQUITY",
  currency: "USD",
  bars: "400",
};

export function AddInstrumentDialog() {
  const [open, setOpen] = useState(false);
  const [pending, startT] = useTransition();
  const router = useRouter();
  const form = useForm<Form>({ resolver: zodResolver(schema), defaultValues: EMPTY });

  function onSubmit(v: Form) {
    startT(async () => {
      const r = await createInstrument({
        symbol: v.symbol,
        name: v.name,
        assetClass: v.assetClass,
        currency: v.currency,
        bars: Number(v.bars),
      });
      if (r.ok) {
        toast.success(`${v.symbol.toUpperCase()} added and price history synced`);
        setOpen(false);
        form.reset(EMPTY);
        router.refresh();
      } else {
        toast.error(r.error);
      }
    });
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>
          <Plus className="h-4 w-4" /> Add instrument
        </Button>
      </DialogTrigger>
      <DialogContent>
        <form onSubmit={form.handleSubmit(onSubmit)}>
          <DialogHeader>
            <DialogTitle>Add instrument</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label>Symbol</Label>
                <Input {...form.register("symbol")} placeholder="AAPL" autoFocus className="uppercase" />
                {form.formState.errors.symbol ? (
                  <p className="text-xs text-destructive">{form.formState.errors.symbol.message}</p>
                ) : null}
              </div>
              <div className="space-y-2">
                <Label>Name</Label>
                <Input {...form.register("name")} placeholder="Apple Inc." />
              </div>
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div className="space-y-2">
                <Label>Asset class</Label>
                <Select
                  value={form.watch("assetClass")}
                  onValueChange={(v) => form.setValue("assetClass", v as Form["assetClass"])}
                >
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {ASSET_CLASSES.map((a) => (
                      <SelectItem key={a.value} value={a.value}>{a.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Currency</Label>
                <Input {...form.register("currency")} className="uppercase" />
              </div>
              <div className="space-y-2">
                <Label>Bars to load</Label>
                <Input {...form.register("bars")} inputMode="numeric" />
              </div>
            </div>
            <p className="text-xs text-muted-foreground">
              Price history is pulled from the configured market-data provider as soon as the
              instrument is created.
            </p>
          </div>
          <DialogFooter>
            <Button type="button" variant="ghost" onClick={() => setOpen(false)} disabled={pending}>
              Cancel
            </Button>
            <Button type="submit" disabled={pending}>{pending ? "Syncing…" : "Add"}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export function SyncButton({ instrumentId, label }: { instrumentId: string; label?: string }) {
  const [pending, startT] = useTransition();
  const router = useRouter();

  return (
    <Button
      variant="outline"
      size={label ? "default" : "sm"}
      disabled={pending}
      onClick={() =>
        startT(async () => {
          const r = await syncCandles(instrumentId);
          if (r.ok) {
            toast.success(
              r.data?.inserted ? `${r.data.inserted} new bars` : "Already up to date",
            );
            router.refresh();
          } else {
            toast.error(r.error);
          }
        })
      }
    >
      <RefreshCw className={pending ? "h-4 w-4 animate-spin" : "h-4 w-4"} />
      {label ?? ""}
    </Button>
  );
}

export function AnalyseButton({ instrumentId }: { instrumentId: string }) {
  const [pending, startT] = useTransition();
  const router = useRouter();

  return (
    <Button
      disabled={pending}
      onClick={() =>
        startT(async () => {
          const r = await generateAnalysis(instrumentId);
          if (r.ok) {
            toast.success("Analysis generated");
            router.refresh();
          } else {
            toast.error(r.error);
          }
        })
      }
    >
      <Sparkles className="h-4 w-4" />
      {pending ? "Analysing…" : "Analyse"}
    </Button>
  );
}

export function DeleteInstrumentButton({ id, symbol }: { id: string; symbol: string }) {
  const [open, setOpen] = useState(false);
  const router = useRouter();

  return (
    <>
      <Button variant="ghost" size="sm" onClick={() => setOpen(true)} aria-label={`Delete ${symbol}`}>
        <Trash2 className="h-4 w-4" />
      </Button>
      <ConfirmDialog
        open={open}
        onOpenChange={setOpen}
        title={`Remove ${symbol}?`}
        description="This deletes its price history, signals, backtests, and any positions referencing it."
        confirmLabel="Remove"
        cancelLabel="Cancel"
        destructive
        onConfirm={async () => {
          const r = await deleteInstrument(id);
          if (r.ok) {
            toast.success(`${symbol} removed`);
            router.refresh();
          } else {
            toast.error(r.error);
          }
        }}
      />
    </>
  );
}
