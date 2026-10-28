<svelte:options namespace="svg" />

<script lang="ts">
  /**
   * The ruled ground a 3D view stands its shape on. See floor.ts for why it is
   * there and grid.ts for how far apart it is ruled.
   */
  import { floorRules, type FloorPlane } from "$lib/ui/floor";

  let {
    floor,
    radius,
    layers,
    footprint,
    view,
  }: {
    floor: FloorPlane;
    /** How far the ruling reaches before it has faded out, in the shape's units. */
    radius: number;
    /** The rulings to draw, finest first, each with how dark it sits. */
    layers: readonly { key: string; step: number; ink: number }[];
    /** The near corner of what stands on the floor, which the ruling lines up with. */
    footprint: { x: number; z: number };
    /** The drawing's viewBox, which the fade is masked to. */
    view: { x: number; y: number; width: number; height: number };
  } = $props();

  const MASK_ID = "floor-reach";
  const FADE_ID = "floor-fade";
</script>

<!-- The floor has no edge to it: it is ruled well past what is drawn and then
     faded out in a circle around the shape, so the ruling thins into the
     background instead of stopping at a rectangle. The fade is a circle *on the
     floor*, laid into the scene by the same matrix as the ruling, so it comes
     out as the ellipse the eye expects. -->
<defs>
  <radialGradient id={FADE_ID}>
    <stop offset="0.45" stop-color="#fff" />
    <stop offset="1" stop-color="#000" />
  </radialGradient>
  <mask
    id={MASK_ID}
    maskUnits="userSpaceOnUse"
    x={view.x}
    y={view.y}
    width={view.width}
    height={view.height}
  >
    <g transform={floor.matrix}>
      <circle cx="0" cy="0" r={radius} fill="url(#{FADE_ID})" />
    </g>
  </mask>
</defs>

<g mask="url(#{MASK_ID})" opacity={floor.openness} pointer-events="none">
  <g transform={floor.matrix}>
    <circle cx="0" cy="0" r={radius} fill="#46606f" opacity="0.05" />
    <!-- The lines are laid out in the floor's own units, so non-scaling-stroke
         is what keeps them a hairline on screen instead of a unit thick in the
         scene. -->
    {#each layers as layer (layer.key)}
      <g stroke="#46606f" stroke-opacity={layer.ink}>
        <!-- Each direction is anchored on the footprint edge it crosses, so
             both run along the shape's own sides. -->
        {#each floorRules(layer.step, radius, footprint.x) as rule (rule)}
          <line
            x1={rule}
            y1={-radius}
            x2={rule}
            y2={radius}
            stroke-width="1"
            vector-effect="non-scaling-stroke"
          />
        {/each}
        {#each floorRules(layer.step, radius, footprint.z) as rule (rule)}
          <line
            x1={-radius}
            y1={rule}
            x2={radius}
            y2={rule}
            stroke-width="1"
            vector-effect="non-scaling-stroke"
          />
        {/each}
      </g>
    {/each}
  </g>
</g>
