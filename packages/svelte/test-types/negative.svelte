<script lang="ts">
  import { ConfigurationSection } from "@ezenki/deploy-commander-manager-sdk-svelte";
  import type { SectionActionMap } from "@ezenki/deploy-commander-manager-sdk-svelte";

  interface OtherData { identifier: number }
  const actions: SectionActionMap<OtherData> = {
    open: { label: "Open", execute: ({ data }) => { void data.identifier; } },
  };
</script>

<ConfigurationSection
  title="Invalid"
  data={{ name: "Parent" }}
  onDataChange={() => undefined}
  initialData={{ name: "Internal" }}
  {actions}
>
  {#snippet children({ data })}<output>{data.name}</output>{/snippet}
</ConfigurationSection>
