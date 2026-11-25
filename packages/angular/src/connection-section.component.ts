import { CommonModule } from "@angular/common";
import { ChangeDetectionStrategy, Component, DestroyRef, PLATFORM_ID, computed, effect, inject, input, signal } from "@angular/core";
import { isPlatformBrowser } from "@angular/common";
import { createConnectionConsumerActions, createConnectionSelectionController } from "@ezenki/deploy-commander-manager-sdk-core";
import type { ConnectionSelectionController, ConnectionSelectionState, ConnectionSectionInputs } from "@ezenki/deploy-commander-manager-sdk-core";
import { ConfigurationSection } from "./configuration-section.component.js";
import { ConfigurationSectionBody } from "./section-body.directive.js";
import { SectionStatus } from "./section-status.component.js";

const EMPTY: ConnectionSelectionState = { resources: [], resourceId: undefined, connections: [], selected: [], connectionIds: [], canAdd: true, loading: true, status: { kind: "loading" } };
@Component({
  selector: "dcmsdk-connection-section", standalone: true, imports: [CommonModule, ConfigurationSection, ConfigurationSectionBody, SectionStatus], changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <dcmsdk-configuration-section #section="dcmsdkConfigurationSection" [title]="title() ?? 'Connections'" [description]="description()" [sectionData]="sectionData()" [className]="className()">
      <ng-template [dcmsdkSectionBodyFor]="section" let-context>
        <label class="dcmsdk-field"><span class="dcmsdk-label">Search resources</span>
          <input class="dcmsdk-input" aria-label="Search resources" [value]="search()" placeholder="Name or resource ID" (input)="updateSearch($event)" />
        </label>
        <label class="dcmsdk-field"><span class="dcmsdk-label">Resource</span>
          <select aria-label="Resource" class="dcmsdk-input" [value]="state().resourceId ?? ''" [disabled]="state().loading" (change)="choose($event)">
            @for (resource of visibleResources(); track resource.id) { <option [value]="resource.id">{{ resource.name }} · {{ resource.type }} · {{ resource.id }}</option> }
          </select>
        </label>
        <div class="flex flex-wrap gap-2">
          @for (connection of state().connections; track connection.id) { <button type="button" class="dcmsdk-button dcmsdk-button-secondary" [disabled]="!state().canAdd || state().connectionIds.includes(connection.id) || state().loading" (click)="controller?.select(connection.id)">Select {{ connection.id }}</button> }
          @for (connection of state().selected; track connection.id) {
            <span class="inline-flex items-center gap-2 rounded-full border border-dcmsdk-border bg-dcmsdk-raised px-3 py-1 text-sm">{{ connection.id }}<button type="button" [attr.aria-label]="'Remove ' + connection.id" (click)="controller?.remove(connection.id)">×</button>
              @if (onDeleteConnection()) { <button type="button" class="dcmsdk-button dcmsdk-button-danger" (click)="controller?.delete(connection.id)">Delete</button> }
            </span>
          }
        </div>
        @if (state().canAdd) { <button type="button" class="dcmsdk-button dcmsdk-button-primary" [disabled]="state().loading || !state().resourceId" (click)="controller?.create()">Create Connection</button> }
        @if (state().notice) { <p role="status">{{ state().notice }}</p> }
        @if (state().status.kind === 'error' || state().status.kind === 'pending' || state().status.kind === 'success') { <dcmsdk-section-status [status]="state().status" /> }
      </ng-template>
    </dcmsdk-configuration-section>
  `,
})
export class ConnectionSection {
  readonly wire = input.required<ConnectionSectionInputs["wire"]>();
  readonly resource = input.required<ConnectionSectionInputs["resource"]>();
  readonly selection = input<ConnectionSectionInputs["selection"]>();
  readonly maxConnections = input<number>();
  readonly onSelectionChange = input<ConnectionSectionInputs["onSelectionChange"]>();
  readonly onDeleteConnection = input<ConnectionSectionInputs["onDeleteConnection"]>();
  readonly title = input<string>();
  readonly description = input<string>();
  readonly className = input("");
  readonly state = signal(EMPTY);
  readonly search = signal("");
  readonly visibleResources = computed<readonly { id: string; name: string; type: string }[]>(() => this.state().resources.filter((resource) => `${resource.name} ${resource.id}`.toLowerCase().includes(this.search().toLowerCase())));
  readonly sectionData = computed(() => ({ initialData: { connectionIds: [] as readonly string[] } }));
  controller?: ConnectionSelectionController;
  private readonly platform = inject(PLATFORM_ID);
  private readonly destroyRef = inject(DestroyRef);
  constructor() {
    if (isPlatformBrowser(this.platform)) effect(() => {
      const wire = this.wire();
      if (!this.controller) this.controller = createConnectionSelectionController(createConnectionConsumerActions(wire), (value) => this.state.set(value));
      const selection = this.selection() ?? { initialData: { connectionIds: [] } };
      this.controller.configure({ resource: this.resource(), maxConnections: this.maxConnections(), onSelectionChange: this.onSelectionChange(), onDeleteConnection: this.onDeleteConnection(), ...selection });
    });
    this.destroyRef.onDestroy(() => this.controller?.dispose());
  }
  choose(event: Event) { this.controller?.chooseResource((event.target as HTMLSelectElement).value); }
  updateSearch(event: Event) { this.search.set((event.target as HTMLInputElement).value); }
}
