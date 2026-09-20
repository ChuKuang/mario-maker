# Blocksmith · 像素工坊 — Design Artifacts

## Style / Genre
2.5D side-scrolling platformer + tile level editor (Mario Maker-like).
Custom AABB tile physics at fixed 60 Hz (no Rapier) — arcade feel over simulation.

## Design brief
- **Player promise**: You are a level smith — build Mario-style stages, then play them immediately: stomp enemies, bump blocks, grab coins, reach the flag.
- **Target feeling**: Tight jump, crisp contact feedback, editor that feels fast and reversible.
- **Primary verb**: Jump (variable height, coyote time, jump buffer).
- **Secondary verbs**: Run / dash, stomp enemies, bump ? / bricks, enter pipes, place / erase tiles in editor.
- **Every 5–30s**: pick a route → jump/stomp → collect → advance toward flag.
- **Every 1–5min**: denser enemies, pits, springs, ice, spikes; editor session of similar length.
- **Lose**: fall into pit, touch enemy/spike/lava, timer hits 0.
- **Reward**: coin count, clear time, stars on demo levels, ability to edit any level and save to localStorage.
- **Better player**: chained stomps, short vs long jumps, use shells/springs, route choice for coin arcs.
- **How next decision is communicated**: visible platforms/enemies ahead, flag silhouette, HUD timer, editor palette highlight.
- **Non-goals**: multiplayer, network sharing, authentic Nintendo assets, full power-up tree.

## Core loop contract
Player **runs and jumps** to **reach the flag** while **enemies, pits, spikes, and a timer** create risk; success gives **coins + clear time + star rating**, failure causes **instant restart at level start** (or pipe/checkpoint later).

Proof in code:
- Verb → InputController intents → Player physics.
- Objective → flag tile + HUD goal hint + clear overlay.
- Pressure → enemies/pits active in first minute of every demo.
- Reward → score state changes HUD and clear screen (not only VFX).
- Failure → death VFX + overlay with retry; restart is one key/tap.
- Restart → `loadLevel(id)` rebuilds under 1 frame of setup.

## Level / encounter plan
- **Format**: 2D tile grid `tiles[y][x]`, camera follows X (and soft Y), side view.
- **Demo 1 新手之路**: teach run/jump/coin/goomba/flag on flat ground.
- **Demo 2 坑与弹簧**: pits + spring bounce + pipe column.
- **Demo 3 敌阵走廊**: goomba + koopa + one-way platforms + brick/? row.
- **Demo 4 冰霜高台**: ice friction + elevated path + gaps.
- **Demo 5 试炼工厂**: spikes, tight gaps, spring + koopa combo, longer timer pressure.
- **Editor**: free-form grid, palette, playtest, save/load JSON in localStorage.

## Architecture
| Layer | Ownership |
| --- | --- |
| `src/game/` | Level format, demo data, physics constants, Game state machine |
| `src/entities/` | Player, enemies, items, block bump particles |
| `src/systems/` | LevelView (instanced tiles), gameplay collision, editor, camera, HUD, audio, VFX |
| `src/core/` | Renderer, loop, input |
| `artifacts/` | Design + evidence |

Physics: custom AABB vs solid tiles + dynamic entities. Fixed `dt = 1/60`, accumulator clamp 0.1s.
Render: OrthographicCamera, instanced tile meshes, CanvasTexture labels for ? / flag.

## Controls
| Action | Keyboard | Touch |
| --- | --- | --- |
| Move | A/D or ←/→ | Stick |
| Jump | Space / W / ↑ / Z | Jump button |
| Dash/run | Shift / X | Hold jump long or dash button |
| Down / pipe | S / ↓ | Stick down |
| Pause | Esc / P | — |
| Editor paint | LMB / drag | Tap/drag |
| Editor erase | RMB / E + click | Erase tool |
| Editor play | Enter / Play button | Play button |

## Tuning (initial)
- runSpeed 7.5, dashSpeed 11, accel 40, friction 28
- jumpVel 12.2, gravity 34, maxFall 22
- coyote 0.08s, jumpBuffer 0.1s, variable jump cut 0.45
- stomp bounce 10.5, hitstop 40ms
- timer per level 120–180s
