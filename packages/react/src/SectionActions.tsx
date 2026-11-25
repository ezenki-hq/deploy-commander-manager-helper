import { useRef, useState } from "react";
import {
  createSectionActionRunner,
  getSectionActionState,
} from "@ezenki/deploy-commander-manager-sdk-core/configuration";
import type { SectionActionRunner, SectionStatusState } from "@ezenki/deploy-commander-manager-sdk-core/configuration";
import { SectionStatus } from "./SectionStatus.js";
import type { ReactSectionActionsInternalProps, SectionActionsProps } from "./types.js";

export function SectionActions<TData extends object>(props: SectionActionsProps<TData>) {
  return <SectionActionsContent {...props} />;
}

export function SectionActionsContent<TData extends object>({
  data,
  actions,
  coreActions,
  readOnly = false,
  disabled = false,
  className = "",
}: ReactSectionActionsInternalProps<TData>) {
  const [status, setStatus] = useState<SectionStatusState>({ kind: "idle" });
  const runnerRef = useRef<SectionActionRunner | null>(null);
  if (runnerRef.current === null) {
    runnerRef.current = createSectionActionRunner(setStatus);
  }

  const entries = Object.entries(actions).flatMap(([key, action]) => {
    const actionState = getSectionActionState(action, data, { readOnly, disabled: disabled || runnerRef.current?.pending });
    if (!actionState.visible) return [];

    const variant = action.variant ?? "secondary";
    return [
      <button
        className={`dcmsdk-button dcmsdk-button-${variant}`}
        type="button"
        key={key}
        disabled={actionState.disabled}
        onClick={() => {
          const snapshot = data;
          void runnerRef.current?.run(action.label, () =>
            action.execute({ data: snapshot, coreActions }),
          );
        }}
      >
        {action.label}
      </button>,
    ];
  });

  if (entries.length === 0 && status.kind === "idle") return null;

  return (
    <>
      {entries.length > 0 && <div className={`dcmsdk-actions${className ? ` ${className}` : ""}`}>{entries}</div>}
      <SectionStatus status={status} />
    </>
  );
}
