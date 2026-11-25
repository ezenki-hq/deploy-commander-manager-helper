import type { JSONValue, Wire } from "@ezenki/deploy-commander-installer-interface";
export interface ManagerInvocationError { readonly message: string; readonly status?: number; readonly details?: JSONValue }
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
  | { readonly mode: "called"; readonly context: ManagerInvocationCalledContext<TMetadata,TResult> | undefined };
export interface ManagerInvocationInputs<TMetadata = unknown,TResult extends JSONValue = JSONValue> { wire: Wire; definition?: ManagerInvocationDefinition<TMetadata,TResult> }
