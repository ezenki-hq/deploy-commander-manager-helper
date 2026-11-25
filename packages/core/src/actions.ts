import {
  RPC,
  type Wire,
} from "@ezenki/deploy-commander-installer-interface";
import type {
  ConnectionDetail,
  ConnectionFilters,
  ConnectionPage,
  ConnectionSummary,
  CoreActions,
  CreateConnectionConfig,
  CreatedConnection,
  LastRunFilters,
  MyConnectionFilters,
  OwnedResource,
  ResourceFilters,
  ResourcePage,
  ResourceSummary,
  RunStarted,
  RunSummary,
  StartRunConfig,
} from "./action-types.js";
import {
  requiredId,
  validateConnectionFilters,
  validateCreateConnectionConfig,
  validateLastRunFilters,
  validateResourceFilters,
  validateStartRunConfig,
} from "./input-validation.js";

const PAGE_SIZE = 50;

function assertPageOffset(responseOffset: number, requestedOffset: number): void {
  if (!Number.isSafeInteger(responseOffset) || responseOffset !== requestedOffset) {
    throw new TypeError("RPC page offset did not match the requested offset");
  }
}

async function findResource(
  checked: RPC.CheckedRPCCaller,
  id: string,
): Promise<ResourceSummary | null> {
  let offset = 0;
  let total = Number.POSITIVE_INFINITY;
  while (offset < total) {
    const page = await checked.getResources({ limit: PAGE_SIZE, offset });
    assertPageOffset(page.offset, offset);
    total = page.total;
    const match = page.items.find((item) => item.id === id);
    if (match) return match;
    if (page.items.length === 0 && offset < total) {
      throw new TypeError("RPC resource page was empty before reaching its reported total");
    }
    offset += page.items.length;
  }
  return null;
}

async function getAllResourceConnections(
  checked: RPC.CheckedRPCCaller,
  resourceId: string,
): Promise<ConnectionSummary[]> {
  const items: ConnectionSummary[] = [];
  let offset = 0;
  let total = Number.POSITIVE_INFINITY;
  while (offset < total) {
    const page = await checked.getConnections({ resource: resourceId, limit: PAGE_SIZE, offset });
    assertPageOffset(page.offset, offset);
    total = page.total;
    if (page.items.length === 0 && offset < total) {
      throw new TypeError("RPC connection page was empty before reaching its reported total");
    }
    items.push(...page.items);
    offset += page.items.length;
  }
  return items;
}

function checkedOwnedResource(
  resource: RPC.CheckedGetResource,
  id: string,
): OwnedResource {
  if (resource.resource.id !== id) throw new TypeError("RPC returned a different resource ID");
  if (resource.config === undefined || resource.config === null) {
    throw new TypeError("Owned resource response did not include configuration");
  }
  return { ...resource, config: resource.config };
}

export function createCoreActions(wire: Wire): CoreActions {
  const checked = RPC.SetupCheckedRPCCaller(wire);
  const caller = RPC.SetupRPCCaller(wire);

  return {
    async startRun(config: StartRunConfig): Promise<RunStarted> {
      validateStartRunConfig(config);
      return caller.start({
        action: config.action,
        runner: "ezenki/deploy-commander-runner:latest",
        platform: "docker",
        ...(config.sub_queue === undefined ? {} : { sub_queue: config.sub_queue }),
        ...(config.metadata === undefined ? {} : { metadata: config.metadata }),
        ...(config.note === undefined ? {} : { note: config.note }),
        ...(config.platform_data === undefined ? {} : { platform_data: config.platform_data }),
        ...(config.config === undefined ? {} : { config: config.config }),
        ...(config.target === undefined ? {} : { target: config.target }),
        ...(config.labels === undefined ? {} : { labels: config.labels }),
        ...(config.secrets === undefined ? {} : { secrets: config.secrets }),
      });
    },

    async getLastRun(filters?: LastRunFilters): Promise<RunSummary | null> {
      validateLastRunFilters(filters);
      return checked.getLatestRun(filters);
    },

    async getResources(filters: ResourceFilters): Promise<ResourcePage> {
      validateResourceFilters(filters);
      return checked.getResources(filters);
    },

    async getResource(id: string): Promise<ResourceSummary | null> {
      requiredId(id, "id");
      return findResource(checked, id);
    },

    async getMyResource(id: string): Promise<OwnedResource> {
      requiredId(id, "id");
      return checkedOwnedResource(await checked.getResource(id), id);
    },

    async getConnections(filters: ConnectionFilters): Promise<ConnectionPage> {
      validateConnectionFilters(filters);
      return checked.getConnections(filters);
    },

    async getMyConnections(filters: MyConnectionFilters): Promise<ConnectionPage> {
      validateConnectionFilters(filters);
      const manager = await caller.getManager();
      requiredId(manager, "current manager ID");
      return checked.getConnections({ ...filters, manager });
    },

    async getResourceConnections(resourceId: string): Promise<ConnectionSummary[]> {
      requiredId(resourceId, "resourceId");
      const resource = await checked.getResource(resourceId);
      if (resource.resource.id !== resourceId) throw new TypeError("RPC returned a different resource ID");
      return getAllResourceConnections(checked, resourceId);
    },

    async getConnection(id: string): Promise<ConnectionDetail> {
      requiredId(id, "id");
      return checked.getConnection(id);
    },

    async connectionExists(resourceId: string, managerId: string): Promise<boolean> {
      requiredId(resourceId, "resourceId");
      requiredId(managerId, "managerId");
      const connections = await checked.getConnections({
        resource: resourceId,
        manager: managerId,
        limit: 1,
        offset: 0,
      });
      return connections.total > 0;
    },

    async createConnection(config: CreateConnectionConfig): Promise<CreatedConnection> {
      validateCreateConnectionConfig(config);
      return caller.createConnection(
        { metadata: config.metadata },
        config.managerId,
        config.external,
        config.resourceId,
        config.labels,
      ) as Promise<CreatedConnection>;
    },

    async deleteConnection(id: string): Promise<void> {
      requiredId(id, "id");
      return caller.deleteConnection(id);
    },
  };
}
