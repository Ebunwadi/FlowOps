import { env } from "../../config/env";
import { checkDatabaseConnection } from "../../config/database";

export interface HealthStatus {
  database: "connected" | "disconnected";
  environment: string;
  service: "flowops-api";
  status: "ok" | "degraded";
  timestamp: string;
  uptimeSeconds: number;
}

export async function getHealth(): Promise<HealthStatus> {
  const databaseConnected = await checkDatabaseConnection();

  return {
    database: databaseConnected ? "connected" : "disconnected",
    environment: env.nodeEnv,
    service: "flowops-api",
    status: databaseConnected ? "ok" : "degraded",
    timestamp: new Date().toISOString(),
    uptimeSeconds: Math.floor(process.uptime()),
  };
}
