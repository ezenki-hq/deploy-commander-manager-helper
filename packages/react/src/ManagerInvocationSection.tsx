import { useEffect, useState } from "react";
import type { JSONValue } from "@ezenki/deploy-commander-installer-interface";
import { openManagerInvocationSession } from "@ezenki/deploy-commander-manager-sdk-core";
import type { ManagerInvocationCalledContext, ManagerInvocationDefinition, ManagerInvocationSession } from "@ezenki/deploy-commander-manager-sdk-core";
import { SectionStatus } from "./SectionStatus.js";
import type { ReactNode } from "react";

export interface ManagerInvocationSectionProps<TMetadata, TResult extends JSONValue> {
  wire: import("@ezenki/deploy-commander-installer-interface").Wire;
  definition?: ManagerInvocationDefinition<TMetadata, TResult>;
  standalone?(): ReactNode;
  called?(context: ManagerInvocationCalledContext<TMetadata, TResult>): ReactNode;
}
export function ManagerInvocationSection<TMetadata = unknown, TResult extends JSONValue = JSONValue>(props: ManagerInvocationSectionProps<TMetadata, TResult>) {
  const [session, setSession] = useState<ManagerInvocationSession<TMetadata, TResult>>();
  const [error, setError] = useState<unknown>();
  useEffect(() => {
    const abort = new AbortController();
    setSession(undefined); setError(undefined);
    void openManagerInvocationSession(props.wire, props.definition, abort.signal).then((value) => { if (!abort.signal.aborted) setSession(value); }).catch((reason: unknown) => { if (!abort.signal.aborted) setError(reason); });
    return () => abort.abort();
  }, [props.wire, props.definition]);
  if (error !== undefined) return <SectionStatus status={{ kind: "error", error }} />;
  if (!session) return <SectionStatus status={{ kind: "loading" }} />;
  if (session.mode === "standalone") return <>{props.standalone?.()}</>;
  if (!props.called) return null;
  if (!props.definition || !session.context) return <SectionStatus status={{ kind: "error", error: new Error("Called content requires a metadata definition") }} />;
  return <>{props.called(session.context)}</>;
}
