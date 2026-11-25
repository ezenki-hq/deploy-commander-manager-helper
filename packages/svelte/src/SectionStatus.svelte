<script lang="ts">
  import { formatSectionError } from "@ezenki/deploy-commander-manager-sdk-core/configuration";
  import type { SectionStatusState } from "@ezenki/deploy-commander-manager-sdk-core/configuration";

  let { status, className = "" }: { status: SectionStatusState; className?: string } = $props();
  let kind = $derived(status.kind);
  let isError = $derived(status.kind === "error");
  let message = $derived.by(() => {
    switch (status.kind) {
      case "idle": return "";
      case "loading": return "Loading configuration…";
      case "pending": return `${status.label} in progress…`;
      case "success": return `${status.label} complete`;
      case "error": return [status.label, formatSectionError(status.error)].filter(Boolean).join(": ");
    }
  });
</script>

{#if kind !== "idle"}
  <div
    class={`dcmsdk-status dcmsdk-status-${kind === "loading" ? "loading" : kind}${className ? ` ${className}` : ""}`}
    role={isError ? "alert" : "status"}
    aria-live={isError ? "assertive" : "polite"}
  >
    {message}
  </div>
{/if}
