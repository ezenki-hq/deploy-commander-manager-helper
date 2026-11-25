import { ConfigurationSection, type SectionActionMap } from "@ezenki/deploy-commander-manager-sdk-react";

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
