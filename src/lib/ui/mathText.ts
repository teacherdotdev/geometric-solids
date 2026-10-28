/**
 * Splitting maths text so a square root can be drawn with a vinculum.
 *
 * The exact answers arrive as plain text such as `√2`, `2√3π` or
 * `√(3² + 4²)`. A bare `√` in front of a long radicand is ambiguous — √3121
 * could be read as √3 · 121 — so the view draws the bar a textbook uses. This
 * module only decides which characters live under that bar; the drawing is in
 * MathText.svelte, and in the tspans the net labels use.
 */
export type MathSegment =
  | { readonly kind: "text"; readonly text: string }
  | { readonly kind: "radical"; readonly radicand: string };

const RADICAL = "√";

/** The parenthesised group at `open`, without its brackets, or null. */
function bracketed(
  text: string,
  open: number,
): { body: string; end: number } | null {
  let depth = 0;
  for (let i = open; i < text.length; i += 1) {
    if (text[i] === "(") depth += 1;
    else if (text[i] === ")") {
      depth -= 1;
      if (depth === 0) return { body: text.slice(open + 1, i), end: i + 1 };
    }
  }
  return null;
}

/**
 * The number at `start`. Only digits go under the bar when there are no
 * brackets, because `2√3π` means 2 · √3 · π: the π is outside the root.
 */
function number(
  text: string,
  start: number,
): { body: string; end: number } | null {
  const match = /^\d+(?:\.\d+)?/.exec(text.slice(start));
  if (!match) return null;
  return { body: match[0], end: start + match[0].length };
}

/**
 * Plain runs and radicals, in order. A `√` whose radicand cannot be identified
 * stays in the plain text, so nothing is ever lost from the original string.
 */
export function splitMath(text: string): MathSegment[] {
  const segments: MathSegment[] = [];
  let plain = "";
  let i = 0;

  while (i < text.length) {
    if (text[i] !== RADICAL) {
      plain += text[i];
      i += 1;
      continue;
    }
    const radicand =
      text[i + 1] === "(" ? bracketed(text, i + 1) : number(text, i + 1);
    if (!radicand) {
      plain += text[i];
      i += 1;
      continue;
    }
    if (plain) segments.push({ kind: "text", text: plain });
    plain = "";
    segments.push({ kind: "radical", radicand: radicand.body });
    i = radicand.end;
  }

  if (plain) segments.push({ kind: "text", text: plain });
  return segments;
}

/** True when `text` has at least one root worth drawing a bar over. */
export function hasRadical(text: string): boolean {
  return splitMath(text).some((segment) => segment.kind === "radical");
}

/**
 * Splitting maths text so a fraction can be set as one number over another.
 *
 * Exact values with no terminating decimal arrive written on one line, such as
 * `5√35/47` or `8√2/7`, which reads as 5√35 ÷ 47 only once it has been
 * puzzled out. A fraction is a value written tight against its slash; a
 * spaced ` / 2` is the division step of a substitution and stays on the line.
 */
export type FractionSegment =
  | { readonly kind: "text"; readonly text: string }
  | {
      readonly kind: "fraction";
      readonly numerator: string;
      readonly denominator: string;
    };

/**
 * The numerator runs back from the slash to the nearest space, bracket,
 * operator or sign; the denominator is the whole number after it.
 */
const FRACTION = /([^\s()×=+\-−/·,]+)\/(\d+)/g;

/**
 * Plain runs and fractions, in order. Brackets that hold nothing but a
 * fraction are dropped: they only grouped it while it was written on one
 * line, and a stacked fraction is grouped already.
 */
export function splitFractions(text: string): FractionSegment[] {
  const segments: FractionSegment[] = [];
  let last = 0;
  for (const match of text.matchAll(FRACTION)) {
    let at = match.index ?? 0;
    let end = at + match[0].length;
    if (text[at - 1] === "(" && text[end] === ")" && at - 1 >= last) {
      at -= 1;
      end += 1;
    }
    if (at > last) segments.push({ kind: "text", text: text.slice(last, at) });
    segments.push({
      kind: "fraction",
      numerator: match[1],
      denominator: match[2],
    });
    last = end;
  }
  if (last < text.length)
    segments.push({ kind: "text", text: text.slice(last) });
  return segments;
}
