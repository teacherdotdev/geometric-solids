import { describe, expect, it } from "vitest";
import { type Point, cutMiddle, smallestCircle } from "./cutMiddle";

describe("the smallest circle around a cut", () => {
  it("sits in the middle of a rectangle, through its corners", () => {
    const circle = smallestCircle([
      [0, 0],
      [4, 0],
      [4, 3],
      [0, 3],
    ]);
    expect(circle.centre[0]).toBeCloseTo(2);
    expect(circle.centre[1]).toBeCloseTo(1.5);
    expect(circle.radius).toBeCloseTo(2.5);
  });

  it("spans the long side of an obtuse triangle", () => {
    const circle = smallestCircle([
      [0, 0],
      [10, 0],
      [5, 1],
    ]);
    expect(circle.centre[0]).toBeCloseTo(5);
    expect(circle.centre[1]).toBeCloseTo(0);
    expect(circle.radius).toBeCloseTo(5);
  });

  it("passes through all three corners of an acute triangle", () => {
    const circle = smallestCircle([
      [0, 0],
      [2, 0],
      [1, Math.sqrt(3)],
    ]);
    expect(circle.centre[0]).toBeCloseTo(1);
    expect(circle.centre[1]).toBeCloseTo(1 / Math.sqrt(3));
    expect(circle.radius).toBeCloseTo(2 / Math.sqrt(3));
  });

  it("holds every point of a curved outline", () => {
    const points: Point[] = Array.from({ length: 60 }, (_, i) => {
      const angle = (i / 60) * Math.PI * 2;
      return [3 + 2 * Math.cos(angle), -1 + Math.sin(angle)];
    });
    const circle = smallestCircle(points);
    expect(circle.centre[0]).toBeCloseTo(3);
    expect(circle.centre[1]).toBeCloseTo(-1);
    expect(circle.radius).toBeCloseTo(2);
    for (const [x, y] of points)
      expect(
        Math.hypot(x - circle.centre[0], y - circle.centre[1]),
      ).toBeLessThanOrEqual(circle.radius + 1e-9);
  });
});

describe("the middle a cut is centred on", () => {
  const trapezoid: Point[] = [
    [0, 0],
    [6, 0],
    [4, 2],
    [2, 2],
  ];

  it("is the middle of the box around it, where that fits", () => {
    expect(cutMiddle(trapezoid, 10)).toEqual([3, 1]);
  });

  it("slides toward the smallest circle just far enough to fit", () => {
    // From the box's middle the far corners are √10 away; the smallest circle
    // has radius 3, centred on the long side.
    const middle = cutMiddle(trapezoid, 3.1);
    const far = Math.max(
      ...trapezoid.map(([x, y]) => Math.hypot(x - middle[0], y - middle[1])),
    );
    expect(far).toBeLessThanOrEqual(3.1);
    expect(far).toBeGreaterThan(3.09);
    expect(middle[0]).toBeCloseTo(3);
    expect(middle[1]).toBeGreaterThan(0);
    expect(middle[1]).toBeLessThan(1);
  });
});
