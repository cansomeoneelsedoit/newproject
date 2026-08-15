"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import { Plus, Trash2 } from "lucide-react";

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
import { ConfirmDialog } from "@/components/shared/confirm-dialog";
import { createApiary, deleteApiary } from "@/server/kronos-actions";

const schema = z.object({
  name: z.string().min(1, "Give the apiary a name"),
  location: z.string().optional(),
  // Coordinates are optional; blank strings become undefined rather than NaN.
  latitude: z.string().optional(),
  longitude: z.string().optional(),
  notes: z.string().optional(),
});
type Form = z.infer<typeof schema>;

const EMPTY: Form = { name: "", location: "", latitude: "", longitude: "", notes: "" };

export function CreateApiaryDialog() {
  const [open, setOpen] = useState(false);
  const [pending, startT] = useTransition();
  const router = useRouter();
  const form = useForm<Form>({ resolver: zodResolver(schema), defaultValues: EMPTY });

  function onSubmit(v: Form) {
    startT(async () => {
      const r = await createApiary({
        name: v.name,
        location: v.location ?? "",
        latitude: v.latitude ? Number(v.latitude) : null,
        longitude: v.longitude ? Number(v.longitude) : null,
        notes: v.notes ?? "",
      });
      if (r.ok) {
        toast.success(`Apiary "${v.name}" created`);
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
          <Plus className="h-4 w-4" /> New apiary
        </Button>
      </DialogTrigger>
      <DialogContent>
        <form onSubmit={form.handleSubmit(onSubmit)}>
          <DialogHeader>
            <DialogTitle>New apiary</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Name</Label>
              <Input {...form.register("name")} placeholder="Home Orchard" autoFocus />
              {form.formState.errors.name ? (
                <p className="text-xs text-destructive">{form.formState.errors.name.message}</p>
              ) : null}
            </div>
            <div className="space-y-2">
              <Label>Location</Label>
              <Input {...form.register("location")} placeholder="North paddock, behind the windbreak" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label>Latitude</Label>
                <Input {...form.register("latitude")} placeholder="-34.9285" inputMode="decimal" />
              </div>
              <div className="space-y-2">
                <Label>Longitude</Label>
                <Input {...form.register("longitude")} placeholder="138.6007" inputMode="decimal" />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Notes</Label>
              <Textarea {...form.register("notes")} rows={3} placeholder="Forage, access, landowner contact…" />
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

export function DeleteApiaryButton({ id, name }: { id: string; name: string }) {
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
        description="The apiary must be empty first. This cannot be undone."
        confirmLabel="Delete"
        cancelLabel="Cancel"
        destructive
        onConfirm={async () => {
          const r = await deleteApiary(id);
          if (r.ok) {
            toast.success("Apiary deleted");
            router.refresh();
          } else {
            toast.error(r.error);
          }
        }}
      />
    </>
  );
}
