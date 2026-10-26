<script lang="ts">
  import Approximation from "$lib/components/Approximation.svelte";
  import MathText from "$lib/components/MathText.svelte";
  import { evalExact, formatExact } from "$lib/domain/exact";
  import {
    DIMENSION_MAX,
    DIMENSION_MIN,
    DIMENSION_STEP,
    DIMENSION_TYPED_MAX,
  } from "$lib/domain/types";
  import { CUBE_EDGE_MAX } from "$lib/domain/unitCubes";
  import {
    domainText,
    t,
    unitLabels,
    validationMessage,
  } from "$lib/i18n/index.svelte";
  import { measureTarget, type LabState } from "$lib/state/lab.svelte";

  let {
    lab,
    compact = false,
  }: {
    lab: LabState;
    /**
     * Fit a floating window. The dimensions keep their column — they are read
     * as a list, and a list reads down — but everything around them gives way:
     * the slider stands down, since it is the widest control here and the typed
     * box already covers it, and the rest closes up as the window shrinks.
     */
    compact?: boolean;
  } = $props();

  const linear = $derived(unitLabels(lab.unit).linear);

  /**
   * Unit cubes take whole edges up to {@link CUBE_EDGE_MAX}, so while they are
   * showing every control here moves in whole units and stops there.
   */
  const inCubes = $derived(lab.view === "cubes");
  const nudge = $derived(inCubes ? 1 : DIMENSION_STEP);
  const lowest = $derived(inCubes ? 1 : DIMENSION_MIN);
  const highest = $derived(inCubes ? CUBE_EDGE_MAX : DIMENSION_TYPED_MAX);
  const sliderMax = $derived(inCubes ? CUBE_EDGE_MAX : DIMENSION_MAX);

  const step =
    "grid h-7 w-7 shrink-0 cursor-pointer place-items-center rounded-md border border-rule bg-panel text-base leading-none font-bold text-ink-soft hover:border-accent hover:text-accent disabled:cursor-not-allowed disabled:opacity-30";
  /**
   * Once the window is too narrow to hold a whole row, the two nudge buttons
   * are the part that goes: the typed box beside them does the same job, and
   * the shape needs the room more than they do.
   */
  const stepClass = $derived(compact ? `${step} max-[30rem]:hidden` : step);
  /**
   * The working for a derived length — "s = √(4² + (6/2)²) = 5" — goes at the
   * same point, and for the same reason. It is the longest line in the panel
   * and the only one that explains rather than sets anything, so a window with
   * no room for the nudge buttons has none for it either. It also goes when the
   * window is too short, where every row costs the shape more than it is worth.
   */
  const derivedClass = $derived(
    compact ? " max-[30rem]:hidden [@media(max-height:26rem)]:hidden" : "",
  );

  /**
   * What is wrong, if anything is. On a full page each complaint sits under the
   * input it belongs to, which is where it reads best. A floating window has no
   * room to give: the panel would more than double in width to hold a sentence,
   * dragging the answers over and shrinking the shape, every time a box was
   * cleared to type in it. So there the complaint leaves the panel and floats
   * above it, where it can be as wide as it needs to be without moving
   * anything. It still carries the ids the inputs point at.
   */
  const complaints = $derived(
    lab.definition.dimensions
      .map((spec) => ({ key: spec.key, message: lab.errors[spec.key] }))
      .filter((complaint): complaint is { key: string; message: string } =>
        Boolean(complaint.message),
      ),
  );

  function stillReads(key: string, message: string): string {
    return t("measure.still", {
      message: validationMessage(message),
      value: lab.dimensions[key],
      unit: linear,
    });
  }
</script>

<!-- The dimensions are always on screen: they are what the whole demonstration
     varies. Pointing at a symbol lights up every edge that carries it. -->
<div class="relative min-w-0">
  {#if compact && complaints.length > 0}
    <!-- Clear of the panel, and clear of the layout: nothing here can change
         the size of anything else. Inert, so it never swallows a drag meant for
         the shape behind it. -->
    <div
      class="pointer-events-none absolute bottom-full left-0 z-10 mb-1.5 w-max max-w-[min(16rem,72vw)] rounded-lg border border-flag/40 bg-flag-soft/95 px-2 py-1 shadow-lg shadow-ink/10 backdrop-blur-md"
    >
      {#each complaints as complaint (complaint.key)}
        <p
          id="error-{complaint.key}"
          data-testid="error-{complaint.key}"
          role="alert"
          class="text-xs font-semibold text-flag"
        >
          {stillReads(complaint.key, complaint.message)}
        </p>
      {/each}
    </div>
  {/if}
  <section
    class="pointer-events-auto min-w-0 rounded-xl border border-rule/70 bg-panel/90 p-2 shadow-lg shadow-ink/10 backdrop-blur-md {compact
      ? 'max-h-[42dvh] overflow-y-auto max-[26rem]:p-1.5 [@media(max-height:26rem)]:max-h-[32dvh] [@media(max-height:26rem)]:p-1.5'
      : ''}"
    aria-label={t("measure.dimensions", { unit: linear })}
  >
    <div
      class="flex flex-col {compact ? 'gap-1 max-[26rem]:gap-0.5' : 'gap-1.5'}"
    >
      {#each lab.definition.dimensions as spec (spec.key)}
        {@const error = lab.errors[spec.key]}
        {@const target = measureTarget(spec.key)}
        <div class="flex items-center gap-1.5">
          <button
            type="button"
            data-testid="measure-{spec.key}"
            aria-pressed={lab.isPinned(target)}
            aria-label={t("measure.show", {
              label: domainText(spec.label),
              hint: domainText(spec.hint),
            })}
            title="{domainText(spec.label)} — {domainText(spec.hint)}"
            class="h-7 w-7 shrink-0 cursor-pointer rounded-md border font-mono text-sm font-bold transition {compact
              ? 'max-[26rem]:h-6 max-[26rem]:w-6'
              : ''} {lab.isActive(target)
              ? 'border-flag bg-flag-soft text-flag'
              : 'border-transparent text-ink-soft hover:border-accent hover:text-accent'}"
            onpointerenter={() => lab.hover(target)}
            onpointerleave={() => lab.unhover(target)}
            onfocus={() => lab.hover(target)}
            onblur={() => lab.unhover(target)}
            onclick={() => lab.togglePin(target)}>{spec.key}</button
          >

          <button
            type="button"
            class={stepClass}
            aria-label={t("measure.decrease", {
              label: domainText(spec.label),
              step: nudge,
            })}
            data-testid="decrease-{spec.key}"
            disabled={lab.dimensions[spec.key] <= lowest}
            onclick={() => lab.nudgeDimension(spec.key, -nudge)}>−</button
          >
          <label class="sr-only" for="dimension-{spec.key}"
            >{t("measure.inUnit", {
              label: domainText(spec.label),
              unit: linear,
            })}</label
          >
          <input
            id="dimension-{spec.key}"
            data-testid="input-{spec.key}"
            class="shrink-0 rounded-md border bg-panel px-1 py-0.5 text-center font-mono {compact
              ? 'w-12 text-sm max-[26rem]:w-10 max-[26rem]:text-xs'
              : 'w-16 text-base'} {error ? 'border-flag' : 'border-rule'}"
            type="text"
            inputmode="decimal"
            autocomplete="off"
            aria-invalid={Boolean(error)}
            aria-describedby={error ? `error-${spec.key}` : undefined}
            value={lab.drafts[spec.key]}
            oninput={(event) =>
              lab.setDraft(spec.key, event.currentTarget.value)}
          />
          <button
            type="button"
            class={stepClass}
            aria-label={t("measure.increase", {
              label: domainText(spec.label),
              step: nudge,
            })}
            data-testid="increase-{spec.key}"
            disabled={lab.dimensions[spec.key] >= highest}
            onclick={() => lab.nudgeDimension(spec.key, nudge)}>+</button
          >
          <!-- The slider only covers the sizes that read well on screen. A typed
             value may be far larger; the handle then rests at the top of the
             slider until it is dragged back into that range. -->
          <input
            class={compact ? "hidden" : "hidden w-28 accent-accent sm:block"}
            type="range"
            min={lowest}
            max={sliderMax}
            step={nudge}
            data-testid="range-{spec.key}"
            aria-label={t("measure.slider", {
              label: domainText(spec.label),
              unit: linear,
            })}
            value={Math.min(lab.dimensions[spec.key], sliderMax)}
            oninput={(event) =>
              lab.setDraft(spec.key, event.currentTarget.value)}
          />
        </div>

        {#if error && !compact}
          <p
            id="error-{spec.key}"
            data-testid="error-{spec.key}"
            role="alert"
            class="max-w-[17rem] rounded bg-flag-soft px-2 py-1 text-xs font-semibold text-flag"
          >
            {stillReads(spec.key, error)}
          </p>
        {/if}
      {/each}
    </div>

    <!-- Derived lengths follow from the dimensions above, so there is no input
       for them. -->
    {#each lab.model.derived as derived (derived.key)}
      {@const value = evalExact(derived.exact)}
      {@const exact = formatExact(derived.exact)}
      <p
        class="mt-1.5 border-t border-rule/60 pt-1.5 font-mono text-xs break-words text-ink-soft{derivedClass}"
        data-testid="derived-{derived.key}"
      >
        <!-- "l = w = h = 2" already ends in its own value; "s = √(3² + 4²)" does not. -->
        <MathText
          text={derived.substitution.endsWith(`= ${exact}`)
            ? derived.substitution
            : `${derived.substitution} = ${exact}`}
        />
        <Approximation {value} class="text-xs" />
      </p>
    {/each}
  </section>
</div>
