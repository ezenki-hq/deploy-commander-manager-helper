import { CommonModule, isPlatformBrowser } from "@angular/common";
import { ChangeDetectionStrategy, Component, ContentChild, DestroyRef, PLATFORM_ID, computed, effect, inject, input, signal } from "@angular/core";
import { openConnectionProviderSession } from "@ezenki/deploy-commander-manager-sdk-core";
import type { ConnectionProviderContext, ConnectionProviderSession, ConnectionProviderDefinition, ConnectionSettingsBodyContext } from "@ezenki/deploy-commander-manager-sdk-core";
import { ConfigurationSection } from "./configuration-section.component.js";
import { ConfigurationSectionBody } from "./section-body.directive.js";
import { CreateConnectionSectionBody } from "./create-connection-section-body.directive.js";

@Component({ selector: "dcmsdk-create-connection-section", standalone: true, imports: [CommonModule, ConfigurationSection, ConfigurationSectionBody], changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <dcmsdk-configuration-section #section="dcmsdkConfigurationSection" [title]="title() ?? 'Create Connection'" [description]="description()" [sectionData]="sectionData()" [loading]="status().kind === 'loading' || status().kind === 'pending'" [error]="status().kind === 'error' ? status().error : undefined" [className]="className()">
      <ng-template [dcmsdkSectionBodyFor]="section" let-section>
        @if (context(); as current) {
          <p>Connect as <strong>{{ current.callingManagerId }}</strong> to <strong>{{ current.resource.resource.name }}</strong>.</p>
          <ng-container *ngTemplateOutlet="body?.template ?? null; context: bodyContext()" />
          @if (current.existingConnections.length) { <ul aria-label="Existing connections">@for (connection of current.existingConnections; track connection.id) { <li>{{ connection.id }}@if (definition().onDeleteConnection) { <button type="button" class="dcmsdk-button dcmsdk-button-danger" (click)="delete(connection.id)">Delete</button> }</li> }</ul> }
          <div class="flex gap-2"><button type="button" class="dcmsdk-button dcmsdk-button-primary" [disabled]="status().kind === 'pending' || status().kind === 'loading'" (click)="create()">Create Connection</button><button type="button" class="dcmsdk-button dcmsdk-button-secondary" [disabled]="status().kind === 'pending' || status().kind === 'loading'" (click)="session()?.cancel()">Cancel</button></div>
        }
      </ng-template>
    </dcmsdk-configuration-section>
  `,
})
export class CreateConnectionSection<TSettings extends object> {
  readonly wire = input.required<import("@ezenki/deploy-commander-installer-interface").Wire>();
  readonly definition = input.required<ConnectionProviderDefinition<TSettings>>();
  readonly title = input<string>(); readonly description = input<string>(); readonly className = input("");
  readonly context = signal<ConnectionProviderContext | undefined>(undefined);
  readonly session = signal<ConnectionProviderSession | undefined>(undefined);
  readonly settings = signal<TSettings | undefined>(undefined);
  readonly status = signal<{ kind: "loading" | "idle" | "pending" | "error"; error?: unknown }>({ kind: "loading" });
  readonly sectionData = computed(() => ({ data: this.settings(), onDataChange: (next: TSettings) => this.settings.set(next) }));
  @ContentChild(CreateConnectionSectionBody) body?: CreateConnectionSectionBody<TSettings>;
  private readonly destroyRef = inject(DestroyRef); private readonly platform = inject(PLATFORM_ID); private abort?: AbortController;
  readonly bodyContext = computed(() => ({ $implicit: { data: this.settings() as TSettings, setData: (next: TSettings) => this.settings.set(next), readOnly: false, loading: this.status().kind === "loading", ...this.context() } as ConnectionSettingsBodyContext<TSettings> }));
  constructor() {
    if (isPlatformBrowser(this.platform)) effect((onCleanup) => {
      const wire = this.wire(); const definition = this.definition();
      const abort = new AbortController(); this.abort = abort; this.status.set({ kind: "loading" });
      void openConnectionProviderSession(wire, abort.signal).then((session) => { if (abort.signal.aborted) return; this.session.set(session); this.context.set(session.context); this.settings.set(definition.initialSettings(session.context)); this.status.set({ kind: "idle" }); }).catch((error: unknown) => { if (!abort.signal.aborted) this.status.set({ kind: "error", error }); });
      onCleanup(() => abort.abort());
    });
    this.destroyRef.onDestroy(() => this.abort?.abort());
  }
  async create() { if (!this.session() || this.settings() === undefined) return; this.status.set({ kind: "pending" }); try { await this.session()!.create(this.settings()!, this.definition().onCreateConnection); this.status.set({ kind: "idle" }); } catch (error) { this.status.set({ kind: "error", error }); } }
  async delete(id: string) { try { const rows = await this.session()?.delete(id, this.definition().onDeleteConnection!); if (rows) this.context.update((context) => context ? { ...context, existingConnections: rows } : context); } catch (error) { this.status.set({ kind: "error", error }); } }
}
