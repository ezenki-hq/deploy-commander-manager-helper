<script lang="ts">
  import ManagerInvocationSection from "../src/ManagerInvocationSection.svelte";
  import CreateConnectionSection from "../src/CreateConnectionSection.svelte";
  let { wire }: { wire: import("@ezenki/deploy-commander-installer-interface").Wire } = $props();
  const invocationDefinition = { parseMetadata: (value: unknown) => value };
  const definition = { initialSettings: () => ({ label: "test" }), onCreateConnection: (settings: { label: string }) => ({ metadata: settings }) };
</script>
<ManagerInvocationSection {wire} definition={invocationDefinition}>
  {#snippet called()}
    <CreateConnectionSection {wire} {definition}>
      {#snippet children(context)}
        <p aria-busy={context.loading}>Provider settings</p>
      {/snippet}
    </CreateConnectionSection>
  {/snippet}
</ManagerInvocationSection>
