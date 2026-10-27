<script lang="ts">
  /**
   * Where the cutting plane goes. One axis: the position slider moves the plane
   * through the solid, measured from where it first touches it.
   */
  import NumberField from "$lib/components/NumberField.svelte";
  import { DIMENSION_STEP } from "$lib/domain/types";
  import { t, unitLabels, validationMessage } from "$lib/i18n/index.svelte";
  import type { LabState } from "$lib/state/lab.svelte";
  import { toNumber } from "$lib/domain/rational";

  let {
    lab,
    compact = false,
  }: {
    lab: LabState;
    compact?: boolean;
  } = $props();

  const linear = $derived(unitLabels(lab.unit).linear);
  const span = $derived(lab.sliceSpan ? toNumber(lab.sliceSpan) : 0);
  /** The first and last tenth strictly inside the solid. */
  const lowest = DIMENSION_STEP;
  const highest = $derived(
    Math.max(lowest, Math.ceil(span * 10 - 1e-9) / 10 - DIMENSION_STEP),
  );

  const label = $derived(
    lab.sliceDirection === "diagonal"
      ? t("slice.position.diagonal")
      : lab.sliceHeading === "frontToBack"
        ? t("slice.position.frontToBack")
        : lab.sliceHeading === "sideToSide"
          ? t("slice.position.sideToSide")
          : t("slice.position.level"),
  );
</script>

<div
  class="pointer-events-auto flex flex-col items-center gap-1 rounded-xl border border-rule/70 bg-panel/85 p-1.5 shadow-lg shadow-ink/10 backdrop-blur-md"
  role="group"
  aria-label={t("slice.label")}
  data-testid="slice-controls"
>
  <p class="text-xs font-bold text-ink-soft">{label}</p>
  <div class="flex items-center gap-1.5">
    <NumberField
      id="slice-position"
      testKey="slice-position"
      {label}
      unit={linear}
      value={lab.slicePosition ?? span / 2}
      draft={lab.sliceDraft}
      error={lab.sliceError}
      step={DIMENSION_STEP}
      {lowest}
      {highest}
      sliderMax={highest}
      {compact}
      onDraft={(raw) => lab.setSliceDraft(raw)}
      onNudge={(delta) => lab.nudgeSlice(delta)}
    />
  </div>
  {#if lab.sliceError}
    <p
      id="error-slice-position"
      data-testid="error-slice-position"
      role="alert"
      class="max-w-[17rem] rounded bg-flag-soft px-2 py-1 text-xs font-semibold text-flag"
    >
      {t("measure.still", {
        message: validationMessage(lab.sliceError),
        value: lab.slicePosition ?? span / 2,
        unit: linear,
      })}
    </p>
  {/if}
</div>
