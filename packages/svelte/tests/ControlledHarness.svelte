<script lang="ts">
  import { ConfigurationSection } from "@ezenki/deploy-commander-manager-sdk-svelte";
  import type { SectionActionMap } from "@ezenki/deploy-commander-manager-sdk-svelte";

  interface Profile { name: string }
  let { actions }: { actions?: SectionActionMap<Profile> } = $props();
  let data = $state<Profile>({ name: "before" });
  function onDataChange(next: Profile): void { data = next; }
</script>

<ConfigurationSection
  title="Controlled profile"
  {data}
  {onDataChange}
  {actions}
>
  {#snippet children(context)}
    <input
      aria-label="Profile name"
      value={context.data.name}
      oninput={(event) => context.setData({ name: event.currentTarget.value })}
    />
  {/snippet}
</ConfigurationSection>
