import type { ConfigurationGroupProps } from "./types.js";

export function ConfigurationGroup({ children, columns = 1, className = "" }: ConfigurationGroupProps) {
  return (
    <div className={`dcmsdk-group${columns === 2 ? " dcmsdk-group-two" : ""}${className ? ` ${className}` : ""}`}>
      {children}
    </div>
  );
}
