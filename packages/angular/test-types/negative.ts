import { Component, signal } from "@angular/core";
import { ConfigurationSection, ConfigurationSectionBody } from "@ezenki/deploy-commander-manager-sdk-angular";
import type { SectionActionMap, SectionData } from "@ezenki/deploy-commander-manager-sdk-angular";

interface Profile { name: string }
interface OtherData { identifier: number }

@Component({
  standalone: true,
  imports: [ConfigurationSection, ConfigurationSectionBody],
  template: `
    <dcmsdk-configuration-section #section [title]="'Invalid'"
      [sectionData]="data()"
      [actions]="actions">
      <ng-template [dcmsdkSectionBodyFor]="section" let-context>
        <span>{{context.unavailable}}</span>
      </ng-template>
    </dcmsdk-configuration-section>
    <dcmsdk-configuration-section [title]="'Mixed'" [sectionData]="mixedData" />
  `,
})
export class NegativeConsumer {
  readonly data = signal<SectionData<Profile>>({ initialData: { name: "Valid" } });
  readonly mixedData = {
    data: { name: "Parent" },
    onDataChange: (_value: Profile) => { void _value; },
    initialData: { name: "Internal" },
  };
  readonly actions: SectionActionMap<OtherData> = {
    open: { label: "Open", execute: ({ data }) => { void data.identifier; } },
  };
}
