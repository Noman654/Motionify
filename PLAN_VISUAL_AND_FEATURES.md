# Reel Composer — Visual & Feature Plan

## 1. Remove Person / Brand References

- **index.html** — Remove author meta or set to app name only.
- **WelcomeScreen** — Remove "Read The Philosophy" link (personal blog). Replace with generic "Learn more" linking to README or in-app tip.
- **FileUpload footer** — Remove profile photo, name "Prasanna Thapa", and personal social links (Website, GitHub profile, LinkedIn, Instagram). Replace with a minimal footer: app name, version, and optional "Source code" link to repo (generic).
- **README.md** — Remove "About the Author" section (photo, name, role, personal links). Keep product description and docs. Optionally keep "Built with ❤️ for creators" without attributing to a person.

---

## 2. Visual Appeal

### 2.1 Global

- **CSS variables** — Centralize accent colors (e.g. `--accent-primary`, `--accent-secondary`) in `index.css` for consistency.
- **Typography** — Slightly larger base, better line-height; use a distinct font for headings (e.g. keep gradient text, add letter-spacing).
- **Scrollbars** — Already custom; keep and optionally match accent.
- **Animations** — Add subtle `animate-fade-in` usage where new panels appear; optional gentle stagger for lists.

### 2.2 Welcome Screen

- Keep gradient orbs and noise. Add a soft glow behind the card.
- Card: stronger glass (backdrop-blur, border glow on focus).
- Buttons: clearer hover/active states and slight scale.
- Remove any single-person attribution; keep "Reel Composer" and tagline only.

### 2.3 Upload (FileUpload)

- **Drop zones** — Clearer border/dashed state, hover state (e.g. border color + light bg).
- **Cards** — Slight rounded-2xl, soft border, optional very subtle shadow.
- **Footer** — Neutral: icon + "Reel Composer" + version + one "Source code" link; no photo, no names.

### 2.4 App Header (Editor)

- Slightly taller header with clearer separation; optional soft bottom shadow.
- Nav buttons: pill-style on hover, consistent spacing.

### 2.5 Modals (Export, Replace Scene, etc.)

- Consistent rounded-2xl, border, backdrop; optional subtle scale-in animation.
- Export modal: clearer progress state and success/error styling.

### 2.6 Editor Panel & Reel Player

- Tabs: active state more visible (e.g. bottom border or background).
- Player area: subtle container shadow so the preview feels "elevated".

---

## 3. Small Features (UX)

- **Keyboard hint** — In Reel Player or header: small text "Press ESC to exit fullscreen" (already implemented; ensure visible).
- **Empty states** — When no project/video: short message + primary action (e.g. "Upload video + SRT to get started").
- **Footer** — Single, minimal footer across app (or only on Upload): "Reel Composer v1.2.5" + link to GitHub repo (generic URL or env-based).
- **No new heavy features** — Keep scope to polish and one or two small UX wins so the app feels more cohesive and professional.

---

## 4. Implementation Order

1. Remove all person/name/photo references (index.html, WelcomeScreen, FileUpload footer, README).
2. Add CSS variables and global polish (index.css).
3. Welcome screen: glass, glow, button states; remove philosophy link.
4. FileUpload: drop-zone and card polish; replace footer with neutral version.
5. App header and modal tweaks.
6. Optional: empty-state copy and footer link.
