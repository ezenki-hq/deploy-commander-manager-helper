<script lang="ts" generics="TMetadata = unknown, TResult extends import('@ezenki/deploy-commander-installer-interface').JSONValue = import('@ezenki/deploy-commander-installer-interface').JSONValue">
  import { openManagerInvocationSession } from "@ezenki/deploy-commander-manager-sdk-core";
  import type { ManagerInvocationDefinition, ManagerInvocationSession } from "@ezenki/deploy-commander-manager-sdk-core";
  import type { Snippet } from "svelte";
  import SectionStatus from "./SectionStatus.svelte";
  let props: { wire: import('@ezenki/deploy-commander-installer-interface').Wire; definition?: ManagerInvocationDefinition<TMetadata, TResult>; standalone?: Snippet; called?: Snippet<[NonNullable<Extract<ManagerInvocationSession<TMetadata, TResult>, { mode: 'called' }>['context']>]> } = $props();
  let session = $state<ManagerInvocationSession<TMetadata, TResult>>();
  let error = $state<unknown>();
  $effect(() => {
    const abort = new globalThis.AbortController(); session = undefined; error = undefined;
    void openManagerInvocationSession(props.wire, props.definition, abort.signal).then((value) => { if (!abort.signal.aborted) session = value; }).catch((reason: unknown) => { if (!abort.signal.aborted) error = reason; });
    return () => abort.abort();
  });
</script>
{#if error !== undefined}<SectionStatus status={{ kind: "error", error }} />
{:else if !session}<SectionStatus status={{ kind: "loading" }} />
{:else if session.mode === "standalone"}{#if props.standalone}{@render props.standalone()}{/if}
{:else if props.called && props.definition && session.context}{@render props.called(session.context)}
{:else if props.called}<SectionStatus status={{ kind: "error", error: new Error("Called content requires a metadata definition") }} />{/if}
