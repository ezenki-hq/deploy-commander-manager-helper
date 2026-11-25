import { Component, ViewChild, signal } from "@angular/core";
import type { SectionActionMap, SectionData } from "@ezenki/deploy-commander-manager-sdk-core/configuration";
import { ConfigurationGroup, ConfigurationSection, ConfigurationSectionBody } from "../src/index.js";

export interface Profile { name: string }

@Component({
  selector: "dcmsdk-test-section-host",
  standalone: true,
  imports: [ConfigurationGroup, ConfigurationSection, ConfigurationSectionBody],
  template: `
    <dcmsdk-configuration-section
      #section
      [title]="'Profile'"
      [description]="'Manager configuration'"
      [sectionData]="sectionData()"
      [actions]="actions()"
      [readOnly]="readOnly()"
      [loading]="loading()"
    >
      <ng-template [dcmsdkSectionBodyFor]="section" let-context>
        <input
          #nameField
          aria-label="Profile name"
          [value]="context.data.name"
          (input)="context.setData({ name: nameField.value })"
        />
      </ng-template>
    </dcmsdk-configuration-section>
    <button type="button" (click)="section.setData({ name: 'host update' })">Host update</button>
    <dcmsdk-configuration-group [columns]="2"><span>Grouped card</span></dcmsdk-configuration-group>
  `,
})
export class SectionHostComponent {
  readonly sectionData = signal<SectionData<Profile>>({ initialData: { name: "initial" } });
  readonly readOnly = signal(false);
  readonly loading = signal(false);
  readonly lastActionData = signal<string | undefined>(undefined);
  readonly actions = signal<SectionActionMap<Profile>>({
    inspect: {
      label: "Inspect",
      visible: (data) => data.name !== "hidden",
      execute: ({ data }) => { this.lastActionData.set(data.name); },
    },
    run: {
      label: "Run",
      execute: () => this.runPromise ?? Promise.resolve(),
    },
    allowed: {
      label: "Allowed",
      allowInReadOnly: true,
      execute: () => { this.lastActionData.set("allowed"); },
    },
  });
  @ViewChild(ConfigurationSection) section!: ConfigurationSection<Profile>;
  runPromise: Promise<void> | undefined;

  setControlledData(next: Profile): void {
    this.sectionData.set({ data: next, onDataChange: (value) => this.setControlledData(value) });
  }
}
