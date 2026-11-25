import { Directive, TemplateRef, input } from "@angular/core";
import type { InputSignal } from "@angular/core";
import type { CreateConnectionSection } from "./create-connection-section.component.js";
import type { ConnectionSettingsBodyContext } from "@ezenki/deploy-commander-manager-sdk-core";
@Directive({ selector: "ng-template[dcmsdkCreateConnectionBodyFor]", standalone: true })
export class CreateConnectionSectionBody<TSettings extends object> {
  readonly dcmsdkCreateConnectionBodyFor: InputSignal<CreateConnectionSection<TSettings>> = input.required<CreateConnectionSection<TSettings>>();
  constructor(readonly template: TemplateRef<{ $implicit: ConnectionSettingsBodyContext<TSettings> }>) {}
  static ngTemplateContextGuard<TSettings extends object>(directive: CreateConnectionSectionBody<TSettings>, context: unknown): context is { $implicit: ConnectionSettingsBodyContext<TSettings> } { return Boolean(directive) || context === undefined; }
}
