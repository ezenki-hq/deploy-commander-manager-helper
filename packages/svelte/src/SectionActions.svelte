<script lang="ts" generics="TData extends object">
  import {
    createSectionActionRunner,
    getSectionActionState,
  } from "@ezenki/deploy-commander-manager-sdk-core/configuration";
  import type { SectionStatusState } from "@ezenki/deploy-commander-manager-sdk-core/configuration";
  import SectionStatus from "./SectionStatus.svelte";
  import type { SvelteSectionActionsProps } from "./types.js";

  let props: SvelteSectionActionsProps<TData> = $props();
  let status = $state<SectionStatusState>({ kind: "idle" });
  let pending = $state(false);
  const runner = createSectionActionRunner((next) => {
    status = next;
    pending = next.kind === "pending";
  });

  function actionState(action: SvelteSectionActionsProps<TData>["actions"][string]) {
    return getSectionActionState(action, props.data, {
      readOnly: props.readOnly,
      disabled: props.disabled === true || pending,
    });
  }

  function runAction(action: SvelteSectionActionsProps<TData>["actions"][string]): void {
    const snapshot = props.data;
    void runner.run(action.label, () => action.execute({ data: snapshot, coreActions: props.coreActions }));
  }
</script>

{#if Object.entries(props.actions).some(([, action]) => actionState(action).visible)}
  <div class={`dcmsdk-actions${props.className ? ` ${props.className}` : ""}`}>
    {#each Object.entries(props.actions) as [key, action] (key)}
      {@const state = actionState(action)}
      {#if state.visible}
        <button
          class={`dcmsdk-button dcmsdk-button-${action.variant ?? "secondary"}`}
          type="button"
          disabled={state.disabled}
          onclick={() => runAction(action)}
        >
          {action.label}
        </button>
      {/if}
    {/each}
  </div>
{/if}
<SectionStatus {status} />
