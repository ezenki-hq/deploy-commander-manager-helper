<script lang="ts" generics="TData extends object">
  import { untrack } from "svelte";
  import { runSectionLoader } from "@ezenki/deploy-commander-manager-sdk-core/configuration";
  import type { SectionStatusState } from "@ezenki/deploy-commander-manager-sdk-core/configuration";
  import SectionActions from "./SectionActions.svelte";
  import SectionStatus from "./SectionStatus.svelte";
  import type { SvelteConfigurationSectionProps } from "./types.js";

  let props: SvelteConfigurationSectionProps<TData> = $props();
  let internalData = $state<TData | undefined>(untrack(() => "initialData" in props ? props.initialData : undefined));
  let internalLoading = $state(false);
  let loadError = $state<unknown>();
  let cancelLoad: (() => void) | undefined;
  const headingId = $props.id();

  let data = $derived(typeof props.onDataChange === "function" ? props.data : internalData);
  let loading = $derived(props.loading === true || internalLoading);
  let visibleError = $derived(props.error !== undefined ? props.error : loadError);
  let currentStatus = $derived<SectionStatusState>(loading
    ? { kind: "loading" }
    : { kind: "error", error: visibleError });

  export function setData(next: TData): void {
    if (typeof props.onDataChange === "function") {
      props.onDataChange(next);
      return;
    }
    cancelLoad?.();
    cancelLoad = undefined;
    internalLoading = false;
    loadError = undefined;
    internalData = next;
  }

  function setBodyData(next: TData): void {
    if (props.readOnly) return;
    setData(next);
  }

  $effect(() => {
    const loader = props.loadData;
    if (!loader) {
      internalLoading = false;
      return;
    }

    internalLoading = true;
    loadError = undefined;
    const cancel = runSectionLoader(loader, {
      onData: (next) => {
        if (cancelLoad === cancel) cancelLoad = undefined;
        internalData = next;
        internalLoading = false;
      },
      onError: (error) => {
        if (cancelLoad === cancel) cancelLoad = undefined;
        loadError = error;
        internalLoading = false;
      },
    });
    cancelLoad = cancel;
    return () => {
      cancel();
      if (cancelLoad === cancel) cancelLoad = undefined;
    };
  });

</script>

<section class={`dcmsdk-section${props.className ? ` ${props.className}` : ""}`} aria-labelledby={headingId} aria-busy={loading}>
  <header class="dcmsdk-section-header">
    <h2 id={headingId} class="dcmsdk-section-title">{props.title}</h2>
    {#if props.descriptionContent || props.description}
      <div class="dcmsdk-section-description">
        {#if props.descriptionContent}{@render props.descriptionContent()}{:else}{props.description}{/if}
      </div>
    {/if}
  </header>
  {#if data !== undefined}
    <fieldset class="dcmsdk-section-body min-w-0 border-0 p-0" disabled={props.readOnly}>
      {@render props.children({ data, setData: setBodyData, readOnly: props.readOnly === true, loading })}
    </fieldset>
  {/if}
  {#if loading || visibleError !== undefined}
    <SectionStatus status={currentStatus} />
  {/if}
  {#if data !== undefined && props.actions}
    <SectionActions
      data={data}
      actions={props.actions}
      coreActions={props.coreActions}
      readOnly={props.readOnly}
      disabled={loading}
    />
  {/if}
</section>
