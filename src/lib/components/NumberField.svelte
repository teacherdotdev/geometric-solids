<script lang="ts">
  import { t } from "$lib/i18n/index.svelte";

  /**
   * One length the teacher sets: − and + buttons, a box to type it in, and a
   * slider. The typed draft is the caller's to keep and to check, because a
   * draft may be empty or wrong while it is being typed and only the caller
   * knows what it would take to apply it.
   */
  let {
    id,
    testKey,
    label,
    unit,
    value,
    draft,
    error = null,
    step,
    lowest,
    highest,
    sliderMin = lowest,
    sliderMax,
    compact = false,
    onDraft,
    onNudge,
  }: {
    /** Names the input, and the `error-{id}` message it points at. */
    id: string;
    /** Suffix for the test ids of every part of the field. */
    testKey: string;
    /** What is being set, already in the reader's language. */
    label: string;
    unit: string;
    /** The value in force, which the buttons and the slider move from. */
    value: number;
    draft: string;
    error?: string | null;
    step: number;
    lowest: number;
    highest: number;
    sliderMin?: number;
    sliderMax: number;
    /**
     * Fit a floating window: the slider stands down, since it is the widest
     * control here and the typed box already covers it, and once the window is
     * too narrow to hold a whole row the nudge buttons go too.
     */
    compact?: boolean;
    onDraft: (raw: string) => void;
    onNudge: (delta: number) => void;
  } = $props();

  const stepButton =
    "grid h-7 w-7 shrink-0 cursor-pointer place-items-center rounded-md border border-rule bg-panel text-base leading-none font-bold text-ink-soft hover:border-accent hover:text-accent disabled:cursor-not-allowed disabled:opacity-30";
  const stepClass = $derived(
    compact ? `${stepButton} max-[30rem]:hidden` : stepButton,
  );
</script>

<button
  type="button"
  class={stepClass}
  aria-label={t("measure.decrease", { label, step })}
  data-testid="decrease-{testKey}"
  disabled={value <= lowest}
  onclick={() => onNudge(-step)}>−</button
>
<label class="sr-only" for={id}>{t("measure.inUnit", { label, unit })}</label>
<input
  {id}
  data-testid="input-{testKey}"
  class="shrink-0 rounded-md border bg-panel px-1 py-0.5 text-center font-mono {compact
    ? 'w-12 text-sm max-[26rem]:w-10 max-[26rem]:text-xs'
    : 'w-16 text-base'} {error ? 'border-flag' : 'border-rule'}"
  type="text"
  inputmode="decimal"
  autocomplete="off"
  aria-invalid={Boolean(error)}
  aria-describedby={error ? `error-${testKey}` : undefined}
  value={draft}
  oninput={(event) => onDraft(event.currentTarget.value)}
/>
<button
  type="button"
  class={stepClass}
  aria-label={t("measure.increase", { label, step })}
  data-testid="increase-{testKey}"
  disabled={value >= highest}
  onclick={() => onNudge(step)}>+</button
>
<!-- The slider only covers the values that read well on screen. A typed value
     may be far larger; the handle then rests at the end of the slider until it
     is dragged back into that range. -->
<input
  class={compact ? "hidden" : "hidden w-28 accent-accent sm:block"}
  type="range"
  min={sliderMin}
  max={sliderMax}
  {step}
  data-testid="range-{testKey}"
  aria-label={t("measure.slider", { label, unit })}
  value={Math.max(sliderMin, Math.min(value, sliderMax))}
  oninput={(event) => onDraft(event.currentTarget.value)}
/>
