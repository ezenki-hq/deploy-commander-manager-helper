import { ChangeDetectionStrategy, Component, computed, input, signal } from "@angular/core";
import {
  createSectionActionRunner,
  getSectionActionState,
} from "@ezenki/deploy-commander-manager-sdk-core/configuration";
import type { CoreActions } from "@ezenki/deploy-commander-manager-sdk-core";
import type { SectionAction, SectionActionMap, SectionStatusState } from "@ezenki/deploy-commander-manager-sdk-core/configuration";
import { SectionStatus } from "./section-status.component.js";

@Component({
  selector: "dcmsdk-section-actions",
  standalone: true,
  imports: [SectionStatus],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @if (visibleActions().length > 0) {
      <div [class]="actionsClass()">
        @for (entry of visibleActions(); track entry.key) {
          <button
            [class]="'dcmsdk-button dcmsdk-button-' + (entry.action.variant ?? 'secondary')"
            type="button"
            [disabled]="entry.state.disabled"
            (click)="runAction(entry.action)"
          >{{ entry.action.label }}</button>
        }
      </div>
    }
    <dcmsdk-section-status [status]="status()" />
  `,
})
export class SectionActions<TData extends object> {
  readonly data = input.required<TData>();
  readonly actions = input.required<SectionActionMap<NoInfer<TData>>>();
  readonly coreActions = input<CoreActions>();
  readonly readOnly = input(false);
  readonly disabled = input(false);
  readonly className = input("");
  readonly status = signal<SectionStatusState>({ kind: "idle" });
  readonly pending = signal(false);
  private readonly runner = createSectionActionRunner((status) => {
    this.status.set(status);
    this.pending.set(status.kind === "pending");
  });

  readonly visibleActions = computed(() => Object.entries(this.actions()).flatMap(([key, action]) => {
    const state = getSectionActionState(action, this.data(), {
      readOnly: this.readOnly(),
      disabled: this.disabled() || this.pending(),
    });
    return state.visible ? [{ key, action, state }] : [];
  }));
  readonly actionsClass = computed(() => `dcmsdk-actions${this.className() ? ` ${this.className()}` : ""}`);

  runAction(action: SectionAction<TData>): void {
    const data = this.data();
    void this.runner.run(action.label, () => action.execute({ data, coreActions: this.coreActions() }));
  }
}
