/**
 * Surface colours.
 *
 * Colour is only ever a secondary cue: a selected surface also gets a hatch
 * pattern, a thicker outline and a short code badge that matches the
 * calculation row, so the app still works for colour-blind students and on a
 * washed-out projector. Each surface of a solid gets its own hue, so two
 * surfaces pinned at once stay told apart.
 */
export const HATCH_PATTERN_ID = "selected-surface-hatch";

/**
 * Hues for selected surfaces, in the order surfaces are listed on a solid.
 * Eight is the most any solid here has (the logo tile's two faces, four
 * straight sides and rounded corners, with one spare), and they are spread far
 * enough apart to stay distinct next to the unselected slate blue.
 */
const SURFACE_HUES = [24, 286, 145, 336, 52, 255, 190, 0];

/** The hue for the nth surface of a solid. */
export function surfaceHue(index: number): number {
  const wrapped =
    ((index % SURFACE_HUES.length) + SURFACE_HUES.length) % SURFACE_HUES.length;
  return SURFACE_HUES[wrapped];
}

/**
 * Shaded fill for a 3D facet, given a diffuse light factor in 0…1. A selected
 * facet is filled in its surface's own hue; `hue` is null when unselected.
 *
 * `baseHue` overrides the usual slate blue for a solid that is a picture of
 * something and so has a colour of its own. Selection still wins over it: a
 * pinned face has to stand out from the rest of its own solid.
 */
export function facetFill(
  hue: number | null,
  diffuse: number,
  baseHue: number | null = null,
): string {
  const clamped = Math.max(0, Math.min(1, diffuse));
  if (hue !== null) return `hsl(${hue} 72% ${48 + 26 * clamped}%)`;
  if (baseHue !== null) return `hsl(${baseHue} 68% ${26 + 46 * clamped}%)`;
  return `hsl(203 40% ${30 + 44 * clamped}%)`;
}

/** Flat fill for a net piece, which has no lighting. */
export function netFill(
  hue: number | null,
  baseHue: number | null = null,
): string {
  if (hue !== null) return `hsl(${hue} 82% 80%)`;
  return baseHue !== null ? `hsl(${baseHue} 74% 80%)` : "hsl(203 38% 88%)";
}

export function netStroke(
  hue: number | null,
  baseHue: number | null = null,
): string {
  if (hue !== null) return `hsl(${hue} 72% 30%)`;
  return baseHue !== null ? `hsl(${baseHue} 46% 26%)` : "hsl(203 34% 34%)";
}

/** Tint for the label chip that opens over a selected surface. */
export function chipTint(hue: number): {
  border: string;
  background: string;
  text: string;
} {
  return {
    border: `hsl(${hue} 65% 38%)`,
    background: `hsl(${hue} 88% 95%)`,
    text: `hsl(${hue} 72% 24%)`,
  };
}

/**
 * Shaded fill for one face of a unit cube. Layers alternate between the
 * solid's own slate blue and a lighter, brighter one, so a layer can still be
 * picked out as the same cubes once it has been laid flat beside the others.
 */
export function cubeFill(layer: number, diffuse: number): string {
  const clamped = Math.max(0, Math.min(1, diffuse));
  return layer % 2 === 0
    ? `hsl(203 40% ${30 + 44 * clamped}%)`
    : `hsl(193 58% ${46 + 36 * clamped}%)`;
}
