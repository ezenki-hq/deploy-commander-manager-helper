import { ConfigurationSection, ManagerInvocationSection, type ResourceProviderInterfaces, type SectionActionMap } from "@ezenki/deploy-commander-manager-sdk-react";

interface Profile {
  name: string;
}

interface OtherData {
  identifier: number;
}

const incompatibleActions: SectionActionMap<OtherData> = {
  open: { label: "Open", execute: ({ data }) => data.identifier },
};

export const incompatibleHandler = (
  <ConfigurationSection
    title="Profile"
    initialData={{ name: "Example" } satisfies Profile}
    actions={incompatibleActions}
    children={({ data }) => <output>{data.name}</output>}
  />
);

export const conflictingModes = (
  <ConfigurationSection
    title="Conflicting"
    data={{ name: "Parent" }}
    onDataChange={() => undefined}
    initialData={{ name: "Internal" }}
    children={({ data }) => <output>{data.name}</output>}
  />
);

export const invalidRegistration = { } satisfies ResourceProviderInterfaces<{ database: string }>;
export const mismatchedInvocationResult = <ManagerInvocationSection
  wire={{} as import("@ezenki/deploy-commander-installer-interface").Wire}
  definition={{ parseMetadata: (value) => value as { id: string }, validateResult: (result: { accepted: boolean }) => { void result.accepted; } }}
  called={({ complete }) => <button onClick={() => complete({ wrong: true })}>Bad result</button>}
/>;
