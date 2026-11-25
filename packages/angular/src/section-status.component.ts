import { ChangeDetectionStrategy, Component, computed, input } from "@angular/core";
import { formatSectionError } from "@ezenki/deploy-commander-manager-sdk-core/configuration";
import type { SectionStatusState } from "@ezenki/deploy-commander-manager-sdk-core/configuration";

@Component({
  selector: "dcmsdk-section-status",
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @if (status().kind !== 'idle') {
      <div
        [class]="statusClass()"
        [attr.role]="isError() ? 'alert' : 'status'"
        [attr.aria-live]="isError() ? 'assertive' : 'polite'"
      >{{ message() }}</div>
    }
  `,
})
export class SectionStatus {
  readonly status = input.required<SectionStatusState>();
  readonly className = input("");
  readonly isError = computed(() => this.status().kind === "error");
  readonly message = computed(() => {
    const status = this.status();
    switch (status.kind) {
      case "idle": return "";
      case "loading": return "Loading configuration…";
      case "pending": return `${status.label} in progress…`;
      case "success": return `${status.label} complete`;
      case "error": return [status.label, formatSectionError(status.error)].filter(Boolean).join(": ");
    }
  });
  readonly statusClass = computed(() => {
    const kind = this.status().kind;
    return `dcmsdk-status dcmsdk-status-${kind === "loading" ? "loading" : kind}${this.className() ? ` ${this.className()}` : ""}`;
  });
}
