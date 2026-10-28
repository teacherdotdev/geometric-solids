<script lang="ts">
  /**
   * Which way the cutting plane faces: horizontal, vertical or diagonal,
   * turned a quarter at a time. The plane is moved by the arrow drawn on it in
   * the solid view, which also says what its position measures. Every slice
   * of a sphere is a circle, so a sphere has nothing here to choose.
   */
  import {
    SLICE_DIRECTIONS,
    SLICE_HEADINGS,
    type SliceDirection,
    type SliceHeading,
  } from "$lib/domain/crossSections";
  import { t } from "$lib/i18n/index.svelte";
  import type { LabState } from "$lib/state/lab.svelte";

  let { lab }: { lab: LabState } = $props();

  const directionNames: Record<SliceDirection, () => string> = {
    horizontal: () => t("slice.horizontal"),
    vertical: () => t("slice.vertical"),
    diagonal: () => t("slice.diagonal"),
  };
  const directionHints: Record<SliceDirection, () => string> = {
    horizontal: () => t("slice.horizontal.hint"),
    vertical: () => t("slice.vertical.hint"),
    diagonal: () => t("slice.diagonal.hint"),
  };
  const headingNames: Record<SliceHeading, () => string> = {
    level: () => "",
    frontToBack: () => t("slice.heading.frontToBack"),
    sideToSide: () => t("slice.heading.sideToSide"),
    right: () => t("slice.heading.right"),
    back: () => t("slice.heading.back"),
    left: () => t("slice.heading.left"),
    front: () => t("slice.heading.front"),
  };
  const turns = $derived(SLICE_HEADINGS[lab.sliceDirection].length > 1);
  const round = $derived(lab.kind === "sphere");

  const choice =
    "cursor-pointer rounded-lg px-2 py-1 text-xs font-bold transition";
</script>

{#if !round}
  <div
    class="pointer-events-auto flex flex-col items-center gap-1 rounded-xl border border-rule/70 bg-panel/85 p-1.5 shadow-lg shadow-ink/10 backdrop-blur-md"
    role="group"
    aria-label={t("slice.label")}
    data-testid="slice-controls"
  >
    <div class="flex flex-wrap items-center justify-center gap-1">
      <div class="flex" role="radiogroup" aria-label={t("slice.direction")}>
        {#each SLICE_DIRECTIONS as direction (direction)}
          <button
            type="button"
            role="radio"
            aria-checked={lab.sliceDirection === direction}
            aria-describedby="slice-hint-{direction}"
            title={directionHints[direction]()}
            data-testid="slice-{direction}"
            class="{choice} {lab.sliceDirection === direction
              ? 'bg-accent text-white'
              : 'text-ink-soft hover:text-accent'}"
            onclick={() => lab.setSliceDirection(direction)}
            >{directionNames[direction]()}</button
          >
        {/each}
      </div>
      {#each SLICE_DIRECTIONS as direction (direction)}
        <span id="slice-hint-{direction}" class="sr-only"
          >{directionHints[direction]()}</span
        >
      {/each}
      {#if turns}
        <button
          type="button"
          class="grid h-7 w-7 cursor-pointer place-items-center rounded-full border border-rule text-ink-soft transition hover:border-accent hover:text-accent"
          data-testid="slice-turn"
          aria-label={t("slice.turn", {
            heading: headingNames[lab.sliceHeading](),
          })}
          title={t("slice.turn", { heading: headingNames[lab.sliceHeading]() })}
          onclick={() => lab.turnSlice()}
        >
          <svg
            width="14"
            height="14"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="2.2"
            stroke-linecap="round"
            stroke-linejoin="round"
            aria-hidden="true"
          >
            <path d="M20 12a8 8 0 1 1-2.34-5.66" />
            <path d="M20 4v5h-5" />
          </svg>
          <!-- Which way it is turned now is only said, not shown: the plane
               on the solid shows it. -->
          <span class="sr-only" data-testid="slice-heading"
            >{headingNames[lab.sliceHeading]()}</span
          >
        </button>
      {/if}
    </div>
  </div>
{/if}
