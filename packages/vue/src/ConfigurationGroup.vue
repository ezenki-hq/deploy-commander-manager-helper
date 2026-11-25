<script setup lang="ts">
import type { VueConfigurationGroupProps } from "./types.js";

withDefaults(defineProps<VueConfigurationGroupProps>(), { columns: 1, className: "" });
</script>

<template>
  <div :class="['dcmsdk-group', { 'dcmsdk-group-two': columns === 2 }, className]">
    <slot />
  </div>
</template>
