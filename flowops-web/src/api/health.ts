import { apiClient } from "@/api/client";

export interface HealthStatus {
  database: "connected" | "disconnected";
  environment: string;
  service: "flowops-api";
  status: "ok" | "degraded";
  timestamp: string;
  uptimeSeconds: number;
}

export function getHealthStatus(): Promise<HealthStatus> {
  return apiClient<HealthStatus>("/health");
}
