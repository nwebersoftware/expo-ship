# Newsletter (Buttondown)

**Status: wired.** The subscribe form on `index.html` and both posts posts to:

```
https://buttondown.com/api/emails/embed-subscribe/nateweber
```

- Username: **nateweber**
- Field: `email`
- No API key is used on the site (a static page can't keep a secret) — the embed endpoint is public
  by design and safe to expose.

## Actions pending on the Buttondown side
- Turn on **double opt-in** if you want confirmation emails.
- Customize the **success page / redirect**.
- The welcome/tags can be managed in the Buttondown dashboard.

## API key
An API key was shared in chat — it is **not** used by the site. Rotate/revoke it if you want; if you
keep one for programmatic management, create a fresh key and store it locally (never in the repo).
