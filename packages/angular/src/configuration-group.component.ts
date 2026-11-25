import { ChangeDetectionStrategy, Component, computed, input } from "@angular/core";

@Component({
  selector: "dcmsdk-configuration-group",
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `<div [class]="groupClass()"><ng-content /></div>`,
})
export class ConfigurationGroup {
  readonly columns = input<1 | 2>(1);
  readonly className = input("");
  readonly groupClass = computed(() =>
    `dcmsdk-group${this.columns() === 2 ? " dcmsdk-group-two" : ""}${this.className() ? ` ${this.className()}` : ""}`,
  );
}
