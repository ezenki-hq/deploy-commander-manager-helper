# Configuration Sections

Managers supply configuration data, fields, and explicitly named actions. The SDK supplies the card layout, data lifecycle, action buttons, and status feedback in React, Vue, Svelte, and Angular. Each package accepts the existing core actions object as an optional input so a manager can use the same authorization and RPC behavior throughout its interface. [Core actions declarations](../../../packages/core/src/action-types.ts)

## Shared and React TypeScript API

Keep the React API as specified below. Move the framework-independent types into `@ezenki/deploy-commander-manager-sdk-core/configuration` and re-export them from each framework package. The shared types are `SectionActionVariant`, `SectionActionContext`, `SectionAction`, `SectionActionMap`, `ConfigurationSectionHandle`, `ConfigurationSectionContext`, `SectionDataLoader`, `ControlledSectionData`, `UncontrolledSectionData`, `SectionActionsProps`, and `SectionStatusState`. Framework packages keep their rendering types local.

```tsx
import type { CoreActions } from "@ezenki/deploy-commander-manager-sdk-core";
import type { ReactElement, ReactNode, Ref } from "react";

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

export type SectionActionMap<TData extends object> =
  Readonly<Record<string, SectionAction<TData>>>;

export interface ConfigurationSectionHandle<TData extends object> {
  setData(next: TData): void;
}

export interface ConfigurationSectionContext<TData extends object> {
  data: Readonly<TData>;
  setData(next: TData): void;
  readOnly: boolean;
  loading: boolean;
}

export type SectionDataLoader<TData extends object> =
  (signal: AbortSignal) => TData | Promise<TData>;

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
} & (ControlledSectionData<TData> | UncontrolledSectionData<TData>);

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

export interface ConfigurationGroupProps {
  children: ReactNode;
  columns?: 1 | 2;
  className?: string;
}

export declare function ConfigurationSection<TData extends object>(
  props: ConfigurationSectionProps<TData>,
): ReactElement;
export declare function SectionActions<TData extends object>(
  props: SectionActionsProps<TData>,
): ReactElement | null;
export declare function SectionStatus(props: SectionStatusProps): ReactElement | null;
export declare function ConfigurationGroup(props: ConfigurationGroupProps): ReactElement;
```

Use React 19 as the peer baseline. Its ref prop keeps the generic section declaration intact and exposes a typed setter for host code. Controlled data remains driven by the parent prop and both parent ref updates and body edits call `onDataChange`. An externally controlled section can pass `data={undefined}` while loading. Keep the data mode stable for the mounted lifetime. To switch modes, remount the section. [React imperative handles](https://react.dev/reference/react/useImperativeHandle)

## Vue, Svelte, and Angular TypeScript API

Vue and Angular use one `sectionData` input so their template checkers can enforce the data-mode union. Svelte exposes the same direct data props as React. For all four frameworks, a host update through the handle calls `onDataChange` in controlled mode and replaces local state in internal mode. Each framework exports the four component names `ConfigurationSection`, `SectionActions`, `SectionStatus`, and `ConfigurationGroup`.

```ts
// Additional framework-independent types exported through core/configuration
export type SectionData<TData extends object> =
  ControlledSectionData<TData> | UncontrolledSectionData<TData>;

export interface SectionOptions<TData extends object> {
  title: string;
  actions?: SectionActionMap<NoInfer<TData>>;
  coreActions?: CoreActions;
  readOnly?: boolean;
  loading?: boolean;
  error?: unknown;
  className?: string;
}

// Vue 3.5+
export interface VueConfigurationSectionProps<TData extends object>
  extends SectionOptions<TData> {
  sectionData: SectionData<TData>;
  description?: string;
}

export interface VueConfigurationSectionSlots<TData extends object> {
  default(context: ConfigurationSectionContext<TData>): unknown;
  description?(): unknown;
}
// Generic SFC props and slots use the contracts above.
// The public instance exposes ConfigurationSectionHandle<TData>.

// Svelte 5.20+
export type SvelteConfigurationSectionProps<TData extends object> =
  SectionOptions<TData> & SectionData<TData> & {
    description?: string;
    descriptionContent?: Snippet;
    children: Snippet<[ConfigurationSectionContext<TData>]>;
  };
// The generic component exports setData(next: TData) for bind:this.

// Angular 21 standalone components and template directive
export interface ConfigurationSectionTemplateContext<TData extends object> {
  $implicit: ConfigurationSectionContext<TData>;
}

export declare class ConfigurationSection<TData extends object>
  implements ConfigurationSectionHandle<TData> {
  readonly title: InputSignal<string>;
  readonly description: InputSignal<string | undefined>;
  readonly sectionData: InputSignal<SectionData<TData>>;
  readonly actions: InputSignal<SectionActionMap<NoInfer<TData>> | undefined>;
  readonly coreActions: InputSignal<CoreActions | undefined>;
  readonly readOnly: InputSignal<boolean>;
  readonly loading: InputSignal<boolean>;
  readonly error: InputSignal<unknown>;
  readonly className: InputSignal<string | undefined>;
  setData(next: TData): void;
}

export declare class ConfigurationSectionBody<TData extends object> {
  readonly dcmsdkSectionBodyFor: InputSignal<ConfigurationSection<TData>>;
  static ngTemplateContextGuard<TData extends object>(
    directive: ConfigurationSectionBody<TData>,
    context: unknown,
  ): context is ConfigurationSectionTemplateContext<TData>;
}
```

`Snippet` comes from Svelte and `InputSignal` comes from Angular. Vue uses a scoped default slot, Svelte uses its `children` snippet, and Angular uses `<ng-template [dcmsdkSectionBodyFor]="section" let-context>` where `section` is a reference to `<dcmsdk-configuration-section>`. Angular uses the standalone selectors `dcmsdk-section-actions`, `dcmsdk-section-status`, and `dcmsdk-configuration-group` for the other components. The standalone action component accepts the shared `SectionActionsProps<TData>` fields, and status accepts `status: SectionStatusState` and optional `className`. The group accepts `columns?: 1 | 2` and `className?: string`; it receives children by slot in Vue, snippet in Svelte, and content projection in Angular. [Vue generic SFCs](https://vuejs.org/api/sfc-script-setup.html#generics) · [Svelte generic props](https://svelte.dev/docs/svelte/typescript#Generic-$props) · [Angular template type checking](https://angular.dev/tools/cli/template-typecheck)

## Shared behavior

Use a small framework-independent module under `core/configuration` for load cancellation and stale result protection, action execution locking, and status/error normalization. The framework adapters own reactive state and bind DOM events. The existing core actions object and root entry point keep their current API.

## Data and actions

- Internal data starts from `initialData` when supplied. A loader runs on client mount and when its function identity changes. Keep the function stable for a stable request. An asynchronous result is applied only if its request is still current. Abort and invalidate on unmount, loader replacement, or a local or host edit. Preserve existing data if loading fails. React Strict Mode may start a second request as part of its setup and cleanup check. [React Strict Mode](https://react.dev/reference/react/StrictMode)
- Render the body once data exists. During loading, keep any existing data visible, mark the section busy, and disable actions. A local edit can cancel an internal load. Show external loading and errors supplied by the manager. Read-only mode disables native fields through a fieldset and exposes `readOnly` to custom controls. The body setter ignores edits in that mode. The host's ref setter can still replace the displayed data.
- Only map entries render as buttons. Visible actions keep object entry order. Read-only mode hides actions unless the manager explicitly marks them `allowInReadOnly`. The manager is responsible for the behavior of an opted-in action. Enabled actions use a snapshot of the displayed data at activation, and any optional core actions object is passed through without modification.
- Run one action at a time per section or standalone action group. Disable visible buttons while one runs and guard against repeated activation before React updates. Report synchronous throws and asynchronous rejections consistently. A resolved handler marks the action complete. For a handler that queues a deployment, this indicates that the handler finished submitting it. The manager uses core run history to show deployment progress separately.
- No field edit, loader completion, or state update triggers a persistence call. Managers choose when to call core actions. Use Deploy Commander resources, connections, runs, history, labels, and frontend state before proposing manager database storage. Explain why those options are insufficient before adding database storage.

## Presentation and distribution

- Use a bordered card with a clear heading and description, comfortable spacing, field focus rings, and an action row that wraps on narrow screens. Use color and text for status, readable type, visible keyboard focus, and native button disabled states. Announce progress and success in a polite live region and announce errors with an alert. Wire section headings to their regions with stable IDs.
- `ConfigurationGroup` is one column by default, with an optional two-column layout at a wider breakpoint. Expose stable documented classes `dcmsdk-field`, `dcmsdk-label`, `dcmsdk-input`, and `dcmsdk-help` for custom render bodies.
- Build one shared Tailwind CSS 4 stylesheet using namespaced semantic classes. Ship the resulting CSS at `./styles.css` in each framework package. Consumers load their framework package's stylesheet once with normal CSS tooling. The compiled stylesheet omits Preflight and honors system dark mode, with explicit overrides from the nearest ancestor with `data-dcmsdk-theme="light"` or `"dark"`. [Tailwind custom styles](https://tailwindcss.com/docs/adding-custom-styles) · [Tailwind Preflight](https://tailwindcss.com/docs/preflight)

The component set uses the core contract without an SDK-wide provider or a new state library. Use React 19, Vue 3.5 or newer in Vue 3, Svelte 5.20 or newer in Svelte 5, and Angular 21. The combined workspace build requires Node.js 22.12 or newer on the Node 22 line, or Node 24 LTS, to support the Angular compiler toolchain alongside TypeScript 5.9. Publish Angular in Angular Package Format with partial compilation. Verify Svelte through a Svelte-aware consumer build. [Angular version compatibility](https://angular.dev/reference/versions) · [Angular Package Format](https://angular.dev/tools/libraries/angular-package-format)

## Acceptance

- All four components and their public types are usable from each framework package.
- Each packed package renders with the compiled styles in its native consumer toolchain without Tailwind configuration. Verify narrow and wide layouts, explicit light and dark themes, and form classes in a browser.
- Shared tests cover load races, cancellation, action locking, and error handling. Component tests for each framework verify both data modes, programmatic updates, read-only use, action conditions, and status. Native compiler fixtures verify the body context, reject mismatched action data and mixed data modes, and verify the public stylesheet import.
- The project passes a clean install, strict type checking, lint, tests, and the build. Create Connection, manager-specific features, and database storage are deferred.
