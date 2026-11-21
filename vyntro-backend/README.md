# VYNTRO — Streetwear storefront starter

This ZIP contains the VYNTRO storefront prototype, local demo admin tools, Supabase schema/migrations, and Netlify Function backend starter.

## What's improved in this revision

- Premium black / warm-stone / lime-accent visual direction.
- Responsive layout for desktop, tablet and mobile.
- 3D-inspired hero treatment, hover depth and animated product presentation.
- Editorial demo product photography loaded from Unsplash image URLs.
- Product detail view with image, description, size, colour, delivery PIN check, return information and reviews.
- Cart, wishlist, product search, category filters and sorting.
- Manual product creation, price changes, image URL changes and stock mode/quantity in the local demo admin.
- Coupon creation/deletion, editable announcement bar, configurable pricing, product sizes/colours/descriptions and product creation in the local demo admin.
- COD defaults: ₹80 surcharge + ₹15 handling.
- Prepaid default discount: ₹80.
- Tax rate is configurable and defaults to 0 until the legally applicable rate is confirmed.
- Better delivery address form and a limited FAQ assistant.
- Server-side order function updated to include tax and the same COD/prepaid pricing settings.

## Important: current limitations — read before publishing

**The storefront in `public/index.html` is still a browser-local prototype.** Cart, wishlist, reviews, demo orders, products, coupons and admin edits use `localStorage` in the current browser. They are not shared across customer devices and are not connected to Supabase yet.

The local admin has no secure login. Open the demo admin by adding `#admin` to the site URL (for example, `https://your-preview.example/#admin`). Do not enter real customer data and do not expose this prototype admin as a production admin.

The current frontend does not call `/.netlify/functions/create-order`, does not create real database orders, and does not connect to a payment gateway. The UPI/WhatsApp completion screen is a demonstration flow, not verified online payment processing. Do not accept live customer payments or publish this as a functioning live store until the production backend, authentication, payment verification, and order workflow have been connected and tested.

The backend files are Netlify Functions. If you plan to deploy on a different platform, its serverless function format and environment-variable setup may need to be adapted. Tell the developer which hosting platform you choose before deployment.

## Product photography

The catalogue uses remote Unsplash image URLs as temporary editorial placeholders. They are not guaranteed to depict the exact garment variants, fabric, print or colour being sold. Replace them with your own product photographs or properly licensed supplier mockups before taking real orders. Product images can be changed in the local demo admin using an HTTPS image URL.

## Pricing logic

- Prepaid: ₹80 discount.
- COD: ₹80 COD surcharge + ₹15 handling by default.
- Tax: configurable percentage, currently 0 by default.
- Shipping: configurable; current demo default is ₹79 and free shipping above ₹999.
- Coupon: `WELCOME80` is a demo fixed ₹80 discount above ₹799.

The checkout shows tax as a separate line. Do not enter a tax rate until the guardian/accountant confirms the correct tax treatment and whether listed prices are tax-inclusive or tax-exclusive. Shipping and payment fee treatment must also be checked before launch.

## Project structure

- `public/index.html` — storefront and local demo admin.
- `public/assets/vyntro-mark.svg` — VYNTRO brand mark.
- `public/*.html` — draft policy pages.
- `netlify/functions/create-order.mjs` — server-side order creation starter.
- `netlify/functions/razorpay-webhook.mjs` — webhook signature verification starter, disabled unless explicitly configured.
- `supabase/migrations/001_schema.sql` — initial database schema.
- `supabase/migrations/002_functions.sql` — stock and coupon helper functions.
- `supabase/migrations/003_pricing_update.sql` — COD handling and tax field/settings update.

## Supabase setup (guardian-managed account)

1. Create a Supabase project with a parent/legal guardian where required by the provider's age and account rules.
2. In SQL Editor, run migrations in order: `001_schema.sql`, `002_functions.sql`, then `003_pricing_update.sql`.
3. Create the intended admin Auth user.
4. Add that user's UUID to `admin_users` using the documented SQL process.
5. Configure environment variables securely. Never expose the Supabase service-role key in frontend code or commit it to Git.

## Netlify backend setup

This project currently contains Netlify Functions. Configure these environment variables in the hosting dashboard:

- `SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY` (server-side secret only)
- `PAYMENTS_ENABLED=false`
- `RAZORPAY_WEBHOOK_SECRET` only when a guardian-managed gateway account and webhook are properly configured.

`SUPABASE_ANON_KEY` is listed in `.env.example` for future frontend integration, but the current static storefront does not use it.

## Testing performed for this revision

- JavaScript syntax check for the storefront script.
- JavaScript syntax check for both Netlify function files.
- Basic project structure and HTML parsing checks.

These checks do not replace browser/device QA, database integration tests, security review, payment gateway tests or real fulfilment testing.

## Next production milestone

Connect the storefront to Supabase, replace the local demo admin with authenticated server-side admin operations, connect the order form to the order function, implement secure payment gateway order creation and webhook verification, and test the manual Qikink workflow end-to-end.
