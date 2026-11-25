import type { SectionStatusProps } from "./types.js";
import { formatSectionError } from "@ezenki/deploy-commander-manager-sdk-core/configuration";

export function SectionStatus({ status, className = "" }: SectionStatusProps) {
  if (status.kind === "idle") return null;

  const messages = {
    loading: "Loading configuration…",
    pending: `${status.kind === "pending" ? status.label : "Operation"} in progress…`,
    success: `${status.kind === "success" ? status.label : "Operation"} complete`,
    error: status.kind === "error"
      ? [status.label, formatSectionError(status.error)].filter(Boolean).join(": ")
      : "The operation could not be completed.",
  };
  const kind = status.kind;
  const message = messages[kind];
  const isError = kind === "error";
  const role = isError ? "alert" : "status";
  const tone = kind === "loading" ? "loading" : kind;

  return (
    <div
      className={`dcmsdk-status dcmsdk-status-${tone}${className ? ` ${className}` : ""}`}
      role={role}
      aria-live={isError ? "assertive" : "polite"}
    >
      {message}
    </div>
  );
}
