<script setup lang="ts" generic="TData extends object">
import { shallowRef } from "vue";
import {
  createSectionActionRunner,
  getSectionActionState,
} from "@ezenki/deploy-commander-manager-sdk-core/configuration";
import type { SectionStatusState } from "@ezenki/deploy-commander-manager-sdk-core/configuration";
import SectionStatus from "./SectionStatus.vue";
import type { VueSectionActionsProps } from "./types.js";

const props = withDefaults(defineProps<VueSectionActionsProps<TData>>(), {
  readOnly: false,
  disabled: false,
});
const status = shallowRef<SectionStatusState>({ kind: "idle" });
const runner = createSectionActionRunner((next) => { status.value = next; });

function actionState(action: (typeof props.actions)[string]) {
  return getSectionActionState(action, props.data, {
    readOnly: props.readOnly,
    disabled: props.disabled || runner.pending,
  });
}

function runAction(action: (typeof props.actions)[string]): void {
  const snapshot = props.data;
  void runner.run(action.label, () => action.execute({ data: snapshot, coreActions: props.coreActions }));
}
</script>

<template>
  <div
    v-if="Object.entries(props.actions).some(([, action]) => actionState(action).visible)"
    :class="['dcmsdk-actions', props.className]"
  >
    <template
      v-for="([key, action]) in Object.entries(props.actions)"
      :key="key"
    >
      <button
        v-if="actionState(action).visible"
        :class="['dcmsdk-button', `dcmsdk-button-${action.variant ?? 'secondary'}`]"
        type="button"
        :disabled="actionState(action).disabled"
        @click="runAction(action)"
      >
        {{ action.label }}
      </button>
    </template>
  </div>
  <SectionStatus :status="status" />
</template>
