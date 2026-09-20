# Game Progress — 像素工坊 Blocksmith

## Intent
Mario Maker–like: play + edit tile platformer levels, polished enough to ship a local demo.

## Status
Complete local playable slice. Dev URL http://127.0.0.1:5188. Build + Playwright + canvas inspector pass-1 green.

## Decisions
- Custom AABB physics (not Rapier) for 60Hz arcade feel
- Orthographic 2.5D side view
- Level format: flat tile array + demo generators
- Editor + playtest + localStorage custom levels
- Procedural character/enemy/block meshes, WebAudio SFX

## Done
- Design brief / loop / 5 demo plans
- Core play loop, entities, collision, bump blocks, springs, flag clear
- Level editor palette + save/playtest
- HUD/menu/overlay/touch stubs
- Tests: visual (menu/play jump/editor/5 demos) + bot smoke
- Evidence in artifacts/final-evidence.md

## Pending / optional next
- Device mobile QA
- More power-ups, checkpoints, moving platforms
- Visual harness scorecard pass if premium art bar required
- Audio generation via ElevenLabs if keys available
