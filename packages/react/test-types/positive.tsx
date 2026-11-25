import { createRef } from "react";
import {
  ConfigurationSection,
  type ConfigurationSectionHandle,
  type SectionActionMap,
} from "@ezenki/deploy-commander-manager-sdk-react";

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
