<script setup lang="ts" generic="TSettings extends object">
import { onBeforeUnmount, onMounted, ref, shallowRef } from "vue";
import { openConnectionProviderSession } from "@ezenki/deploy-commander-manager-sdk-core";
import type { ConnectionProviderContext, ConnectionProviderSession } from "@ezenki/deploy-commander-manager-sdk-core";
import ConfigurationSection from "./ConfigurationSection.vue";
import type { VueCreateConnectionSectionProps, VueCreateConnectionSectionSlots } from "./connection-types.js";
const props = defineProps<VueCreateConnectionSectionProps<TSettings>>();
defineSlots<VueCreateConnectionSectionSlots<TSettings>>();
const settings = shallowRef<TSettings>();
const context = shallowRef<ConnectionProviderContext>();
const session = shallowRef<ConnectionProviderSession>();
const status = shallowRef<{ kind: "loading" | "error" | "pending" | "idle"; error?: unknown }>({ kind: "loading" });
const revision = ref(0);
let abort: globalThis.AbortController | undefined;
onMounted(() => { void open(); });
async function open() {
  abort = new globalThis.AbortController(); status.value = { kind: "loading" };
  try {
    const opened = await openConnectionProviderSession(props.wire, abort.signal);
    if (abort.signal.aborted) return;
    session.value = opened; context.value = opened.context; settings.value = props.definition.initialSettings(opened.context); status.value = { kind: "idle" };
  } catch (error) { if (!abort.signal.aborted) status.value = { kind: "error", error }; }
}
onBeforeUnmount(() => abort?.abort());
function update(next: TSettings) { settings.value = next; }
async function deleteConnection(id: string) {
  if (!session.value || !props.definition.onDeleteConnection || !context.value) return;
  try { const rows = await session.value.delete(id, props.definition.onDeleteConnection); context.value = { ...context.value, existingConnections: rows }; revision.value++; }
  catch (error) { status.value = { kind: "error", error }; }
}
</script>
<template>
  <ConfigurationSection
    :title="props.title ?? 'Create Connection'"
    :description="props.description"
    :section-data="{ data: settings, onDataChange: update }"
    :loading="status.kind === 'loading' || status.kind === 'pending'"
    :error="status.kind === 'error' ? status.error : undefined"
    :class-name="props.className"
    :data-revision="revision"
  >
    <template #default="section">
      <div
        v-if="context"
        class="space-y-4"
      >
        <p>Connect as <strong>{{ context.callingManagerId }}</strong> to <strong>{{ context.resource.resource.name }}</strong>.</p>
        <slot v-bind="{ ...section, ...context }" />
        <ul
          v-if="context.existingConnections.length"
          aria-label="Existing connections"
        >
          <li
            v-for="connection in context.existingConnections"
            :key="connection.id"
          >
            {{ connection.id }}<button
              v-if="props.definition.onDeleteConnection"
              type="button"
              class="dcmsdk-button dcmsdk-button-danger"
              @click="deleteConnection(connection.id)"
            >
              Delete
            </button>
          </li>
        </ul>
        <div class="flex gap-2">
          <button
            type="button"
            class="dcmsdk-button dcmsdk-button-primary"
            :disabled="status.kind === 'pending' || status.kind === 'loading'"
            @click="status = { kind: 'pending' }; session?.create(section.data, props.definition.onCreateConnection).then(() => status = { kind: 'idle' }).catch((error) => status = { kind: 'error', error })"
          >
            Create Connection
          </button>
          <button
            type="button"
            class="dcmsdk-button dcmsdk-button-secondary"
            :disabled="status.kind === 'pending' || status.kind === 'loading'"
            @click="session?.cancel()"
          >
            Cancel
          </button>
        </div>
      </div>
    </template>
  </ConfigurationSection>
</template>
