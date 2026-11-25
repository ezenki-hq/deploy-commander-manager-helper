<script lang="ts" generics="TSettings extends object">
  import { onMount } from "svelte";
  import { openConnectionProviderSession } from "@ezenki/deploy-commander-manager-sdk-core";
  import type { ConnectionProviderContext, ConnectionProviderSession } from "@ezenki/deploy-commander-manager-sdk-core";
  import ConfigurationSection from "./ConfigurationSection.svelte";
  import type { SvelteCreateConnectionSectionProps } from "./connection-types.js";
  let props: SvelteCreateConnectionSectionProps<TSettings> = $props();
  let settings = $state<TSettings | undefined>();
  let context = $state<ConnectionProviderContext>();
  let session = $state<ConnectionProviderSession>();
  let status = $state<{ kind: "loading" | "error" | "pending" | "idle"; error?: unknown }>({ kind: "loading" });
  let revision = $state(0);
  let abort: globalThis.AbortController | undefined;
  onMount(() => {
    abort = new globalThis.AbortController();
    void openConnectionProviderSession(props.wire, abort.signal).then((opened) => {
      if (abort?.signal.aborted) return;
      session = opened; context = opened.context; settings = props.definition.initialSettings(opened.context); status = { kind: "idle" };
    }).catch((error: unknown) => { if (!abort?.signal.aborted) status = { kind: "error", error }; });
    return () => abort?.abort();
  });
</script>

<ConfigurationSection title={props.title ?? "Create Connection"} data={settings} onDataChange={(next) => settings = next} loading={status.kind === "loading" || status.kind === "pending"} error={status.kind === "error" ? status.error : undefined} className={props.className}>
  {#snippet children(section)}
    {#if context}
      <p>Connect as <strong>{context.callingManagerId}</strong> to <strong>{context.resource.resource.name}</strong>.</p>
      {@render props.children({ ...section, ...context })}
      {#if context.existingConnections.length}<ul aria-label="Existing connections" data-revision={revision}>{#each context.existingConnections as connection (connection.id)}<li>{connection.id}{#if props.definition.onDeleteConnection}<button type="button" class="dcmsdk-button dcmsdk-button-danger" onclick={() => session?.delete(connection.id, props.definition.onDeleteConnection!).then((rows) => { context = { ...context!, existingConnections: rows }; revision++; }).catch((error: unknown) => status = { kind: "error", error })}>Delete</button>{/if}</li>{/each}</ul>{/if}
      <div class="flex gap-2">
        <button type="button" class="dcmsdk-button dcmsdk-button-primary" disabled={status.kind === "loading" || status.kind === "pending"} onclick={() => { status = { kind: "pending" }; void session?.create(section.data, props.definition.onCreateConnection).then(() => status = { kind: "idle" }).catch((error: unknown) => status = { kind: "error", error }); }}>Create Connection</button>
        <button type="button" class="dcmsdk-button dcmsdk-button-secondary" disabled={status.kind === "loading" || status.kind === "pending"} onclick={() => session?.cancel()}>Cancel</button>
      </div>
    {/if}
  {/snippet}
</ConfigurationSection>
