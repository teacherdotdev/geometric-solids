# Geometric Solids — domain model

Status: proposed model based on confirmed discovery choices. No application implementation yet.

See [requirements.md](requirements.md) for the product decisions and proposed defaults.

## Shared vocabulary

- **Solid:** A closed three-dimensional shape with valid dimensions.
- **Independent dimension:** A measurement entered by the teacher.
- **Derived dimension:** A measurement calculated from independent dimensions, such as a hypotenuse or slant height.
- **Logo solid:** The site's own mark as a tapered rounded-square keyboard key. It is not offered in the shape picker; it is
  reached by clicking the mark beside it. Its measurements are exact like every other solid's.
- **Surface:** One external planar face or curved surface. A sphere has one curved surface; do not describe it as a planar face.
- **Surface area:** Sum of the areas of all external surfaces.
- **Volume:** The three-dimensional space enclosed by the solid.
- **Net:** An arrangement of flat surface pieces that can form the solid. The sphere has no exact distortion-free net.
- **View orientation:** Rotation of the representation, independent of the solid's geometry.
- **Answer visibility:** Whether evaluated final results are shown. It does not change the underlying calculations.
- **Unit cube:** A cube whose edges are one unit long in the chosen measurement unit. Only rectangular prisms and cubes
  with whole-number edges are shown built from unit cubes. _Avoid:_ block, voxel.
- **Row:** A line of unit cubes running along the solid's length.
- **Layer:** A one-cube-high slab of rows covering the solid's base. A solid of height h has h layers. _Avoid:_ slice,
  level.
- **Flat arrangement:** The solid's layers laid end to end along its length, making one layer h times as long as the
  base. It has the same unit cubes, and so the same volume, as the stacked solid. _Avoid:_ unstacked, spread.
- **Fill:** How many of the solid's unit cubes are stacked in it; every other cube lies in the flat arrangement. Empty
  means all are flat and full means all are stacked. Cubes are stacked one at a time, along a row, row by row across a
  layer, and layer by layer upward. _Avoid:_ placed, added: cubes are never created or removed, only moved.

## Solid definitions and formulas

All dimensions are positive. Calculations use full precision internally; rounding is presentation-only.

| Solid | Independent dimensions | Derived dimensions | Total surface area | Volume |
| --- | --- | --- | --- | --- |
| Rectangular prism | length l, width w, height h | None | 2(lw + lh + wh) | lwh |
| Cube | side s | l = w = h = s | 6s² | s³ |
| Right-triangular prism | perpendicular legs a and b, prism length p | hypotenuse c = √(a² + b²) | ab + p(a + b + c) | abp / 2 |
| Square pyramid | base side b, perpendicular height h | face slant height s = √(h² + (b/2)²) | b² + 2bs | b²h / 3 |
| Cylinder | radius r, perpendicular height h | circumference C = 2πr | 2πr² + 2πrh | πr²h |
| Cone | radius r, perpendicular height h | slant height s = √(r² + h²) | πr² + πrs | πr²h / 3 |
| Sphere | radius r | diameter d = 2r | 4πr² | 4πr³ / 3 |

The triangular prism's cross-sectional altitude is one of its two perpendicular legs, not the prism length. The cone's perpendicular height is used for volume; its slant height is used for lateral surface area.

## Surface decomposition

Stable surface identifiers link the 3D representation, net pieces, and mathematical terms. Identifiers belong to a solid kind and must not leak into another solid's selection state.

| Solid | External surfaces | Surface-area terms |
| --- | --- | --- |
| Rectangular prism | top, bottom, front, back, left, right | Two lw, two lh, two wh |
| Cube | top, bottom, front, back, left, right | Six s² |
| Right-triangular prism | two triangular bases, leg-a rectangle, leg-b rectangle, hypotenuse rectangle | Two ab/2, ap, bp, cp |
| Square pyramid | square base, front, back, left, and right triangular faces | b², four bs/2 |
| Cylinder | top disk, bottom disk, curved side | πr², πr², 2πrh |
| Cone | base disk, curved side | πr², πrs |
| Sphere | curved surface | 4πr² |
| teacher.dev key | top face (radius r), larger bottom face (radius r + b), four straight bevel sides, rounded bevel corners | m² + 4mr + πr²; m² + 4m(r + b) + π(r + b)²; four mt; π(2r + b)t |

The key's four rounded bevel corners are one surface, because together they are one conical frustum with radii r and r + b and slant t = √(h² + b²). Its four straight bevel sides are separate, so each carries its own badge. The perpendicular height h, not the slant, determines volume.

Individual surface selection identifies the exact surface rather than automatically selecting every equally sized surface. The calculation presentation may group equal terms, but must make clear which selected surface contributes to that group.

## Net geometry

All pieces in a net share one linear scale. Fitting the whole net into the viewport may change that scale, but cannot independently resize its pieces.

- **Rectangular prism:** Six rectangles joined along equal-length edges; opposite faces have equal dimensions. Choose a nonoverlapping standard cross arrangement.
- **Cube:** Six congruent squares in a valid nonoverlapping cube net.
- **Right-triangular prism:** A strip of three rectangles of widths a, b, and c and common length p; attach congruent right-triangle bases to appropriate opposite strip edges. Maintain correct edge correspondences and avoid overlapping pieces.
- **Square pyramid:** One b-by-b square with four congruent base-b, altitude-s triangles, one joined to each edge.
- **Cylinder:** One 2πr-by-h rectangle plus two radius-r disks. Show the circular pieces as separate net components with clearly associated joining boundaries; their curved edges do not share straight line segments with the rectangle in the plane.
- **Cone:** One sector of radius s and central angle θ = 2πr/s radians, plus one radius-r base disk. Because h > 0, s > r and 0 < θ < 2π. The sector's arc length sθ = 2πr and area s²θ/2 = πrs. Lay out the base separately without overlap and associate its circumference with the sector arc.
- **Sphere:** No net. Show an educational explanation rather than a fabricated flattened surface.
- **teacher.dev key:** Four m-by-t rectangles, an annular sector for the four rounded corners considered as one conical frustum, and separate top and bottom rounded-square faces. The annular sector’s inner and outer arcs equal 2πr and 2π(r + b). The rounded outlines may be tessellated for drawing; all displayed areas and the integrated volume stay analytic.

Curved surfaces may be tessellated for rendering. Their displayed area and volume formulas remain analytic, not mesh-based approximations.

## Exact and approximate values

Keep mathematical expressions distinct from formatted numbers.

- General formula: for example V = πr²h.
- Substitution: for example V = π × 2² × 3.
- Exact result: for example 12π cm³.
- Approximate result: for example ≈ 37.70 cm³.

Exact results can contain radicals, not only π. For a cone with r = 1 and h = 1, its exact total surface area is (1 + √2)π, not a rounded coefficient followed by π. Likewise, a right-triangular prism with an irrational hypotenuse needs a radical expression for an exact surface-area result. Do not round a derived length before using it in a formula.

Finite decimal inputs represent exact decimal quantities for expression formatting. Use rational/decimal-aware expression construction where needed; never label a rounded floating-point coefficient as exact. Approximate numeric evaluation uses calculator Math.PI. No symbolic-algebra dependency is required if exact expressions retain their unsimplified structure.

## State boundaries

### Geometry state

- Selected solid kind.
- Last valid independent dimensions for each kind.
- Derived measurements, surface definitions, surface area, volume, and net geometry are calculated from these values, not independently editable or separately persisted copies.

### Input draft state

- Editable text values and validation messages.
- Drafts may temporarily be empty or invalid while typing.
- Only complete, valid drafts update geometry. An invalid draft leaves the last valid representation visible and clearly signals that the new entry has not been applied.
- A cube has one independent side input so its three axes cannot become inconsistent.

### Presentation state

- Solid, cubes or net view.
- 3D orientation and auto-rotation preference.
- Fill: how many unit cubes are stacked, and whether they are moving on their own.
- Selected surface identifier or no selection.
- Measurement-unit label.
- Answer visibility.

These do not alter the physical calculations. Switching shape clears incompatible surface selection and resets orientation to a useful view. Switching to the sphere uses its solid view and explains why a net is unavailable. Switching to a solid other than a rectangular prism or cube from the cubes view returns to the solid view. Entering the cubes view is the one view change that alters geometry: it rounds each edge to a whole number from 1 to 10 and fills the solid. Answer visibility survives shape and view changes.

## Invariants and verification

1. Every valid dimension is finite, positive, and within the configured input range and step.
2. Surface-area and volume values are finite and positive for all supported inputs.
3. Total surface area equals the sum of its analytic surface terms.
4. Doubling every dimension multiplies total surface area by 4 and volume by 8.
5. Equal rectangular-prism dimensions agree with the cube formulas.
6. A cylinder with the same radius and height as a cone has three times the cone's volume.
7. A cone sector's arc length equals its base circumference and its area equals the curved side's area.
8. A rectangular prism's, cube's, or triangular prism's net preserves all surface dimensions and joining-edge lengths.
9. Rotation, highlighting, unit-label changes, and view changes do not alter numeric geometry.
10. Hidden final answers do not appear in rendered text, accessibility descriptions, tooltips, or net labels. Formula substitutions intentionally remain visible. In the cubes view this includes the cube count and the flat arrangement's evaluated length.
11. The cubes view always shows exactly as many unit cubes as the volume, each either stacked or in the flat arrangement.

Test the pure geometry and exact-expression model independently from rendering. Browser tests should cover dimension edits and validation, all seven shape selections and the unlisted logo solid, solid/net switching, the cubes view, surface selection, answer reveal persistence, keyboard rotation, and a narrow viewport.
