# Connection and Manager Invocation Sections

## Scope

Add `ConnectionSection` for resource consumers and `CreateConnectionSection` for resource providers in React, Vue, Svelte, and Angular. Put the wire protocol, identity checks, authorization checks, and consumer selection lifecycle in core. Each adapter uses the configuration section components and stylesheet it already ships. The Manager Interface Guide and the installed installer interface types define the platform boundary. Resource configuration stays in the provider interface, and Deploy Commander stores the connection created by that interface.

Add an optional `ManagerInvocationSection` to the same four adapters. It is a general way for a manager to choose which content to render when opened directly or by another manager. Both connection components remain usable without it.

## Interface protocol

1. The consumer chooses an accessible resource summary. Before opening the child, core resolves that exact resource again with the summary operation and obtains the current manager ID through RPC. The resource must have a valid owning manager distinct from the current manager.
2. Core calls `wire.startInterface({ manager: resource.manager, metadata: { purpose: "createConnection", resourceId: resource.id } })` and awaits `child.close`. The provider app dispatches on this metadata using the SDK guard. The provider section reads the metadata again from the interface RPC, validates it, resolves the child manager and `getCallingManager()`, and loads the exact resource through `getMyResource()`. The returned resource owner must match the current child manager. Missing caller context, a self call, invalid metadata, and an unowned resource stop the workflow before rendering the settings or invoking a mutation.
3. The provider loads existing connections using both `resource` and `manager` filters. It displays the existing connections and checks the pair again at explicit creation, passing that data to the manager's handler. The handler prepares metadata, optional labels, and the external flag. Core calls the existing `createConnection` action, which invokes `caller.createConnection()` from the provider's wire. Core supplies both identifiers from validated context. Multiple distinct connection IDs for the same pair are supported.
4. The provider closes with its RPC-derived manager ID and the minimal creation result. It validates that the returned connection summary matches the resource and caller first. Explicit cancellation closes with an `ok: true` result carrying `kind: "cancelled"`. Recoverable create or delete errors appear in the provider so it can retry or cancel. Fatal initialization errors appear locally and, when both current and calling manager identities are known, close with a structured failed response. A root interface with no caller stays open and displays the error.
5. The consumer validates the closing manager, success flag, result discriminator, resource ID, and connection ID. For a success result, it refreshes the authorized connections for the exact resource and current consuming manager, follows pagination, and requires the exact returned ID to appear. It refreshes the displayed list for that resource and appends the ID to the latest selection if capacity permits. A failed close, invalid result, or missing authorized ID surfaces an error. Cancellation returns to the picker without a selection change. If selection capacity fills while the child is open, retain the refreshed list and current selection and explain why the new connection was not selected.

The wire has no parent API for cancelling a launched child. The child supplies its Cancel action. The consumer ignores obsolete results after unmount or workflow replacement. The parent prevents a second launch while the first is pending. Mutations require explicit actions. Reads use the checked core wrappers.

## Core TypeScript contract

Export through the core package root. Keep `CoreActions` compatible. All workflow methods bind to the same caller-supplied `Wire` and construct or reuse `createCoreActions(wire)` internally.

```ts
import type { JSONValue, Wire } from "@ezenki/deploy-commander-installer-interface";

export interface CreateConnectionInterfaceMetadata {
  purpose: "createConnection";
  resourceId: string;
}

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
  readonly resource: OwnedResource;
  readonly callingManagerId: string;
  readonly existingConnections: readonly ConnectionSummary[];
}

export interface ConnectionSettings {
  metadata: JSONValue;
  external?: boolean;
  labels?: CreateConnectionConfig["labels"];
}

export type PrepareConnection<TSettings extends object> = (
  settings: Readonly<TSettings>,
  context: ConnectionProviderContext,
) => ConnectionSettings | Promise<ConnectionSettings>;

export type DeleteProviderConnection = (
  connection: ConnectionSummary,
  context: ConnectionProviderContext,
) => void | Promise<void>;

export interface ConnectionConsumerActions {
  getResources(query: ConnectionResourceQuery): Promise<readonly ResourceSummary[]>;
  getConnections(resourceId: string): Promise<readonly ConnectionSummary[]>;
  getConnection(id: string): Promise<ConnectionSummary>;
  requestConnection(resourceId: string): Promise<ConnectionRequestResult>;
}

export interface ConnectionProviderSession {
  readonly context: ConnectionProviderContext;
  create<TSettings extends object>(
    settings: Readonly<TSettings>,
    prepare: PrepareConnection<TSettings>,
  ): Promise<void>;
  delete(connectionId: string, handler: DeleteProviderConnection): Promise<readonly ConnectionSummary[]>;
  cancel(): void;
}

export function createConnectionConsumerActions(wire: Wire): ConnectionConsumerActions;
export function openConnectionProviderSession(wire: Wire, signal?: AbortSignal): Promise<ConnectionProviderSession>;
export function isCreateConnectionInterfaceMetadata(value: unknown): value is CreateConnectionInterfaceMetadata;
```

Core reads accessible resource summaries using a paginated resource query. Fixed IDs use exact summary lookup. Apply server-supported type, manager, external, and label filters. Connection listing for resource selection shows the connections visible to the consumer under that resource. The creation confirmation restricts the refresh to the current consuming manager and the exact resource, then returns the refreshed visible list with other authorized choices preserved. An exact checked connection lookup for controlled or initial IDs returns only the connection summary and verifies its ID. Reject malformed pages that cannot advance. Provider session identity remains private to the methods, including after the settings callback. Lock concurrent create calls. Mark the session complete after a validated successful creation and close, and prevent a second mutation on that session. If the RPC reported success but returned malformed or mismatched data, treat it as an uncertain completed mutation, close with an error, and prevent a blind retry. A rejected mutation can be retried. The provider app owns the wire's lifetime.

Each picker narrows its visible choices by name or ID. The provider initialization signal invalidates an obsolete setup and suppresses a stale fatal close. It does not cancel an RPC already in progress.

### Shared selection lifecycle

The framework adapters reuse a per-mount consumer controller. The controller owns authorization of selected IDs, capacity, selection updates, discovery state, and stale result guards. The adapters own rendering, their client's mount/dispose lifecycle, and binding changes to the controller. It is a plain TypeScript object with no framework dependency.

```ts
export interface ConnectionSelectionData {
  readonly connectionIds: readonly string[];
}

export type ConnectionSelection =
  | { data: ConnectionSelectionData; onDataChange(next: ConnectionSelectionData): void; initialData?: never }
  | { data?: never; onDataChange?: never; initialData?: ConnectionSelectionData };

export interface ConnectionConsumerOptions {
  resource: ConnectionResourceQuery;
  maxConnections?: number;
  onSelectionChange?(connectionIds: readonly string[]): void;
  onDeleteConnection?(connection: ConnectionSummary): void | Promise<void>;
}

export interface ConnectionSelectionState {
  readonly resources: readonly ResourceSummary[];
  readonly resourceId: string | undefined;
  readonly connections: readonly ConnectionSummary[];
  readonly selected: readonly ConnectionSummary[];
  readonly connectionIds: readonly string[];
  readonly canAdd: boolean;
  readonly loading: boolean;
  readonly status: SectionStatusState;
  readonly notice: string | undefined;
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

export function createConnectionSelectionController(
  actions: ConnectionConsumerActions,
  onStateChange: (state: ConnectionSelectionState) => void,
): ConnectionSelectionController;

export interface ConnectionProviderDefinition<TSettings extends object> {
  initialSettings(context: ConnectionProviderContext): TSettings;
  onCreateConnection: PrepareConnection<NoInfer<TSettings>>;
  onDeleteConnection?: DeleteProviderConnection;
}

export type ConnectionSettingsBodyContext<TSettings extends object> =
  ConfigurationSectionContext<TSettings> & ConnectionProviderContext;
```

Initialize on the first `configure` call. Compare resource queries and selected ID lists by value so equivalent rebindings do not restart reads. Snapshot a read or mutation's resource before starting. Guard against obsolete discovery responses and duplicate mutations. Reevaluate current capacity and controlled IDs when a child completes, so updates to those props do not invalidate its authorized result. After disposal, ignore late results and callbacks. Bind methods to the current options so a callback captured before an asynchronous operation cannot overwrite a newer controlled selection. An authorized connection row can be selected by ID. Externally provided IDs can be removed locally even if the authorization check failed.

## React TypeScript contract

Export through the React package root. A `Wire` type import is part of the public declaration, so declare a direct workspace dependency on the installed interface package if needed for public type resolution. Reuse the existing `styles.css` export.

```ts
import type { ReactNode } from "react";
import type { Wire } from "@ezenki/deploy-commander-installer-interface";

interface ConnectionSectionPresentation {
  title?: string;
  description?: ReactNode;
  className?: string;
}

export type ConnectionSectionProps =
  ConnectionSelection & ConnectionConsumerOptions & ConnectionSectionPresentation & { wire: Wire };

export interface CreateConnectionSectionDefinition<TSettings extends object>
  extends ConnectionSectionPresentation, ConnectionProviderDefinition<TSettings> {
  children(context: ConnectionSettingsBodyContext<NoInfer<TSettings>>): ReactNode;
}

export type CreateConnectionSectionProps<TSettings extends object> =
  CreateConnectionSectionDefinition<TSettings> & { wire: Wire };

export interface ResourceProviderInterfaces<TSettings extends object> {
  createConnection: CreateConnectionSectionDefinition<TSettings>;
}

export function ConnectionSection(props: ConnectionSectionProps): ReactNode;
export function CreateConnectionSection<TSettings extends object>(props: CreateConnectionSectionProps<TSettings>): ReactNode;
```

## Vue, Svelte, and Angular TypeScript contracts

Each package exports `ConnectionSection`, `CreateConnectionSection`, and the common application-facing types from core. Select a data mode with one `selection` prop in Vue and Angular to preserve the union in templates. Svelte exposes controlled and internal data props directly, like React. Use a generic `definition` input in Vue, Svelte, and Angular so settings types are inferred from `initialSettings`. Register a required `createConnection` definition in each provider app, then route validated metadata to its provider section. The React definition includes the render function. The other frameworks supply the body at the component usage through their native template mechanism. Put the common `ConnectionSectionInputs`, `CreateConnectionSectionInputs`, and non-React `ResourceProviderInterfaces` types in core. Re-export the corresponding registry contract from each framework package.

```ts
// Vue and Angular share this consumer input shape.
export interface ConnectionSectionInputs extends ConnectionConsumerOptions {
  wire: Wire;
  selection?: ConnectionSelection;
  title?: string;
  description?: string;
  className?: string;
}

export interface CreateConnectionSectionInputs<TSettings extends object> {
  wire: Wire;
  definition: ConnectionProviderDefinition<TSettings>;
  title?: string;
  description?: string;
  className?: string;
}

export interface ResourceProviderInterfaces<TSettings extends object> {
  createConnection: ConnectionProviderDefinition<TSettings>;
}

// Vue 3.5+ generic SFC props and settings slot.
export type VueConnectionSectionProps = ConnectionSectionInputs;
export type VueCreateConnectionSectionProps<TSettings extends object> = CreateConnectionSectionInputs<TSettings>;
export interface VueCreateConnectionSectionSlots<TSettings extends object> {
  default(context: ConnectionSettingsBodyContext<NoInfer<TSettings>>): unknown;
}

// Svelte 5.20+ generic component props, with Snippet from Svelte.
export type SvelteConnectionSectionProps = Omit<ConnectionSectionInputs, "selection"> & ConnectionSelection;
export type SvelteCreateConnectionSectionProps<TSettings extends object> =
  CreateConnectionSectionInputs<TSettings> & {
    children: Snippet<[ConnectionSettingsBodyContext<NoInfer<TSettings>>]>;
  };

// Angular 21 standalone components. All public inputs use their corresponding InputSignal type.
export declare class ConnectionSection {
  readonly wire: InputSignal<Wire>;
  readonly resource: InputSignal<ConnectionResourceQuery>;
  readonly selection: InputSignal<ConnectionSelection | undefined>;
  readonly maxConnections: InputSignal<number | undefined>;
  readonly onSelectionChange: InputSignal<ConnectionConsumerOptions["onSelectionChange"]>;
  readonly onDeleteConnection: InputSignal<ConnectionConsumerOptions["onDeleteConnection"]>;
  readonly title: InputSignal<string | undefined>;
  readonly description: InputSignal<string | undefined>;
  readonly className: InputSignal<string | undefined>;
}

export declare class CreateConnectionSection<TSettings extends object> {
  readonly wire: InputSignal<Wire>;
  readonly definition: InputSignal<ConnectionProviderDefinition<TSettings>>;
  readonly title: InputSignal<string | undefined>;
  readonly description: InputSignal<string | undefined>;
  readonly className: InputSignal<string | undefined>;
}

export declare class CreateConnectionSectionBody<TSettings extends object> {
  readonly dcmsdkCreateConnectionBodyFor: InputSignal<CreateConnectionSection<TSettings>>;
  static ngTemplateContextGuard<TSettings extends object>(
    directive: CreateConnectionSectionBody<TSettings>,
    context: unknown,
  ): context is { $implicit: ConnectionSettingsBodyContext<TSettings> };
}
```

Vue passes settings and the SDK context to the default scoped slot. Svelte passes that same context to the `children` snippet. Angular uses `<dcmsdk-connection-section>` and `<dcmsdk-create-connection-section #provider>` with `<ng-template [dcmsdkCreateConnectionBodyFor]="provider" let-context>` for settings. Angular requires `wire` and `resource` on the consumer, `wire` and `definition` on the provider, and the link input on the body directive. In all adapters, client mount starts RPC reads and teardown invalidates local updates. Keep the wire instance stable for the mounted workflow. Remount the section to change wire or switch between controlled and internal selection modes.

The manager declares its interface registry using `satisfies ResourceProviderInterfaces<Settings>` and dispatches the validated purpose to `CreateConnectionSection` with the registered definition. TypeScript requires that entry when the app uses the contract. The host app owns metadata dispatch.

The consumer reads selected IDs from `data` in controlled mode and seeds local state once from `initialData` otherwise. Every user-driven selection change emits the complete proposed list to `onSelectionChange` and, in controlled mode, `onDataChange`. Selection uniqueness is by connection ID. `maxConnections` is a positive safe integer and defaults to 1. Reaching capacity disables selection additions and creation. Removing a selection is available locally and does not delete the connection. Invalid supplied selections or unauthorized IDs produce a visible error, and the UI does not silently replace them. Changes to the resource picker do not erase selected IDs. A delete button appears only with a handler, uses an authorized connection from the current list, awaits the handler, refreshes the list on success, and removes the affected selection if present. The provider uses the same pattern for existing connections scoped to its validated caller and resource. Handler errors preserve selection and context and surface via section status.

Use accessible labels, native selection controls, and `ConfigurationSection`, `SectionActions` and `SectionStatus` for pending and error presentation. Use the existing responsive and theme classes. The consumer exposes a named **Create Connection** action; the provider exposes **Create Connection** and **Cancel**. Neither form submits while initializing or while handling a conflicting mutation.

## Acceptance

Each adapter must pass a two-wire component test. The parent chooses the resource and opens its owner. The child receives RPC metadata and calling manager context, renders typed settings, creates on its own wire, and closes. The parent confirms the exact new ID through authorized reads and emits its selection. Each adapter also tests existing selection, explicit multi-selection, the default cap, optional deletion, cancellation, and unauthorized access. Use native compiler fixtures for the public body and data-mode types and for required provider registration. Confirm both component exports and the existing stylesheet export in all four packages.

## Optional ManagerInvocationSection

### Lifecycle and close ownership

- On client mount, resolve current and calling manager IDs through `RPC.SetupRPCCaller(wire)`. Validate the current ID and any supplied caller ID as nonblank strings without surrounding whitespace. A null or undefined calling manager identifies standalone mode. A supplied valid ID identifies called mode. This generic component leaves any additional caller authorization to the manager's workflow.
- Render only the matching supplied content after detection. In standalone mode, skip the metadata RPC and allow the developer to supply only standalone content. For a called view, retrieve metadata through `getMetadata()`, pass the unknown value through the developer's synchronous parser, and render called content only when parsing succeeds. When the matching content is omitted, render an empty body. A called view requires a definition for metadata parsing. Missing definition when a called view is configured, invalid context, rejected RPCs, and parser failures appear as errors using the shared `SectionStatus`. Use its loading state during detection and parsing. Leave the surrounding layout to the manager.
- Called content receives the trusted `callingManagerId`, the parsed `metadata`, and explicit `complete` and `fail` callbacks. The first valid terminal callback sends one `wire.close()` response with the RPC-derived current manager ID. `complete` sets `ok: true` and copies the JSON result. `fail` sets `ok: false` and passes the structured message, optional status, and optional JSON details. Validate outbound payloads before attempting to close. A second callback call is ignored, including a second call in the same event loop turn. Validation failures throw to the callback caller before a close is attempted, leaving the callback usable for correction. Reserve the terminal state before calling `wire.close()` so a synchronous transport error cannot cause a second send.
- Loading and rendering perform detection only. Validation and load failures display an error without closing the wire. Abort or invalidate initialization on unmount or a wire or definition replacement. Ignore late results and make stale callbacks inert. The host owns the wire and its listeners.
- When the called view renders `CreateConnectionSection`, that provider section owns the close on create, cancel, or its specified fatal failure. The wrapper only chooses the view. The called slot or render function does not wire its `complete` or `fail` to the provider. Keep the actual two-wire acceptance test with the wrapper present and assert exactly one close. An unwrapped provider follows the same workflow. The consuming manager continues to use resource summaries exclusively when looking up the selected resource.

### Core TypeScript contract

Export from core under the package root. `Wire` and `JSONValue` below come from the installer interface package. The optional `validateResult` supports rules beyond JSON compatibility and lets a typed definition carry the result type into templates. The parser may return domain metadata and may throw a descriptive validation error, including for missing or unexpected metadata.

```ts
export interface ManagerInvocationError {
  readonly message: string;
  readonly status?: number;
  readonly details?: JSONValue;
}

export interface ManagerInvocationDefinition<TMetadata = unknown, TResult extends JSONValue = JSONValue> {
  parseMetadata(value: unknown): TMetadata;
  validateResult?: (result: TResult) => void;
}

export interface ManagerInvocationCalledContext<TMetadata, TResult extends JSONValue> {
  readonly callingManagerId: string;
  readonly metadata: TMetadata;
  complete(result: TResult): void;
  fail(error: ManagerInvocationError): void;
}

export type ManagerInvocationSession<TMetadata, TResult extends JSONValue> =
  | { readonly mode: "standalone" }
  | { readonly mode: "called"; readonly context: ManagerInvocationCalledContext<TMetadata, TResult> | undefined };

export interface ManagerInvocationInputs<TMetadata = unknown, TResult extends JSONValue = JSONValue> {
  wire: Wire;
  definition?: ManagerInvocationDefinition<TMetadata, TResult>;
}

export function openManagerInvocationSession<TMetadata = unknown, TResult extends JSONValue = JSONValue>(
  wire: Wire,
  definition?: ManagerInvocationDefinition<TMetadata, TResult>,
  signal?: AbortSignal,
): Promise<ManagerInvocationSession<TMetadata, TResult>>;
```

Without a definition, core detects called mode and returns it without context or a metadata read. An adapter with called content and no definition surfaces the missing parser error in called mode. An adapter without called content can omit the definition when opening the session. A standalone interface never invokes either parser or result validator. For a narrow result type, annotate the supplied definition as `ManagerInvocationDefinition<Metadata, Result>`. The results contract uses JSON-compatible types. Failure messages must contain non-whitespace text and optional status must be an integer.

### Framework TypeScript contracts

Each adapter exports `ManagerInvocationSection` and the application-facing invocation types from core. Both views are optional in every adapter. React can pass a component through its render function, Vue uses named slots, Svelte uses named snippets, and Angular uses lazy `ng-template` content. Inactive content is never mounted.

```ts
type CalledView<TMetadata, TResult extends JSONValue> =
  ManagerInvocationCalledContext<NoInfer<TMetadata>, NoInfer<TResult>>;

// React
export interface ManagerInvocationSectionProps<TMetadata, TResult extends JSONValue>
  extends ManagerInvocationInputs<TMetadata, TResult> {
  standalone?(): ReactNode;
  called?(context: CalledView<TMetadata, TResult>): ReactNode;
}
export function ManagerInvocationSection<TMetadata = unknown, TResult extends JSONValue = JSONValue>(
  props: ManagerInvocationSectionProps<TMetadata, TResult>,
): ReactNode;

// Vue
export type VueManagerInvocationSectionProps<TMetadata, TResult extends JSONValue> =
  ManagerInvocationInputs<TMetadata, TResult>;
export interface VueManagerInvocationSectionSlots<TMetadata, TResult extends JSONValue> {
  standalone?(): unknown;
  called?(context: CalledView<TMetadata, TResult>): unknown;
}

// Svelte
export interface SvelteManagerInvocationSectionProps<TMetadata, TResult extends JSONValue>
  extends ManagerInvocationInputs<TMetadata, TResult> {
  standalone?: Snippet;
  called?: Snippet<[CalledView<TMetadata, TResult>]>;
}

// Angular
export declare class ManagerInvocationSection<TMetadata, TResult extends JSONValue> {
  readonly wire: InputSignal<Wire>;
  readonly definition: InputSignal<ManagerInvocationDefinition<TMetadata, TResult> | undefined>;
}
export declare class ManagerInvocationCalledBody<TMetadata, TResult extends JSONValue> {
  readonly dcmsdkManagerInvocationCalledFor: InputSignal<ManagerInvocationSection<TMetadata, TResult>>;
  static ngTemplateContextGuard<TMetadata, TResult extends JSONValue>(
    directive: ManagerInvocationCalledBody<TMetadata, TResult>,
    context: unknown,
  ): context is { $implicit: ManagerInvocationCalledContext<TMetadata, TResult> };
}
```

Angular uses `<dcmsdk-manager-invocation-section #invocation>` with `<ng-template #dcmsdkStandalone>` and `<ng-template [dcmsdkManagerInvocationCalledFor]="invocation" let-context>` for the respective views. Angular exports the standalone directive `ManagerInvocationCalledBody` alongside the section. `ReactNode`, `Snippet`, and `InputSignal` come from the corresponding framework packages.

### Invocation acceptance

Core tests cover both modes, valid and invalid identities, metadata parsing and rejection, success and failure payloads, repeated completion attempts, wire errors, and abort before and after detection. All four adapter tests exercise standalone and called content, optional modes, loading, validation errors, explicit success and failure, and unmount while detection is pending. Native compiler fixtures verify inferred metadata and reject an invalid result type. Existing connection tests remain required, including exact single close when the invocation wrapper hosts the provider.
