import type {
  SectionAction,
  SectionActionRunner,
  SectionActionStatusListener,
  SectionLoaderCallbacks,
} from "./types.js";

const FALLBACK_ERROR = "The operation could not be completed.";

export function runSectionLoader<TData extends object>(
  loader: (signal: AbortSignal) => TData | Promise<TData>,
  callbacks: SectionLoaderCallbacks<TData>,
): () => void {
  const controller = new AbortController();
  let active = true;
  let result: TData | Promise<TData>;

  try {
    result = loader(controller.signal);
  } catch (error) {
    callbacks.onError(error);
    return () => {
      active = false;
      controller.abort();
    };
  }

  void Promise.resolve(result).then(
    (data) => {
      if (active && !controller.signal.aborted) callbacks.onData(data);
    },
    (error: unknown) => {
      if (active && !controller.signal.aborted) callbacks.onError(error);
    },
  );

  return () => {
    active = false;
    controller.abort();
  };
}

export function getSectionActionState<TData extends object>(
  action: SectionAction<TData>,
  data: Readonly<TData>,
  options: { readOnly?: boolean; disabled?: boolean } = {},
): { visible: boolean; disabled: boolean } {
  const visible = typeof action.visible === "function"
    ? action.visible(data)
    : action.visible ?? true;
  const readOnlyHidden = options.readOnly === true && action.allowInReadOnly !== true;
  const actionDisabled = typeof action.disabled === "function"
    ? action.disabled(data)
    : action.disabled ?? false;

  return {
    visible: visible && !readOnlyHidden,
    disabled: options.disabled === true || actionDisabled,
  };
}

export function createSectionActionRunner(
  onStatus: SectionActionStatusListener,
): SectionActionRunner {
  let pending = false;

  return {
    get pending() {
      return pending;
    },
    async run(label, execute) {
      if (pending) return false;
      pending = true;
      onStatus({ kind: "pending", label });

      try {
        await execute();
        onStatus({ kind: "success", label });
        return true;
      } catch (error) {
        onStatus({ kind: "error", error, label });
        return false;
      } finally {
        pending = false;
      }
    },
  };
}

export function formatSectionError(error: unknown): string {
  if (error instanceof Error && error.message.trim().length > 0) return error.message;
  if (typeof error === "object" && error !== null && "message" in error) {
    const message = error.message;
    if (typeof message === "string" && message.trim().length > 0) return message;
  }
  return FALLBACK_ERROR;
}
