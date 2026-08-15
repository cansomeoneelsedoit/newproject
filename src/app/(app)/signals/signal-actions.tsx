"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import { Plus, RefreshCw, Trash2 } from "lucide-react";

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
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ConfirmDialog } from "@/components/shared/confirm-dialog";
import { createStrategy, deleteStrategy, refreshSignals } from "@/server/kronos-actions";

const KINDS = [
  { value: "SMA_CROSSOVER", label: "SMA crossover" },
  { value: "RSI_REVERSION", label: "RSI mean reversion" },
  { value: "DONCHIAN_BREAKOUT", label: "Donchian breakout" },
  { value: "MACD_TREND", label: "MACD trend" },
] as const;

type Kind = (typeof KINDS)[number]["value"];

/** Per-kind numeric parameters, so the form only asks what the strategy reads. */
const FIELDS: Record<Kind, { key: string; label: string; def: string }[]> = {
  SMA_CROSSOVER: [
    { key: "fast", label: "Fast period", def: "20" },
    { key: "slow", label: "Slow period", def: "50" },
  ],
  RSI_REVERSION: [
    { key: "period", label: "RSI period", def: "14" },
    { key: "oversold", label: "Oversold", def: "30" },
    { key: "overbought", label: "Overbought", def: "70" },
  ],
  DONCHIAN_BREAKOUT: [
    { key: "entryPeriod", label: "Entry period", def: "20" },
    { key: "exitPeriod", label: "Exit period", def: "10" },
  ],
  MACD_TREND: [
    { key: "fast", label: "Fast", def: "12" },
    { key: "slow", label: "Slow", def: "26" },
    { key: "signal", label: "Signal", def: "9" },
  ],
};

const schema = z.object({
  name: z.string().min(1, "Name is required"),
  kind: z.enum(["SMA_CROSSOVER", "RSI_REVERSION", "DONCHIAN_BREAKOUT", "MACD_TREND"]),
  allowShort: z.boolean(),
  notes: z.string().optional(),
  p0: z.string().optional(),
  p1: z.string().optional(),
  p2: z.string().optional(),
});
type Form = z.infer<typeof schema>;

export function CreateStrategyDialog() {
  const [open, setOpen] = useState(false);
  const [pending, startT] = useTransition();
  const router = useRouter();

  const form = useForm<Form>({
    resolver: zodResolver(schema),
    defaultValues: {
      name: "",
      kind: "SMA_CROSSOVER",
      allowShort: false,
      notes: "",
      p0: "20",
      p1: "50",
      p2: "",
    },
  });

  const kind = form.watch("kind") as Kind;
  const fields = FIELDS[kind];

  function selectKind(next: Kind) {
    form.setValue("kind", next);
    // Reset the parameter inputs to that kind's defaults, so switching kinds
    // never leaves a stale value from the previous one.
    const defs = FIELDS[next];
    form.setValue("p0", defs[0]?.def ?? "");
    form.setValue("p1", defs[1]?.def ?? "");
    form.setValue("p2", defs[2]?.def ?? "");
  }

  function onSubmit(v: Form) {
    const params: Record<string, unknown> = { allowShort: v.allowShort };
    const values = [v.p0, v.p1, v.p2];
    fields.forEach((f, i) => {
      const raw = values[i];
      if (raw !== undefined && raw !== "") params[f.key] = Number(raw);
    });

    startT(async () => {
      const r = await createStrategy({
        name: v.name,
        kind: v.kind,
        params,
        notes: v.notes ?? "",
      });
      if (r.ok) {
        toast.success(`Strategy "${v.name}" created`);
        setOpen(false);
        form.reset();
        router.refresh();
      } else {
        toast.error(r.error);
      }
    });
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline">
          <Plus className="h-4 w-4" /> New strategy
        </Button>
      </DialogTrigger>
      <DialogContent>
        <form onSubmit={form.handleSubmit(onSubmit)}>
          <DialogHeader>
            <DialogTitle>New strategy</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Name</Label>
              <Input {...form.register("name")} placeholder="Fast trend 20/50" autoFocus />
              {form.formState.errors.name ? (
                <p className="text-xs text-destructive">{form.formState.errors.name.message}</p>
              ) : null}
            </div>
            <div className="space-y-2">
              <Label>Kind</Label>
              <Select value={kind} onValueChange={(v) => selectKind(v as Kind)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {KINDS.map((k) => (
                    <SelectItem key={k.value} value={k.value}>{k.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-3 gap-3">
              {fields.map((f, i) => (
                <div key={f.key} className="space-y-2">
                  <Label>{f.label}</Label>
                  <Input
                    {...form.register((["p0", "p1", "p2"] as const)[i])}
                    inputMode="numeric"
                  />
                </div>
              ))}
            </div>
            <label className="flex items-center gap-2 rounded-md border p-3 text-sm">
              <Switch
                checked={form.watch("allowShort")}
                onCheckedChange={(v) => form.setValue("allowShort", v)}
              />
              Allow short positions
            </label>
            <div className="space-y-2">
              <Label>Notes</Label>
              <Textarea {...form.register("notes")} rows={2} />
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="ghost" onClick={() => setOpen(false)} disabled={pending}>
              Cancel
            </Button>
            <Button type="submit" disabled={pending}>{pending ? "Saving…" : "Create"}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export function RefreshSignalsButton() {
  const [pending, startT] = useTransition();
  const router = useRouter();

  return (
    <Button
      disabled={pending}
      onClick={() =>
        startT(async () => {
          const r = await refreshSignals();
          if (r.ok) {
            toast.success(
              r.data?.written ? `${r.data.written} signals recorded` : "No new signals",
            );
            router.refresh();
          } else {
            toast.error(r.error);
          }
        })
      }
    >
      <RefreshCw className={pending ? "h-4 w-4 animate-spin" : "h-4 w-4"} />
      Record signals
    </Button>
  );
}

export function DeleteStrategyButton({ id, name }: { id: string; name: string }) {
  const [open, setOpen] = useState(false);
  const router = useRouter();

  return (
    <>
      <Button variant="ghost" size="sm" onClick={() => setOpen(true)} aria-label={`Delete ${name}`}>
        <Trash2 className="h-4 w-4" />
      </Button>
      <ConfirmDialog
        open={open}
        onOpenChange={setOpen}
        title={`Delete "${name}"?`}
        description="Its recorded signals and backtests go with it."
        confirmLabel="Delete"
        cancelLabel="Cancel"
        destructive
        onConfirm={async () => {
          const r = await deleteStrategy(id);
          if (r.ok) {
            toast.success("Strategy deleted");
            router.refresh();
          } else {
            toast.error(r.error);
          }
        }}
      />
    </>
  );
}
