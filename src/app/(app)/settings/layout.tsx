import Link from "next/link";
import type { ReactNode } from "react";

import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";

export default function SettingsLayout({ children }: { children: ReactNode }) {
  return (
    <div className="space-y-6">
      <h1 className="font-serif text-3xl">Settings</h1>
      <Tabs defaultValue="general">
        <TabsList>
          <TabsTrigger value="general" asChild><Link href="/settings/general">General</Link></TabsTrigger>
        </TabsList>
      </Tabs>
      {children}
    </div>
  );
}
