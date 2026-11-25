import type {
  ConfigurationSectionContext,
  SectionActionMap,
  SectionData,
  SectionOptions,
  SectionStatusState,
} from "@ezenki/deploy-commander-manager-sdk-core/configuration";
import type { CoreActions } from "@ezenki/deploy-commander-manager-sdk-core";

export type {
  ConfigurationGroupOptions,
  ConfigurationSectionContext,
  ConfigurationSectionHandle,
  ControlledSectionData,
  SectionAction,
  SectionActionContext,
  SectionActionMap,
  SectionActionVariant,
  SectionActionsProps,
  SectionData,
  SectionDataLoader,
  SectionOptions,
  SectionStatusProps,
  SectionStatusState,
  UncontrolledSectionData,
} from "@ezenki/deploy-commander-manager-sdk-core/configuration";
export type { CoreActions } from "@ezenki/deploy-commander-manager-sdk-core";

export interface AngularConfigurationSectionOptions<TData extends object>
  extends SectionOptions<TData> {
  description?: string;
  sectionData: SectionData<TData>;
}

export interface ConfigurationSectionTemplateContext<TData extends object> {
  $implicit: ConfigurationSectionContext<TData>;
}

export interface AngularSectionActionsOptions<TData extends object> {
  data: TData;
  actions: SectionActionMap<NoInfer<TData>>;
  coreActions?: CoreActions;
  readOnly?: boolean;
  disabled?: boolean;
  className?: string;
}

export interface AngularSectionStatusOptions {
  status: SectionStatusState;
  className?: string;
}

export interface AngularConfigurationGroupOptions {
  columns?: 1 | 2;
  className?: string;
}
