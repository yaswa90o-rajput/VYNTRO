// Marks prepaid orders paid ONLY after a verified gateway webhook. Disabled until PAYMENTS_ENABLED=true.
// Untested: verify against Razorpay's current docs in test mode before going live.
import crypto from "node:crypto";
import { createClient } from "@supabase/supabase-js";
const sb = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
export default async (req) => {
  if (process.env.PAYMENTS_ENABLED !== "true") return new Response("Payments disabled", { status: 503 });
  const raw = await req.text();
  const sig = Buffer.from(req.headers.get("x-razorpay-signature") || "");
  const exp = Buffer.from(crypto.createHmac("sha256", process.env.RAZORPAY_WEBHOOK_SECRET || "x").update(raw).digest("hex"));
  if (sig.length !== exp.length || !crypto.timingSafeEqual(sig, exp)) return new Response("Bad signature", { status: 400 });
  const ev = JSON.parse(raw);
  if (ev.event === "payment.captured") {
    const p = ev.payload.payment.entity, id = p.notes?.order_id;
    const { data: o } = await sb.from("orders").select("id,total,pay_status").eq("public_id", id).eq("pay_method", "prepaid").maybeSingle();
    if (o && o.pay_status === "pending" && o.total * 100 === p.amount)
      await sb.from("orders").update({ pay_status: "paid", pay_ref: p.id, status: "Payment Confirmed" }).eq("id", o.id);
  }
  return new Response("ok");
};
