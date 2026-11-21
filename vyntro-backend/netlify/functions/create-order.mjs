// Server-side order creation: prices come from the database, never from the browser.
import { createClient } from "@supabase/supabase-js";
const sb = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
const hits = new Map();
const j = (o, s = 200) => new Response(JSON.stringify(o), { status: s, headers: { "content-type": "application/json" } });
export default async (req) => {
  if (req.method !== "POST") return j({ error: "Method not allowed" }, 405);
  const ip = req.headers.get("x-nf-client-connection-ip") || "x", now = Date.now();
  const h = (hits.get(ip) || []).filter((t) => now - t < 60000);
  if (h.length >= 5) return j({ error: "Too many requests. Try again in a minute." }, 429);
  hits.set(ip, [...h, now]);
  let b; try { b = await req.json(); } catch { return j({ error: "Invalid request" }, 400); }
  const s = (v, n) => String(v ?? "").trim().slice(0, n);
  const c = { name: s(b.name, 80), email: s(b.email, 100), phone: s(b.phone, 10), address: s(b.address, 250), pincode: s(b.pincode, 6) };
  if (c.name.length < 2 || !/^\S+@\S+\.\S+$/.test(c.email) || !/^[6-9]\d{9}$/.test(c.phone) || c.address.length < 8 || !/^[1-9]\d{5}$/.test(c.pincode)) return j({ error: "Check your details." }, 400);
  if (!["prepaid", "cod"].includes(b.pay_method) || !Array.isArray(b.items) || !b.items.length || b.items.length > 20) return j({ error: "Invalid order." }, 400);
  const ids = b.items.map((i) => s(i.variant_id, 40));
  const { data: vs } = await sb.from("product_variants").select("id,size,colour,stock_mode,stock_qty,active,products(name,price,active)").in("id", ids);
  const { data: st } = await sb.from("store_settings").select("*");
  const cfg = Object.fromEntries((st || []).map((r) => [r.key, r.value]));
  let sub = 0; const rows = [];
  for (const i of b.items) {
    const v = vs?.find((x) => x.id === i.variant_id), q = Math.floor(+i.qty);
    if (!v || !v.active || !v.products?.active || !(q >= 1 && q <= 10)) return j({ error: "An item is unavailable." }, 409);
    if (v.stock_mode === "manual" && v.stock_qty < q) return j({ error: `${v.products.name} is out of stock.` }, 409);
    sub += v.products.price * q;
    rows.push({ variant_id: v.id, name: v.products.name, size: v.size, colour: v.colour, qty: q, unit_price: v.products.price });
  }
  let disc = 0, code = null;
  if (b.coupon) {
    const { data: cp } = await sb.from("coupons").select("*").eq("code", s(b.coupon, 30).toUpperCase()).maybeSingle();
    const ok = cp && cp.active && sub >= cp.min_cart && (!cp.expires_at || new Date(cp.expires_at) > new Date()) && (cp.usage_limit == null || cp.used < cp.usage_limit);
    if (!ok) return j({ error: "Coupon is invalid, expired or the cart is below its minimum." }, 400);
    disc = cp.kind === "fixed" ? cp.amount : Math.floor((sub * cp.amount) / 100);
    if (cp.max_discount) disc = Math.min(disc, cp.max_discount);
    disc = Math.min(disc, sub); code = cp.code;
  }
  // Tax is configurable and defaults to 0 until the merchant verifies the applicable rate.
  const taxable = Math.max(0, sub - disc);
  const tax = Math.round(taxable * (cfg.tax_rate || 0) / 100);
  const ship = sub - disc >= (cfg.free_shipping_above || 999999999) ? 0 : (cfg.shipping || 0);
  const pp = b.pay_method === "prepaid" ? (cfg.prepaid_discount || 0) : 0;
  const cod = b.pay_method === "cod" ? (cfg.cod_charge || 0) + (cfg.cod_handling_fee || 0) : 0;
  const total = Math.max(0, sub - disc + ship - pp + cod + tax);
  // Reserve manually controlled stock only after validating the coupon and total.
  for (const r of rows) { const v = vs.find((x) => x.id === r.variant_id); if (v.stock_mode === "manual") { const { data: okk, error: stockError } = await sb.rpc("take_stock", { v: v.id, q: r.qty }); if (stockError || !okk) return j({ error: `${r.name} just went out of stock.` }, 409); } }
  const public_id = "VY" + Date.now().toString(36).toUpperCase();
  const { data: o, error } = await sb.from("orders").insert({ public_id, ...c, address: c.address, pay_method: b.pay_method, coupon: code, subtotal: sub, discount: disc + pp, shipping: ship, cod_charge: cod, tax, total, status: b.pay_method === "cod" ? "Pending" : "Payment Pending" }).select("id").single();
  if (error) return j({ error: "Could not save the order." }, 500);
  const { error: itemError } = await sb.from("order_items").insert(rows.map((r) => ({ ...r, order_id: o.id })));
  if (itemError) { await sb.from("orders").delete().eq("id", o.id); return j({ error: "Could not save order items." }, 500); }
  if (code) await sb.rpc("use_coupon", { c: code });
  // Prepaid: payment stays "pending" until the gateway webhook verifies it. Nothing is marked paid here.
  return j({ order_id: public_id, subtotal: sub, discount: disc + pp, shipping: ship, cod_charge: cod, tax, total, pay_status: "pending" });
};
