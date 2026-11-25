<!-- eslint-disable vue/multi-word-component-names -- Fixture filename is used by the type-test runner. -->
<script setup lang="ts">
import { ConfigurationSection, type SectionActionMap } from "@ezenki/deploy-commander-manager-sdk-vue";

interface OtherData { identifier: number }
const actions: SectionActionMap<OtherData> = {
  open: { label: "Open", execute: ({ data }) => { void data.identifier; } },
};
</script>

<template>
  <ConfigurationSection
    title="Invalid"
    :section-data="{ data: { name: 'Parent' }, onDataChange: () => {}, initialData: { name: 'Internal' } }"
    :actions="actions"
  >
    <template #default="{ data }">
      <output>{{ data.name }}</output>
    </template>
  </ConfigurationSection>
</template>
