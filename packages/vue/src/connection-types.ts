export type { ConnectionSectionInputs as VueConnectionSectionProps, CreateConnectionSectionInputs as VueCreateConnectionSectionProps, ConnectionProviderContext, ConnectionProviderDefinition, ConnectionSettingsBodyContext, ConnectionSelection, ConnectionSelectionData, ConnectionConsumerOptions, ConnectionResourceQuery, ConnectionSummary, ConnectionSelectionState, ResourceProviderInterfaces } from "@ezenki/deploy-commander-manager-sdk-core";
export interface VueCreateConnectionSectionSlots<TSettings extends object> {
  default(context: import("@ezenki/deploy-commander-manager-sdk-core").ConnectionSettingsBodyContext<NoInfer<TSettings>>): unknown;
}
export type VueManagerInvocationSectionProps<TMetadata = unknown, TResult extends import("@ezenki/deploy-commander-installer-interface").JSONValue = import("@ezenki/deploy-commander-installer-interface").JSONValue> = import("@ezenki/deploy-commander-manager-sdk-core").ManagerInvocationInputs<TMetadata, TResult>;
export interface VueManagerInvocationSectionSlots<TMetadata = unknown, TResult extends import("@ezenki/deploy-commander-installer-interface").JSONValue = import("@ezenki/deploy-commander-installer-interface").JSONValue> {
  standalone?(): unknown;
  called?(props: { context: import("@ezenki/deploy-commander-manager-sdk-core").ManagerInvocationCalledContext<NoInfer<TMetadata>, NoInfer<TResult>> }): unknown;
}
