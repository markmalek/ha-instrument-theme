import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";
import {
  buildTheme,
  colors,
  contrast,
  MODES,
  mix,
  modeVariables,
  type Palette,
  primaryScale,
  sharedVariables,
  triple,
  yamlValue,
} from "../src/theme.ts";

const root = new URL("../", import.meta.url);
const read = (path: string) => readFileSync(new URL(path, root), "utf8");
const palette = JSON.parse(read("src/palette.json")) as Palette;

const asMap = (pairs: [string, string][]) => new Map(pairs);

test("the committed theme file is up to date (run npm run build)", () => {
  assert.equal(read("themes/instrument.yaml"), buildTheme(palette));
});

test("both modes set exactly the same variables, each once", () => {
  const [dark, light] = MODES.map((m) => modeVariables(palette, m));
  assert.deepEqual(
    dark.map(([k]) => k),
    light.map(([k]) => k),
  );
  for (const list of [dark, light, sharedVariables(palette)]) {
    const keys = list.map(([k]) => k);
    assert.equal(new Set(keys).size, keys.length, "no variable is set twice");
  }
  const shared = new Set(sharedVariables(palette).map(([k]) => k));
  for (const [k] of dark) assert.ok(!shared.has(k), `${k} is both shared and per mode`);
});

test("every palette color is exported as --instrument-*, in both modes", () => {
  for (const mode of MODES) {
    const vars = asMap(modeVariables(palette, mode));
    for (const [name, value] of Object.entries(palette.colors))
      assert.equal(vars.get(`instrument-${name}`), value[mode], `${name} ${mode}`);
    assert.equal(vars.get("instrument-shadow"), palette.shadow[mode]);
  }
});

test("text stays readable in both modes", () => {
  for (const mode of MODES) {
    const v = asMap(modeVariables(palette, mode));
    const pairs: [string, string, number][] = [
      ["primary-text-color", "primary-background-color", 7],
      ["primary-text-color", "card-background-color", 7],
      ["secondary-text-color", "card-background-color", 4.5],
      ["primary-color", "card-background-color", 4.5],
      ["text-primary-color", "primary-color", 4.5],
      ["sidebar-text-color", "sidebar-background-color", 4.5],
      ["sidebar-selected-text-color", "sidebar-background-color", 4.5],
      ["primary-text-color", "bubble-button-accent-color", 7],
      // The Bubble module's state line: faint when off, hi when on; separator labels muted.
      ["instrument-faint", "instrument-card", 4.5],
      ["instrument-hi", "instrument-card", 4.5],
      ["instrument-hi", "bubble-button-accent-color", 4.5],
      ["instrument-muted", "instrument-card", 4.5],
    ];
    for (const [fg, bg, min] of pairs) {
      const ratio = contrast(v.get(fg) as string, v.get(bg) as string);
      assert.ok(ratio >= min, `${mode}: ${fg} on ${bg} is ${ratio.toFixed(2)}:1, under ${min}:1`);
    }
  }
});

test("text stays readable on the module's tinted fills, whatever the light's color", () => {
  // The module draws an "on" fill as color-mix(<color> 16%, transparent) over the card.
  const lights = [
    "#4c8dff",
    "#0000ff",
    "#000080",
    "#c80000",
    "#7828c8",
    "#bdbdb0",
    "#ffd400",
    "#ffffff",
  ];
  for (const mode of MODES) {
    const v = asMap(modeVariables(palette, mode));
    const card = v.get("card-background-color") as string;
    const text = v.get("primary-text-color") as string;
    for (const light of lights) {
      const ratio = contrast(text, mix(card, light, 0.16));
      assert.ok(ratio >= 7, `${mode}: text on a ${light} tint is ${ratio.toFixed(2)}:1`);
    }
  }
});

test("the dark theme uses the accent, the light theme its darker ink", () => {
  const dark = asMap(modeVariables(palette, "dark"));
  const light = asMap(modeVariables(palette, "light"));
  assert.equal(dark.get("primary-color"), palette.colors.ac.dark);
  assert.equal(dark.get("ha-color-primary-40"), palette.colors.ac.dark);
  assert.equal(light.get("primary-color"), palette.colors["ac-ink"].light);
  assert.equal(dark.get("rgb-primary-color"), triple(palette.colors.ac.dark));
  assert.equal(dark.get("primary-background-color"), palette.colors.canvas.dark);
  assert.equal(light.get("ha-card-background"), palette.colors.card.light);
});

test("corners and fonts come from the palette", () => {
  const shared = asMap(sharedVariables(palette));
  assert.equal(shared.get("ha-card-border-radius"), palette.radius.card);
  assert.equal(shared.get("bubble-button-border-radius"), palette.radius.card);
  assert.equal(shared.get("bubble-icon-border-radius"), palette.radius.panel);
  assert.equal(shared.get("mush-chip-border-radius"), palette.radius.panel);
  assert.equal(shared.get("bubble-media-player-buttons-border-radius"), palette.radius.control);
  assert.equal(shared.get("ha-font-family-body"), palette.fonts.sans);
  assert.equal(shared.get("ha-font-family-code"), palette.fonts.mono);
});

test("the primary scale darkens below 40 and lightens above it", () => {
  const s = primaryScale("#4c8dff");
  const lum = (hex: string) => contrast(hex, "#000000");
  const keys = ["05", "10", "20", "30", "40", "50", "60", "70", "80", "90", "95"];
  assert.deepEqual(Object.keys(s).sort(), [...keys].sort());
  for (let i = 1; i < keys.length; i++) assert.ok(lum(s[keys[i]]) > lum(s[keys[i - 1]]), keys[i]);
});

test("color helpers", () => {
  assert.equal(mix("#000000", "#ffffff", 0.5), "#808080");
  assert.equal(triple("#10151f"), "16, 21, 31");
  assert.equal(yamlValue("#10151f"), '"#10151f"');
  assert.equal(yamlValue('"JetBrains Mono", monospace'), `'"JetBrains Mono", monospace'`);
  assert.throws(() => triple("red"), /hex/);
  const broken = structuredClone(palette);
  broken.colors.card.light = "white";
  assert.throws(() => colors(broken, "light"), /card has no hex value in light/);
});

test("the file is one Instrument theme with a dark and a light mode", () => {
  const yaml = buildTheme(palette);
  assert.match(yaml, /^# Instrument, a Home Assistant theme/);
  assert.match(yaml, /\nInstrument:\n {2}ha-font-family-body: /);
  assert.match(yaml, /\n {2}modes:\n {4}dark:\n {6}primary-color: "#/);
  assert.match(yaml, /\n {4}light:\n {6}primary-color: "#/);
  // Every value line is quoted, so YAML never reads a color as a comment or a number.
  for (const line of yaml.split("\n").filter((l) => /^ {2,6}[a-z]/.test(l) && !/:\s*$/.test(l)))
    assert.match(line, /: ["']/, line);
});

test("the Bubble module is one global module whose colors all fall back", () => {
  const yaml = read("bubble/instrument.yaml");
  assert.match(yaml, /^instrument:\n {2}name: "Instrument"\n/);
  assert.match(yaml, /\n {2}code: \|\n/);
  assert.match(yaml, /\n {2}is_global: true\n/, "every Bubble card gets it");
  // Bubble picks sub-button text from the raw fill; both tones must follow the theme,
  // since the module draws every fill as a quiet tint.
  assert.match(yaml, /--bubble-sub-button-dark-text-color: var\(--primary-text-color\);/);
  assert.match(yaml, /--bubble-sub-button-light-text-color: var\(--primary-text-color\);/);
  // Under another theme a bare var(--instrument-*) is empty and the color drops out.
  assert.equal(yaml.match(/var\(--instrument-[a-z0-9-]+\)/g), null);
  assert.equal(yaml.match(/var\(--bubble-slider-fill-color\)/g), null);
  assert.equal(yaml.split("{").length, yaml.split("}").length, "braces balance");
  // Every color it reads is one the theme sets.
  const exported = new Set(modeVariables(palette, "dark").map(([k]) => k));
  for (const [, name] of yaml.matchAll(/var\(--(instrument-[a-z0-9-]+)/g))
    assert.ok(exported.has(name), `${name} is not set by the theme`);
});

test("nothing in the published files names the private project it came from", () => {
  for (const path of [
    "themes/instrument.yaml",
    "bubble/instrument.yaml",
    "src/palette.json",
    "src/theme.ts",
  ])
    assert.doesNotMatch(read(path), /jv-|jarvis/i, path);
});

test("the project is written in American English", () => {
  const files = [
    "README.md",
    "CONTRIBUTING.md",
    "CHANGELOG.md",
    "src/theme.ts",
    "scripts/build.ts",
    "bubble/instrument.yaml",
    "themes/instrument.yaml",
  ];
  const british =
    /\b(colours?|behaviours?|favou?rites?|centre[sd]?|licence|organis\w*|recognis\w*|customis\w*|optimis\w*|analys(e|ed|ing)|greys?)\b/i;
  for (const path of files) assert.doesNotMatch(read(path), british, path);
});

test("the README uses full URLs, since Home Assistant's store page can't resolve relative ones", () => {
  const readme = read("README.md");
  assert.equal(readme.match(/src="(?!https:\/\/)[^"]*"/g), null, "an image path is relative");
  assert.equal(readme.match(/\]\((?!https:\/\/|#)[^)]*\)/g), null, "a link is relative");
});
