import { env } from "../../config/env";

export interface HealthStatus {
  environment: string;
  service: "flowops-api";
  status: "ok";
  timestamp: string;
  uptimeSeconds: number;
}

export function getHealth(): HealthStatus {
  return {
    environment: env.nodeEnv,
    service: "flowops-api",
    status: "ok",
    timestamp: new Date().toISOString(),
    uptimeSeconds: Math.floor(process.uptime())
  };
}
