# Deploy Commander Manager SDK

A TypeScript monorepo of reusable libraries for managers that integrate with Deploy Commander. The shared core owns framework-independent contracts and actions; the framework packages provide configuration UI without embedding manager-specific persistence or Deploy Commander transport logic.

## Packages

| Package | Purpose | Stylesheet |
| --- | --- | --- |
| [`@ezenki/deploy-commander-manager-sdk-core`](packages/core) | Framework-independent Deploy Commander actions and shared configuration contracts/lifecycle | — |
| [`@ezenki/deploy-commander-manager-sdk-react`](packages/react) | React configuration sections, action/status components, and grouping | `@ezenki/deploy-commander-manager-sdk-react/styles.css` |
| [`@ezenki/deploy-commander-manager-sdk-vue`](packages/vue) | Vue 3 configuration sections, action/status components, and grouping | `@ezenki/deploy-commander-manager-sdk-vue/styles.css` |
| [`@ezenki/deploy-commander-manager-sdk-svelte`](packages/svelte) | Svelte 5 configuration sections, action/status components, and grouping | `@ezenki/deploy-commander-manager-sdk-svelte/styles.css` |
| [`@ezenki/deploy-commander-manager-sdk-angular`](packages/angular) | Standalone Angular configuration sections, action/status components, body directive, and grouping | `@ezenki/deploy-commander-manager-sdk-angular/styles.css` |

Each package is independently consumable. Install the core package when using its actions or types; each UI package declares core as a dependency. UI framework runtimes are peers: React 19, Vue 3.5+, Svelte 5.20+, and Angular 21+. UI packages are ESM. Svelte exports compiler-ready components under the `svelte` export condition; use a Svelte-aware consumer build.

## Configuration sections

All framework packages expose `ConfigurationSection`, `SectionActions`, `SectionStatus`, and `ConfigurationGroup`. Their public APIs are typed against the shared contracts from core. The section body is framework-native (a React render function, Vue slot, Svelte snippet, or Angular projected template) and receives `{ data, setData, readOnly, loading }`.

### React

```tsx
import { useRef } from "react";
import {
  ConfigurationGroup,
  ConfigurationSection,
  type ConfigurationSectionHandle,
} from "@ezenki/deploy-commander-manager-sdk-react";
import "@ezenki/deploy-commander-manager-sdk-react/styles.css";

type Settings = { region: string; replicas: number };

export function SettingsPanel() {
  const section = useRef<ConfigurationSectionHandle<Settings>>(null);
  return <ConfigurationGroup columns={2}>
    <ConfigurationSection<Settings>
      ref={section}
      title="Deployment settings"
      description="Choose where and how many replicas to run."
      initialData={{ region: "eu-west", replicas: 2 }}
    >
      {({ data, setData }) => <>
        <label className="dcmsdk-field">
          <span className="dcmsdk-label">Region</span>
          <input className="dcmsdk-input" value={data.region}
            onChange={(event) => setData({ ...data, region: event.target.value })} />
        </label>
        <button type="button" onClick={() => section.current?.setData({ ...data, replicas: 3 })}>
          Set three replicas
        </button>
      </>}
    </ConfigurationSection>
  </ConfigurationGroup>;
}
```

For externally controlled state, pass `data` and `onDataChange` instead of `initialData`/`loadData`. Uncontrolled sections accept `initialData`, `loadData`, or both. Loading can be cancelled when a section is edited, replaced, or unmounted. Programmatic updates are available through the React `ref`, Vue `ref`/`setData`, Svelte `bind:this`, or Angular template reference.

### Vue

```vue
<script setup lang="ts">
import { ref } from "vue";
import { ConfigurationSection } from "@ezenki/deploy-commander-manager-sdk-vue";
import "@ezenki/deploy-commander-manager-sdk-vue/styles.css";

type Settings = { region: string };
const section = ref<{ setData(next: Settings): void }>();
const sectionData = { initialData: { region: "eu-west" } };
</script>

<template>
  <ConfigurationSection ref="section" title="Deployment settings" :section-data="sectionData">
    <template #default="{ data, setData }">
      <label class="dcmsdk-field">
        <span class="dcmsdk-label">Region</span>
        <input class="dcmsdk-input" :value="data.region"
          @input="setData({ ...data, region: ($event.target as HTMLInputElement).value })" />
      </label>
    </template>
  </ConfigurationSection>
</template>
```

Vue uses the `sectionData` prop with either `{ data, onDataChange }` for controlled state or `{ initialData, loadData }` for internal state. The default slot is type-checked with the section's data type; `setData` is also exposed on the component instance.

### Svelte

```svelte
<script lang="ts">
  import { ConfigurationSection } from "@ezenki/deploy-commander-manager-sdk-svelte";
  import "@ezenki/deploy-commander-manager-sdk-svelte/styles.css";
  import type { ConfigurationSectionHandle } from "@ezenki/deploy-commander-manager-sdk-svelte";

  type Settings = { region: string };
  let section: ConfigurationSectionHandle<Settings>;
</script>

<ConfigurationSection bind:this={section} title="Deployment settings"
  initialData={{ region: "eu-west" }}>
  {#snippet children({ data, setData })}
    <label class="dcmsdk-field">
      <span class="dcmsdk-label">Region</span>
      <input class="dcmsdk-input" value={data.region}
        oninput={(event) => setData({ ...data, region: event.currentTarget.value })} />
    </label>
  {/snippet}
</ConfigurationSection>
```

### Angular

```ts
import { Component, signal } from "@angular/core";
import {
  ConfigurationSection,
  ConfigurationSectionBody,
  type ConfigurationSectionContext,
} from "@ezenki/deploy-commander-manager-sdk-angular";
import "@ezenki/deploy-commander-manager-sdk-angular/styles.css";

type Settings = { region: string };

@Component({
  standalone: true,
  imports: [ConfigurationSection, ConfigurationSectionBody],
  template: `
    <dcmsdk-configuration-section #section title="Deployment settings" [sectionData]="sectionData()">
      <ng-template [dcmsdkSectionBodyFor]="section" let-context>
        <label class="dcmsdk-field">
          <span class="dcmsdk-label">Region</span>
          <input class="dcmsdk-input" [value]="context.data.region"
            (input)="updateRegion(context, $event)" />
        </label>
      </ng-template>
    </dcmsdk-configuration-section>
  `,
})
export class SettingsPanel {
  readonly sectionData = signal({ initialData: { region: "eu-west" } });

  updateRegion(section: ConfigurationSectionContext<Settings>, event: Event) {
    section.setData({ ...section.data, region: (event.target as HTMLInputElement).value });
  }
}
```

Angular uses the `sectionData` input for controlled or internal state. The `dcmsdkSectionBodyFor` directive provides a strictly typed template context; a template reference to the section also exposes `setData` for programmatic updates.

### Actions and Deploy Commander core

Provide only actions the manager intends to offer. The SDK does not add Save or Reset actions, persist form edits, or start runs when fields change. Action handlers receive the current read-only section data and the optional `coreActions` object supplied by the manager:

```ts
import type { SectionActionMap } from "@ezenki/deploy-commander-manager-sdk-core/configuration";
import type { CoreActions } from "@ezenki/deploy-commander-manager-sdk-core";

type Settings = { region: string };
const coreActions: CoreActions = managerCoreActions;
const actions: SectionActionMap<Settings> = {
  inspect: {
    label: "Inspect",
    variant: "secondary",
    execute: async ({ data, coreActions }) => {
      await inspectRegion(data.region, coreActions);
    },
  },
};
```

Pass `actions` and `coreActions` to a section. Actions support `visible`, `disabled`, `variant` (`primary`, `secondary`, `danger`, `ghost`), and `allowInReadOnly`. They receive the freshest section data. Managers decide whether an action saves to Deploy Commander resources, connections, runs, or elsewhere; the SDK UI itself performs no persistence. Do not add manager database storage when Deploy Commander resources, connections, runs, history, labels, or frontend state can represent the data.

### Styling and themes

Import the package's public `styles.css` subpath once in the application. The generated stylesheet is included in the package, so consumers do not need Tailwind installed, configured, or scanning SDK source files. The shared `dcmsdk-` classes cover sections, fields, inputs, action buttons and variants, status messages, and responsive groups. A group uses one column by default and supports `columns={2}` (or its framework equivalent) at wide viewports. Framework consumers can place these classes on their own fields for a consistent look.

Colors inherit from SDK CSS variables and honor the user's system color preference. To force a theme for a subtree, use `data-dcmsdk-theme="light"` or `data-dcmsdk-theme="dark"` on an ancestor. An explicit nested theme overrides the system preference within that subtree.

## Deploy Commander integration

Core integrations use documented operations from `@ezenki/deploy-commander-installer-interface`. Deploy Commander supplies trusted manager context and enforces ownership/access. Managers prepare deployment metadata for state-changing operations; `ezenki/deploy-commander-runner` applies it. See the [manager interface guide](docs/integrations/MANAGER_INTERFACE_GUIDE.md) and [runner implementation guide](docs/integrations/DEPLOYMENT_RUNNER_IMPLEMENTATION_GUIDE.md) before changing core integration behavior.

## Development

Use Node.js 22.12+ (22.x) or Node.js 24+ with npm. The workspace toolchain includes TypeScript, ESLint, Tailwind CSS 4, and each framework's compiler and runtime test tools. Run:

```sh
npm ci
npm run build
```

The root build runs lint, strict package type checks (including typed framework templates), compilation, core and package-export tests, and framework runtime tests. Any failed stage exits nonzero. Individual checks are available with `npm run lint`, `npm run typecheck`, `npm run compile`, and `npm test`.

The monorepo is not published to a registry yet. To consume local packages during development, build them first or install their generated tarballs in a temporary consumer project.
