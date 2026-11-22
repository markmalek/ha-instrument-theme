// Instrument, a Home Assistant theme, as the YAML Home Assistant reads from its
// themes/ folder. Every colour, font, corner and shadow comes from src/palette.json.
//
// The theme sets three kinds of variable:
//   - Home Assistant's own (backgrounds, cards, text, sidebar, header, states, fonts,
//     and the --ha-color-primary-* scale its newer controls take their accent from);
//   - Bubble Card's bubble-* and Mushroom's mush-*;
//   - the palette itself as --instrument-*, for cards and the Bubble module to read.

export type Mode = "dark" | "light";
export const MODES: Mode[] = ["dark", "light"];

export const THEME_NAME = "Instrument";

export interface Palette {
  colors: Record<string, Record<Mode, string>>;
  fonts: { sans: string; mono: string };
  radius: { card: string; panel: string; control: string };
  shadow: Record<Mode, string>;
}

const HEX = /^#[0-9a-f]{6}$/i;

/** "#4c8dff" → [76, 141, 255]. */
export function rgbOf(hex: string): [number, number, number] {
  if (!HEX.test(hex)) throw new Error(`not a six-digit hex colour: ${hex}`);
  const n = Number.parseInt(hex.slice(1), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

const toHex = (rgb: number[]) =>
  `#${rgb
    .map((c) =>
      Math.round(Math.min(255, Math.max(0, c)))
        .toString(16)
        .padStart(2, "0"),
    )
    .join("")}`;

/** `a` mixed toward `b` by `t` (0 = a, 1 = b), in sRGB. */
export function mix(a: string, b: string, t: number): string {
  const x = rgbOf(a);
  const y = rgbOf(b);
  return toHex(x.map((c, i) => c + (y[i] - c) * t));
}

/** "16, 21, 31": the form Home Assistant's rgb-* variables take. */
export const triple = (hex: string) => rgbOf(hex).join(", ");

/**
 * A tonal scale around the accent for Home Assistant's --ha-color-primary-NN tokens:
 * 40 is the accent itself, lower steps darken toward black, higher ones lighten toward white.
 */
export function primaryScale(accent: string): Record<string, string> {
  const dark: [string, number][] = [
    ["05", 0.82],
    ["10", 0.7],
    ["20", 0.5],
    ["30", 0.25],
  ];
  const light: [string, number][] = [
    ["50", 0.2],
    ["60", 0.36],
    ["70", 0.52],
    ["80", 0.68],
    ["90", 0.84],
    ["95", 0.92],
  ];
  return {
    ...Object.fromEntries(dark.map(([k, t]) => [k, mix(accent, "#000000", t)])),
    "40": accent,
    ...Object.fromEntries(light.map(([k, t]) => [k, mix(accent, "#ffffff", t)])),
  };
}

/** WCAG contrast ratio of two hex colours. */
export function contrast(a: string, b: string): number {
  const lum = (hex: string) => {
    const [r, g, bl] = rgbOf(hex).map((c) => {
      const s = c / 255;
      return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
    });
    return 0.2126 * r + 0.7152 * g + 0.0722 * bl;
  };
  const [hi, lo] = [lum(a), lum(b)].sort((x, y) => y - x);
  return (hi + 0.05) / (lo + 0.05);
}

/** The palette's colours in one mode, by name. Every colour must be a six-digit hex. */
export function colors(palette: Palette, mode: Mode): Record<string, string> {
  const out: Record<string, string> = {};
  for (const [name, value] of Object.entries(palette.colors)) {
    const v = value[mode];
    if (!v || !HEX.test(v)) throw new Error(`${name} has no hex value in ${mode}: ${v}`);
    out[name] = v;
  }
  return out;
}

/** Variables that are the same in both modes: fonts, corners, sizes. */
export function sharedVariables(palette: Palette): [string, string][] {
  const { sans, mono } = palette.fonts;
  const { card, panel, control } = palette.radius;
  return [
    // Fonts. A theme can't load them: a dashboard resource loads Inter and JetBrains Mono.
    ["ha-font-family-body", sans],
    ["ha-font-family-heading", sans],
    ["ha-font-family-code", mono],
    ["ha-font-family-longform", sans],
    ["paper-font-common-base_-_font-family", sans],
    ["mdc-typography-font-family", sans],
    // Cards.
    ["ha-card-border-radius", card],
    ["ha-card-border-width", "1px"],
    ["ha-card-header-font-family", sans],
    ["ha-badge-border-radius", panel],
    // Dialogs and pop-ups are larger than any card, so the palette has no corner for them.
    ["ha-dialog-border-radius", "16px"],
    // Bubble Card shapes.
    ["bubble-border-radius", card],
    ["bubble-icon-border-radius", panel],
    ["bubble-sub-button-border-radius", panel],
    ["bubble-button-border-radius", card],
    ["bubble-button-icon-border-radius", panel],
    ["bubble-media-player-border-radius", card],
    ["bubble-media-player-buttons-border-radius", control],
    ["bubble-media-player-icon-border-radius", panel],
    ["bubble-pop-up-border-radius", "20px"],
    // Mushroom shapes and type.
    ["mush-icon-border-radius", panel],
    ["mush-control-border-radius", panel],
    ["mush-chip-border-radius", panel],
    ["mush-badge-border-radius", panel],
    ["mush-card-primary-font-weight", "500"],
    ["mush-card-secondary-font-weight", "400"],
  ];
}

/** Variables that change with the mode: every colour. */
export function modeVariables(palette: Palette, mode: Mode): [string, string][] {
  const c = colors(palette, mode);
  const shadow = palette.shadow[mode];
  // The accent drawn as a fill or a word: itself on a dark page, the darker ink on a pale one.
  const primary = mode === "dark" ? c.ac : c["ac-ink"];
  // Text on an accent fill: dark ink on the bright dark-mode accent, white on the light-mode ink.
  const onPrimary = mode === "dark" ? "#0a0d14" : "#ffffff";
  const backdrop = mode === "dark" ? "rgba(5, 7, 12, 0.72)" : "rgba(11, 18, 32, 0.32)";
  const scale = primaryScale(primary);

  return [
    // Accent.
    ["primary-color", primary],
    ["accent-color", primary],
    ["dark-primary-color", scale["30"]],
    ["light-primary-color", scale["80"]],
    ["text-primary-color", onPrimary],
    ["rgb-primary-color", triple(primary)],
    ["rgb-accent-color", triple(primary)],
    ["rgb-text-primary-color", triple(onPrimary)],
    ...Object.entries(scale).map(([k, v]): [string, string] => [`ha-color-primary-${k}`, v]),
    // Surfaces.
    ["primary-background-color", c.canvas],
    ["secondary-background-color", c.inset],
    ["lovelace-background", c.canvas],
    ["ha-panel-background", c.canvas],
    ["card-background-color", c.card],
    ["ha-card-background", c.card],
    ["rgb-card-background-color", triple(c.card)],
    ["ha-card-border-color", c.line],
    ["ha-card-box-shadow", shadow],
    ["mdc-theme-surface", c.card],
    ["mdc-theme-background", c.canvas],
    ["clear-background-color", c.canvas],
    ["chip-background-color", c.raised],
    ["data-table-background-color", c.card],
    ["table-row-background-color", c.card],
    ["table-row-alternative-background-color", c.inset],
    ["markdown-code-background-color", c.inset],
    ["input-fill-color", c.inset],
    ["mdc-text-field-fill-color", c.inset],
    ["code-editor-background-color", c.inset],
    // Text.
    ["primary-text-color", c.text],
    ["secondary-text-color", c.soft],
    ["disabled-text-color", c.off],
    ["disabled-color", c.off],
    ["rgb-primary-text-color", triple(c.text)],
    ["rgb-secondary-text-color", triple(c.soft)],
    ["text-light-primary-color", c.strong],
    ["ha-card-header-color", c.strong],
    ["mdc-theme-primary", primary],
    ["mdc-theme-on-primary", onPrimary],
    ["mdc-theme-text-primary-on-background", c.text],
    ["mdc-theme-text-secondary-on-background", c.soft],
    // Lines.
    ["divider-color", c.line],
    ["outline-color", c["line-2"]],
    ["outline-hover-color", c["line-3"]],
    ["scrollbar-thumb-color", c["line-3"]],
    ["input-idle-line-color", c["line-2"]],
    ["input-hover-line-color", c["line-3"]],
    // Sidebar and header.
    ["sidebar-background-color", c.inset],
    ["sidebar-text-color", c.soft],
    ["sidebar-icon-color", c.faint],
    ["sidebar-selected-text-color", c.hi],
    ["sidebar-selected-icon-color", c.hi],
    ["app-header-background-color", c.canvas],
    ["app-header-text-color", c.text],
    ["app-header-border-bottom", `1px solid ${c.line}`],
    ["ha-panel-toolbar-background", c.canvas],
    // Controls.
    ["slider-color", primary],
    ["slider-secondary-color", scale["70"]],
    ["slider-track-color", c.track],
    ["switch-checked-color", primary],
    ["switch-checked-button-color", primary],
    ["switch-checked-track-color", primary],
    ["switch-unchecked-button-color", c.faint],
    ["switch-unchecked-track-color", c.track],
    // Status.
    ["state-active-color", primary],
    ["state-inactive-color", c.idle],
    ["state-icon-color", c.muted],
    ["state-binary_sensor-door-on-color", c.warn],
    ["state-binary_sensor-garage_door-on-color", c.warn],
    ["state-binary_sensor-window-on-color", c.warn],
    ["state-binary_sensor-opening-on-color", c.warn],
    ["state-lock-unlocked-color", c.warn],
    ["state-lock-jammed-color", c.danger],
    ["success-color", c.live],
    ["warning-color", c.warn],
    ["error-color", c.danger],
    ["info-color", primary],
    ["rgb-success-color", triple(c.live)],
    ["rgb-warning-color", triple(c.warn)],
    ["rgb-error-color", triple(c.danger)],
    ["rgb-info-color", triple(primary)],
    ["history-unavailable-color", c.off],
    // Bubble Card colours.
    ["bubble-main-background-color", c.card],
    ["bubble-secondary-background-color", c.inset],
    ["bubble-accent-color", primary],
    // An "on" button without the Instrument module: Bubble paints it solid, so give it
    // a quiet accent tint over the card that keeps the text readable. The module
    // (bubble/instrument.yaml) tints each fill from its own colour instead.
    ["bubble-button-accent-color", mix(c.card, c.ac, 0.16)],
    ["bubble-icon-background-color", c.inset],
    ["bubble-sub-button-background-color", c.inset],
    ["bubble-button-main-background-color", c.card],
    ["bubble-button-icon-background-color", c.inset],
    ["bubble-media-player-main-background-color", c.card],
    ["bubble-media-player-icon-background-color", c.inset],
    ["bubble-media-player-slider-background-color", c.track],
    ["bubble-line-background-color", c.line],
    ["bubble-border", `1px solid ${c.line}`],
    ["bubble-box-shadow", shadow],
    ["bubble-button-box-shadow", shadow],
    ["bubble-media-player-box-shadow", shadow],
    ["bubble-pop-up-background-color", c.canvas],
    ["bubble-pop-up-main-background-color", c.card],
    ["bubble-backdrop-background-color", backdrop],
    // Mushroom colours.
    ["mush-card-primary-color", c.text],
    ["mush-card-secondary-color", c.soft],
    ["mush-title-color", c.strong],
    ["mush-subtitle-color", c.soft],
    ["mush-chip-background", c.card],
    ["mush-chip-border-color", c.line],
    ["mush-rgb-disabled", triple(c.idle)],
    ["mush-rgb-info", triple(primary)],
    ["mush-rgb-success", triple(c.live)],
    ["mush-rgb-warning", triple(c.warn)],
    ["mush-rgb-danger", triple(c.danger)],
    // The palette itself.
    ...Object.entries(c).map(([k, v]): [string, string] => [`instrument-${k}`, v]),
    ["instrument-shadow", shadow],
  ];
}

/** A YAML scalar: double-quoted, or single-quoted when the value holds a double quote. */
export function yamlValue(v: string): string {
  if (v.includes('"')) return `'${v.replace(/'/g, "''")}'`;
  return `"${v.replace(/\\/g, "\\\\")}"`;
}

/** The whole theme file: one theme with shared variables and a dark and a light mode. */
export function buildTheme(palette: Palette): string {
  const lines = [
    "# Instrument, a Home Assistant theme: https://github.com/markmalek/ha-instrument-theme",
    "# Generated by src/theme.ts from src/palette.json: do not edit by hand.",
    `${THEME_NAME}:`,
  ];
  for (const [k, v] of sharedVariables(palette)) lines.push(`  ${k}: ${yamlValue(v)}`);
  lines.push("  modes:");
  for (const mode of MODES) {
    lines.push(`    ${mode}:`);
    for (const [k, v] of modeVariables(palette, mode)) lines.push(`      ${k}: ${yamlValue(v)}`);
  }
  return `${lines.join("\n")}\n`;
}
