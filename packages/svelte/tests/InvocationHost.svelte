<script lang="ts">
  import ManagerInvocationSection from "../src/ManagerInvocationSection.svelte";
  let { wire, definition }: { wire: import("@ezenki/deploy-commander-installer-interface").Wire; definition: import("@ezenki/deploy-commander-manager-sdk-core").ManagerInvocationDefinition<unknown, { done: boolean }> } = $props();
</script>
<ManagerInvocationSection {wire} {definition}>
  {#snippet called(context)}
    <button onclick={() => { context.complete({ done: true }); context.fail({ message: "late" }); }}>{context.callingManagerId}</button>
  {/snippet}
</ManagerInvocationSection>
