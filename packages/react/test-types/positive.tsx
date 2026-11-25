import { createRef } from "react";
import {
  ConnectionSection,
  CreateConnectionSection,
  ManagerInvocationSection,
  ConfigurationSection,
  type ConfigurationSectionHandle,
  type SectionActionMap,
} from "@ezenki/deploy-commander-manager-sdk-react";
import type { ManagerInvocationDefinition, ResourceProviderInterfaces } from "@ezenki/deploy-commander-manager-sdk-react";

interface Profile {
  name: string;
  enabled: boolean;
}

const ref = createRef<ConfigurationSectionHandle<Profile>>();
const actions: SectionActionMap<Profile> = {
  enable: {
    label: "Enable",
    execute: ({ data }) => { void data.enabled; },
  },
};

export const internal = (
  <ConfigurationSection
    ref={ref}
    title="Profile"
    initialData={{ name: "Example", enabled: true }}
    actions={actions}
    children={({ data, setData, readOnly, loading }) => (
      <input
        aria-label="Name"
        value={data.name}
        disabled={readOnly || loading}
        onChange={(event) => setData({ ...data, name: event.target.value })}
      />
    )}
  />
);

export const controlled = (
  <ConfigurationSection
    title="Controlled"
    data={{ name: "Parent", enabled: false }}
    onDataChange={(next) => next.enabled}
    children={({ data }) => <output>{data.name}</output>}
  />
);

interface ConnectionSettings { database: string }
const providerInterfaces = {
  createConnection: {
    initialSettings: () => ({ database: "" }),
    onCreateConnection: (settings: ConnectionSettings) => ({ metadata: { database: settings.database } }),
    children: ({ data, setData }: import("@ezenki/deploy-commander-manager-sdk-react").ConnectionSettingsBodyContext<ConnectionSettings>) => <input value={data.database} onChange={(event) => setData({ database: event.target.value })} />,
  },
} satisfies ResourceProviderInterfaces<ConnectionSettings>;
const invocation: ManagerInvocationDefinition<{ resourceId: string }, { accepted: boolean }> = {
  parseMetadata(value) { if (typeof value !== "object" || value === null || typeof (value as { resourceId?: unknown }).resourceId !== "string") throw new TypeError(); return { resourceId: (value as { resourceId: string }).resourceId }; },
};
export const connection = <ConnectionSection wire={{} as import("@ezenki/deploy-commander-installer-interface").Wire} resource={{ filters: { type: "database" } }} initialData={{ connectionIds: [] }} maxConnections={2} />;
export const provider = <CreateConnectionSection wire={{} as import("@ezenki/deploy-commander-installer-interface").Wire} {...providerInterfaces.createConnection} />;
export const invocationSection = <ManagerInvocationSection wire={{} as import("@ezenki/deploy-commander-installer-interface").Wire} definition={invocation} called={({ metadata, complete }) => <button onClick={() => complete({ accepted: metadata.resourceId.length > 0 })}>Complete</button>} />;
