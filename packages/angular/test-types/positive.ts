import { Component, signal } from "@angular/core";
import { ConfigurationSection, ConfigurationSectionBody, ConnectionSection, CreateConnectionSection, CreateConnectionSectionBody, ManagerInvocationSection, ManagerInvocationCalledBody } from "@ezenki/deploy-commander-manager-sdk-angular";
import type { ManagerInvocationDefinition, ResourceProviderInterfaces, SectionActionMap, SectionData } from "@ezenki/deploy-commander-manager-sdk-angular";

interface Profile { name: string; enabled: boolean }

@Component({
  standalone: true,
  imports: [ConfigurationSection, ConfigurationSectionBody],
  template: `
    <dcmsdk-configuration-section #section [title]="'Profile'" [sectionData]="data()" [actions]="actions">
      <ng-template [dcmsdkSectionBodyFor]="section" let-context>
        <input [value]="context.data.name" [disabled]="context.readOnly || context.loading"
          (input)="context.setData({name: field.value, enabled: context.data.enabled})" #field />
      </ng-template>
    </dcmsdk-configuration-section>
  `,
})
export class PositiveConsumer {
  readonly data = signal<SectionData<Profile>>({ initialData: { name: "Example", enabled: true } });
  readonly actions: SectionActionMap<Profile> = {
    enable: { label: "Enable", execute: ({ data }) => { void data.enabled; } },
  };
}

interface ConnectionSettings { database: string }
interface CallMetadata { resourceId: string }
type CallResult = Record<"accepted", boolean>;
@Component({
  standalone: true,
  imports: [ConnectionSection, CreateConnectionSection, CreateConnectionSectionBody, ManagerInvocationSection, ManagerInvocationCalledBody],
  template: `
    <dcmsdk-connection-section [wire]="wire" [resource]="{filters: {type: 'database'}}" [selection]="selection" [maxConnections]="2" />
    <dcmsdk-manager-invocation-section [wire]="wire" [definition]="invocationDefinition" #invocation>
      <ng-template #dcmsdkStandalone><p>Standalone</p></ng-template>
      <ng-template [dcmsdkManagerInvocationCalledFor]="invocation" let-context>
        <button (click)="context.complete({accepted: true})">Complete</button>
        <dcmsdk-create-connection-section [wire]="wire" [definition]="providerInterfaces.createConnection" #provider>
          <ng-template [dcmsdkCreateConnectionBodyFor]="provider" let-context>
            <input [value]="context.data.database" (input)="context.setData({database: field.value})" #field />
          </ng-template>
        </dcmsdk-create-connection-section>
      </ng-template>
    </dcmsdk-manager-invocation-section>
  `,
})
export class ConnectionPositiveConsumer {
  readonly wire = {} as import("@ezenki/deploy-commander-installer-interface").Wire;
  readonly selection = { initialData: { connectionIds: [] as readonly string[] } };
  readonly providerInterfaces = { createConnection: { initialSettings: () => ({ database: "" }), onCreateConnection: (settings: ConnectionSettings) => ({ metadata: { database: settings.database } }) } } satisfies ResourceProviderInterfaces<ConnectionSettings>;
  readonly invocationDefinition: ManagerInvocationDefinition<CallMetadata, CallResult> = { parseMetadata: (value) => value as CallMetadata };
}
