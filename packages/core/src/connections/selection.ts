import type { ConnectionConsumerActions, ConnectionConsumerOptions, ConnectionSelection, ConnectionSelectionController, ConnectionSelectionState } from "./types.js";
import type { ConnectionSummary, ResourceSummary } from "../action-types.js";
import type { SectionStatusState } from "../configuration/types.js";

export function createConnectionSelectionController(actions: ConnectionConsumerActions, onStateChange: (state: ConnectionSelectionState) => void): ConnectionSelectionController {
  let options: (ConnectionConsumerOptions & ConnectionSelection) | undefined;
  let resources: readonly ResourceSummary[] = [];
  let rows: readonly ConnectionSummary[] = [];
  let resourceId: string | undefined;
  let internalIds: readonly string[] = [];
  let internalInitialized = false;
  const verified = new Map<string, ConnectionSummary>();
  let loading = false;
  let status: SectionStatusState = { kind: "idle" };
  let notice: string | undefined;
  let generation = 0;
  let disposed = false;
  let busy = false;
  const ids = () => options && "data" in options ? options.data?.connectionIds ?? [] : internalIds;
  const emit = () => {
    if (disposed || !options) return;
    const connectionIds = [...ids()];
    const max = options.maxConnections ?? 1;
    onStateChange({ resources, resourceId, connections: rows, selected: connectionIds.map((id) => verified.get(id)).filter((x): x is ConnectionSummary => !!x), connectionIds, canAdd: connectionIds.length < max, loading, status, notice });
  };
  const update = (next: readonly string[]) => {
    const unique = [...new Set(next)];
    if (options && "onDataChange" in options && options.onDataChange) options.onDataChange({ connectionIds: unique });
    else internalIds = unique;
    options?.onSelectionChange?.(unique);
    emit();
  };
  async function loadResources(token: number) {
    if (!options) return;
    try {
      resources = await actions.getResources(options.resource);
      if (disposed || token !== generation) return;
      if ("resourceId" in options.resource && options.resource.resourceId) resourceId = options.resource.resourceId;
      else resourceId = resources[0]?.id;
      if (resourceId) await loadRows(resourceId, token);
      if (disposed || token !== generation) return;
      loading = false;
      emit();
    } catch (error) { if (!disposed && token === generation) { status = { kind: "error", error }; loading = false; emit(); } }
  }
  async function loadRows(id: string, token = generation) {
    const found = await actions.getConnections(id);
    if (disposed || token !== generation) return;
    rows = found;
    for (const row of found) verified.set(row.id, row);
  }
  const controller: ConnectionSelectionController = {
    configure(next) {
      const changed = !options || JSON.stringify(options.resource) !== JSON.stringify(next.resource);
      options = next;
      if (!internalInitialized) {
        internalIds = next.initialData?.connectionIds ?? [];
        internalInitialized = true;
      }
      const max = next.maxConnections ?? 1;
      if (!Number.isSafeInteger(max) || max <= 0) {
        status = { kind: "error", error: new RangeError("maxConnections must be a positive safe integer") };
        emit();
        return;
      }
      if (ids().length > max) {
        status = { kind: "error", error: new RangeError("Selected connections exceed maxConnections") };
        emit();
        return;
      }
      if (new Set(ids()).size !== ids().length) {
        status = { kind: "error", error: new TypeError("Connection IDs must be unique") };
        emit();
        return;
      }
      if (changed) { generation++; loading = true; status = { kind: "loading" }; void loadResources(generation); }
      emit();
      for (const id of ids()) if (!verified.has(id)) void actions.getConnection(id).then((row) => {
        if (disposed) return;
        if (row.id !== id) throw new TypeError("Connection lookup returned a different ID");
        verified.set(id,row); emit();
      }).catch((error) => { if (!disposed) { status={kind:"error",error}; emit(); } });
    },
    chooseResource(id) { if (!resources.some((row) => row.id === id)) throw new Error("Resource is not available"); resourceId=id; rows=[]; generation++; const token=generation; loading=true; status={kind:"loading"}; void loadRows(id,token).then(()=>{if(token===generation){loading=false;emit();}}).catch((error)=>{if(token===generation){loading=false;status={kind:"error",error};emit();}}); emit(); },
    select(id) { if (ids().includes(id)) return; if (ids().length >= (options?.maxConnections ?? 1)) return; if (!rows.some((row)=>row.id===id)) throw new Error("Connection is not available"); verified.set(id,rows.find((row)=>row.id===id)!); update([...ids(),id]); },
    remove(id) { update(ids().filter((value)=>value!==id)); },
    async create() {
      if (busy || !resourceId || ids().length >= (options?.maxConnections ?? 1)) return;
      busy=true; loading=true; status={kind:"pending",label:"Create connection"}; emit();
      try {
        const result=await actions.requestConnection(resourceId);
        if (disposed) return;
        if (result.kind === "cancelled") { status={kind:"idle"}; return; }
        rows=result.connections; for(const row of rows) verified.set(row.id,row);
        const next=[...ids()]; if(!next.includes(result.connection.id)) { if(next.length<(options?.maxConnections??1)) next.push(result.connection.id); else notice="Connection created, but selection capacity was reached"; }
        update(next); status={kind:"success",label:"Connection created"};
      } catch(error){status={kind:"error",error};} finally{busy=false;loading=false;emit();}
    },
    async delete(id) {
      const connection=rows.find((row)=>row.id===id); if(!connection || !verified.has(id) || !options?.onDeleteConnection) return;
      try { await options.onDeleteConnection(connection); if(disposed)return; rows=await actions.getConnections(connection.resource); if(disposed)return; verified.delete(id); controller.remove(id); status={kind:"success",label:"Connection deleted"}; }
      catch(error){status={kind:"error",error};} emit();
    },
    dispose(){disposed=true;generation++;},
  };
  return controller;
}
