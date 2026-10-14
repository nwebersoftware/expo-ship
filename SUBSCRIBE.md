# Turning on the subscribe form

The site ships with a styled email form. It's inert until you point it at a newsletter provider.
Pick one (both have free tiers), grab its embed/form HTML, and replace the `<form>` in `index.html`.

## Option A — Buttondown (recommended: simple, you own the list, easy export)
1. Create a free account at buttondown.email.
2. Settings → Embed subscribe form → copy the form snippet.
3. In `index.html`, replace:
   ```html
   <form class="sub-form" action="REPLACE_WITH_FORM_ENDPOINT" method="post" target="_blank">
     <input type="email" name="email" placeholder="you@example.com" required aria-label="Email" />
     <button type="submit">Subscribe</button>
   </form>
   ```
   with Buttondown's form (keep the `class="sub-form"` so styling applies).
4. Commit + push.

## Option B — Substack / MailerLite / ConvertKit
Same idea — paste their embed form in place of the placeholder form.

## Why this matters
The **email list is the asset you own** (not the blog, not any single platform). Every post should end
with a reason to subscribe.
