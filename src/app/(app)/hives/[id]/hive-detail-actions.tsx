"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import { ClipboardCheck, Droplets } from "lucide-react";

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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { ConfirmDialog } from "@/components/shared/confirm-dialog";
import { logInspection, recordHarvest, setHiveStatus } from "@/server/kronos-actions";
import { colonyHealth, varroaVerdict } from "@/lib/kronos";
import { HealthBadge } from "@/components/kronos/health-badge";

/** `<input type="date">` wants YYYY-MM-DD in local time. */
function todayISO(): string {
  const d = new Date();
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

// ---------------------------------------------------------------------------
// Log inspection
// ---------------------------------------------------------------------------

const inspectionSchema = z.object({
  inspectedAt: z.string().min(1),
  temperament: z.enum(["CALM", "NORMAL", "DEFENSIVE", "AGGRESSIVE"]),
  broodPattern: z.enum(["SOLID", "SPOTTY", "NONE"]),
  queenSeen: z.boolean(),
  eggsSeen: z.boolean(),
  queenCells: z.string(),
  framesOfBees: z.string(),
  framesOfBrood: z.string(),
  storesKg: z.string(),
  varroaPer100: z.string().optional(),
  treatment: z.string().optional(),
  notes: z.string().optional(),
});
type InspectionForm = z.infer<typeof inspectionSchema>;

function emptyInspection(): InspectionForm {
  return {
    inspectedAt: todayISO(),
    temperament: "NORMAL",
    broodPattern: "SOLID",
    queenSeen: false,
    eggsSeen: true,
    queenCells: "0",
    framesOfBees: "8",
    framesOfBrood: "4",
    storesKg: "15",
    varroaPer100: "",
    treatment: "",
    notes: "",
  };
}

export function LogInspectionDialog({ hiveId, hiveName }: { hiveId: string; hiveName: string }) {
  const [open, setOpen] = useState(false);
  const [pending, startT] = useTransition();
  const router = useRouter();
  const form = useForm<InspectionForm>({
    resolver: zodResolver(inspectionSchema),
    defaultValues: emptyInspection(),
  });

  const v = form.watch();
  // Live preview of the score the saved inspection will produce, so the
  // beekeeper sees the consequence of what they're recording before saving.
  const preview = colonyHealth({
    queenSeen: v.queenSeen,
    eggsSeen: v.eggsSeen,
    broodPattern: v.broodPattern,
    queenCells: Number(v.queenCells) || 0,
    framesOfBees: Number(v.framesOfBees) || 0,
    framesOfBrood: Number(v.framesOfBrood) || 0,
    storesKg: Number(v.storesKg) || 0,
    varroaPer100: v.varroaPer100 ? Number(v.varroaPer100) : null,
    temperament: v.temperament,
  });

  function onSubmit(values: InspectionForm) {
    startT(async () => {
      const r = await logInspection({
        hiveId,
        inspectedAt: values.inspectedAt,
        temperament: values.temperament,
        broodPattern: values.broodPattern,
        queenSeen: values.queenSeen,
        eggsSeen: values.eggsSeen,
        queenCells: values.queenCells,
        framesOfBees: values.framesOfBees,
        framesOfBrood: values.framesOfBrood,
        storesKg: values.storesKg,
        varroaPer100: values.varroaPer100 ? Number(values.varroaPer100) : null,
        treatment: values.treatment ?? "",
        notes: values.notes ?? "",
      });
      if (r.ok) {
        toast.success(`Inspection logged for ${hiveName}`);
        setOpen(false);
        form.reset(emptyInspection());
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
          <ClipboardCheck className="h-4 w-4" /> Log inspection
        </Button>
      </DialogTrigger>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
        <form onSubmit={form.handleSubmit(onSubmit)}>
          <DialogHeader>
            <DialogTitle>Inspect {hiveName}</DialogTitle>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="grid grid-cols-3 gap-3">
              <div className="space-y-2">
                <Label>Date</Label>
                <Input type="date" {...form.register("inspectedAt")} />
              </div>
              <div className="space-y-2">
                <Label>Temperament</Label>
                <Select
                  value={v.temperament}
                  onValueChange={(x) => form.setValue("temperament", x as InspectionForm["temperament"])}
                >
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="CALM">Calm</SelectItem>
                    <SelectItem value="NORMAL">Normal</SelectItem>
                    <SelectItem value="DEFENSIVE">Defensive</SelectItem>
                    <SelectItem value="AGGRESSIVE">Aggressive</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Brood pattern</Label>
                <Select
                  value={v.broodPattern}
                  onValueChange={(x) => form.setValue("broodPattern", x as InspectionForm["broodPattern"])}
                >
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="SOLID">Solid</SelectItem>
                    <SelectItem value="SPOTTY">Spotty</SelectItem>
                    <SelectItem value="NONE">None</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="flex gap-6 rounded-md border p-3">
              <label className="flex items-center gap-2 text-sm">
                <Switch
                  checked={v.queenSeen}
                  onCheckedChange={(x) => form.setValue("queenSeen", x)}
                />
                Queen seen
              </label>
              <label className="flex items-center gap-2 text-sm">
                <Switch
                  checked={v.eggsSeen}
                  onCheckedChange={(x) => form.setValue("eggsSeen", x)}
                />
                Eggs seen
              </label>
            </div>

            <div className="grid grid-cols-4 gap-3">
              <div className="space-y-2">
                <Label>Frames of bees</Label>
                <Input {...form.register("framesOfBees")} inputMode="numeric" />
              </div>
              <div className="space-y-2">
                <Label>Frames of brood</Label>
                <Input {...form.register("framesOfBrood")} inputMode="numeric" />
              </div>
              <div className="space-y-2">
                <Label>Queen cells</Label>
                <Input {...form.register("queenCells")} inputMode="numeric" />
              </div>
              <div className="space-y-2">
                <Label>Stores (kg)</Label>
                <Input {...form.register("storesKg")} inputMode="decimal" />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label>Varroa / 100 bees</Label>
                <Input {...form.register("varroaPer100")} inputMode="decimal" placeholder="Leave blank if not washed" />
                <p className="text-xs text-muted-foreground">
                  {v.varroaPer100
                    ? `Verdict: ${varroaVerdict(Number(v.varroaPer100))}`
                    : "No wash recorded"}
                </p>
              </div>
              <div className="space-y-2">
                <Label>Treatment applied</Label>
                <Input {...form.register("treatment")} placeholder="e.g. oxalic acid vapour" />
              </div>
            </div>

            <div className="space-y-2">
              <Label>Notes</Label>
              <Textarea {...form.register("notes")} rows={2} />
            </div>

            <div className="flex items-center justify-between rounded-md bg-muted/40 p-3">
              <div className="text-sm">
                <div className="font-medium">Resulting health</div>
                <div className="text-xs text-muted-foreground">
                  {preview.flags.length === 0 ? "No concerns flagged" : preview.flags[0]}
                </div>
              </div>
              <HealthBadge band={preview.band} score={preview.score} />
            </div>
          </div>

          <DialogFooter>
            <Button type="button" variant="ghost" onClick={() => setOpen(false)} disabled={pending}>
              Cancel
            </Button>
            <Button type="submit" disabled={pending}>{pending ? "Saving…" : "Save inspection"}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

// ---------------------------------------------------------------------------
// Record harvest
// ---------------------------------------------------------------------------

const harvestSchema = z.object({
  harvestedAt: z.string().min(1),
  honeyKg: z.string().min(1, "How much honey?"),
  waxKg: z.string().optional(),
  frames: z.string().optional(),
  notes: z.string().optional(),
});
type HarvestForm = z.infer<typeof harvestSchema>;

export function RecordHarvestDialog({ hiveId, hiveName }: { hiveId: string; hiveName: string }) {
  const [open, setOpen] = useState(false);
  const [pending, startT] = useTransition();
  const router = useRouter();
  const empty: HarvestForm = { harvestedAt: todayISO(), honeyKg: "", waxKg: "0", frames: "", notes: "" };
  const form = useForm<HarvestForm>({ resolver: zodResolver(harvestSchema), defaultValues: empty });

  function onSubmit(values: HarvestForm) {
    startT(async () => {
      const r = await recordHarvest({
        hiveId,
        harvestedAt: values.harvestedAt,
        honeyKg: Number(values.honeyKg),
        waxKg: values.waxKg ? Number(values.waxKg) : 0,
        frames: values.frames ? Number(values.frames) : null,
        notes: values.notes ?? "",
      });
      if (r.ok) {
        toast.success(`Harvest recorded for ${hiveName}`);
        setOpen(false);
        form.reset(empty);
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
          <Droplets className="h-4 w-4" /> Record harvest
        </Button>
      </DialogTrigger>
      <DialogContent>
        <form onSubmit={form.handleSubmit(onSubmit)}>
          <DialogHeader>
            <DialogTitle>Harvest from {hiveName}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label>Date</Label>
                <Input type="date" {...form.register("harvestedAt")} />
              </div>
              <div className="space-y-2">
                <Label>Honey (kg)</Label>
                <Input {...form.register("honeyKg")} inputMode="decimal" autoFocus />
                {form.formState.errors.honeyKg ? (
                  <p className="text-xs text-destructive">{form.formState.errors.honeyKg.message}</p>
                ) : null}
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label>Wax (kg)</Label>
                <Input {...form.register("waxKg")} inputMode="decimal" />
              </div>
              <div className="space-y-2">
                <Label>Frames pulled</Label>
                <Input {...form.register("frames")} inputMode="numeric" />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Notes</Label>
              <Textarea {...form.register("notes")} rows={2} placeholder="Flow source, moisture %…" />
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="ghost" onClick={() => setOpen(false)} disabled={pending}>
              Cancel
            </Button>
            <Button type="submit" disabled={pending}>{pending ? "Saving…" : "Save harvest"}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

// ---------------------------------------------------------------------------
// Status control
// ---------------------------------------------------------------------------

const STATUSES = [
  { value: "ACTIVE", label: "Active" },
  { value: "QUEENLESS", label: "Queenless" },
  { value: "SWARMED", label: "Swarmed" },
  { value: "DEAD", label: "Dead" },
  { value: "SOLD", label: "Sold" },
];

export function HiveStatusControl({ hiveId, status }: { hiveId: string; status: string }) {
  const [confirm, setConfirm] = useState<string | null>(null);
  const router = useRouter();

  async function apply(next: string) {
    const r = await setHiveStatus(hiveId, next);
    if (r.ok) {
      toast.success("Status updated");
      router.refresh();
    } else {
      toast.error(r.error);
    }
  }

  return (
    <>
      <Select
        value={status}
        onValueChange={(next) => {
          if (next === status) return;
          // Losing a colony is worth a second look before it disappears from
          // the active roster.
          if (next === "DEAD" || next === "SOLD") setConfirm(next);
          else void apply(next);
        }}
      >
        <SelectTrigger className="w-40"><SelectValue /></SelectTrigger>
        <SelectContent>
          {STATUSES.map((s) => (
            <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>
          ))}
        </SelectContent>
      </Select>
      <ConfirmDialog
        open={confirm !== null}
        onOpenChange={(o) => !o && setConfirm(null)}
        title={confirm === "DEAD" ? "Mark this colony dead?" : "Mark this colony sold?"}
        description="It will drop off the active roster and stop appearing in inspection reminders."
        confirmLabel="Confirm"
        cancelLabel="Cancel"
        destructive={confirm === "DEAD"}
        onConfirm={async () => {
          if (confirm) await apply(confirm);
          setConfirm(null);
        }}
      />
    </>
  );
}

// ---------------------------------------------------------------------------
// Inspection history table (client-side only for the date formatting)
// ---------------------------------------------------------------------------

export type InspectionRow = {
  id: string;
  inspectedAt: string;
  temperament: string;
  broodPattern: string;
  queenSeen: boolean;
  eggsSeen: boolean;
  queenCells: number;
  framesOfBees: number;
  framesOfBrood: number;
  storesKg: number;
  varroaPer100: number | null;
  treatment: string | null;
  notes: string | null;
};

export function InspectionHistory({ rows }: { rows: InspectionRow[] }) {
  if (rows.length === 0) {
    return <p className="p-6 text-sm text-muted-foreground">No inspections recorded yet.</p>;
  }

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Date</TableHead>
          <TableHead>Health</TableHead>
          <TableHead>Queen / eggs</TableHead>
          <TableHead>Brood</TableHead>
          <TableHead className="text-right">Bees</TableHead>
          <TableHead className="text-right">Stores</TableHead>
          <TableHead className="text-right">Varroa</TableHead>
          <TableHead>Notes</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {rows.map((r) => {
          const health = colonyHealth({
            queenSeen: r.queenSeen,
            eggsSeen: r.eggsSeen,
            broodPattern: r.broodPattern as "SOLID" | "SPOTTY" | "NONE",
            queenCells: r.queenCells,
            framesOfBees: r.framesOfBees,
            framesOfBrood: r.framesOfBrood,
            storesKg: r.storesKg,
            varroaPer100: r.varroaPer100,
            temperament: r.temperament as "CALM" | "NORMAL" | "DEFENSIVE" | "AGGRESSIVE",
          });
          return (
            <TableRow key={r.id}>
              <TableCell className="whitespace-nowrap font-medium">
                {new Date(r.inspectedAt).toLocaleDateString()}
              </TableCell>
              <TableCell><HealthBadge band={health.band} score={health.score} /></TableCell>
              <TableCell className="text-xs text-muted-foreground">
                {r.queenSeen ? "Queen seen" : "Not seen"} / {r.eggsSeen ? "eggs" : "no eggs"}
              </TableCell>
              <TableCell className="text-xs text-muted-foreground">{r.broodPattern.toLowerCase()}</TableCell>
              <TableCell className="text-right tabular-nums">{r.framesOfBees}</TableCell>
              <TableCell className="text-right tabular-nums">{r.storesKg} kg</TableCell>
              <TableCell className="text-right tabular-nums">
                {r.varroaPer100 === null ? "—" : r.varroaPer100}
              </TableCell>
              <TableCell className="max-w-[16rem] truncate text-xs text-muted-foreground">
                {r.treatment ? `${r.treatment}. ` : ""}
                {r.notes ?? ""}
              </TableCell>
            </TableRow>
          );
        })}
      </TableBody>
    </Table>
  );
}
