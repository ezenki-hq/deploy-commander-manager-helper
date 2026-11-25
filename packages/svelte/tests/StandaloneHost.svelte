<script lang="ts">
  import ManagerInvocationSection from "../src/ManagerInvocationSection.svelte";
  let { wire }: { wire: import("@ezenki/deploy-commander-installer-interface").Wire } = $props();
</script>
<ManagerInvocationSection {wire}>
  {#snippet standalone()}<p>Standalone manager</p>{/snippet}
</ManagerInvocationSection>
