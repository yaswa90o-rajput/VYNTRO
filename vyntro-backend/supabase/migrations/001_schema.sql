-- VYNTRO schema. Run once in Supabase > SQL Editor.
create extension if not exists pgcrypto;
create table categories(id uuid primary key default gen_random_uuid(), name text unique not null, slug text unique not null);
create table products(id uuid primary key default gen_random_uuid(), category_id uuid references categories, name text not null, slug text unique not null,
 description text default '', sku text unique not null, price int not null check(price>0), mrp int check(mrp is null or mrp>=price),
 cost int check(cost is null or cost>=0), images text[] default '{}', is_new bool default false, is_best bool default false,
 is_featured bool default false, active bool default true, created_at timestamptz default now());
create table product_variants(id uuid primary key default gen_random_uuid(), product_id uuid not null references products on delete cascade,
 size text not null, colour text not null, stock_mode text not null default 'made_to_order' check(stock_mode in('made_to_order','manual')),
 stock_qty int not null default 0 check(stock_qty>=0), active bool default true, unique(product_id,size,colour));
create table store_settings(key text primary key, value int not null check(value>=0));
insert into store_settings values('prepaid_discount',80),('cod_charge',80),('cod_handling_fee',0),('shipping',79),('free_shipping_above',999);
create table coupons(code text primary key, kind text not null check(kind in('fixed','percent')), amount int not null check(amount>0),
 min_cart int default 0, max_discount int, expires_at timestamptz, usage_limit int, used int default 0, active bool default true);
insert into coupons(code,kind,amount,min_cart) values('WELCOME80','fixed',80,799);
create table orders(id uuid primary key default gen_random_uuid(), public_id text unique not null, customer_id uuid references auth.users,
 name text not null, email text not null, phone text not null check(phone ~ '^[6-9][0-9]{9}$'), address text not null, pincode text not null check(pincode ~ '^[1-9][0-9]{5}$'),
 pay_method text not null check(pay_method in('prepaid','cod')), pay_status text not null default 'pending' check(pay_status in('pending','paid','failed','refunded')),
 pay_ref text, coupon text, subtotal int, discount int, shipping int, cod_charge int, total int,
 status text not null default 'Pending', qikink_ref text, courier text, tracking_no text, tracking_url text, qikink_cost int, created_at timestamptz default now());
create table order_items(id uuid primary key default gen_random_uuid(), order_id uuid not null references orders on delete cascade,
 variant_id uuid references product_variants, name text, size text, colour text, qty int not null check(qty between 1 and 10), unit_price int not null);
create table order_notes(id uuid primary key default gen_random_uuid(), order_id uuid references orders on delete cascade, note text, created_at timestamptz default now());
create table admin_users(user_id uuid primary key references auth.users, role text not null default 'admin');
create table wishlists(user_id uuid references auth.users, product_id uuid references products on delete cascade, primary key(user_id,product_id));
create table reviews(id uuid primary key default gen_random_uuid(), product_id uuid references products, user_id uuid references auth.users,
 rating int not null check(rating between 1 and 5), body text, approved bool default false, verified_purchase bool default false, created_at timestamptz default now());
create table return_requests(id uuid primary key default gen_random_uuid(), order_id uuid references orders, user_id uuid references auth.users,
 kind text not null, reason text, status text default 'Requested', admin_note text, refund_ref text, created_at timestamptz default now());
-- Security: row level security ON everywhere. No policy = no access.
do $$ declare t text; begin foreach t in array array['categories','products','product_variants','store_settings','coupons','orders','order_items','order_notes','admin_users','wishlists','reviews','return_requests'] loop
 execute format('alter table %I enable row level security',t); end loop; end $$;
create function is_admin() returns bool language sql security definer stable as $$ select exists(select 1 from admin_users where user_id=auth.uid()) $$;
create policy pub_cat on categories for select using(true);
create policy pub_prod on products for select using(active);
create policy pub_var on product_variants for select using(active);
create policy pub_set on store_settings for select using(true);
create policy pub_rev on reviews for select using(approved);
create policy own_wish on wishlists for all using(user_id=auth.uid()) with check(user_id=auth.uid());
create policy own_rev on reviews for insert with check(user_id=auth.uid() and approved=false and verified_purchase=false);
create policy own_orders on orders for select using(customer_id=auth.uid());
create policy own_items on order_items for select using(exists(select 1 from orders o where o.id=order_id and o.customer_id=auth.uid()));
create policy own_ret on return_requests for all using(user_id=auth.uid()) with check(user_id=auth.uid() and status='Requested');
create policy adm_all_cat on categories for all using(is_admin()) with check(is_admin());
create policy adm_all_prod on products for all using(is_admin()) with check(is_admin());
create policy adm_all_var on product_variants for all using(is_admin()) with check(is_admin());
create policy adm_all_set on store_settings for all using(is_admin()) with check(is_admin());
create policy adm_all_cpn on coupons for all using(is_admin()) with check(is_admin());
create policy adm_all_ord on orders for all using(is_admin()) with check(is_admin());
create policy adm_all_itm on order_items for all using(is_admin()) with check(is_admin());
create policy adm_all_nt on order_notes for all using(is_admin()) with check(is_admin());
create policy adm_all_rev on reviews for all using(is_admin()) with check(is_admin());
create policy adm_all_ret on return_requests for all using(is_admin()) with check(is_admin());
-- Orders are created ONLY by the server function (service key), never directly by the browser.
