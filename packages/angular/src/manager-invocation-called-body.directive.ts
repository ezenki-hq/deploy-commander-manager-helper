import { Directive, TemplateRef, input } from "@angular/core";
import type { InputSignal } from "@angular/core";
import type { ManagerInvocationCalledContext } from "@ezenki/deploy-commander-manager-sdk-core";
import type { ManagerInvocationSection } from "./manager-invocation-section.component.js";
@Directive({ selector: "ng-template[dcmsdkManagerInvocationCalledFor]", standalone: true })
export class ManagerInvocationCalledBody<TMetadata, TResult extends import("@ezenki/deploy-commander-installer-interface").JSONValue> {
  readonly dcmsdkManagerInvocationCalledFor: InputSignal<ManagerInvocationSection<TMetadata, TResult>> = input.required<ManagerInvocationSection<TMetadata, TResult>>();
  constructor(readonly template: TemplateRef<{ $implicit: ManagerInvocationCalledContext<TMetadata, TResult> }>) {}
  static ngTemplateContextGuard<TMetadata, TResult extends import("@ezenki/deploy-commander-installer-interface").JSONValue>(directive: ManagerInvocationCalledBody<TMetadata, TResult>, context: unknown): context is { $implicit: ManagerInvocationCalledContext<TMetadata, TResult> } { return Boolean(directive) || context === undefined; }
}
