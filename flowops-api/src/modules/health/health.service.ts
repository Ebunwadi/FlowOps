import { env } from "../../config/env";
import { checkDatabaseConnection } from "../../config/database";
import { checkStorageConnection } from "../../config/storage";

export interface HealthStatus {
  database: "connected" | "disconnected";
  environment: string;
  service: "flowops-api";
  status: "ok" | "degraded";
  storage: "connected" | "disconnected";
  timestamp: string;
  uptimeSeconds: number;
}

export async function getHealth(): Promise<HealthStatus> {
  const [databaseConnected, storageConnected] = await Promise.all([
    checkDatabaseConnection(),
    checkStorageConnection(),
  ]);

  const isHealthy = databaseConnected && storageConnected;

  return {
    database: databaseConnected ? "connected" : "disconnected",
    environment: env.nodeEnv,
    service: "flowops-api",
    status: isHealthy ? "ok" : "degraded",
    storage: storageConnected ? "connected" : "disconnected",
    timestamp: new Date().toISOString(),
    uptimeSeconds: Math.floor(process.uptime()),
  };
}
