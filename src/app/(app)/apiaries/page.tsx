import Link from "next/link";
import { MapPin } from "lucide-react";

import { listApiaries } from "@/server/kronos";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { CreateApiaryDialog, DeleteApiaryButton } from "./apiary-dialogs";

export const dynamic = "force-dynamic";

export default async function ApiariesPage() {
  const apiaries = await listApiaries();

  return (
    <div className="space-y-6">
      <header className="flex items-center justify-between">
        <div>
          <h1 className="font-serif text-3xl">Apiaries</h1>
          <p className="text-sm text-muted-foreground">
            The sites where your colonies live.
          </p>
        </div>
        <CreateApiaryDialog />
      </header>

      <Card>
        <CardHeader>
          <CardTitle>All apiaries ({apiaries.length})</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {apiaries.length === 0 ? (
            <p className="p-6 text-sm text-muted-foreground">
              No apiaries yet. Create one to start adding hives.
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Location</TableHead>
                  <TableHead className="text-right">Hives</TableHead>
                  <TableHead className="text-right">Active</TableHead>
                  <TableHead className="w-16" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {apiaries.map((a) => (
                  <TableRow key={a.id}>
                    <TableCell className="font-medium">
                      <Link href={`/apiaries/${a.id}`} className="hover:underline">
                        {a.name}
                      </Link>
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {a.location ? (
                        <span className="inline-flex items-center gap-1.5">
                          <MapPin className="h-3.5 w-3.5" />
                          {a.location}
                        </span>
                      ) : (
                        "—"
                      )}
                    </TableCell>
                    <TableCell className="text-right">{a.hiveCount}</TableCell>
                    <TableCell className="text-right">
                      <Badge variant={a.activeCount > 0 ? "accent" : "outline"}>{a.activeCount}</Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <DeleteApiaryButton id={a.id} name={a.name} />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
