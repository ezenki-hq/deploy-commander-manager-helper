<script lang="ts">
  import { SectionActions } from "@ezenki/deploy-commander-manager-sdk-svelte";
  import type { SectionActionMap } from "@ezenki/deploy-commander-manager-sdk-svelte";

  interface Profile { name: string }
  let { actions }: { actions: SectionActionMap<Profile> } = $props();
</script>

<SectionActions data={{ name: "current" }} {actions} />
