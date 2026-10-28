/**
 * Exact values for Geometric Solids.
 *
 * Every surface area and volume this app can produce is a sum of terms shaped
 * like `coefficient × √radicand × πⁿ`, because the only irrational ingredients
 * are π and square roots of rational quantities (hypotenuses and slant
 * heights). Representing results that way lets us print a genuinely exact
 * answer such as `(1 + √2)π` instead of a rounded coefficient pretending to be
 * exact, without pulling in a computer-algebra dependency.
 */
import {
  ONE,
  type Rational,
  add as addRational,
  div as divRational,
  isZero,
  mul as mulRational,
  rational,
  toDecimalString,
  toNumber,
} from "./rational";

export interface ExactTerm {
  readonly coeff: Rational;
  /** Power of π in this term; never exceeds 2 for the supported solids. */
  readonly pi: number;
  /** Positive square-free integer under the radical; 1 means no radical. */
  readonly radicand: bigint;
}

export type Exact = readonly ExactTerm[];

const SUPERSCRIPT = ["⁰", "¹", "²", "³", "⁴"];

/** Split √m into `outside × √inside` with a square-free inside. */
function simplifySqrt(m: bigint): { outside: bigint; inside: bigint } {
  if (m <= 0n)
    throw new Error("Square roots are only taken of positive quantities");
  let outside = 1n;
  let inside = m;
  for (let factor = 2n; factor * factor <= inside; factor += 1n) {
    const square = factor * factor;
    while (inside % square === 0n) {
      inside /= square;
      outside *= factor;
    }
  }
  return { outside, inside };
}

function normalize(terms: Exact): ExactTerm[] {
  const combined = new Map<string, ExactTerm>();
  for (const term of terms) {
    if (isZero(term.coeff)) continue;
    const key = `${term.pi}:${term.radicand}`;
    const existing = combined.get(key);
    combined.set(
      key,
      existing
        ? { ...existing, coeff: addRational(existing.coeff, term.coeff) }
        : term,
    );
  }
  return [...combined.values()]
    .filter((term) => !isZero(term.coeff))
    .sort((a, b) => a.pi - b.pi || Number(a.radicand - b.radicand));
}

export function exactRational(coeff: Rational): Exact {
  return normalize([{ coeff, pi: 0, radicand: 1n }]);
}

export function exactPi(coeff: Rational, power = 1): Exact {
  return normalize([{ coeff, pi: power, radicand: 1n }]);
}

/** √r as an exact value, for example √(1/4) → 1/2 and √8 → 2√2. */
export function exactSqrt(r: Rational): Exact {
  if (r.n < 0n)
    throw new Error("Square roots are only taken of positive quantities");
  // √(n/d) = √(n·d)/d keeps the radicand a whole number.
  const { outside, inside } = simplifySqrt(r.n * r.d);
  return normalize([
    { coeff: rational(outside, r.d), pi: 0, radicand: inside },
  ]);
}

export function addExact(...values: Exact[]): Exact {
  return normalize(values.flat());
}

export function mulExact(...values: Exact[]): Exact {
  let product: Exact = [{ coeff: ONE, pi: 0, radicand: 1n }];
  for (const value of values) {
    const next: ExactTerm[] = [];
    for (const a of product) {
      for (const b of value) {
        const { outside, inside } = simplifySqrt(a.radicand * b.radicand);
        next.push({
          coeff: mulRational(mulRational(a.coeff, b.coeff), rational(outside)),
          pi: a.pi + b.pi,
          radicand: inside,
        });
      }
    }
    product = normalize(next);
  }
  return product;
}

/** Multiply by a plain rational, the common case for scaling a formula term. */
export function scaleExact(value: Exact, factor: Rational): Exact {
  return normalize(
    value.map((term) => ({ ...term, coeff: mulRational(term.coeff, factor) })),
  );
}

/**
 * Divide by a single term without π, such as 5 or 2√2, by rationalising the
 * denominator: x / (c√k) = x√k / (ck). Null for any other divisor, whose
 * quotient this representation cannot always hold.
 */
export function divideExact(value: Exact, divisor: Exact): Exact | null {
  const terms = normalize(divisor);
  if (terms.length !== 1 || terms[0].pi !== 0) return null;
  const { coeff, radicand } = terms[0];
  return mulExact(value, [
    {
      coeff: divRational(ONE, mulRational(coeff, rational(radicand))),
      pi: 0,
      radicand,
    },
  ]);
}

/** Approximate numeric value, using calculator π rather than 3.14. */
export function evalExact(value: Exact): number {
  return value.reduce(
    (sum, term) =>
      sum +
      toNumber(term.coeff) *
        Math.PI ** term.pi *
        Math.sqrt(Number(term.radicand)),
    0,
  );
}

function termText(coeff: Rational, radicand: bigint, piPower: number): string {
  const piText =
    piPower === 0
      ? ""
      : `π${piPower === 1 ? "" : (SUPERSCRIPT[piPower] ?? `^${piPower}`)}`;
  const radicalText = radicand === 1n ? "" : `√${radicand}`;
  const symbolic = `${radicalText}${piText}`;

  const decimal = toDecimalString(coeff);
  if (decimal !== null) {
    if (symbolic === "") return decimal;
    if (decimal === "1") return symbolic;
    if (decimal === "-1") return `-${symbolic}`;
    return `${decimal}${symbolic}`;
  }
  // No terminating decimal, so keep it as a fraction: 2√3π/5 rather than 0.69…
  const numerator =
    coeff.n === 1n && symbolic !== "" ? symbolic : `${coeff.n}${symbolic}`;
  return `${numerator}/${coeff.d}`;
}

/**
 * Exact text such as `94`, `20π`, `(1 + √2)π` or `12 + 5√2`. π is factored out
 * when every term carries it, which is what a teacher writes on the board.
 */
export function formatExact(value: Exact): string {
  const terms = normalize(value);
  if (terms.length === 0) return "0";
  const everyTermHasSinglePi =
    terms.length > 1 && terms.every((term) => term.pi === 1);
  if (everyTermHasSinglePi) {
    return `(${terms.map((term) => termText(term.coeff, term.radicand, 0)).join(" + ")})π`;
  }
  return terms
    .map((term) => termText(term.coeff, term.radicand, term.pi))
    .join(" + ");
}

/** True when the value is a plain rational, so it can be inlined in a substitution. */
export function isRationalExact(value: Exact): boolean {
  const terms = normalize(value);
  return terms.every((term) => term.pi === 0 && term.radicand === 1n);
}
