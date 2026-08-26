"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Check, Copy, Eye, EyeOff, KeyRound, Save } from "lucide-react";

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
import { Switch } from "@/components/ui/switch";
import { ConfirmDialog } from "@/components/shared/confirm-dialog";
import { rotateWebhookSecret, updateWebhookEndpoint } from "@/server/kronos-actions";

const NO_ACCOUNT = "__none__";

/**
 * Copy-to-clipboard that degrades honestly.
 *
 * `navigator.clipboard` is unavailable over plain HTTP on anything but
 * localhost, and some browsers deny it outright. Rather than failing silently,
 * say so — the text is on screen and selectable either way.
 */
export function CopyButton({
  value,
  label = "Copy",
  className,
}: {
  value: string;
  label?: string;
  className?: string;
}) {
  const [copied, setCopied] = useState(false);

  async function copy() {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      toast.error("Clipboard is blocked here — select the text and copy manually");
    }
  }

  return (
    <Button type="button" variant="outline" size="sm" className={className} onClick={copy}>
      {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
      {copied ? "Copied" : label}
    </Button>
  );
}

export function SecretField({ secret }: { secret: string }) {
  const [shown, setShown] = useState(false);
  return (
    <div className="flex items-center gap-2">
      <code className="flex-1 truncate rounded-md border bg-muted/40 px-3 py-2 font-mono text-xs">
        {shown ? secret : "•".repeat(secret.length)}
      </code>
      <Button type="button" variant="ghost" size="sm" onClick={() => setShown((s) => !s)}>
        {shown ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
        {shown ? "Hide" : "Show"}
      </Button>
      <CopyButton value={secret} />
    </div>
  );
}

export function RotateSecretButton() {
  const [open, setOpen] = useState(false);
  const [pending, startT] = useTransition();
  const router = useRouter();
  return (
    <>
      <Button variant="outline" size="sm" disabled={pending} onClick={() => setOpen(true)}>
        <KeyRound className="h-4 w-4" /> Rotate secret
      </Button>
      <ConfirmDialog
        open={open}
        onOpenChange={setOpen}
        title="Rotate the webhook secret?"
        description="Every Pine script already pasted into TradingView stops working immediately. You will need to re-copy the script into each alert."
        confirmLabel="Rotate"
        cancelLabel="Cancel"
        destructive
        onConfirm={() =>
          startT(async () => {
            const r = await rotateWebhookSecret();
            if (r.ok) {
              toast.success("Secret rotated — re-copy your Pine scripts");
              setOpen(false);
              router.refresh();
            } else {
              toast.error(r.error);
            }
          })
        }
      />
    </>
  );
}

export function EndpointSettings({
  accounts,
  initial,
}: {
  accounts: { id: string; name: string }[];
  initial: {
    accountId: string | null;
    enabled: boolean;
    notionalPerTrade: number;
    slippageBps: number;
    commissionBps: number;
  };
}) {
  const [accountId, setAccountId] = useState(initial.accountId ?? NO_ACCOUNT);
  const [enabled, setEnabled] = useState(initial.enabled);
  const [notional, setNotional] = useState(String(initial.notionalPerTrade));
  const [slippage, setSlippage] = useState(String(initial.slippageBps));
  const [commission, setCommission] = useState(String(initial.commissionBps));
  const [pending, startT] = useTransition();
  const router = useRouter();

  function save() {
    startT(async () => {
      const r = await updateWebhookEndpoint({
        accountId: accountId === NO_ACCOUNT ? null : accountId,
        enabled,
        notionalPerTrade: Number(notional),
        slippageBps: Number(slippage),
        commissionBps: Number(commission),
      });
      if (r.ok) {
        toast.success("Endpoint updated");
        router.refresh();
      } else {
        toast.error(r.error);
      }
    });
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between rounded-md border p-3">
        <div>
          <Label htmlFor="tv-enabled">Accept alerts</Label>
          <p className="text-xs text-muted-foreground">
            Turn this off to stop trading without deleting your TradingView alerts.
          </p>
        </div>
        <Switch id="tv-enabled" checked={enabled} onCheckedChange={setEnabled} />
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label>Paper account</Label>
          <Select value={accountId} onValueChange={setAccountId}>
            <SelectTrigger><SelectValue placeholder="Pick an account" /></SelectTrigger>
            <SelectContent>
              <SelectItem value={NO_ACCOUNT}>None — reject alerts</SelectItem>
              {accounts.map((a) => (
                <SelectItem key={a.id} value={a.id}>{a.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label htmlFor="tv-notional">Notional per signal</Label>
          <Input
            id="tv-notional"
            value={notional}
            onChange={(e) => setNotional(e.target.value)}
            inputMode="decimal"
          />
          <p className="text-xs text-muted-foreground">
            Quantity is this divided by the last close.
          </p>
        </div>

        <div className="space-y-2">
          <Label htmlFor="tv-slippage">Slippage (bps)</Label>
          <Input
            id="tv-slippage"
            value={slippage}
            onChange={(e) => setSlippage(e.target.value)}
            inputMode="decimal"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="tv-commission">Commission (bps)</Label>
          <Input
            id="tv-commission"
            value={commission}
            onChange={(e) => setCommission(e.target.value)}
            inputMode="decimal"
          />
        </div>
      </div>

      <Button onClick={save} disabled={pending}>
        <Save className="h-4 w-4" /> {pending ? "Saving…" : "Save"}
      </Button>
    </div>
  );
}

export function PineScriptBlock({
  scripts,
}: {
  scripts: { id: string; name: string; kind: string; script: string }[];
}) {
  const [selected, setSelected] = useState(scripts[0]?.id ?? "");
  const current = scripts.find((s) => s.id === selected) ?? scripts[0];

  if (!current) {
    return (
      <p className="text-sm text-muted-foreground">
        No strategies yet. Create one on the Backtests page, validate it, then come back for its
        Pine script.
      </p>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-2">
        <Select value={current.id} onValueChange={setSelected}>
          <SelectTrigger className="w-72"><SelectValue /></SelectTrigger>
          <SelectContent>
            {scripts.map((s) => (
              <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <CopyButton value={current.script} label="Copy script" />
      </div>
      <pre className="max-h-96 overflow-auto rounded-md border bg-muted/40 p-4 font-mono text-xs leading-relaxed">
        {current.script}
      </pre>
    </div>
  );
}
