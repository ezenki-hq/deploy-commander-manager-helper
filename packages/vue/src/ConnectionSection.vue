<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref, shallowRef, watch } from "vue";
import { createConnectionConsumerActions, createConnectionSelectionController } from "@ezenki/deploy-commander-manager-sdk-core";
import type { ConnectionSelectionController, ConnectionSelectionState } from "@ezenki/deploy-commander-manager-sdk-core";
import ConfigurationSection from "./ConfigurationSection.vue";
import SectionStatus from "./SectionStatus.vue";
import type { VueConnectionSectionProps } from "./connection-types.js";

const props = defineProps<VueConnectionSectionProps>();
const state = shallowRef<ConnectionSelectionState>({ resources: [], resourceId: undefined, connections: [], selected: [], connectionIds: [], canAdd: true, loading: true, status: { kind: "loading" } });
const search = ref("");
let controller: ConnectionSelectionController | undefined;
function selectionOptions() {
  return { ...props, ...(props.selection ?? { initialData: { connectionIds: [] } }) };
}
function configure() { controller?.configure(selectionOptions()); }
onMounted(() => {
  controller = createConnectionSelectionController(createConnectionConsumerActions(props.wire), (next) => { state.value = next; });
  configure();
});
watch(() => [props.resource, props.selection, props.maxConnections, props.onSelectionChange, props.onDeleteConnection], configure, { deep: true });
onBeforeUnmount(() => controller?.dispose());
</script>

<template>
  <ConfigurationSection
    :title="props.title ?? 'Connections'"
    :description="props.description"
    :section-data="{ initialData: { connectionIds: [] } }"
    :class-name="props.className"
  >
    <template #default>
      <label class="dcmsdk-field"><span class="dcmsdk-label">Search resources</span><input
        v-model="search"
        aria-label="Search resources"
        class="dcmsdk-input"
        placeholder="Name or resource ID"
      ></label>
      <label class="dcmsdk-field"><span class="dcmsdk-label">Resource</span>
        <select
          aria-label="Resource"
          class="dcmsdk-input"
          :value="state.resourceId ?? ''"
          :disabled="state.loading"
          @change="controller?.chooseResource(($event.target as HTMLSelectElement).value)"
        >
          <option
            v-for="resource in state.resources.filter((item) => `${item.name} ${item.id}`.toLowerCase().includes(search.toLowerCase()))"
            :key="resource.id"
            :value="resource.id"
          >{{ resource.name }} · {{ resource.type }} · {{ resource.id }}</option>
        </select>
      </label>
      <div class="flex flex-wrap gap-2">
        <button
          v-for="connection in state.connections"
          :key="connection.id"
          type="button"
          class="dcmsdk-button dcmsdk-button-secondary"
          :disabled="!state.canAdd || state.connectionIds.includes(connection.id) || state.loading"
          @click="controller?.select(connection.id)"
        >
          Select {{ connection.id }}
        </button>
        <span
          v-for="connection in state.selected"
          :key="connection.id"
          class="inline-flex items-center gap-2 rounded-full border border-dcmsdk-border bg-dcmsdk-raised px-3 py-1 text-sm"
        >
          {{ connection.id }} <button
            type="button"
            :aria-label="`Remove ${connection.id}`"
            @click="controller?.remove(connection.id)"
          >×</button>
          <button
            v-if="props.onDeleteConnection"
            type="button"
            class="dcmsdk-button dcmsdk-button-danger"
            @click="controller?.delete(connection.id)"
          >Delete</button>
        </span>
      </div>
      <button
        v-if="state.canAdd"
        type="button"
        class="dcmsdk-button dcmsdk-button-primary"
        :disabled="state.loading || !state.resourceId"
        @click="controller?.create()"
      >
        Create Connection
      </button>
      <p
        v-if="state.notice"
        role="status"
      >
        {{ state.notice }}
      </p>
      <SectionStatus
        v-if="state.status.kind === 'error' || state.status.kind === 'pending' || state.status.kind === 'success'"
        :status="state.status"
      />
    </template>
  </ConfigurationSection>
</template>
