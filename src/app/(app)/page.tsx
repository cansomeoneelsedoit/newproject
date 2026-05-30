import { prisma } from "@/server/prisma";
import { getActiveOrgId } from "@/server/org";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const activeOrgId = await getActiveOrgId();
  const org = activeOrgId
    ? await prisma.organization.findUnique({
        where: { id: activeOrgId },
        select: { name: true },
      })
    : null;

  return (
    <div className="space-y-6">
      <h1 className="font-serif text-3xl">Dashboard</h1>

      <Card>
        <CardHeader>
          <CardTitle>{org?.name ?? "Your organisation"}</CardTitle>
        </CardHeader>
        <CardContent className="p-4 text-sm text-muted-foreground">
          Welcome to your workspace. This is a clean multi-tenant skeleton with
          authentication, organisations, audit logging, and admin user
          management ready to build on.
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Skeleton ready</CardTitle>
        </CardHeader>
        <CardContent className="p-4 text-sm text-muted-foreground">
          Start adding your own features. The app shell, sidebar, settings, and
          multi-org switching are wired up and waiting.
        </CardContent>
      </Card>
    </div>
  );
}
