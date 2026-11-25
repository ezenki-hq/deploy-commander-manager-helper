import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/svelte";
import { afterEach, describe, expect, it } from "vitest";
import {
  ConfigurationGroup,
  ConfigurationSection,
  SectionActions,
  SectionStatus,
} from "@ezenki/deploy-commander-manager-sdk-svelte";
import type { SectionActionMap, SectionStatusState } from "@ezenki/deploy-commander-manager-sdk-svelte";
import InternalHarness from "./InternalHarness.svelte";
import ControlledHarness from "./ControlledHarness.svelte";
import ActionHarness from "./ActionHarness.svelte";
import GroupHarness from "./GroupHarness.svelte";

afterEach(cleanup);

interface Profile { name: string }

describe("Svelte configuration components", () => {
  it("exports the four compiler-ready components", () => {
    expect(ConfigurationSection).toBeDefined();
    expect(SectionActions).toBeDefined();
    expect(SectionStatus).toBeDefined();
    expect(ConfigurationGroup).toBeDefined();
  });

  it("updates controlled data through the typed snippet and passes current data to actions", async () => {
    const received: string[] = [];
    const actions: SectionActionMap<Profile> = {
      inspect: { label: "Inspect", execute: ({ data }) => { received.push(data.name); } },
    };
    render(ControlledHarness, { props: { actions } });

    await fireEvent.input(screen.getByRole("textbox", { name: "Profile name" }), { target: { value: "after" } });
    expect((screen.getByRole("textbox", { name: "Profile name" }) as HTMLInputElement).value).toBe("after");
    await fireEvent.click(screen.getByRole("button", { name: "Inspect" }));
    expect(received).toEqual(["after"]);
  });

  it("keeps internal data separate and supports the bind:this setData method", async () => {
    render(InternalHarness);
    expect((screen.getByRole("textbox", { name: "Profile name" }) as HTMLInputElement).value).toBe("initial");
    await fireEvent.click(screen.getByRole("button", { name: "Host update" }));
    expect((screen.getByRole("textbox", { name: "Profile name" }) as HTMLInputElement).value).toBe("host update");
  });

  it("cancels a pending load when the user edits data", async () => {
    let signal: AbortSignal | undefined;
    let resolveLoad: ((profile: Profile) => void) | undefined;
    const loadData = (requestSignal: AbortSignal) => {
      signal = requestSignal;
      return new Promise<Profile>((resolve) => { resolveLoad = resolve; });
    };
    render(InternalHarness, { props: { loadData } });

    const input = screen.getByRole("textbox", { name: "Profile name" }) as HTMLInputElement;
    await fireEvent.input(input, { target: { value: "edited" } });
    resolveLoad?.({ name: "stale" });
    await waitFor(() => expect(input.value).toBe("edited"));
    expect(signal?.aborted).toBe(true);
  });

  it("hides read-only actions unless opted in and disables body fields", async () => {
    const calls: string[] = [];
    const actions: SectionActionMap<Profile> = {
      hidden: { label: "Hidden", execute: () => { calls.push("hidden"); } },
      allowed: { label: "Allowed", allowInReadOnly: true, execute: () => { calls.push("allowed"); } },
    };
    render(InternalHarness, { props: { readOnly: true, actions } });

    expect(screen.queryByRole("button", { name: "Hidden" })).toBeNull();
    expect((screen.getByRole("textbox", { name: "Profile name" }) as HTMLInputElement).matches(":disabled")).toBe(true);
    await fireEvent.click(screen.getByRole("button", { name: "Allowed" }));
    expect(calls).toEqual(["allowed"]);
  });

  it("locks actions during async execution and announces errors", async () => {
    let rejectAction: ((error: Error) => void) | undefined;
    const actions: SectionActionMap<Profile> = {
      run: { label: "Run", execute: () => new Promise<void>((_resolve, reject) => { rejectAction = reject; }) },
    };
    render(ActionHarness, { props: { actions } });

    const button = screen.getByRole("button", { name: "Run" }) as HTMLButtonElement;
    await fireEvent.click(button);
    expect(button.disabled).toBe(true);
    rejectAction?.(new Error("Denied"));
    await waitFor(() => expect(screen.getByRole("alert").textContent).toBe("Run: Denied"));
    expect(button.disabled).toBe(false);
  });

  it("renders status and the responsive group class", () => {
    const loading: SectionStatusState = { kind: "loading" };
    const status = render(SectionStatus, { props: { status: loading } });
    expect(screen.getByRole("status").getAttribute("aria-live")).toBe("polite");
    status.unmount();

    render(GroupHarness);
    expect(screen.getByText("Card").parentElement?.classList.contains("dcmsdk-group-two")).toBe(true);
  });
});
