<!-- eslint-disable vue/multi-word-component-names -- Fixture filename is used by the type-test runner. -->
<script setup lang="ts">
import { ref } from "vue";
import {
  ConnectionSection,
  CreateConnectionSection,
  ManagerInvocationSection,
  ConfigurationSection,
  type ConfigurationSectionHandle,
  type SectionActionMap,
} from "@ezenki/deploy-commander-manager-sdk-vue";
import type { ManagerInvocationDefinition, ResourceProviderInterfaces } from "@ezenki/deploy-commander-manager-sdk-vue";

interface Profile { name: string; enabled: boolean }
const section = ref<ConfigurationSectionHandle<Profile> | null>(null);
const actions: SectionActionMap<Profile> = {
  enable: { label: "Enable", execute: ({ data }) => { void data.enabled; } },
};
interface Settings { database: string }
const providerInterfaces = { createConnection: { initialSettings: () => ({ database: "" }), onCreateConnection: (settings: Settings) => ({ metadata: { database: settings.database } }) } } satisfies ResourceProviderInterfaces<Settings>;
const wire = {} as import("@ezenki/deploy-commander-installer-interface").Wire;
const invocationDefinition: ManagerInvocationDefinition<{ resourceId: string }, { accepted: boolean }> = { parseMetadata: (value) => ({ resourceId: String((value as { resourceId: unknown }).resourceId) }) };
</script>

<template>
  <ConfigurationSection
    ref="section"
    title="Profile"
    :section-data="{ initialData: { name: 'Example', enabled: true } }"
    :actions="actions"
  >
    <template #description>
      <span>Profile details</span>
    </template>
    <template #default="{ data, setData, readOnly, loading }">
      <input
        :value="data.name"
        :disabled="readOnly || loading"
        @input="setData({ ...data, name: ($event.target as HTMLInputElement).value })"
      >
    </template>
  </ConfigurationSection>
  <ConnectionSection
    :wire="wire"
    :resource="{ filters: { type: 'database' } }"
    :selection="{ initialData: { connectionIds: [] } }"
    :max-connections="2"
  />
  <ManagerInvocationSection
    :wire="wire"
    :definition="invocationDefinition"
  >
    <template #standalone>
      <p>Standalone</p>
    </template>
    <template #called="{ context }">
      <p>{{ context.callingManagerId }} {{ context.metadata.resourceId }}</p>
      <CreateConnectionSection
        :wire="wire"
        :definition="providerInterfaces.createConnection"
      >
        <template #default="{ data, setData }">
          <input
            :value="data.database"
            @input="setData({ ...data, database: ($event.target as HTMLInputElement).value })"
          >
        </template>
      </CreateConnectionSection>
    </template>
  </ManagerInvocationSection>
</template>
