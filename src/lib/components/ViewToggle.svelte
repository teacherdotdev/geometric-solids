<script lang="ts">
  import { t } from "$lib/i18n/index.svelte";
  import type { LabState, ViewMode } from "$lib/state/lab.svelte";

  let {
    lab,
    onViewChange = (view) => lab.setView(view),
  }: { lab: LabState; onViewChange?: (view: ViewMode) => void } = $props();

  // Three tabs only just clear the shape picker on a phone, so they close up
  // there.
  const tab =
    "cursor-pointer rounded-lg px-2.5 py-1 max-sm:px-1.5 text-xs font-bold tracking-wide uppercase transition disabled:cursor-not-allowed disabled:opacity-40";
  const reason =
    "absolute top-full right-0 z-30 mt-2 w-60 rounded-lg border border-rule/70 bg-panel/95 px-3 py-1.5 text-center text-xs font-normal normal-case shadow-lg shadow-ink/10 backdrop-blur-md";

  function tabClass(view: ViewMode): string {
    return `${tab} ${lab.view === view ? "bg-accent text-white" : "text-ink-soft"}`;
  }

  /** Which greyed-out tab the pointer is on, which is where its excuse lives. */
  let asking = $state<ViewMode | null>(null);
</script>

<div
  class="pointer-events-auto flex rounded-xl border border-rule/70 bg-panel/85 p-1 shadow-lg shadow-ink/10 backdrop-blur-md"
  role="radiogroup"
  aria-label={t("view.label")}
>
  <button
    type="button"
    role="radio"
    aria-checked={lab.view === "solid"}
    data-testid="view-solid"
    class={tabClass("solid")}
    onclick={() => onViewChange("solid")}>{t("view.solid")}</button
  >
  <!-- A disabled button dispatches no pointer events of its own, so the reason
       a tab is greyed out has to be hung on something around it. The wrapper
       is scaffolding: the tab inside it keeps the radio role. -->
  <span
    role="presentation"
    class="relative flex"
    onpointerenter={() => (asking = "cubes")}
    onpointerleave={() => (asking = null)}
  >
    <button
      type="button"
      role="radio"
      aria-checked={lab.view === "cubes"}
      data-testid="view-cubes"
      class={tabClass("cubes")}
      disabled={!lab.definition.hasCubes}
      aria-describedby={lab.definition.hasCubes ? undefined : "no-cubes-reason"}
      onclick={() => onViewChange("cubes")}>{t("view.cubes")}</button
    >
    {#if !lab.definition.hasCubes}
      <!-- Always in the document, so the tab keeps something to point its
           aria-describedby at; only laid out on screen when it is asked for. -->
      <p
        id="no-cubes-reason"
        data-testid="no-cubes-reason"
        class={asking === "cubes" ? reason : "sr-only"}
      >
        {t("view.noCubes")}
      </p>
    {/if}
  </span>
  <span
    role="presentation"
    class="relative flex"
    onpointerenter={() => (asking = "net")}
    onpointerleave={() => (asking = null)}
  >
    <button
      type="button"
      role="radio"
      aria-checked={lab.view === "net"}
      data-testid="view-net"
      class={tabClass("net")}
      disabled={!lab.definition.hasNet}
      aria-describedby={lab.definition.hasNet ? undefined : "no-net-reason"}
      onclick={() => onViewChange("net")}>{t("view.net")}</button
    >
    {#if !lab.definition.hasNet}
      <p
        id="no-net-reason"
        data-testid="no-net-reason"
        class={asking === "net" ? reason : "sr-only"}
      >
        {t("view.noNet.before")}<strong>{t("view.noNet.strong")}</strong>{t(
          "view.noNet.after",
        )}
      </p>
    {/if}
  </span>
</div>
