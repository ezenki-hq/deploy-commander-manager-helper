import { Component, signal } from "@angular/core";
import type { Wire } from "@ezenki/deploy-commander-installer-interface";
import { ConnectionSection, CreateConnectionSection, CreateConnectionSectionBody, ManagerInvocationSection, ManagerInvocationCalledBody } from "../src/index.js";

@Component({ selector: "dcmsdk-test-connection-host", standalone: true, imports: [ConnectionSection], template: `<dcmsdk-connection-section [wire]="wire()" [resource]="resource" [selection]="selection" [onSelectionChange]="onSelected" />` })
export class ConnectionHost {
  readonly wire = signal<Wire>({} as Wire);
  readonly resource = { resourceId: "r1" } as const;
  readonly selection = { initialData: { connectionIds: [] as readonly string[] } } as const;
  readonly selected = signal<readonly string[]>([]);
  readonly onSelected = (ids: readonly string[]) => this.selected.set(ids);
}

@Component({ selector: "dcmsdk-test-provider-invocation-host", standalone: true, imports: [ManagerInvocationSection, ManagerInvocationCalledBody, CreateConnectionSection, CreateConnectionSectionBody], template: `
  <dcmsdk-manager-invocation-section [wire]="wire()" [definition]="invocationDefinition" #invocation>
    <ng-template #dcmsdkStandalone><p>Standalone page</p></ng-template>
    <ng-template [dcmsdkManagerInvocationCalledFor]="invocation" let-context>
      <dcmsdk-create-connection-section [wire]="wire()" [definition]="providerDefinition" #provider>
        <ng-template [dcmsdkCreateConnectionBodyFor]="provider" let-context><p>Provider body {{ context.callingManagerId }}</p></ng-template>
      </dcmsdk-create-connection-section>
    </ng-template>
  </dcmsdk-manager-invocation-section>
` })
export class ProviderInvocationHost {
  readonly wire = signal<Wire>({} as Wire);
  readonly invocationDefinition = { parseMetadata: (value: unknown) => value };
  readonly providerDefinition = { initialSettings: () => ({ label: "test" }), onCreateConnection: (settings: { label: string }) => ({ metadata: settings }) };
}
