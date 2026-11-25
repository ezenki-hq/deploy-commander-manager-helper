<script setup lang="ts" generic="TMetadata = unknown, TResult extends import('@ezenki/deploy-commander-installer-interface').JSONValue = import('@ezenki/deploy-commander-installer-interface').JSONValue">
import { onBeforeUnmount, onMounted, shallowRef, watch } from "vue";
import { openManagerInvocationSession } from "@ezenki/deploy-commander-manager-sdk-core";
import type { ManagerInvocationSession } from "@ezenki/deploy-commander-manager-sdk-core";
import SectionStatus from "./SectionStatus.vue";
import type { ManagerInvocationDefinition } from "@ezenki/deploy-commander-manager-sdk-core";
const props = defineProps<{ wire: import('@ezenki/deploy-commander-installer-interface').Wire; definition?: ManagerInvocationDefinition<TMetadata, TResult> }>();
defineSlots<{ standalone?(): unknown; called?(props: { context: NonNullable<Extract<ManagerInvocationSession<TMetadata, TResult>, { mode: 'called' }>['context']> }): unknown }>();
const session = shallowRef<ManagerInvocationSession<TMetadata, TResult>>();
const error = shallowRef<unknown>();
let abort: globalThis.AbortController | undefined;
async function detect() {
  abort?.abort(); abort = new globalThis.AbortController(); session.value = undefined; error.value = undefined;
  try { const result = await openManagerInvocationSession(props.wire, props.definition, abort.signal); if (!abort.signal.aborted) session.value = result; }
  catch (reason) { if (!abort.signal.aborted) error.value = reason; }
}
onMounted(() => { void detect(); });
watch(() => [props.wire, props.definition], () => { if (abort) void detect(); });
onBeforeUnmount(() => abort?.abort());
</script>
<template>
  <SectionStatus
    v-if="error !== undefined"
    :status="{ kind: 'error', error }"
  />
  <SectionStatus
    v-else-if="!session"
    :status="{ kind: 'loading' }"
  />
  <slot
    v-else-if="session.mode === 'standalone'"
    name="standalone"
  />
  <slot
    v-else-if="$slots.called && props.definition && session.context"
    name="called"
    :context="session.context"
  />
  <SectionStatus
    v-else-if="$slots.called"
    :status="{ kind: 'error', error: new Error('Called content requires a metadata definition') }"
  />
</template>
