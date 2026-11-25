<!-- eslint-disable vue/multi-word-component-names -- Fixture filename is used by the type-test runner. -->
<script setup lang="ts">
import { ref } from "vue";
import {
  ConfigurationSection,
  type ConfigurationSectionHandle,
  type SectionActionMap,
} from "@ezenki/deploy-commander-manager-sdk-vue";

interface Profile { name: string; enabled: boolean }
const section = ref<ConfigurationSectionHandle<Profile> | null>(null);
const actions: SectionActionMap<Profile> = {
  enable: { label: "Enable", execute: ({ data }) => { void data.enabled; } },
};
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
</template>
