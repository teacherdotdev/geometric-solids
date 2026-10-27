import { DIMENSION_MIN, DIMENSION_STEP, DIMENSION_TYPED_MAX } from "./types";

export type DimensionParse =
  | { readonly ok: true; readonly value: number }
  | { readonly ok: false; readonly message: string };

export const RANGE_MESSAGE = `Enter a number from ${DIMENSION_MIN} to ${DIMENSION_TYPED_MAX}`;
export const STEP_MESSAGE = `Use steps of ${DIMENSION_STEP}, for example 2.5`;

/**
 * Parse a dimension draft. Invalid drafts are rejected outright rather than
 * silently corrected, so the teacher sees why the shape did not change and the
 * previous valid geometry stays on screen.
 */
export function parseDimension(raw: string): DimensionParse {
  const text = raw.trim();
  if (text === "") return { ok: false, message: "Enter a number" };
  if (!/^\d*\.?\d*$/.test(text) || text === ".") {
    return { ok: false, message: RANGE_MESSAGE };
  }

  const value = Number(text);
  if (!Number.isFinite(value)) return { ok: false, message: RANGE_MESSAGE };
  if (value < DIMENSION_MIN || value > DIMENSION_TYPED_MAX)
    return { ok: false, message: RANGE_MESSAGE };

  // Work in tenths so 0.3 does not fail on binary floating-point error.
  const tenths = value * 10;
  if (Math.abs(tenths - Math.round(tenths)) > 1e-9)
    return { ok: false, message: STEP_MESSAGE };

  return { ok: true, value: Math.round(tenths) / 10 };
}

/** Canonical text for a valid dimension, used to seed and reset input drafts. */
export function dimensionToDraft(value: number): string {
  return String(Math.round(value * 10) / 10);
}
