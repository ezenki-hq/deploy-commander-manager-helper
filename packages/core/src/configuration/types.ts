import type { CoreActions } from "../action-types.js";

export type SectionActionVariant = "primary" | "secondary" | "danger" | "ghost";

export interface SectionActionContext<TData extends object> {
  data: Readonly<TData>;
  coreActions: CoreActions | undefined;
}

export interface SectionAction<TData extends object> {
  label: string;
  variant?: SectionActionVariant;
  visible?: boolean | ((data: Readonly<TData>) => boolean);
  disabled?: boolean | ((data: Readonly<TData>) => boolean);
  allowInReadOnly?: boolean;
  execute: (context: SectionActionContext<TData>) => void | Promise<void>;
}

export type SectionActionMap<TData extends object> = Readonly<
  Record<string, SectionAction<TData>>
>;

export interface ConfigurationSectionHandle<TData extends object> {
  setData(next: TData): void;
}

export interface ConfigurationSectionContext<TData extends object> {
  data: Readonly<TData>;
  setData(next: TData): void;
  readOnly: boolean;
  loading: boolean;
}

export type SectionDataLoader<TData extends object> = (
  signal: AbortSignal,
) => TData | Promise<TData>;

export type ControlledSectionData<TData extends object> = {
  data: TData | undefined;
  onDataChange(next: TData): void;
  initialData?: never;
  loadData?: never;
};

export type UncontrolledSectionData<TData extends object> = {
  data?: never;
  onDataChange?: never;
} & (
  | { initialData: TData; loadData?: SectionDataLoader<TData> }
  | { initialData?: TData; loadData: SectionDataLoader<TData> }
);

export type SectionData<TData extends object> =
  | ControlledSectionData<TData>
  | UncontrolledSectionData<TData>;

export interface SectionOptions<TData extends object> {
  title: string;
  actions?: SectionActionMap<NoInfer<TData>>;
  coreActions?: CoreActions;
  readOnly?: boolean;
  loading?: boolean;
  error?: unknown;
  className?: string;
}

export interface SectionActionsProps<TData extends object> {
  data: TData;
  actions: SectionActionMap<NoInfer<TData>>;
  coreActions?: CoreActions;
  readOnly?: boolean;
  disabled?: boolean;
  className?: string;
}

export type SectionStatusState =
  | { kind: "idle" }
  | { kind: "loading" }
  | { kind: "pending"; label: string }
  | { kind: "success"; label: string }
  | { kind: "error"; error: unknown; label?: string };

export interface SectionStatusProps {
  status: SectionStatusState;
  className?: string;
}

export interface ConfigurationGroupOptions {
  columns?: 1 | 2;
  className?: string;
}

export interface SectionActionState {
  visible: boolean;
  disabled: boolean;
}

export interface SectionLoaderCallbacks<TData extends object> {
  onData(data: TData): void;
  onError(error: unknown): void;
}

export type SectionActionStatusListener = (status: SectionStatusState) => void;

export interface SectionActionRunner {
  readonly pending: boolean;
  run(label: string, execute: () => void | Promise<void>): Promise<boolean>;
}
