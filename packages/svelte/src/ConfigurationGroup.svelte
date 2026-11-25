<script lang="ts">
  import type { SvelteConfigurationGroupProps } from "./types.js";

  let { columns = 1, className = "", children }: SvelteConfigurationGroupProps = $props();
</script>

<div class={`dcmsdk-group${columns === 2 ? " dcmsdk-group-two" : ""}${className ? ` ${className}` : ""}`}>
  {#if children}{@render children()}{/if}
</div>
