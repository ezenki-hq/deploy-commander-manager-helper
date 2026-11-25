import type {
  ConfigurationSectionContext,
  ConfigurationSectionHandle,
  CoreActions,
  SectionActionsProps as CoreSectionActionsProps,
  SectionActionMap,
  SectionData,
} from "@ezenki/deploy-commander-manager-sdk-core";
import type { ReactNode, Ref } from "react";

export type {
  ConfigurationGroupOptions,
  ConfigurationSectionContext,
  ConfigurationSectionHandle,
  ControlledSectionData,
  SectionAction,
  SectionActionContext,
  SectionActionMap,
  SectionActionVariant,
  SectionData,
  SectionDataLoader,
  SectionOptions,
  SectionStatusProps,
  SectionStatusState,
  UncontrolledSectionData,
} from "@ezenki/deploy-commander-manager-sdk-core/configuration";

export type ConfigurationSectionProps<TData extends object> = {
  title: string;
  description?: ReactNode;
  children(context: ConfigurationSectionContext<TData>): ReactNode;
  actions?: SectionActionMap<NoInfer<TData>>;
  coreActions?: CoreActions;
  readOnly?: boolean;
  loading?: boolean;
  error?: unknown;
  ref?: Ref<ConfigurationSectionHandle<TData>>;
  className?: string;
} & SectionData<TData>;

export type SectionActionsProps<TData extends object> = CoreSectionActionsProps<TData>;

export type ReactSectionActionsInternalProps<TData extends object> = SectionActionsProps<TData>;

export interface ConfigurationGroupProps {
  children: ReactNode;
  columns?: 1 | 2;
  className?: string;
}
