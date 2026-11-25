<script setup lang="ts">
import { computed } from "vue";
import { formatSectionError } from "@ezenki/deploy-commander-manager-sdk-core/configuration";
import type { SectionStatusProps } from "@ezenki/deploy-commander-manager-sdk-core/configuration";

const props = defineProps<SectionStatusProps>();
const isError = computed(() => props.status.kind === "error");
const kind = computed(() => props.status.kind);
const message = computed(() => {
  switch (props.status.kind) {
    case "idle": return "";
    case "loading": return "Loading configuration…";
    case "pending": return `${props.status.label} in progress…`;
    case "success": return `${props.status.label} complete`;
    case "error": return [props.status.label, formatSectionError(props.status.error)].filter(Boolean).join(": ");
    default: return "";
  }
});
</script>

<template>
  <div
    v-if="kind !== 'idle'"
    :class="['dcmsdk-status', `dcmsdk-status-${kind === 'loading' ? 'loading' : kind}`, props.className]"
    :role="isError ? 'alert' : 'status'"
    :aria-live="isError ? 'assertive' : 'polite'"
  >
    {{ message }}
  </div>
</template>
