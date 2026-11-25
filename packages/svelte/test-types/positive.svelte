<script lang="ts">
  import { ConfigurationSection } from "@ezenki/deploy-commander-manager-sdk-svelte";
  import type { SectionActionMap } from "@ezenki/deploy-commander-manager-sdk-svelte";

  interface Profile { name: string; enabled: boolean }
  const actions: SectionActionMap<Profile> = {
    enable: { label: "Enable", execute: ({ data }) => { void data.enabled; } },
  };
</script>

<ConfigurationSection
  title="Profile"
  initialData={{ name: "Example", enabled: true }}
  {actions}
>
  {#snippet descriptionContent()}<span>Profile details</span>{/snippet}
  {#snippet children({ data, setData, readOnly, loading })}
    <input
      value={data.name}
      disabled={readOnly || loading}
      oninput={(event) => setData({ ...data, name: event.currentTarget.value })}
    />
  {/snippet}
</ConfigurationSection>
