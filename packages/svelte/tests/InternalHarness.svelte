<script lang="ts">
  import { ConfigurationSection } from "@ezenki/deploy-commander-manager-sdk-svelte";
  import type {
    ConfigurationSectionHandle,
    SectionActionMap,
    SectionDataLoader,
  } from "@ezenki/deploy-commander-manager-sdk-svelte";

  interface Profile { name: string }
  let {
    loadData,
    readOnly = false,
    actions,
  }: {
    loadData?: SectionDataLoader<Profile>;
    readOnly?: boolean;
    actions?: SectionActionMap<Profile>;
  } = $props();
  let section: ConfigurationSectionHandle<Profile>;
</script>

<ConfigurationSection
  bind:this={section}
  title="Internal profile"
  initialData={{ name: "initial" }}
  {loadData}
  {readOnly}
  {actions}
>
  {#snippet children(context)}
    <input
      aria-label="Profile name"
      value={context.data.name}
      disabled={context.readOnly || context.loading}
      oninput={(event) => context.setData({ name: event.currentTarget.value })}
    />
  {/snippet}
</ConfigurationSection>

<button type="button" onclick={() => section.setData({ name: "host update" })}>Host update</button>
