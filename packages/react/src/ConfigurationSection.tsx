import { useCallback, useEffect, useId, useImperativeHandle, useRef, useState } from "react";
import { runSectionLoader } from "@ezenki/deploy-commander-manager-sdk-core/configuration";
import { SectionActionsContent } from "./SectionActions.js";
import { SectionStatus } from "./SectionStatus.js";
import type { ConfigurationSectionProps } from "./types.js";

export function ConfigurationSection<TData extends object>(props: ConfigurationSectionProps<TData>) {
  const isControlled = typeof props.onDataChange === "function";
  const [internalData, setInternalData] = useState<TData | undefined>(() =>
    "initialData" in props ? props.initialData : undefined,
  );
  const [internalLoading, setInternalLoading] = useState(false);
  const [loadError, setLoadError] = useState<unknown>();
  const cancelLoad = useRef<(() => void) | undefined>(undefined);
  const propsRef = useRef(props);
  propsRef.current = props;
  const loader = "loadData" in props ? props.loadData : undefined;
  const data = isControlled ? props.data : internalData;
  const headingId = useId();

  const setData = useCallback((next: TData) => {
    const current = propsRef.current;
    if (typeof current.onDataChange === "function") {
      current.onDataChange(next);
      return;
    }
    cancelLoad.current?.();
    cancelLoad.current = undefined;
    setInternalLoading(false);
    setLoadError(undefined);
    setInternalData(next);
  }, []);

  const setBodyData = useCallback((next: TData) => {
    if (propsRef.current.readOnly) return;
    setData(next);
  }, [setData]);

  useImperativeHandle(props.ref, () => ({ setData }), [setData]);

  useEffect(() => {
    if (isControlled || !loader) return;

    setInternalLoading(true);
    setLoadError(undefined);
    const cancel = runSectionLoader(loader, {
      onData: (loaded) => {
        cancelLoad.current = undefined;
        setInternalData(loaded);
        setInternalLoading(false);
      },
      onError: (error) => {
        cancelLoad.current = undefined;
        setLoadError(error);
        setInternalLoading(false);
      },
    });
    cancelLoad.current = cancel;
    return () => {
      cancel();
      if (cancelLoad.current === cancel) cancelLoad.current = undefined;
    };
  }, [isControlled, loader]);

  const loading = props.loading === true || internalLoading;
  const visibleError = props.error !== undefined ? props.error : loadError;
  const status = loading
    ? { kind: "loading" as const }
    : { kind: "error" as const, error: visibleError };

  return (
    <section
      className={`dcmsdk-section${props.className ? ` ${props.className}` : ""}`}
      aria-labelledby={headingId}
      aria-busy={loading}
    >
      <header className="dcmsdk-section-header">
        <h2 className="dcmsdk-section-title" id={headingId}>{props.title}</h2>
        {props.description && <div className="dcmsdk-section-description">{props.description}</div>}
      </header>
      {data !== undefined && (
        <fieldset className="dcmsdk-section-body min-w-0 border-0 p-0" disabled={props.readOnly}>
          {props.children({ data, setData: setBodyData, readOnly: props.readOnly === true, loading })}
        </fieldset>
      )}
      {(loading || visibleError !== undefined) && <SectionStatus status={status} />}
      {data !== undefined && props.actions && (
        <SectionActionsContent
          data={data}
          actions={props.actions}
          coreActions={props.coreActions}
          readOnly={props.readOnly}
          disabled={loading}
        />
      )}
    </section>
  );
}
