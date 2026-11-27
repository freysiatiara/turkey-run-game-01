# Gobble Run — A Turkey Escape Game

https://make.fun/bounty/turkey-run-game-01

https://make.fun/badge/turkey-run-game-01.svg
https://make.fun/badge/turkey-run-game-01/freysiatiara/turkey-run-game-01/rank.svg
https://make.fun/badge/turkey-run-game-01/freysiatiara/turkey-run-game-01/reward.svg

Thanksgiving is coming — and YOU are the dinner. Run a turkey from the
farmyard, through the barn, to the kitchen door 1400 m away, while the farmer
hunts you down with his carving knives.

## How to play

Open `game/index.html` in desktop Chrome (or run `node serve.ts` and open
http://localhost:8080). No network, no build step, no files outside `game/`.

- **← → / A D** — run left and right (click / drag also steers)
- **SPACE / ↑ / W** — jump the fences and the flying knives
- **SHIFT / X** — dash away from the farmer
- **S / ↓ / H** — hide in a haystack (breaks the farmer's line of sight)
- **P / ESC** — pause, **M** — mute, **ENTER** — start / restart

## What is in the game

- **Complete turkey escape game:** title screen with instructions, a run with
  a HUD (score, distance in metres, 3 lives, stage, escape progress bar, alert
  meter), and end screens for **CAUGHT!** and **ESCAPED!** with restart.
- **Farmer AI with 5 states:** patrol, suspicious, chase, search, and a
  carving-knife throw with a wind-up. He watches a vision cone, gets alerted,
  corners the turkey when close, loses the trail when you hide or dash away,
  and searches the last place he saw you.
- **3 stages that get harder:** Farmyard (0–400 m), The Barn (400–900 m),
  The Kitchen (900–1400 m) — faster farmer, more knives, and hot ovens that
  burn you if you stand too close.
- **Fun and replay value:** corn pickups (+25), +5 per obstacle cleared,
  distance score, dash with cooldown, haystack hiding, and a local best score.
- **Feel and polish:** responsive fixed-step 60 Hz simulation, clear feedback
  (SPOTTED! banner, alert meter, hit flash / invulnerability blink, oven
  warning), pause, mute, and fully synthesised WebAudio sound (gobble,
  pickup chirp, alarm, knife whoosh, hit thud, caught sting, escape fanfare)
  — no audio files.
- **Original art:** the turkey, the farmer, the farm, the barn and the kitchen
  are all drawn in code on a 2D canvas in one coherent autumn palette.

## Layout

- `game/index.html` — the page; `game/src/main.js` boots the loop and screens
- `game/src/config.js` — every tuning number and colour
- `game/src/world.js` — rules: turkey physics, farmer AI, knives, ovens, stages
- `game/src/render.js` — all canvas drawing: characters, scenery, HUD, screens
- `game/src/input.js` — keyboard + pointer input
- `game/src/audio.js` — synthesised WebAudio sound effects
- `game/src/random.js` — seeded random generator for repeatable runs
- `game/src/shots.js` — deterministic screenshot scenes (`?shot=start|play|chase|end`)
- `main.ts` — hands the game in: copies `game/` + `screenshots/` to `/output`
  and writes `dossier.json` (Node 22, standard library only)
- `screenshots/` — 4 real renders of this game (title, play, chase, caught)

## License

MIT — see `LICENSE`.
