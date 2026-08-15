"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import { Plus } from "lucide-react";

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
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { createHive } from "@/server/kronos-actions";

const HIVE_TYPES = [
  { value: "LANGSTROTH", label: "Langstroth" },
  { value: "NATIONAL", label: "National" },
  { value: "WARRE", label: "Warré" },
  { value: "TOP_BAR", label: "Top bar" },
  { value: "NUC", label: "Nuc" },
] as const;

const schema = z.object({
  name: z.string().min(1, "Give the hive a name"),
  apiaryId: z.string().min(1, "Pick an apiary"),
  type: z.enum(["LANGSTROTH", "NATIONAL", "WARRE", "TOP_BAR", "NUC"]),
  queenYear: z.string().optional(),
  queenSource: z.string().optional(),
  notes: z.string().optional(),
});
type Form = z.infer<typeof schema>;

export function CreateHiveDialog({
  apiaries,
  defaultApiaryId,
}: {
  apiaries: { id: string; name: string }[];
  defaultApiaryId?: string;
}) {
  const [open, setOpen] = useState(false);
  const [pending, startT] = useTransition();
  const router = useRouter();

  const empty: Form = {
    name: "",
    apiaryId: defaultApiaryId ?? apiaries[0]?.id ?? "",
    type: "LANGSTROTH",
    queenYear: String(new Date().getFullYear()),
    queenSource: "",
    notes: "",
  };
  const form = useForm<Form>({ resolver: zodResolver(schema), defaultValues: empty });

  function onSubmit(v: Form) {
    startT(async () => {
      const r = await createHive({
        name: v.name,
        apiaryId: v.apiaryId,
        type: v.type,
        status: "ACTIVE",
        queenYear: v.queenYear ? Number(v.queenYear) : null,
        queenSource: v.queenSource ?? "",
        notes: v.notes ?? "",
      });
      if (r.ok) {
        toast.success(`Hive "${v.name}" added`);
        setOpen(false);
        form.reset(empty);
        router.refresh();
      } else {
        toast.error(r.error);
      }
    });
  }

  // Without an apiary there is nowhere to put a hive; point the user at the
  // step they need rather than opening a form that cannot be submitted.
  if (apiaries.length === 0) {
    return (
      <Button asChild variant="outline">
        <Link href="/apiaries">Create an apiary first</Link>
      </Button>
    );
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>
          <Plus className="h-4 w-4" /> Add hive
        </Button>
      </DialogTrigger>
      <DialogContent>
        <form onSubmit={form.handleSubmit(onSubmit)}>
          <DialogHeader>
            <DialogTitle>Add hive</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label>Name</Label>
                <Input {...form.register("name")} placeholder="H-12" autoFocus />
                {form.formState.errors.name ? (
                  <p className="text-xs text-destructive">{form.formState.errors.name.message}</p>
                ) : null}
              </div>
              <div className="space-y-2">
                <Label>Apiary</Label>
                <Select
                  value={form.watch("apiaryId")}
                  onValueChange={(v) => form.setValue("apiaryId", v)}
                >
                  <SelectTrigger><SelectValue placeholder="Pick one" /></SelectTrigger>
                  <SelectContent>
                    {apiaries.map((a) => (
                      <SelectItem key={a.id} value={a.id}>{a.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div className="space-y-2">
                <Label>Type</Label>
                <Select
                  value={form.watch("type")}
                  onValueChange={(v) => form.setValue("type", v as Form["type"])}
                >
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {HIVE_TYPES.map((t) => (
                      <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Queen year</Label>
                <Input {...form.register("queenYear")} inputMode="numeric" placeholder="2026" />
              </div>
              <div className="space-y-2">
                <Label>Queen source</Label>
                <Input {...form.register("queenSource")} placeholder="Split / breeder" />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Notes</Label>
              <Textarea {...form.register("notes")} rows={2} />
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="ghost" onClick={() => setOpen(false)} disabled={pending}>
              Cancel
            </Button>
            <Button type="submit" disabled={pending}>{pending ? "Saving…" : "Add hive"}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
