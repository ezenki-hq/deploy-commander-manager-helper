import { CommonModule, isPlatformBrowser } from "@angular/common";
import {
  ChangeDetectionStrategy,
  Component,
  ContentChild,
  PLATFORM_ID,
  computed,
  effect,
  inject,
  input,
  signal,
} from "@angular/core";
import { runSectionLoader } from "@ezenki/deploy-commander-manager-sdk-core/configuration";
import type {
  ControlledSectionData,
  SectionActionMap,
  SectionData,
  SectionDataLoader,
  SectionStatusState,
} from "@ezenki/deploy-commander-manager-sdk-core/configuration";
import type { CoreActions } from "@ezenki/deploy-commander-manager-sdk-core";
import { SectionActions } from "./section-actions.component.js";
import { SectionStatus } from "./section-status.component.js";
import { ConfigurationSectionBody } from "./section-body.directive.js";
import type { ConfigurationSectionTemplateContext } from "./types.js";

let nextSectionId = 0;

@Component({
  selector: "dcmsdk-configuration-section",
  exportAs: "dcmsdkConfigurationSection",
  standalone: true,
  imports: [CommonModule, SectionActions, SectionStatus],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <section
      [class]="sectionClass()"
      [attr.aria-labelledby]="headingId()"
      [attr.aria-busy]="loadingState()"
    >
      <header class="dcmsdk-section-header">
        <h2 [id]="headingId()" class="dcmsdk-section-title">{{ title() }}</h2>
        @if (description()) {
          <div class="dcmsdk-section-description">{{ description() }}</div>
        }
      </header>
      @if (data(); as currentData) {
        <fieldset class="dcmsdk-section-body min-w-0 border-0 p-0" [disabled]="readOnly()">
          <ng-container
            *ngTemplateOutlet="body?.template ?? null; context: templateContext()"
          />
        </fieldset>
        @if (actions(); as currentActions) {
          <dcmsdk-section-actions
            [data]="currentData"
            [actions]="currentActions"
            [coreActions]="coreActions()"
            [readOnly]="readOnly()"
            [disabled]="loadingState()"
          />
        }
      }
      @if (loadingState() || visibleError() !== undefined) {
        <dcmsdk-section-status [status]="sectionStatus()" />
      }
    </section>
  `,
})
export class ConfigurationSection<TData extends object> {
  readonly title = input.required<string>();
  readonly description = input<string>();
  readonly id = input<string>();
  readonly sectionData = input.required<SectionData<TData>>();
  readonly actions = input<SectionActionMap<NoInfer<TData>>>();
  readonly coreActions = input<CoreActions>();
  readonly readOnly = input(false);
  readonly loading = input(false);
  readonly error = input<unknown>();
  readonly className = input("");

  @ContentChild(ConfigurationSectionBody)
  body?: ConfigurationSectionBody<TData>;

  private readonly platformId = inject(PLATFORM_ID);
  private readonly internalData = signal<TData | undefined>(undefined);
  private readonly internalLoading = signal(false);
  private readonly loadError = signal<unknown>(undefined);
  private cancelLoad: (() => void) | undefined;

  readonly headingId = computed(() => this.id() ?? `dcmsdk-section-${++nextSectionId}`);
  readonly sectionClass = computed(() => `dcmsdk-section${this.className() ? ` ${this.className()}` : ""}`);
  readonly data = computed(() => {
    const value = this.sectionData();
    return this.isControlled(value) ? value.data : this.internalData();
  });
  readonly loadingState = computed(() => this.loading() || this.internalLoading());
  readonly visibleError = computed(() => this.error() !== undefined ? this.error() : this.loadError());
  readonly sectionStatus = computed<SectionStatusState>(() => this.loadingState()
    ? { kind: "loading" }
    : { kind: "error", error: this.visibleError() });
  readonly templateContext = computed<ConfigurationSectionTemplateContext<TData>>(() => {
    const data = this.data();
    return {
      $implicit: {
        data: data as Readonly<TData>,
        setData: (next) => this.setBodyData(next),
        readOnly: this.readOnly(),
        loading: this.loadingState(),
      },
    };
  });
  private readonly loader = computed<SectionDataLoader<TData> | undefined>(() => {
    const value = this.sectionData();
    return !this.isControlled(value) && "loadData" in value ? value.loadData : undefined;
  });

  constructor() {
    effect(() => {
      const value = this.sectionData();
      if (!this.isControlled(value) && this.internalData() === undefined && value.initialData !== undefined) {
        this.internalData.set(value.initialData);
      }
    });

    effect((onCleanup) => {
      const loader = this.loader();
      if (!isPlatformBrowser(this.platformId) || !loader) {
        this.internalLoading.set(false);
        return;
      }

      this.internalLoading.set(true);
      this.loadError.set(undefined);
      const cancel = runSectionLoader(loader, {
        onData: (data) => {
          if (this.cancelLoad === cancel) this.cancelLoad = undefined;
          this.internalData.set(data);
          this.internalLoading.set(false);
        },
        onError: (error) => {
          if (this.cancelLoad === cancel) this.cancelLoad = undefined;
          this.loadError.set(error);
          this.internalLoading.set(false);
        },
      });
      this.cancelLoad = cancel;
      onCleanup(() => {
        cancel();
        if (this.cancelLoad === cancel) this.cancelLoad = undefined;
      });
    });
  }

  setData(next: TData): void {
    const value = this.sectionData();
    if (this.isControlled(value)) {
      value.onDataChange(next);
      return;
    }
    this.cancelLoad?.();
    this.cancelLoad = undefined;
    this.internalLoading.set(false);
    this.loadError.set(undefined);
    this.internalData.set(next);
  }

  private setBodyData(next: TData): void {
    if (this.readOnly()) return;
    this.setData(next);
  }

  private isControlled(value: SectionData<TData>): value is ControlledSectionData<TData> {
    return typeof value.onDataChange === "function";
  }
}
