<script lang="ts">
  /**
   * Moving unit cubes between the solid and the flat arrangement. One axis,
   * read left to right: every cube stacked at the left end, every cube flat at
   * the right. The slider can be dragged anywhere along it; under it, a play
   * button points each way with pause between them.
   */
  import { t } from "$lib/i18n/index.svelte";
  import type { LabState } from "$lib/state/lab.svelte";

  let { lab }: { lab: LabState } = $props();

  const empty = $derived(lab.fill === 0);
  const full = $derived(lab.fill >= lab.cubeTotal);

  /**
   * The slider runs over the share of cubes lying flat, not over a count: its
   * ends would otherwise give the volume away to a screen reader while the
   * answers are hidden. A step is still exactly one cube.
   */
  const total = $derived(Math.max(1, lab.cubeTotal));
  const flatShare = $derived((lab.cubeTotal - lab.fill) / total);
  const position = $derived(
    lab.answersVisible
      ? t("cubes.count", { stacked: lab.fill, total: lab.cubeTotal })
      : t("cubes.share", { percent: Math.round((lab.fill / total) * 100) }),
  );

  const button =
    "grid h-8 w-8 cursor-pointer place-items-center rounded-lg text-ink-soft hover:bg-ink/5 hover:text-accent disabled:cursor-not-allowed disabled:opacity-30";
  const pressed = "bg-accent text-white hover:bg-accent hover:text-white";
  const end = "w-14 text-[11px] font-semibold text-ink-soft";
</script>

<div
  class="pointer-events-auto flex w-56 flex-col gap-0.5 rounded-xl border border-rule/70 bg-panel/85 px-2 py-1.5 shadow-lg shadow-ink/10 backdrop-blur-md"
  role="group"
  aria-label={t("cubes.label")}
  data-testid="cube-controls"
>
  <input
    type="range"
    class="w-full cursor-pointer accent-accent"
    min="0"
    max="1"
    step={1 / total}
    value={flatShare}
    data-testid="cubes-slider"
    aria-label={t("cubes.slider")}
    aria-valuetext={position}
    oninput={(event) =>
      lab.placeCubes(
        lab.cubeTotal -
          Math.round(Number(event.currentTarget.value) * lab.cubeTotal),
      )}
  />
  <div class="flex items-center justify-between">
    <span class={end} aria-hidden="true">{t("cubes.stacked")}</span>
    <div class="flex items-center gap-0.5">
      <button
        type="button"
        class="{button} {lab.cubeRun === 'stack' ? pressed : ''}"
        data-testid="cubes-play-stack"
        aria-pressed={lab.cubeRun === "stack"}
        disabled={full}
        aria-label={t("cubes.playStack")}
        title={t("cubes.playStack")}
        onclick={() => lab.runCubes("stack")}
      >
        <svg
          width="16"
          height="16"
          viewBox="0 0 24 24"
          fill="currentColor"
          stroke="currentColor"
          stroke-width="2.2"
          stroke-linejoin="round"
          aria-hidden="true"
        >
          <path d="M17 5L5 12l12 7Z" />
        </svg>
      </button>
      <button
        type="button"
        class={button}
        data-testid="cubes-pause"
        disabled={!lab.cubeRun}
        aria-label={t("cubes.pause")}
        title={t("cubes.pause")}
        onclick={() => lab.pauseCubes()}
      >
        <svg
          width="16"
          height="16"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          stroke-width="2.6"
          stroke-linecap="round"
          aria-hidden="true"
        >
          <path d="M9 5v14M15 5v14" />
        </svg>
      </button>
      <button
        type="button"
        class="{button} {lab.cubeRun === 'flatten' ? pressed : ''}"
        data-testid="cubes-play-flatten"
        aria-pressed={lab.cubeRun === "flatten"}
        disabled={empty}
        aria-label={t("cubes.playFlatten")}
        title={t("cubes.playFlatten")}
        onclick={() => lab.runCubes("flatten")}
      >
        <svg
          width="16"
          height="16"
          viewBox="0 0 24 24"
          fill="currentColor"
          stroke="currentColor"
          stroke-width="2.2"
          stroke-linejoin="round"
          aria-hidden="true"
        >
          <path d="M7 5l12 7-12 7Z" />
        </svg>
      </button>
    </div>
    <span class="{end} text-right" aria-hidden="true">{t("cubes.flat")}</span>
  </div>
  <!-- The count, at full, is the volume, so it goes when the answers do: the
       class is then counting for itself. -->
  {#if lab.answersVisible}
    <p
      class="text-center text-[11px] font-semibold text-ink-soft"
      data-testid="cubes-count"
    >
      {position}
    </p>
  {/if}
</div>
