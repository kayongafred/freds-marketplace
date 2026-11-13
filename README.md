# Kayonga eMarket database setup

Kayonga eMarket uses Supabase for shared product listings and photo storage. Posting a product is currently free; sellers complete hCaptcha and then submit their product directly.

## Accessibility

The homepage includes an in-flow Accessibility settings panel with text sizing (80%–200%), high contrast, reduced motion, and enhanced focus indicators. Reduced motion follows the device preference unless a visitor explicitly changes it. Settings are saved in that browser. Keyboard users can use the skip link, Tab and Shift+Tab, Enter or Space, and Escape to close open panels and dialogs. The site also supports browser zoom and forced-colors mode. These measures are intended to support WCAG 2.2 AA; they are not a certification, and assistive-technology testing is still important.

Visitors can share the marketplace using the header menu on Facebook, WhatsApp, LinkedIn, email, and X/Twitter, or use the device share sheet for TikTok and Instagram when available. The share menu includes platform logos, lets visitors copy a caption and link, and downloads a branded story image. For Instagram Stories, upload the image and add a Link sticker; for WhatsApp Status, paste the link in the status text or image caption. Social apps control their own story/status link previews and caption behavior.

For an existing Supabase project, run the following migration in its SQL Editor to make listings free to post and remove asking prices from existing listings. This clears only listing prices; other listing details and payment records are preserved:

```sql
alter table public.listings
  alter column payment_request_id drop not null;

alter table public.listings
  alter column price drop not null;

update public.listings
set price = null
where price is not null;

drop policy if exists "Sellers can publish their own listings" on public.listings;
create policy "Sellers can publish their own listings"
  on public.listings for insert
  to authenticated
  with check (seller_id = (select auth.uid()));
```

The public page also provides Open Graph and Twitter Card metadata pointing to `kayongaemarket-logo.png` for social link previews. Social networks may cache previews; use each platform's link debugger or wait for its cache to refresh after changing preview metadata.

Search engines are allowed to index the homepage. `robots.txt` links to `sitemap.xml`, which lists the public homepage. The homepage contains the Google Search Console HTML-tag verification token. Keep that tag in place to retain ownership verification. Indexing and ranking are controlled by search engines and are not immediate or guaranteed.

## Connect Supabase

1. Create a Supabase project at https://supabase.com and open its SQL Editor.
2. Run the contents of `supabase-setup.sql`.
3. In the Supabase dashboard, enable anonymous sign-ins under Authentication settings.
4. Open Project Settings, then API. Copy the Project URL and the publishable/anon key into `supabase-config.js`:

   ```js
   window.MARKET_DAY_SUPABASE = {
     url: "https://your-project.supabase.co",
     anonKey: "your-publishable-or-anon-key",
     hcaptchaSiteKey: "your-public-hcaptcha-site-key"
   };
   ```

5. Serve this folder over HTTP and reload the page. A successful connection shows “Shared database connected.”

Never put a `service_role` key in this website. The publishable/anon key is intended for browser use; row-level security in the SQL setup restricts listing creation and photo uploads to the current anonymous seller session.

## Configure hCaptcha

The seller flow shows hCaptcha before creating a Supabase anonymous session. Put the public Site Key in `hcaptchaSiteKey` in `supabase-config.js`. In Supabase, open **Authentication → Attack Protection**, choose hCaptcha, paste the Secret Key from your password manager into **Captcha secret**, and save. The Secret Key must stay in Supabase; never put it in website code or send it in chat.

The hCaptcha Site Key must allow the exact hostname serving the page. If the widget says “Request not allowed,” add that hostname in the hCaptcha dashboard under the Site Key's allowed domains, then reload the page. Enter hostnames only, without `https://`, paths, or ports. For local preview, serve the site over HTTP and allowlist `127.0.0.1`; opening `index.html` directly as a `file://` URL cannot be verified. For the live site, allowlist its full Netlify hostname (for example, `your-site.netlify.app`). Make sure the public Site Key in `supabase-config.js` and the hCaptcha Secret Key configured in Supabase belong to the same hCaptcha site. Do not subscribe to the hCaptcha Pro trial unless you want a paid plan.

Listing fees and payment requests are no longer part of the posting flow. New database setups do not create payment tables. Existing Supabase projects retain their old `listing_fees` and `payment_requests` tables and records; the current website does not use them.

Food is excluded from new listings and hidden from public browsing. Existing food rows are not deleted by the setup script.

Product names, photos, and seller contact details are public so buyers can find and contact sellers. The current posting form does not collect asking prices, but a price is displayed when it is present in a listing record. Buyers should confirm price and terms with sellers directly. Anonymous seller sessions do not provide account recovery or ownership management. Add verified seller accounts and moderation before using this for a public production marketplace.

## Policies and code license

The public website includes a [Privacy Policy](privacy.html), [Terms of Use](terms.html), [Listing Rules](listing-rules.html), and [Code License](license.html). Sellers must agree to the terms and listing rules before publishing. Seller names, contact details, location, and photos are public on published listings; review these policies and the applicable local laws before operating the marketplace.

The project is proprietary and all rights are reserved by Kayonga eMarket except for third-party components and user-submitted content, which remain under their respective terms. See [LICENSE.txt](LICENSE.txt). This is not an open-source license. Have the policy wording reviewed for the laws applicable to the business before relying on it as legal advice.

## Email notifications for new listings

The Supabase Edge Function in `supabase/functions/listing-notification/index.ts` emails `kayongafred87@gmail.com` after a listing is inserted. It does not notify for payment requests or failed listing attempts.

1. Create a Resend account, verify a sender domain/address, and copy its API key.
2. Install and sign in to the Supabase CLI, then link this folder to your project and deploy the function:

  ```powershell
  supabase login
  supabase link --project-ref YOUR_PROJECT_REF
  supabase functions deploy listing-notification
  ```

3. In Supabase Dashboard, open Edge Functions → Secrets and add `RESEND_API_KEY`, `RESEND_FROM` (your verified sender), `NOTIFICATION_EMAIL` (`kayongafred87@gmail.com`), and a strong random `NOTIFICATION_WEBHOOK_SECRET`.
4. Open Database → Webhooks, create an `INSERT` webhook for `public.listings`, and set the URL to `https://YOUR_PROJECT_REF.supabase.co/functions/v1/listing-notification`.
5. Add an `Authorization` request header with value `Bearer YOUR_NOTIFICATION_WEBHOOK_SECRET`, using the same secret from step 3. Save the webhook and publish a test listing.

Do not put the Resend API key or webhook secret in `supabase-config.js` or any browser code. The function checks the webhook secret before sending email. Function calls use `verify_jwt = false` because the database webhook authenticates with that separate shared secret.

## Publish on the internet

This is a static website; `netlify.toml` sets the project root as the publish directory and applies browser security headers. Netlify provides HTTPS for its hosted sites; use the HTTPS address when sharing or testing the live site. Before publishing, complete the Supabase setup above, fill in `supabase-config.js`, and run `supabase-setup.sql`. If those settings are blank or the database is unavailable, no sample products are shown; listings created in that browser are saved locally and are not shared with visitors.

1. Create/sign in to a Netlify account.
2. Open https://app.netlify.com/drop and drag the `freds-marketplace` project folder onto the page.
3. Netlify will provide a public `*.netlify.app` address. Share that address with buyers and sellers.
4. To update the site later, upload the project folder again or connect it to a Git repository in Netlify.

Anyone with the public URL can view the site. Seller contact details and addresses are shown to buyers, so only publish information sellers agree to share. Google Search is not a web host; after deployment, add the public URL in Google Search Console if you want Google to index it. Search indexing can take time and is not guaranteed.
