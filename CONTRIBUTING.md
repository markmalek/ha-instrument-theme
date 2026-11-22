# Contributing to Instrument

Thanks for helping. Bug reports with a screenshot and the card involved are the most
useful thing you can send.

## How the theme is made

`themes/instrument.yaml` is generated; don't edit it by hand.

| File | What it holds |
| --- | --- |
| `src/palette.json` | The colours (dark and light), fonts, corners and shadow. |
| `src/theme.ts` | Which Home Assistant, Bubble Card and Mushroom variables get which palette values. |
| `scripts/build.ts` | Writes `themes/instrument.yaml` from the two above. |
| `bubble/instrument.yaml` | The Bubble Card module, written by hand. |
| `test/theme.test.ts` | Contrast, completeness and file checks. |

Most changes belong in `src/theme.ts` (a variable that's missing or wrong for some
card) or `bubble/instrument.yaml`.

`src/palette.json` is synced from the design system the palette comes from, which
opens a pull request here when the colours change. To propose a colour change, open an
issue or a pull request that explains it; it gets applied at the source too, so the
next sync keeps it.

## Working on it

Needs Node 22.13 or later.

```bash
npm install
npm run build     # regenerate themes/instrument.yaml
npm run check     # lint, typecheck and tests
```

Commit the regenerated `themes/instrument.yaml` with your change: HACS installs that
file, and the tests fail if it's out of date.

To try a change in Home Assistant, copy `themes/instrument.yaml` (and
`bubble/instrument.yaml` if you changed it) into your config and reload themes.

## Pull requests

- Keep one change per pull request, and say which cards it affects.
- Include before and after screenshots, in dark and light mode, for anything visual.
- Text has to stay readable: the tests check contrast for text on the canvas, cards,
  the sidebar and the tinted fills, and a change that drops below the minimum fails.
