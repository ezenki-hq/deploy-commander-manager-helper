import { CommonModule, isPlatformBrowser } from "@angular/common";
import { ChangeDetectionStrategy, Component, ContentChild, DestroyRef, PLATFORM_ID, TemplateRef, computed, effect, inject, input, signal } from "@angular/core";
import { openManagerInvocationSession } from "@ezenki/deploy-commander-manager-sdk-core";
import type { ManagerInvocationDefinition, ManagerInvocationSession } from "@ezenki/deploy-commander-manager-sdk-core";
import type { JSONValue, Wire } from "@ezenki/deploy-commander-installer-interface";
import { SectionStatus } from "./section-status.component.js";
import { ManagerInvocationCalledBody } from "./manager-invocation-called-body.directive.js";
@Component({ selector: "dcmsdk-manager-invocation-section", standalone: true, imports: [CommonModule, SectionStatus], changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @if (error() !== undefined) { <dcmsdk-section-status [status]="{ kind: 'error', error: error() }" /> }
    @else if (!session()) { <dcmsdk-section-status [status]="{ kind: 'loading' }" /> }
    @else if (session()?.mode === 'standalone') { <ng-container *ngTemplateOutlet="standaloneTemplate ?? null" /> }
    @else if (calledBody?.template && isCalled() && calledContextValue()) { <ng-container *ngTemplateOutlet="calledBody!.template; context: calledContext()" /> }
    @else if (calledBody?.template) { <dcmsdk-section-status [status]="{ kind: 'error', error: missingDefinition }" /> }
  `,
})
export class ManagerInvocationSection<TMetadata = unknown, TResult extends JSONValue = JSONValue> {
  readonly wire = input.required<Wire>(); readonly definition = input<ManagerInvocationDefinition<TMetadata, TResult>>();
  readonly session = signal<ManagerInvocationSession<TMetadata, TResult> | undefined>(undefined); readonly error = signal<unknown>(undefined);
  readonly missingDefinition = new Error("Called content requires a metadata definition");
  @ContentChild("dcmsdkStandalone", { read: TemplateRef }) standaloneTemplate?: TemplateRef<unknown>;
  @ContentChild(ManagerInvocationCalledBody) calledBody?: ManagerInvocationCalledBody<TMetadata, TResult>;
  readonly calledContextValue = computed(() => {
    const current = this.session();
    return current?.mode === "called" ? current.context : undefined;
  });
  readonly isCalled = computed(() => this.session()?.mode === "called");
  readonly calledContext = computed(() => ({ $implicit: this.calledContextValue() }));
  private readonly platform = inject(PLATFORM_ID); private readonly destroyRef = inject(DestroyRef); private abort?: AbortController;
  constructor() {
    if (isPlatformBrowser(this.platform)) effect((onCleanup) => {
      const wire = this.wire(); const definition = this.definition();
      const abort = new AbortController(); this.abort = abort; this.session.set(undefined); this.error.set(undefined);
      void openManagerInvocationSession(wire, definition, abort.signal).then((value) => { if (!abort.signal.aborted) this.session.set(value); }).catch((reason: unknown) => { if (!abort.signal.aborted) this.error.set(reason); });
      onCleanup(() => abort.abort());
    });
    this.destroyRef.onDestroy(() => this.abort?.abort());
  }
}
