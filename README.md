# Chairside Nitrous Academy

Installable static PWA for dental nitrous oxide training. The app parses the supplied course document at runtime and renders:

- Module-based learning flow
- Learning objectives
- Teaching transcript
- Assessment cards with mastery tracking
- Reference library
- Local learner notes
- Offline support via service worker

## Run locally

Serve the folder over HTTP. Examples:

```bash
python3 -m http.server 4173
```

Then open `http://localhost:4173`.

## Deploy

This project is static and can be deployed directly to:

- Netlify
- Vercel
- GitHub Pages
- Any basic web host

No build step is required.

## Content source

The app reads `2026_N20_combined_v1_ALL_MODULES copy.txt` directly. Updating that file updates the course content without changing the UI code, as long as the structure remains:

- `MODULE X - TITLE`
- `Learning Objective X.X:`
- dialogue lines in `Speaker: text` form
- `Question:`
- `Answer:`
- `Learning Objective:`
- numbered references like `1.0: Citation https://...`

## Clinical note

This is a draft training platform. Final content, scope-of-practice alignment, and legal/educational review should be completed by qualified dental faculty and counsel before real-world deployment.
