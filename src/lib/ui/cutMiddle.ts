/**
 * Where the slice view's round window centres the cut: the middle of the box
 * around it, so it grows and shrinks straight about its own middle as the
 * plane moves. A curved cut can reach a little outside the window from there,
 * so then the middle slides toward the centre of the smallest circle around
 * the cut, just far enough to hold it. That circle is never wider than the
 * solid's extent, as the whole cut lies within the extent of the solid's
 * centre, so a window that holds the extent can always hold the cut.
 */

export type Point = readonly [number, number];

export interface Circle {
  readonly centre: Point;
  readonly radius: number;
}

const SLACK = 1e-9;

function contains(circle: Circle, [x, y]: Point): boolean {
  return (
    Math.hypot(x - circle.centre[0], y - circle.centre[1]) <=
    circle.radius + SLACK * Math.max(1, circle.radius)
  );
}

function across(a: Point, b: Point): Circle {
  return {
    centre: [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2],
    radius: Math.hypot(a[0] - b[0], a[1] - b[1]) / 2,
  };
}

/** The circle through three points, or null when they lie on one line. */
function through(a: Point, b: Point, c: Point): Circle | null {
  const [bx, by] = [b[0] - a[0], b[1] - a[1]];
  const [cx, cy] = [c[0] - a[0], c[1] - a[1]];
  const d = 2 * (bx * cy - by * cx);
  if (Math.abs(d) < SLACK) return null;
  const b2 = bx * bx + by * by;
  const c2 = cx * cx + cy * cy;
  const x = (cy * b2 - by * c2) / d;
  const y = (bx * c2 - cx * b2) / d;
  return { centre: [a[0] + x, a[1] + y], radius: Math.hypot(x, y) };
}

/**
 * Welzl's incremental construction. It takes points in the order given, which
 * is quick enough for the few dozen corners a cut has, and keeps the result
 * the same for the same cut.
 */
export function smallestCircle(points: readonly Point[]): Circle {
  if (points.length === 0) return { centre: [0, 0], radius: 0 };
  let circle: Circle = { centre: points[0], radius: 0 };
  for (let i = 1; i < points.length; i += 1) {
    if (contains(circle, points[i])) continue;
    // points[i] lies on the circle around the first i + 1 points.
    circle = { centre: points[i], radius: 0 };
    for (let j = 0; j < i; j += 1) {
      if (contains(circle, points[j])) continue;
      // So do points[i] and points[j].
      circle = across(points[i], points[j]);
      for (let k = 0; k < j; k += 1) {
        if (contains(circle, points[k])) continue;
        circle = through(points[i], points[j], points[k]) ?? circle;
      }
    }
  }
  return circle;
}

function farthest([cx, cy]: Point, points: readonly Point[]): number {
  return Math.max(...points.map(([x, y]) => Math.hypot(x - cx, y - cy)));
}

/**
 * The middle to centre a cut on in a round window of the given radius: the
 * middle of its box when the cut fits around that, or else as little of the
 * way toward its smallest circle's centre as lets it fit.
 */
export function cutMiddle(points: readonly Point[], radius: number): Point {
  if (points.length === 0) return [0, 0];
  const xs = points.map(([x]) => x);
  const ys = points.map(([, y]) => y);
  const box: Point = [
    (Math.min(...xs) + Math.max(...xs)) / 2,
    (Math.min(...ys) + Math.max(...ys)) / 2,
  ];
  if (farthest(box, points) <= radius) return box;
  const snug = smallestCircle(points).centre;
  const toward = (share: number): Point => [
    box[0] + (snug[0] - box[0]) * share,
    box[1] + (snug[1] - box[1]) * share,
  ];
  // How far a point lies from the farthest of the cut only falls and rises
  // once along the way, so halving the step finds where it first fits.
  let [short, enough] = [0, 1];
  for (let step = 0; step < 30; step += 1) {
    const share = (short + enough) / 2;
    if (farthest(toward(share), points) <= radius) enough = share;
    else short = share;
  }
  return toward(enough);
}
