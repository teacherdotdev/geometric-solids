# Geometric Solids — product requirements

Status: implemented. This document remains the specification of record; see
[Current implementation state](#current-implementation-state).

## Purpose

Help a sixth-grade math teacher demonstrate how a solid's dimensions relate to its surface area and volume. The primary experience is a teacher controlling the app on a projected screen, not independent student practice.

The originating teacher request was for a rotating 3D shape app with editable length, width, and height. Follow-up discovery expanded the scope below.

## Confirmed decisions

| Area | Decision |
| --- | --- |
| Primary use | Teacher-led classroom demonstration |
| Solids | Rectangular prism, cube, right-triangular prism, square pyramid, cylinder, cone, sphere |
| Manipulation | Rotatable 3D solids with editable relevant dimensions |
| Calculation | Live formulas, substituted dimensions, and final results |
| Answer reveal | Hide final answers only — numerical results, and a cross section's name; formulas, substituted dimensions and side lengths remain visible |
| Surface explanation | Highlight individual faces or curved surfaces and relate them to the surface-area calculation |
| Nets | Toggle between a solid and its accurately scaled flat net, not animated unfolding or side-by-side views |
| Triangular prism | Right-triangle base; enter both perpendicular legs and prism length |
| π | Show exact π expressions and an approximate decimal using calculator π, not 3.14 |
| Volume visualization | A Cubes view shows a rectangular prism or cube as unit cubes that move between the solid and a flat arrangement of its layers (added after launch at a teacher's request; see [Show a solid in unit cubes](#show-a-solid-in-unit-cubes)) |
| Cross sections | A Slice view cuts a solid with a horizontal, vertical or 45° diagonal cutting plane and draws the cross section face-on with its name, side lengths and area (added after launch at a teacher's request; see [Slice a solid](#slice-a-solid)). It is about the 2D shape, not about building up volume |
| Textbook workflow | Let the teacher float the interactive lab above a textbook in another tab |

## Proposed defaults

These are implementation recommendations, not separately confirmed requirements.

- All solids are closed. Surface area means total external area, including bases.
- Dimension inputs accept 0.1–20 inclusive in increments of 0.1. Reject invalid entries rather than silently changing them.
- Select cm, m, inches, or generic units. The selector changes the measurement label, not the physical-unit conversion; make this behavior explicit.
- Length uses linear units, surface area square units, and volume cubic units.
- Decimal answers display up to two decimal places. Use an approximation sign when the displayed value is rounded.
- Start rotation paused. Support pointer/touch dragging, keyboard rotation, optional auto-rotation, and reset view. Honor reduced-motion preferences.
- Keep each shape's last valid dimensions while switching shapes during the current session; no persistence across reloads is required.
- Start with answers visible. Preserve the teacher's answer-visibility choice when changing shapes, dimensions, or views.
- Surface highlighting works through labeled controls, not only hover or color.
- Use a desktop/projector-first layout that remains usable on tablets and narrow screens.
- No accounts, student data, backend, saved lessons, quizzes, or sharing workflows.
- Name: Geometric Solids, at geometricsolids.org.

## Essential interactions

### Choose and resize a solid

1. Select one of seven solids.
2. Show only its relevant independent dimensions, with labels on the solid.
3. Edit a number or use a range control.
4. Update the solid's proportions, net, and calculations from the same validated geometry.
5. Identify derived measurements such as a cone's slant height as calculated, not independently editable.

### Rotate the solid

- Drag in the 3D view to change orientation.
- Provide keyboard-accessible rotation and reset controls.
- Allow the teacher to start and stop continuous rotation.
- Rotation changes the view only, not dimensions or calculated quantities.

### Explain surface area

- Every surface is named and carries its own formula.
- Pointing at a surface, or at an edge, measures it in place: the surface's formula, substitution and area, or the edge's length. Clicking keeps the measurement on screen until it is clicked again.
- A measurement is also reachable without a pointer: each surface has a focusable badge on the solid, and each dimension has a focusable symbol in the dimension bar.
- Use matching names and secondary visual cues across the solid, net, and measurement so meaning does not depend on color.
- Total surface area counts each external surface exactly once.

### Switch to a net

- Toggle to a flat, proportionally accurate net for the five developable solids.
- Preserve dimensions and surface identity across views.
- A cylinder's lateral surface is a rectangle of dimensions 2πr by h.
- A cone's lateral surface is a sector, not a triangle. Its radius is the cone's slant height and its arc length equals the base circumference.
- A sphere cannot have an exact flat net without distortion. Explain this explicitly; do not display a misleading net. Its 3D view and calculations remain available.
- Auto-rotation does not run while showing a net.

### Show a solid in unit cubes

Students build their sense of volume by counting unit cubes, and adjustable
pictures of the same solid whole and in cubes are hard to come by.

- A **Cubes** tab sits between Solid and Net. It is offered only for the rectangular prism and the cube, which whole unit cubes fill exactly; on any other solid it is greyed out with a one-line reason, and choosing such a solid while in Cubes returns to the Solid view.
- Entering Cubes rounds each edge to the nearest whole number (halves up, at least 1) and caps it at 10, visibly in the dimension bar. The change stays after leaving. While in Cubes, the dimension controls step by 1 and a typed edge that is not a whole number from 1 to 10 is refused with an input error.
- Exactly V unit cubes are on screen at all times. Each is either stacked in the solid or lying in the **flat arrangement**: the solid's layers laid end to end along its length, beside the solid after a one-unit gap, making one layer h·l long and w wide. A faint outline of the solid and a faint footprint of the flat arrangement are always shown.
- The fill — how many cubes are stacked — starts full. Controls, left to right: all flat, one cube out, play/pause, one cube in, all stacked. Play moves cubes into the solid one at a time along a row, row by row across a layer, then layer by layer upward, at about 4 per second, faster for a big solid so a full fill takes no more than about 20 seconds. All flat and all stacked move whole layers over about 1.5 seconds. With reduced motion, play moves a layer per step and all flat/all stacked land at once.
- Layers alternate between two shades in both arrangements, so a layer can be recognised after it moves.
- The solid's edges are labelled l, w and h (s for a cube); the flat arrangement's w and h × l, with the evaluated length only while answers are visible.
- While answers are visible, a count reads "24 of 60 unit cubes stacked". While they are hidden there is no count, no total and no evaluated flat length anywhere, including accessible descriptions.
- Both totals stay in their corner. Surface badges and surface measurement are not shown. The floor grid is fixed at one unit, so each square is one cube's footprint.
- Drag, keyboard rotation and reset work as in the Solid view. Auto-rotation is turned off, and unavailable, while every cube lies flat.
- Changing a dimension keeps a full solid full and an empty one empty; a part-filled solid keeps its count, capped at the new total. Coming back to Cubes starts full.

### Slice a solid

Students describe the two-dimensional figures that result from slicing
three-dimensional figures (CCSS 7.G.A.3), and a cut is hard to show with a
real solid. A teacher asked to slice the shapes parallel to the base,
perpendicular to it, or at a diagonal.

- A **Slice** tab sits after Net: Solid | Cubes | Net | Slice. It is offered for all seven picker solids. The logo solid's Slice tab is greyed out with a one-line reason, and choosing the logo while in Slice returns to the Solid view.
- Directions are measured against the solid's **bottom face**, the face it stands on. For the triangular prism that is the leg-a rectangle, not one of its triangular bases, so its horizontal slices are rectangles.
- Three buttons choose the **slice direction**: **Horizontal**, **Vertical** and **Diagonal**. Their hints and accessible descriptions say "parallel to the bottom face" and "perpendicular to the bottom face". Vertical has two headings (front to back, side to side) and Diagonal four (a 45° plane leaning toward the front, back, left or right); a turn button steps through them. The same seven slices are offered on every solid; on the cylinder and cone the four diagonals give the same cross section, which is itself worth noticing. The sphere has no direction controls, because every slice of a sphere is a circle.
- One **slice position** slider moves the cutting plane along one axis, in the solid's units and steps of 0.1, with a typed entry like the dimension inputs:
  - Horizontal: height above the bottom face.
  - Vertical: distance in from the side.
  - Diagonal: how far the plane has slid, along the line it leans along, from where it first touches the solid.
  - Sphere: height above its lowest point.

  The position is drawn on the solid as a measured line, and the 90° or 45° angle between the cutting plane and the bottom face is marked.
- The slider stops just short of both ends, where the plane would only touch the solid at a point, an edge or a face, so there is always a real cross section. Changing direction, heading, solid or dimensions keeps the position, pulled back into range when it no longer fits. Slice opens on Horizontal at half height.
- On the solid, the cutting plane is drawn see-through and the cross section is outlined where it meets the surface. The solid is not cut apart. Drag, keyboard rotation and reset work as in the Solid view and the plane turns with the solid; auto-rotation is turned off.
- The stage splits: the solid and its plane on one side, the **cross-section drawing** on the other, always side by side. The panels run along the top and bottom edges, so the room they leave is a band across the middle; both halves are fitted into it, on a phone as in the floating window. The drawing is the cross section seen face-on, at the same scale as the solid beside it and on a unit grid.
- The drawing always shows:
  - the cross section's most specific name: square rather than rectangle; equilateral, isosceles or right triangle where true, otherwise triangle; trapezoid; circle, ellipse, part of an ellipse, parabola region, hyperbola region. These slice directions never give a pentagon or hexagon;
  - a length on every straight side;
  - on a curved cross section, the radius, the two axes of an ellipse, or the width and height of a region;
  - its area, in a card beside it.
- Pointing at an edge of the drawing measures it, and lights the matching segment of the outline on the solid. Pointing at the cross section shows its formula, substitution and area, with the height line that ½bh or ½(b₁ + b₂)h needs drawn in. Clicking keeps the measurement on screen. Each edge and the cross section have focusable badges, so every measurement is reachable without a pointer.
- Area formulas: the standard formula wherever there is one (lw, s², ½bh, ½(b₁ + b₂)h, πr², πab). A parabola region uses Archimedes' ⅔wh. Part of an ellipse and a hyperbola region show an approximate area only, with no formula and a note that working it out needs mathematics beyond this course.
- Numbers follow the rest of the app: exact with an approximation beside it, and approximate only where the app cannot write an exact value — mainly cylinder and cone slices that cut through a disk.
- While answers are hidden, the cross section's name and its evaluated area are hidden everywhere, including accessible descriptions; side lengths, formulas and substitutions stay visible.
- Both totals stay in their corner, and slicing never changes them.

### Float over a textbook

- A `Float` control opens the complete interactive lab in a browser-managed, always-on-top window so the teacher can switch to a textbook tab without losing the lab.
- Keep the current solid, dimensions, view, and answer state when entering or leaving the floating window.
- The floating window offers no return control of its own. Coming back is the browser's own back-to-tab button, which takes the teacher to the tab rather than only sending the lab there.
- Leave a clear explanation and return control in the original tab while the lab is floating.
- Disable the control with an accessible explanation when the browser does not support Document Picture-in-Picture.

### Hide and reveal answers

- An eye control beside the totals hides the final numerical surface-area and volume results.
- General formulas and substitutions remain available for student discussion: per surface in its measurement, and for the totals behind the `fx` control beside them.
- While hidden, neither the exact nor approximate final result is exposed in tooltips, accessible labels, or alternate views.
- Avoid completed numerical face-area subtotals while answers are hidden; surface names and unevaluated expressions remain available.
- In the Slice view the cross section's name counts as an answer and hides with the results; its side lengths do not.
- Revealing answers displays the current geometry's results, not stale values.

## Acceptance examples

- A 3 × 4 × 5 rectangular prism has surface area 94 square units and volume 60 cubic units.
- A cube with side 2 has surface area 24 square units and volume 8 cubic units.
- A right-triangular prism with legs 3 and 4 and prism length 5 has a hypotenuse of 5, surface area 72 square units, and volume 30 cubic units.
- A square pyramid with base side 6 and perpendicular height 4 has slant height 5, surface area 96 square units, and volume 48 cubic units.
- A cylinder with radius 2 and height 3 has surface area 20π square units and volume 12π cubic units.
- A cone with radius 3 and perpendicular height 4 has slant height 5, surface area 24π square units, and volume 12π cubic units.
- A sphere with radius 3 has surface area 36π square units and volume 36π cubic units; no exact net is offered.
- Entering an empty, zero, negative, out-of-range, or nonfinite dimension never produces a malformed solid or NaN result. Show an input error and retain the last valid geometry.
- Changing shape or view while answers are hidden does not reveal a final result.
- Floating the lab, changing a dimension there, and returning it to the tab preserves the changed geometry and results.
- A 3 × 4 × 5 rectangular prism in Cubes shows 60 unit cubes; laid flat they form one 15 × 4 layer of the same 60 cubes.
- Entering Cubes with a 3.5 × 40 × 5 prism changes it to 4 × 10 × 5, which shows 200 cubes.
- A square pyramid with base side 6 and height 4, sliced horizontally at height 2, gives a 3 × 3 square of area 9.
- The same pyramid sliced vertically 3 in from the side, through its tip, gives an isosceles triangle with sides 6, 5 and 5, height 4 and area 12; 1 in from the side it gives a trapezoid with parallel sides 6 and 4, height 4/3 and area 20/3.
- A 3 × 4 × 5 rectangular prism sliced horizontally at any height gives a rectangle equal to its bottom face.
- A cube with side 2 sliced diagonally through opposite edges (position 2) gives a 2 × 2√2 rectangle of area 4√2 ≈ 5.66.
- A right-triangular prism with legs 3 and 4 and length 5, sliced across its length, gives a right triangle with sides 3, 4 and 5 and area 6; sliced horizontally at height 2 it gives a 1.5 × 5 rectangle of area 7.5.
- A cylinder with radius 1 and height 4 sliced diagonally through its centre (position 3) gives an ellipse with axes 2 and 2√2 and area √2π ≈ 4.44. A cylinder with radius 2 and height 3 sliced diagonally through its centre gives part of an ellipse, with an approximate area only.
- A sphere with radius 3 sliced at height 1 gives a circle of radius √5 and area 5π ≈ 15.71.
- With answers hidden, the Slice view shows the cross section's side lengths and formula but not its name or evaluated area.
- Every essential action can be performed without a mouse.

## Implementation constraints

Follow the workspace and project AGENTS.md files: Bun, TypeScript, SvelteKit, Tailwind CSS, ESLint, and a blank Prettier configuration. Prefer accessible DOM/SVG presentation where practical. Start local development servers only through the workspace's scripts/agent-dev.mjs allocator.

## Current implementation state

Built as a single prerendered SvelteKit page.

- `src/lib/domain/` holds the pure model: exact rational/radical/π arithmetic
  (`rational.ts`, `exact.ts`), the seven picker solids and their surface decomposition
  (`solids.ts`), 3D meshes and measurable edges (`geometry3d.ts`), net layouts
  (`nets.ts`), unit-cube layout and fill steps (`unitCubes.ts`), input
  validation (`validation.ts`), and unit labels
  (`format.ts`). None of it imports Svelte, and it is covered by
  `src/lib/domain/*.test.ts`.
- `src/lib/state/lab.svelte.ts` keeps geometry, input drafts, and presentation
  state separate, as described in [domain-model.md](domain-model.md). What is
  being measured is a hovered or pinned _target_: one surface, or one length
  that every edge carrying it responds to.
- `src/lib/components/` renders the solid, its unit cubes (`CubeView.svelte`)
  and the net as accessible SVG. The
  shape fills the screen; four small panels float over it — the solid picker
  top left, the view, unit, and floating-window controls top right, the
  dimensions bottom left, and the two totals bottom right. `ShapeLab.svelte`
  mounts the same stateful experience in the page or in a Document
  Picture-in-Picture window.
- `tests/shape-lab.spec.ts` covers the browser behaviour listed in the domain
  model's verification section.

Run it with the workspace allocator, never a bare `bun run dev`:

```sh
./scripts/agent-dev.mjs 3d-surface-area-volume --no-pocketbase
```

Checks: `bun run test` (model), `bun run check` (types), `bun run lint`,
`bun run format:check`, and `BASE_URL=<allocated url> bun run test:e2e`
against a running server.

See [domain-model.md](domain-model.md) for geometry, formulas, and state rules.
