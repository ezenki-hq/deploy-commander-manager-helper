<script lang="ts">
  import { onMount } from "svelte";
  import { createConnectionConsumerActions, createConnectionSelectionController } from "@ezenki/deploy-commander-manager-sdk-core";
  import type { ConnectionSelectionController, ConnectionSelectionState } from "@ezenki/deploy-commander-manager-sdk-core";
  import ConfigurationSection from "./ConfigurationSection.svelte";
  import SectionStatus from "./SectionStatus.svelte";
  import type { SvelteConnectionSectionProps } from "./connection-types.js";
  let props: SvelteConnectionSectionProps = $props();
  const initialState: ConnectionSelectionState = { resources: [], resourceId: undefined, connections: [], selected: [], connectionIds: [], canAdd: true, loading: true, status: { kind: "loading" } };
  let selectionState = $state(initialState);
  let search = $state("");
  let controller: ConnectionSelectionController | undefined;
  const options = (): import("@ezenki/deploy-commander-manager-sdk-core").ConnectionConsumerOptions & import("@ezenki/deploy-commander-manager-sdk-core").ConnectionSelection => {
    const { data, onDataChange, initialData, ...base } = props;
    return typeof onDataChange === "function"
      ? { ...base, data: data!, onDataChange }
      : { ...base, initialData: initialData ?? { connectionIds: [] } };
  };
  onMount(() => {
    controller = createConnectionSelectionController(createConnectionConsumerActions(props.wire), (next) => { selectionState = next; });
    controller.configure(options());
    return () => controller?.dispose();
  });
  $effect(() => {
    const current = [props.resource, props.maxConnections, props.initialData, props.data, props.onDataChange, props.onSelectionChange, props.onDeleteConnection];
    void current;
    controller?.configure(options());
  });
</script>

<ConfigurationSection title={props.title ?? "Connections"} initialData={{ connectionIds: [] }} className={props.className}>
  {#snippet children({ loading })}
    <div aria-busy={loading}>
    <label class="dcmsdk-field"><span class="dcmsdk-label">Search resources</span><input bind:value={search} aria-label="Search resources" class="dcmsdk-input" placeholder="Name or resource ID" /></label>
    <label class="dcmsdk-field"><span class="dcmsdk-label">Resource</span>
      <select aria-label="Resource" class="dcmsdk-input" value={selectionState.resourceId ?? ""} disabled={selectionState.loading} onchange={(event) => controller?.chooseResource(event.currentTarget.value)}>
        {#each selectionState.resources.filter((item) => `${item.name} ${item.id}`.toLowerCase().includes(search.toLowerCase())) as resource (resource.id)}<option value={resource.id}>{resource.name} · {resource.type} · {resource.id}</option>{/each}
      </select>
    </label>
    <div class="flex flex-wrap gap-2">
      {#each selectionState.connections as connection (connection.id)}<button type="button" class="dcmsdk-button dcmsdk-button-secondary" disabled={!selectionState.canAdd || selectionState.connectionIds.includes(connection.id) || selectionState.loading} onclick={() => controller?.select(connection.id)}>Select {connection.id}</button>{/each}
      {#each selectionState.selected as connection (connection.id)}
        <span class="inline-flex items-center gap-2 rounded-full border border-dcmsdk-border bg-dcmsdk-raised px-3 py-1 text-sm">{connection.id}<button type="button" aria-label={`Remove ${connection.id}`} onclick={() => controller?.remove(connection.id)}>×</button>{#if props.onDeleteConnection}<button type="button" class="dcmsdk-button dcmsdk-button-danger" onclick={() => controller?.delete(connection.id)}>Delete</button>{/if}</span>
      {/each}
    </div>
    {#if selectionState.canAdd}<button type="button" class="dcmsdk-button dcmsdk-button-primary" disabled={selectionState.loading || !selectionState.resourceId} onclick={() => controller?.create()}>Create Connection</button>{/if}
    {#if selectionState.notice}<p role="status">{selectionState.notice}</p>{/if}
    {#if selectionState.status.kind === "error" || selectionState.status.kind === "pending" || selectionState.status.kind === "success"}<SectionStatus status={selectionState.status} />{/if}
    </div>
  {/snippet}
</ConfigurationSection>
