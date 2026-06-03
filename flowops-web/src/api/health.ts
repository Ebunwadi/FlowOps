import { apiClient } from "@/api/client";

export interface HealthStatus {
  environment: string;
  service: "flowops-api";
  status: "ok";
  timestamp: string;
  uptimeSeconds: number;
}

export function getHealthStatus(): Promise<HealthStatus> {
  return apiClient<HealthStatus>("/health");
}
