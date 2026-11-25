<script lang="ts">
  import { ConfigurationSection, ConnectionSection, CreateConnectionSection, ManagerInvocationSection } from "@ezenki/deploy-commander-manager-sdk-svelte";
  import type { ManagerInvocationDefinition, ResourceProviderInterfaces, SectionActionMap } from "@ezenki/deploy-commander-manager-sdk-svelte";

  interface Profile { name: string; enabled: boolean }
  const actions: SectionActionMap<Profile> = {
    enable: { label: "Enable", execute: ({ data }) => { void data.enabled; } },
  };
  interface Settings { database: string }
  const providerInterfaces = { createConnection: { initialSettings: () => ({ database: "" }), onCreateConnection: (settings: Settings) => ({ metadata: { database: settings.database } }) } } satisfies ResourceProviderInterfaces<Settings>;
  const wire = {} as import("@ezenki/deploy-commander-installer-interface").Wire;
  const invocationDefinition: ManagerInvocationDefinition<{ resourceId: string }, { accepted: boolean }> = { parseMetadata: (value) => ({ resourceId: String((value as { resourceId: unknown }).resourceId) }) };
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
<ConnectionSection {wire} resource={{ filters: { type: "database" } }} initialData={{ connectionIds: [] }} maxConnections={2} />
<ManagerInvocationSection {wire} definition={invocationDefinition}>
  {#snippet standalone()}<p>Standalone</p>{/snippet}
  {#snippet called(context)}
    <p>{context.callingManagerId} {context.metadata.resourceId}</p>
    <button onclick={() => context.complete({ accepted: true })}>Complete</button>
    <CreateConnectionSection {wire} definition={providerInterfaces.createConnection}>
      {#snippet children(section)}<input value={section.data.database} oninput={(event) => section.setData({ ...section.data, database: event.currentTarget.value })} />{/snippet}
    </CreateConnectionSection>
  {/snippet}
</ManagerInvocationSection>
