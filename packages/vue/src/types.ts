import type {
  ConfigurationSectionContext,
  ConfigurationSectionHandle,
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

export interface VueConfigurationSectionProps<TData extends object>
  extends SectionOptions<TData> {
  sectionData: SectionData<TData>;
  description?: string;
}

export interface VueConfigurationSectionSlots<TData extends object> {
  default(context: ConfigurationSectionContext<TData>): unknown;
  description?(): unknown;
}

export type VueConfigurationSectionHandle<TData extends object> = ConfigurationSectionHandle<TData>;

export interface VueConfigurationGroupProps {
  columns?: 1 | 2;
  className?: string;
}

export interface VueSectionStatusProps {
  status: SectionStatusState;
  className?: string;
}

export interface VueSectionActionsProps<TData extends object> {
  data: TData;
  actions: import("@ezenki/deploy-commander-manager-sdk-core/configuration").SectionActionMap<NoInfer<TData>>;
  coreActions?: CoreActions;
  readOnly?: boolean;
  disabled?: boolean;
  className?: string;
}
