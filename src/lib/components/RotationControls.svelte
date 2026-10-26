<script lang="ts">
  import { t } from "$lib/i18n/index.svelte";
  import type { LabState } from "$lib/state/lab.svelte";

  let {
    lab,
    reducedMotion = false,
    compact = false,
  }: {
    lab: LabState;
    reducedMotion?: boolean;
    /**
     * Drop the nudge arrows and keep only recentre and spin. In a floating
     * window the shape is close enough to drag directly, so the arrows are the
     * part of this row that can go.
     */
    compact?: boolean;
  } = $props();

  const STEP = 0.18;
  const isNet = $derived(lab.view === "net");
  /** Every cube lying flat is read like a net, not spun. */
  const allFlat = $derived(lab.view === "cubes" && lab.fill === 0);
  const button =
    "grid h-8 w-8 cursor-pointer place-items-center rounded-lg text-sm text-ink-soft hover:bg-ink/5 hover:text-accent disabled:cursor-not-allowed disabled:opacity-30";
</script>

<div
  class="pointer-events-auto flex items-center gap-0.5 rounded-xl border border-rule/70 bg-panel/85 p-1 shadow-lg shadow-ink/10 backdrop-blur-md"
  role="group"
  aria-label={t("rotation.label")}
>
  {#if !compact}
    <button
      type="button"
      class={button}
      data-testid="rotate-left"
      disabled={isNet}
      aria-label={t("rotation.left")}
      onclick={() => lab.rotateBy(-STEP, 0)}>←</button
    >
    <button
      type="button"
      class={button}
      data-testid="rotate-up"
      disabled={isNet}
      aria-label={t("rotation.back")}
      onclick={() => lab.rotateBy(0, -STEP)}>↑</button
    >
    <button
      type="button"
      class={button}
      data-testid="rotate-down"
      disabled={isNet}
      aria-label={t("rotation.forward")}
      onclick={() => lab.rotateBy(0, STEP)}>↓</button
    >
    <button
      type="button"
      class={button}
      data-testid="rotate-right"
      disabled={isNet}
      aria-label={t("rotation.right")}
      onclick={() => lab.rotateBy(STEP, 0)}>→</button
    >

    <span class="mx-0.5 h-5 w-px bg-rule" aria-hidden="true"></span>
  {/if}

  <button
    type="button"
    class={button}
    data-testid="reset-view"
    disabled={isNet}
    aria-label={t("rotation.reset")}
    title={t("rotation.reset")}
    onclick={() => lab.resetView()}
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
      <!-- Corner brackets closing on a centred dot: put the shape back where
           it started. Deliberately nothing like the spin button's orbit. -->
      <path d="M4 9V5.5A1.5 1.5 0 0 1 5.5 4H9" />
      <path d="M15 4h3.5A1.5 1.5 0 0 1 20 5.5V9" />
      <path d="M20 15v3.5a1.5 1.5 0 0 1-1.5 1.5H15" />
      <path d="M9 20H5.5A1.5 1.5 0 0 1 4 18.5V15" />
      <circle cx="12" cy="12" r="2.4" />
    </svg>
  </button>
  <button
    type="button"
    class="{button} {lab.autoRotate
      ? 'bg-accent text-white hover:bg-accent'
      : ''}"
    data-testid="toggle-spin"
    aria-pressed={lab.autoRotate}
    disabled={isNet || allFlat || reducedMotion}
    aria-label={lab.autoRotate ? t("rotation.stop") : t("rotation.spin")}
    title={reducedMotion
      ? t("rotation.reduced")
      : lab.autoRotate
        ? t("rotation.stop")
        : t("rotation.spin")}
    onclick={() => lab.toggleAutoRotate()}
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
      {#if lab.autoRotate}
        <path d="M9 5v14M15 5v14" />
      {:else}
        <!-- Two arrows chasing each other round: keep turning. The reset
             button next door is a square frame, so the two never look alike. -->
        <path d="M20.5 12a8.5 8.5 0 0 0-8.5-8.5A8.5 8.5 0 0 0 5.6 6.7" />
        <path d="M4 3.5v4h4" />
        <path d="M3.5 12a8.5 8.5 0 0 0 8.5 8.5 8.5 8.5 0 0 0 6.4-3.2" />
        <path d="M20 20.5v-4h-4" />
      {/if}
    </svg>
  </button>
</div>
