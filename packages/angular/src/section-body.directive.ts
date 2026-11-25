import { Directive, TemplateRef, input } from "@angular/core";
import type { InputSignal } from "@angular/core";
import type { ConfigurationSectionTemplateContext } from "./types.js";
import type { ConfigurationSection } from "./configuration-section.component.js";

@Directive({
  selector: "ng-template[dcmsdkSectionBodyFor]",
  standalone: true,
})
export class ConfigurationSectionBody<TData extends object> {
  readonly dcmsdkSectionBodyFor: InputSignal<ConfigurationSection<TData>> = input.required<ConfigurationSection<TData>>();

  constructor(readonly template: TemplateRef<ConfigurationSectionTemplateContext<TData>>) {}

  static ngTemplateContextGuard<TData extends object>(
    directive: ConfigurationSectionBody<TData>,
    context: unknown,
  ): context is ConfigurationSectionTemplateContext<TData> {
    return Boolean(directive) || context === undefined;
  }
}
