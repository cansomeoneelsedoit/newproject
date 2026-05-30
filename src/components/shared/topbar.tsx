import { getTranslations } from "next-intl/server";
import { signOut } from "@/auth";
import { recentActions } from "@/server/audit";
import { listMyOrgs, getActiveOrgId } from "@/server/org";
import { LangToggle } from "@/components/shared/lang-toggle";
import { ThemeToggle } from "@/components/shared/theme-toggle";
import { AuditHistorySheet } from "@/components/shared/audit-history-sheet";
import { OrgSwitcher } from "@/components/shared/org-switcher";
import { Button } from "@/components/ui/button";

export async function Topbar({ userName }: { userName?: string | null }) {
  const tCommon = await getTranslations("common");
  const [actions, orgs, activeOrgId] = await Promise.all([
    recentActions(50),
    listMyOrgs(),
    getActiveOrgId(),
  ]);

  async function doSignOut() {
    "use server";
    await signOut({ redirectTo: "/signin" });
  }

  return (
    <header className="flex h-14 items-center justify-between border-b bg-background px-4">
      <div className="flex items-center gap-3 text-sm">
        <OrgSwitcher orgs={orgs} activeId={activeOrgId} />
        <span className="text-muted-foreground">{tCommon("welcome")}</span>
        <span className="font-medium">{userName ?? ""}</span>
      </div>
      <div className="flex items-center gap-3 text-xs">
        <LangToggle />
        <ThemeToggle />
        <AuditHistorySheet
          entries={actions.map((a: { id: string; type: string; description: string; createdAt: Date; undone: boolean }) => ({
            id: a.id,
            type: a.type,
            description: a.description,
            createdAt: a.createdAt.toISOString(),
            undone: a.undone,
          }))}
        />
        <form action={doSignOut}>
          <Button size="sm" variant="ghost">
            {tCommon("signOut")}
          </Button>
        </form>
      </div>
    </header>
  );
}
