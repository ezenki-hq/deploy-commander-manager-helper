import type { Wire } from "@ezenki/deploy-commander-installer-interface";
import type {
  ConnectionConsumerOptions,
  ConnectionProviderDefinition,
  ConnectionSelection,
  ConnectionSettingsBodyContext,
} from "@ezenki/deploy-commander-manager-sdk-core";
import type { ReactNode } from "react";

export type { ConnectionConsumerOptions, ConnectionProviderContext, ConnectionProviderDefinition, ConnectionSelection, ConnectionSelectionData, ConnectionSummary, ConnectionResourceQuery, ConnectionSelectionState } from "@ezenki/deploy-commander-manager-sdk-core";
export type ConnectionSectionProps = ConnectionConsumerOptions & ConnectionSelection & {
  wire: Wire;
  title?: string;
  description?: ReactNode;
  className?: string;
};
export interface CreateConnectionSectionDefinition<TSettings extends object> extends ConnectionProviderDefinition<TSettings> {
  title?: string;
  description?: ReactNode;
  className?: string;
  children(context: ConnectionSettingsBodyContext<NoInfer<TSettings>>): ReactNode;
}
export type CreateConnectionSectionProps<TSettings extends object> = CreateConnectionSectionDefinition<TSettings> & { wire: Wire };
export interface ResourceProviderInterfaces<TSettings extends object> {
  createConnection: CreateConnectionSectionDefinition<TSettings>;
}
export type { ConnectionSettingsBodyContext };
