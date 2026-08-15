"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { updateGeneralSettings } from "@/app/(app)/settings/actions";

const schema = z.object({
  appName: z.string().min(1),
  defaultLocale: z.enum(["en", "id"]),
});
type Form = z.infer<typeof schema>;

export function GeneralSettingsForm({ initial }: { initial: Form }) {
  const [pending, startT] = useTransition();
  const router = useRouter();
  const form = useForm<Form>({ resolver: zodResolver(schema), defaultValues: initial });

  function onSubmit(v: Form) {
    startT(async () => {
      const r = await updateGeneralSettings(v);
      if (r.ok) {
        toast.success("Settings saved");
        router.refresh();
      } else toast.error(r.error);
    });
  }

  return (
    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
      <div className="space-y-2">
        <Label>App name</Label>
        <Input {...form.register("appName")} />
      </div>
      <div className="space-y-2">
        <Label>Default language</Label>
        <Select
          defaultValue={initial.defaultLocale}
          onValueChange={(v) => form.setValue("defaultLocale", v as "en" | "id")}
        >
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="en">English</SelectItem>
            <SelectItem value="id">Bahasa Indonesia</SelectItem>
          </SelectContent>
        </Select>
      </div>
      <Button type="submit" disabled={pending}>{pending ? "Saving…" : "Save"}</Button>
    </form>
  );
}
