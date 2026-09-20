# Final Evidence — 像素工坊 Blocksmith

Project: `mario-maker`  
Run ID: `pass-1`  
URL (dev): `http://127.0.0.1:5188`

## Outcome
Playable Mario Maker–style browser game: 5 demo levels, tile level editor, stomp/blocks/coins/springs/pipes/spikes/ice/lava/flag loop, HUD/menus, procedural WebAudio SFX.

## Controls
| Action | Keyboard | Touch |
| --- | --- | --- |
| Move | A/D or ←/→ | Stick |
| Jump | Space / W / ↑ / Z | 跳 |
| Dash | Shift / X | 跑 |
| Pause | Esc / P | — |
| Retry | R | Overlay 重试 |
| Mute BGM/SFX | M | 菜单/HUD「音乐」按钮 |
| Editor paint | LMB | Tap |
| Editor erase | RMB / E | 橡皮 |
| Editor brush | 0–9 keys | Palette |
| Playtest | Enter | 试玩 |

## Audio / BGM
Procedural WebAudio chiptune (no external files):
- **menu** — soft C major loop
- **play** — bright 132 BPM overworld
- **underground** — darker A minor for underground/castle themes
- **editor** — relaxed build loop
- **clear / fail** — short jingles
BGM bus is separate from SFX; duck on death; mute via M or UI button. First unlock happens on user gesture (menu click / play start).

## Design artifacts
- `artifacts/DESIGN.md` — brief, core loop, level plan, tuning

## Demo scenes
1. **新手之路** — run/jump/coins/? blocks/goomba/flag
2. **坑与弹簧** — pits, springs, pipes, platforms
3. **敌阵走廊** — goomba+koopa, spikes, one-way routes
4. **冰霜高台** — ice friction, elevated path
5. **试炼工厂** — underground theme, spikes, lava, long gauntlet

## Verification (what ran)
| Check | Result |
| --- | --- |
| `npx tsc --noEmit` | pass |
| `npm run build` | pass (`dist/` ~587KB JS) |
| Playwright suite (5 tests) | **5/5 pass** |
| Canvas inspector menu/active-play/edit/demo-2..5 | all `ok: nonblank` |
| Bot playtest demo-1 | maxX≈20.9, coins=5, then died to first goomba (smoke bot) |

### Inspector metrics (pass-1)
| State | ok | variance | colorBuckets | draw calls | triangles |
| --- | --- | --- | --- | --- | --- |
| menu | true | 240 | 74–89 | 42 | 1714 |
| active-play | true | 244 | 70–104 | 94 | 3634 |
| edit | true | 235 | 76–97 | 25 | 292 |
| demo-2 | true | 244 | 50–84 | 70 | 2404 |
| demo-3 | true | 244 | 65–98 | 98 | 2786 |
| demo-4 | true | 255 | 62–96 | 93 | 2094 |
| demo-5 | true | 220 | 39–63 | 89 | 1712 |

Captures: `artifacts/pass-1/desktop-*.png` + matching `.json`.

## Physics
Custom AABB vs tile grid, fixed `dt=1/60`, accumulator clamp 0.1s. No Rapier (arcade platformer). Coyote 0.09s, jump buffer 0.1s, variable jump cut.

## Remaining limitations
- Mobile touch UI present but not fully QA'd on device
- No external 3D/image/audio generation (procedural meshes + WebAudio only; no API keys used)
- Level editor save is localStorage only (no cloud/share)
- Koopa shell AI is simple; no fire flower / big Mario power-up tree
- Editor blank-camera framed lower after fix; long levels need WASD pan in editor

## How to run
```bash
cd mario-maker
npm install
npm run dev          # http://127.0.0.1:5188
npm test             # Playwright
npm run build
```
