# Making a car image that matches the set

Every car on the site came out of ChatGPT's image generator. To add one that
sits alongside the others without looking out of place, keep these fixed.

## The prompt

> Studio product photograph of a **{YEAR} {MAKE} {MODEL}** in **{COLOUR}**.
> Front three-quarter view, car angled so the front points to the **right** of
> frame. The whole car is in shot with clear space around it — nothing cropped.
> Isolated on a plain white background with no shadow and no ground reflection.
> Even, soft studio lighting from above and slightly front-left. Sharp focus,
> photorealistic, clean paint, no people, no text overlays, no watermark.
> Landscape 3:2. The front number plate is a black plate reading
> **RACING RENTALS**.

Then: *"Give me that as a PNG with a transparent background."*

## What must stay constant

| | |
|---|---|
| Angle | Front three-quarter, front pointing **right** |
| Framing | Whole car, space around it, never cropped |
| Background | Plain white, or transparent — **no shadow, no reflection** |
| Lighting | Soft, even, from above-front-left |
| Size | 1536 × 1024 or larger |
| Plate | Black, reads **RACING RENTALS** |

The site draws its own contact shadow under each car, so a shadow baked into
the image will show up as a double shadow.

## Known traps

- **Check the plate spelling.** Two renders came back reading "PACING". If it is
  wrong, do not re-roll the whole car — the plate can be replaced (see below).
- **Some renders have a checkerboard baked into the pixels** rather than real
  transparency. That is fine; the background gets cut either way.
- **A blank plate is fine too** — one can be added afterwards.
- Facing direction drifted across the original batch. Anything facing left still
  works, it just reads slightly less consistently in the grid.

## Getting it onto the site

Drop the file anywhere and tell Claude where it is. The steps are:

1. `carkit cutout <in> <out.png>` — Vision subject isolation, keeps the largest
   subject so bystander cars are dropped
2. `carkit plate` — only if the plate needs fixing or adding
3. `carkit web <in> cars/<slug>-1400 1400 0.92` and again at `760`, plus a
   `-760.png` fallback
4. Add the vehicle to `FLEET` in `src/page.html`, including `ih:` (the height of
   the 1400px file — without it the card collapses and the image will not load)
5. `python3 build.py`, commit, push
