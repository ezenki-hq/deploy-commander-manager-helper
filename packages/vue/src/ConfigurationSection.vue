<script setup lang="ts" generic="TData extends object">
import { computed, onBeforeUnmount, onMounted, ref, shallowRef, useId, watch } from "vue";
import { runSectionLoader } from "@ezenki/deploy-commander-manager-sdk-core/configuration";
import type {
  ControlledSectionData,
  ConfigurationSectionHandle,
  SectionData,
  SectionStatusState,
} from "@ezenki/deploy-commander-manager-sdk-core/configuration";
import SectionActions from "./SectionActions.vue";
import SectionStatus from "./SectionStatus.vue";
import type { VueConfigurationSectionProps, VueConfigurationSectionSlots } from "./types.js";

const props = defineProps<VueConfigurationSectionProps<TData>>();
defineSlots<VueConfigurationSectionSlots<TData>>();

const internalData = shallowRef<TData | undefined>(
  "initialData" in props.sectionData ? props.sectionData.initialData : undefined,
);
const internalLoading = ref(false);
const loadError = shallowRef<unknown>();
const mounted = ref(false);
const headingId = useId();
let cancelLoad: (() => void) | undefined;

function isControlledData(value: SectionData<TData>): value is ControlledSectionData<TData> {
  return typeof value.onDataChange === "function";
}

const data = computed(() => isControlledData(props.sectionData)
  ? props.sectionData.data
  : internalData.value);
const loader = computed(() => {
  const sectionData = props.sectionData;
  return !isControlledData(sectionData) && "loadData" in sectionData
    ? sectionData.loadData
    : undefined;
});
const loading = computed(() => props.loading === true || internalLoading.value);
const visibleError = computed(() => props.error !== undefined ? props.error : loadError.value);
const status = computed<SectionStatusState>(() => loading.value
  ? { kind: "loading" }
  : { kind: "error", error: visibleError.value });

function setData(next: TData): void {
  if (isControlledData(props.sectionData)) {
    props.sectionData.onDataChange(next);
    return;
  }
  cancelLoad?.();
  cancelLoad = undefined;
  internalLoading.value = false;
  loadError.value = undefined;
  internalData.value = next;
}

function setBodyData(next: TData): void {
  if (props.readOnly) return;
  setData(next);
}

function startLoader(): void {
  cancelLoad?.();
  cancelLoad = undefined;
  const currentLoader = loader.value;
  if (!currentLoader) {
    internalLoading.value = false;
    return;
  }
  internalLoading.value = true;
  loadError.value = undefined;
  const cancel = runSectionLoader(currentLoader, {
    onData: (next) => {
      if (cancelLoad === cancel) cancelLoad = undefined;
      internalData.value = next;
      internalLoading.value = false;
    },
    onError: (error) => {
      if (cancelLoad === cancel) cancelLoad = undefined;
      loadError.value = error;
      internalLoading.value = false;
    },
  });
  cancelLoad = cancel;
}

onMounted(() => {
  mounted.value = true;
  startLoader();
});
watch(loader, () => {
  if (mounted.value) startLoader();
});
onBeforeUnmount(() => {
  mounted.value = false;
  cancelLoad?.();
  cancelLoad = undefined;
});

defineExpose<ConfigurationSectionHandle<TData>>({ setData });
</script>

<template>
  <section
    :class="['dcmsdk-section', props.className]"
    :aria-labelledby="headingId"
    :aria-busy="loading"
  >
    <header class="dcmsdk-section-header">
      <h2
        :id="headingId"
        class="dcmsdk-section-title"
      >
        {{ props.title }}
      </h2>
      <div
        v-if="$slots.description || props.description"
        class="dcmsdk-section-description"
      >
        <slot name="description">
          {{ props.description }}
        </slot>
      </div>
    </header>
    <fieldset
      v-if="data !== undefined"
      class="dcmsdk-section-body min-w-0 border-0 p-0"
      :disabled="props.readOnly"
    >
      <slot
        :data="data"
        :set-data="setBodyData"
        :read-only="props.readOnly === true"
        :loading="loading"
      />
    </fieldset>
    <SectionStatus
      v-if="loading || visibleError !== undefined"
      :status="status"
    />
    <SectionActions
      v-if="data !== undefined && props.actions"
      :data="data"
      :actions="props.actions"
      :core-actions="props.coreActions"
      :read-only="props.readOnly"
      :disabled="loading"
    />
  </section>
</template>
