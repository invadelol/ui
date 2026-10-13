# Agent notes

- **Design:** read [DESIGN.md](DESIGN.md) before you change or add any UI. It is the single art direction for the desktop app, invade.lol and the landing pages. Use only its tokens, materials, radii, type scale and recipes, and run its checklist before you ship.
- **Public repo:** never commit real Riot IDs or puuids. Fixtures and stories use fictional players.
- **Releasing:** a version bump goes in its own commit. Publishing happens by pushing a `v*` tag; trusted publishing is configured in `.github/workflows/ci.yml`.
