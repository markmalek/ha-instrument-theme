// Writes themes/instrument.yaml from src/palette.json.
//
//   npm run build
//
// HACS installs the committed file, so run this after changing src/ and commit the
// result. The tests fail when the committed file is out of date.

import { readFileSync, writeFileSync } from "node:fs";
import { buildTheme, type Palette } from "../src/theme.ts";

const root = new URL("../", import.meta.url);
const palette = JSON.parse(readFileSync(new URL("src/palette.json", root), "utf8")) as Palette;
writeFileSync(new URL("themes/instrument.yaml", root), buildTheme(palette));
console.log("  themes/instrument.yaml");
