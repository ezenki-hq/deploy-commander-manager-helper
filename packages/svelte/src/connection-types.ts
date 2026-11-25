import type { Snippet } from "svelte";
import type { ConnectionSectionInputs, ConnectionSelection, CreateConnectionSectionInputs, ConnectionSettingsBodyContext } from "@ezenki/deploy-commander-manager-sdk-core";
export type { ConnectionProviderContext, ConnectionProviderDefinition, ConnectionSelectionData, ConnectionConsumerOptions, ConnectionResourceQuery, ConnectionSummary, ConnectionSelectionState, ResourceProviderInterfaces } from "@ezenki/deploy-commander-manager-sdk-core";
export type SvelteConnectionSectionProps = Omit<ConnectionSectionInputs, "selection"> & ConnectionSelection;
export type SvelteCreateConnectionSectionProps<TSettings extends object> = CreateConnectionSectionInputs<TSettings> & { children: Snippet<[ConnectionSettingsBodyContext<NoInfer<TSettings>>]> };
export type SvelteManagerInvocationSectionProps<TMetadata = unknown, TResult extends import("@ezenki/deploy-commander-installer-interface").JSONValue = import("@ezenki/deploy-commander-installer-interface").JSONValue> = import("@ezenki/deploy-commander-manager-sdk-core").ManagerInvocationInputs<TMetadata, TResult> & {
  standalone?: Snippet;
  called?: Snippet<[import("@ezenki/deploy-commander-manager-sdk-core").ManagerInvocationCalledContext<NoInfer<TMetadata>, NoInfer<TResult>>]>;
};
