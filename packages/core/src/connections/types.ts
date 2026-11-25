import type { JSONValue, Wire } from "@ezenki/deploy-commander-installer-interface";
import type { ConnectionSummary, ResourceFilters, ResourceSummary } from "../action-types.js";
import type { ConfigurationSectionContext } from "../configuration/types.js";

export interface CreateConnectionInterfaceMetadata { purpose: "createConnection"; resourceId: string }
export type CreateConnectionInterfaceResult =
  | { kind: "created"; resourceId: string; connectionId: string }
  | { kind: "cancelled" };
export type ConnectionRequestResult =
  | { kind: "created"; connection: ConnectionSummary; connections: readonly ConnectionSummary[] }
  | { kind: "cancelled" };
export type ConnectionResourceQuery =
  | { resourceId: string; filters?: never }
  | { resourceId?: never; filters?: Omit<ResourceFilters, "limit" | "offset"> };
export interface ConnectionProviderContext {
  readonly resource: import("../action-types.js").OwnedResource;
  readonly callingManagerId: string;
  readonly existingConnections: readonly ConnectionSummary[];
}
export interface ConnectionSettings { metadata: JSONValue; external?: boolean; labels?: Record<string, string> }
export type PrepareConnection<T extends object> = (settings: Readonly<T>, context: ConnectionProviderContext) => ConnectionSettings | Promise<ConnectionSettings>;
export type DeleteProviderConnection = (connection: ConnectionSummary, context: ConnectionProviderContext) => void | Promise<void>;
export interface ConnectionConsumerActions {
  getResources(query: ConnectionResourceQuery): Promise<readonly ResourceSummary[]>;
  getConnections(resourceId: string): Promise<readonly ConnectionSummary[]>;
  getConnection(id: string): Promise<ConnectionSummary>;
  requestConnection(resourceId: string): Promise<ConnectionRequestResult>;
  deleteConnection(connectionId: string): Promise<void>;
}
export interface ConnectionProviderSession {
  readonly context: ConnectionProviderContext;
  create<T extends object>(settings: Readonly<T>, prepare: PrepareConnection<T>): Promise<void>;
  delete(connectionId: string, handler: DeleteProviderConnection): Promise<readonly ConnectionSummary[]>;
  cancel(): void;
}
export interface ConnectionConsumerOptions {
  resource: ConnectionResourceQuery;
  maxConnections?: number;
  onSelectionChange?(ids: readonly string[]): void;
  onDeleteConnection?(connection: ConnectionSummary): void | Promise<void>;
}
export interface ConnectionSelectionData { readonly connectionIds: readonly string[] }
export type ConnectionSelection =
 | { data: ConnectionSelectionData; onDataChange(next: ConnectionSelectionData): void; initialData?: never }
 | { data?: never; onDataChange?: never; initialData?: ConnectionSelectionData };
export interface ConnectionSelectionState {
  readonly resources: readonly ResourceSummary[];
  readonly resourceId: string | undefined;
  readonly connections: readonly ConnectionSummary[];
  readonly selected: readonly ConnectionSummary[];
  readonly connectionIds: readonly string[];
  readonly canAdd: boolean;
  readonly loading: boolean;
  readonly status: import("../configuration/types.js").SectionStatusState;
  readonly notice?: string;
}
export interface ConnectionSelectionController {
  configure(options: ConnectionConsumerOptions & ConnectionSelection): void;
  chooseResource(resourceId: string): void;
  select(connectionId: string): void;
  remove(connectionId: string): void;
  create(): Promise<void>;
  delete(connectionId: string): Promise<void>;
  dispose(): void;
}
export type ConnectionSettingsBodyContext<T extends object> = ConfigurationSectionContext<T> & ConnectionProviderContext;
export interface ConnectionProviderDefinition<T extends object> {
  initialSettings(context: ConnectionProviderContext): T;
  onCreateConnection: PrepareConnection<NoInfer<T>>;
  onDeleteConnection?: DeleteProviderConnection;
}
export interface ResourceProviderInterfaces<TSettings extends object> {
  createConnection: ConnectionProviderDefinition<TSettings>;
}
export interface ConnectionSectionInputs extends ConnectionConsumerOptions { wire: Wire; selection?: ConnectionSelection; title?: string; description?: string; className?: string }
export interface CreateConnectionSectionInputs<T extends object> { wire: Wire; definition: ConnectionProviderDefinition<T>; title?: string; description?: string; className?: string }
