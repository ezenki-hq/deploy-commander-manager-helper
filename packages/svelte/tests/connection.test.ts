import { fireEvent, render, screen, waitFor } from "@testing-library/svelte";
import { describe, expect, it } from "vitest";
import ConnectionSection from "../src/ConnectionSection.svelte";
import InvocationHost from "./InvocationHost.svelte";
import ProviderInvocationHost from "./ProviderInvocationHost.svelte";
import StandaloneHost from "./StandaloneHost.svelte";
import type { Wire } from "@ezenki/deploy-commander-installer-interface";

const stamp = "2026-01-01T00:00:00.000Z";
const resource = { id: "r1", manager: "owner", name: "Primary DB", type: "database", external: true, created_at: stamp, updated_at: stamp };
const connection = { id: "c1", resource: "r1", manager: "consumer", external: false, created_at: stamp, updated_at: stamp };
type RecordedCall = { request: string; payload?: Record<string, unknown> };
function wireCast(value: unknown): Wire { return value as Wire; }
function wireFor(closeResult: unknown, rows = [connection]) {
  const calls: RecordedCall[] = [];
  const wire = { calls, async sendRPC(call: RecordedCall) { calls.push(call); if (call.request === "getManager") return { ok: true, result: "consumer" }; if (call.request === "getResources") return { ok: true, result: { items: [resource], offset: call.payload?.offset, limit: call.payload?.limit, total: 1 } }; if (call.request === "getConnections") return { ok: true, result: { items: rows, offset: call.payload?.offset, limit: call.payload?.limit, total: rows.length } }; if (call.request === "getCallingManager") return { ok: true, result: "caller" }; if (call.request === "getMetadata") return { ok: true, result: { purpose: "test" } }; throw Error(call.request); }, async startInterface(call: Record<string, unknown>) { calls.push({ request: "startInterface", payload: call }); return { id: "child", close: Promise.resolve(closeResult) }; }, close(response: unknown) { calls.push({ request: "close", payload: { response } }); }, end() {} };
  return { wire: wireCast(wire), calls };
}

describe("Svelte connection and invocation sections", () => {
  it("opens the owner interface and selects the returned authorized ID", async () => {
    const { wire, calls } = wireFor({ manager: "owner", ok: true, result: { kind: "created", resourceId: "r1", connectionId: "c2" } }, [connection, { ...connection, id: "c2" }]);
    const changes: string[][] = [];
    render(ConnectionSection, { props: { wire, resource: { resourceId: "r1" }, initialData: { connectionIds: [] }, onSelectionChange: (ids: readonly string[]) => changes.push([...ids]) } });
    const button = await screen.findByRole("button", { name: "Create Connection" });
    await waitFor(() => expect((button as HTMLButtonElement).disabled).toBe(false));
    await fireEvent.click(button);
    await waitFor(() => expect(changes.at(-1)).toEqual(["c2"]));
    expect(calls.some((call) => call.request === "startInterface" && call.payload?.manager === "owner" && (call.payload?.metadata as { resourceId?: string }).resourceId === "r1")).toBe(true);
  });
  it("renders called mode and closes exactly once on completion", async () => {
    const { wire, calls } = wireFor(null);
    render(InvocationHost, { props: { wire, definition: { parseMetadata: (value: unknown) => value } } });
    await fireEvent.click(await screen.findByRole("button", { name: "caller" }));
    await waitFor(() => expect(calls.filter((call) => call.request === "close")).toHaveLength(1));
  });
  it("renders standalone without requesting metadata", async () => {
    const { calls } = wireFor(null);
    const standaloneWire = wireCast({ calls, async sendRPC(call: RecordedCall) { calls.push(call); if (call.request === "getManager") return { ok: true, result: "provider" }; if (call.request === "getCallingManager") return { ok: true, result: null }; throw Error(call.request); }, close() {}, end() {} });
    render(StandaloneHost, { props: { wire: standaloneWire } });
    expect(await screen.findByText("Standalone manager")).toBeTruthy();
    expect(calls.some((call) => call.request === "getMetadata")).toBe(false);
  });
  it("wraps the resource owner interface without duplicate close handling", async () => {
    const calls: RecordedCall[] = [];
    const owned = { resource, config: { id: "r1", manager: "owner", agent: "agent1", name: "Primary DB", resource_type: "database", external: true, created_at: stamp, updated_at: stamp, metadata: {} } };
    const created = { id: "c3", resource: "r1", manager: "consumer", external: false, created_at: stamp, updated_at: stamp };
    const wire = wireCast({ calls, async sendRPC(call: RecordedCall) { calls.push(call); if (call.request === "getManager") return { ok: true, result: "owner" }; if (call.request === "getCallingManager") return { ok: true, result: "consumer" }; if (call.request === "getMetadata") return { ok: true, result: { purpose: "createConnection", resourceId: "r1" } }; if (call.request === "getResource") return { ok: true, result: owned }; if (call.request === "getConnections") return { ok: true, result: { items: [], offset: call.payload?.offset, limit: call.payload?.limit, total: 0 } }; if (call.request === "createConnection") return { ok: true, result: { connection: created, config: {} } }; throw Error(call.request); }, close(response: unknown) { calls.push({ request: "close", payload: { response } }); }, end() {} });
    render(ProviderInvocationHost, { props: { wire } });
    await waitFor(() => expect(screen.getByRole("button", { name: "Create Connection" })).toBeTruthy());
    await fireEvent.click(screen.getByRole("button", { name: "Create Connection" }));
    await waitFor(() => expect(calls.filter((call) => call.request === "close")).toHaveLength(1));
    expect(((calls.find((call) => call.request === "close")?.payload?.response as { result: { connectionId: string } }).result.connectionId)).toBe("c3");
  });
});
