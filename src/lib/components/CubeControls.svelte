<script lang="ts">
  /**
   * Moving unit cubes between the flat arrangement and the solid. One axis,
   * read left to right: everything flat, one cube back out, play, one cube in,
   * everything stacked.
   */
  import { t } from "$lib/i18n/index.svelte";
  import type { LabState } from "$lib/state/lab.svelte";

  let {
    lab,
    reducedMotion = false,
  }: {
    lab: LabState;
    /** Stack or flatten everything at once instead of layer by layer. */
    reducedMotion?: boolean;
  } = $props();

  const empty = $derived(lab.fill === 0);
  const full = $derived(lab.fill >= lab.cubeTotal);
  const playing = $derived(lab.cubeRun === "play");

  const button =
    "grid h-8 w-8 cursor-pointer place-items-center rounded-lg text-sm text-ink-soft hover:bg-ink/5 hover:text-accent disabled:cursor-not-allowed disabled:opacity-30";
</script>

<div
  class="pointer-events-auto flex flex-col items-center rounded-xl border border-rule/70 bg-panel/85 p-1 shadow-lg shadow-ink/10 backdrop-blur-md"
  role="group"
  aria-label={t("cubes.label")}
>
  <div class="flex items-center gap-0.5">
    <button
      type="button"
      class={button}
      data-testid="cubes-flatten"
      disabled={empty}
      aria-label={t("cubes.flatten")}
      title={t("cubes.flatten")}
      onclick={() => lab.runCubes("flatten", reducedMotion)}
    >
      <svg
        width="16"
        height="16"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        stroke-width="2.2"
        stroke-linecap="round"
        stroke-linejoin="round"
        aria-hidden="true"
      >
        <path d="M6 5v14" />
        <path d="M19 6l-7 6 7 6Z" />
      </svg>
    </button>
    <button
      type="button"
      class={button}
      data-testid="cubes-remove"
      disabled={empty}
      aria-label={t("cubes.remove")}
      title={t("cubes.remove")}
      onclick={() => lab.stepCubes(-1)}>−</button
    >
    <button
      type="button"
      class="{button} {playing ? 'bg-accent text-white hover:bg-accent' : ''}"
      data-testid="cubes-play"
      aria-pressed={playing}
      disabled={full && !playing}
      aria-label={playing ? t("cubes.pause") : t("cubes.play")}
      title={playing ? t("cubes.pause") : t("cubes.play")}
      onclick={() =>
        playing ? lab.pauseCubes() : lab.runCubes("play", reducedMotion)}
    >
      <svg
        width="16"
        height="16"
        viewBox="0 0 24 24"
        fill={playing ? "none" : "currentColor"}
        stroke="currentColor"
        stroke-width="2.2"
        stroke-linecap="round"
        stroke-linejoin="round"
        aria-hidden="true"
      >
        {#if playing}
          <path d="M9 5v14M15 5v14" />
        {:else}
          <path d="M7 5l12 7-12 7Z" />
        {/if}
      </svg>
    </button>
    <button
      type="button"
      class={button}
      data-testid="cubes-add"
      disabled={full}
      aria-label={t("cubes.add")}
      title={t("cubes.add")}
      onclick={() => lab.stepCubes(1)}>+</button
    >
    <button
      type="button"
      class={button}
      data-testid="cubes-stack"
      disabled={full}
      aria-label={t("cubes.stack")}
      title={t("cubes.stack")}
      onclick={() => lab.runCubes("stack", reducedMotion)}
    >
      <svg
        width="16"
        height="16"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        stroke-width="2.2"
        stroke-linecap="round"
        stroke-linejoin="round"
        aria-hidden="true"
      >
        <path d="M5 6l7 6-7 6Z" />
        <path d="M18 5v14" />
      </svg>
    </button>
  </div>
  <!-- The count, at full, is the volume, so it goes when the answers do: the
       class is then counting for itself. -->
  {#if lab.answersVisible}
    <p
      class="px-1 pb-0.5 text-[11px] font-semibold text-ink-soft"
      data-testid="cubes-count"
    >
      {t("cubes.count", { stacked: lab.fill, total: lab.cubeTotal })}
    </p>
  {/if}
</div>
