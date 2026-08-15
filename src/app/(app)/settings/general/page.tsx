import { prisma } from "@/server/prisma";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { GeneralSettingsForm } from "@/app/(app)/settings/general/general-form";

export const dynamic = "force-dynamic";

export default async function GeneralSettingsPage() {
  const setting = await prisma.setting.findUnique({ where: { id: "singleton" } });
  return (
    <Card>
      <CardHeader><CardTitle>General</CardTitle></CardHeader>
      <CardContent>
        <GeneralSettingsForm
          initial={{
            appName: setting?.appName ?? "Kronos",
            defaultLocale: (setting?.defaultLocale as "en" | "id") ?? "en",
          }}
        />
      </CardContent>
    </Card>
  );
}
