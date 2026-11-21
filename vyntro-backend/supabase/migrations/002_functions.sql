-- Run after 001. Server-only helpers (coupon usage + manual stock).
create function use_coupon(c text) returns void language sql security definer as $$ update coupons set used=used+1 where code=c $$;
create function take_stock(v uuid, q int) returns bool language plpgsql security definer as $$
begin update product_variants set stock_qty=stock_qty-q where id=v and stock_mode='manual' and stock_qty>=q; return found; end $$;
revoke all on function use_coupon(text), take_stock(uuid,int) from public, anon, authenticated;
grant execute on function use_coupon(text), take_stock(uuid,int) to service_role;
