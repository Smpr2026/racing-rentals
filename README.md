# Racing Rentals & Racing Sales

A single-page site covering both arms of the business under one brand:

- **Racing Rentals** — car hire, daily / weekly / long term, plus a rent-to-own pathway
- **Racing Sales** — the used car yard

Switch between them with the **Hire / Buy** control in the header. The page ground
changes colour so it is always obvious which side you are on, and each vehicle is
tagged per arm — a car can be for hire, for sale, or both.

## Status: design concept

This is a working prototype for review, **not a live site**.

Everything factual is a placeholder and must be replaced before this goes anywhere near
customers:

| Placeholder | Notes |
|---|---|
| All weekly rates and drive-away prices | Invented to make the design readable |
| Kilometres | Only the Corolla (141,514), Focus (92,894) and Territory (320,253) are real — read off dashboard photos |
| Years | Inferred from body shape, not confirmed |
| Rego expiry dates | Invented |
| Finance figures | Invented, and see the warning below |
| Phone, email, hours | Placeholders |

### Vehicle images

The car images are **studio renders, not photographs of the individual vehicles**. They
are fine for a design review. Using them on a live sales listing would misrepresent the
actual cars — real photos are needed before launch.

### Finance advertising

The Buy side shows indicative weekly repayment figures. In Australia, advertising credit
in this way engages credit-advertising rules. Before this is public-facing, the business
needs to be working with a licensed credit provider or be an authorised credit
representative, and the wording needs their sign-off.

## Still to do

- Replace all placeholder data above
- Real vehicle photography
- PWA layer — manifest and icons, so it installs to the home screen
- Wire the enquiry and test-drive forms to an actual inbox
- A way for the owner to update stock without editing HTML

## Layout

    index.html    the whole site — no build step, no dependencies
    cars/         vehicle images, AVIF with PNG fallbacks at two sizes each

## Installing to the home screen

The site is a PWA: `manifest.webmanifest`, icons in `icons/`, and `sw.js` for
offline. On Android/Chrome the browser offers **Install** and the in-page strip
appears once it does. On iOS there is no install prompt — the strip instead
tells you to use **Share → Add to Home Screen**.

Once installed it opens with no browser chrome, and the page plus the small car
images are cached so it loads instantly and still works with no signal. The
manifest also registers two shortcuts (long-press the icon): *Hire a car* and
*Cars for sale*.

## Editing

Edit `src/page.html`, then:

    python3 build.py

That regenerates `index.html` — the wrapper, the PWA tags and the install logic
are added by the build, so `src/page.html` stays publishable as-is.

Bump `VERSION` in `sw.js` when you change cached assets, or returning visitors
keep the old copy.
