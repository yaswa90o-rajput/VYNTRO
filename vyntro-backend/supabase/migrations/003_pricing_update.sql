-- VYNTRO pricing update. Run after 001_schema.sql and 002_functions.sql.
-- COD adds ₹80 surcharge + ₹15 handling by default.
-- Tax is intentionally 0 until the applicable rate is confirmed by the guardian/accountant.
insert into store_settings(key,value) values
  ('prepaid_discount',80),
  ('cod_charge',80),
  ('cod_handling_fee',15),
  ('tax_rate',0)
on conflict(key) do update set value=excluded.value;

alter table orders add column if not exists tax integer not null default 0;
