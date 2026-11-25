import { Component, signal } from "@angular/core";
import { ConfigurationSection, ConfigurationSectionBody } from "@ezenki/deploy-commander-manager-sdk-angular";
import type { SectionActionMap, SectionData } from "@ezenki/deploy-commander-manager-sdk-angular";

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
