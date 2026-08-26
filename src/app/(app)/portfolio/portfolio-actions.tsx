"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import { Plus, Wallet, X } from "lucide-react";

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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cancelOrder, createAccount, placeOrder } from "@/server/kronos-actions";

// ---------------------------------------------------------------------------
// Open account
// ---------------------------------------------------------------------------

const accountSchema = z.object({
  name: z.string().min(1, "Name is required"),
  currency: z.string().length(3),
  startingCash: z.string(),
});
type AccountForm = z.infer<typeof accountSchema>;

export function OpenAccountDialog() {
  const [open, setOpen] = useState(false);
  const [pending, startT] = useTransition();
  const router = useRouter();
  const empty: AccountForm = { name: "", currency: "USD", startingCash: "100000" };
  const form = useForm<AccountForm>({ resolver: zodResolver(accountSchema), defaultValues: empty });

  function onSubmit(v: AccountForm) {
    startT(async () => {
      const r = await createAccount({
        name: v.name,
        currency: v.currency,
        startingCash: Number(v.startingCash),
      });
      if (r.ok) {
        toast.success(`Account "${v.name}" opened`);
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
          <Wallet className="h-4 w-4" /> Open account
        </Button>
      </DialogTrigger>
      <DialogContent>
        <form onSubmit={form.handleSubmit(onSubmit)}>
          <DialogHeader>
            <DialogTitle>Open paper account</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Name</Label>
              <Input {...form.register("name")} placeholder="Momentum book" autoFocus />
              {form.formState.errors.name ? (
                <p className="text-xs text-destructive">{form.formState.errors.name.message}</p>
              ) : null}
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label>Currency</Label>
                <Input {...form.register("currency")} className="uppercase" />
              </div>
              <div className="space-y-2">
                <Label>Starting cash</Label>
                <Input {...form.register("startingCash")} inputMode="numeric" />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="ghost" onClick={() => setOpen(false)} disabled={pending}>
              Cancel
            </Button>
            <Button type="submit" disabled={pending}>{pending ? "Opening…" : "Open"}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

// ---------------------------------------------------------------------------
// Place order
// ---------------------------------------------------------------------------

const orderSchema = z.object({
  accountId: z.string().min(1),
  instrumentId: z.string().min(1),
  side: z.enum(["BUY", "SELL"]),
  type: z.enum(["MARKET", "LIMIT"]),
  quantity: z.string().min(1, "Quantity is required"),
  limitPrice: z.string().optional(),
});
type OrderForm = z.infer<typeof orderSchema>;

export function PlaceOrderDialog({
  accounts,
  instruments,
}: {
  accounts: { id: string; name: string }[];
  instruments: { id: string; symbol: string; lastClose: number | null }[];
}) {
  const [open, setOpen] = useState(false);
  const [pending, startT] = useTransition();
  const router = useRouter();

  const empty: OrderForm = {
    accountId: accounts[0]?.id ?? "",
    instrumentId: instruments[0]?.id ?? "",
    side: "BUY",
    type: "MARKET",
    quantity: "100",
    limitPrice: "",
  };
  const form = useForm<OrderForm>({ resolver: zodResolver(orderSchema), defaultValues: empty });

  if (accounts.length === 0 || instruments.length === 0) {
    return (
      <Button asChild variant="outline">
        <a href={instruments.length === 0 ? "/instruments" : "#"}>
          {instruments.length === 0 ? "Add an instrument first" : "Open an account first"}
        </a>
      </Button>
    );
  }

  const type = form.watch("type");
  const selected = instruments.find((i) => i.id === form.watch("instrumentId"));

  function onSubmit(v: OrderForm) {
    startT(async () => {
      const r = await placeOrder({
        accountId: v.accountId,
        instrumentId: v.instrumentId,
        side: v.side,
        type: v.type,
        quantity: Number(v.quantity),
        limitPrice: v.limitPrice ? Number(v.limitPrice) : null,
      });
      if (r.ok) {
        const status = r.data?.status;
        if (status === "FILLED") toast.success("Order filled");
        else if (status === "PENDING") toast.info("Order resting — limit not reached");
        else toast.warning("Order rejected — check the order list for why");
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
        <Button>
          <Plus className="h-4 w-4" /> Place order
        </Button>
      </DialogTrigger>
      <DialogContent>
        <form onSubmit={form.handleSubmit(onSubmit)}>
          <DialogHeader>
            <DialogTitle>Place paper order</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label>Account</Label>
                <Select
                  value={form.watch("accountId")}
                  onValueChange={(v) => form.setValue("accountId", v)}
                >
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {accounts.map((a) => (
                      <SelectItem key={a.id} value={a.id}>{a.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Instrument</Label>
                <Select
                  value={form.watch("instrumentId")}
                  onValueChange={(v) => form.setValue("instrumentId", v)}
                >
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {instruments.map((i) => (
                      <SelectItem key={i.id} value={i.id}>{i.symbol}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-3">
              <div className="space-y-2">
                <Label>Side</Label>
                <Select
                  value={form.watch("side")}
                  onValueChange={(v) => form.setValue("side", v as "BUY" | "SELL")}
                >
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="BUY">Buy</SelectItem>
                    <SelectItem value="SELL">Sell</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Type</Label>
                <Select
                  value={type}
                  onValueChange={(v) => form.setValue("type", v as "MARKET" | "LIMIT")}
                >
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="MARKET">Market</SelectItem>
                    <SelectItem value="LIMIT">Limit</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Quantity</Label>
                <Input {...form.register("quantity")} inputMode="decimal" />
              </div>
            </div>

            {type === "LIMIT" ? (
              <div className="space-y-2">
                <Label>Limit price</Label>
                <Input {...form.register("limitPrice")} inputMode="decimal" />
                <p className="text-xs text-muted-foreground">
                  Fills only if the last close is already at or through this price; otherwise the
                  order rests.
                </p>
              </div>
            ) : null}

            <p className="text-xs text-muted-foreground">
              {selected?.lastClose != null
                ? `Last close for ${selected.symbol} is ${selected.lastClose}. Market orders fill there with 2 bps slippage against you, plus 5 bps commission.`
                : "This instrument has no price history yet — sync it before trading."}
            </p>
          </div>
          <DialogFooter>
            <Button type="button" variant="ghost" onClick={() => setOpen(false)} disabled={pending}>
              Cancel
            </Button>
            <Button type="submit" disabled={pending}>{pending ? "Placing…" : "Place order"}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export function CancelOrderButton({ id }: { id: string }) {
  const [pending, startT] = useTransition();
  const router = useRouter();

  return (
    <Button
      variant="ghost"
      size="sm"
      disabled={pending}
      aria-label="Cancel order"
      onClick={() =>
        startT(async () => {
          const r = await cancelOrder(id);
          if (r.ok) {
            toast.success("Order cancelled");
            router.refresh();
          } else {
            toast.error(r.error);
          }
        })
      }
    >
      <X className="h-4 w-4" />
    </Button>
  );
}
