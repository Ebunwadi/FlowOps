import { apiClient } from "@/api/client";
import type { FlowOpsUserProfile } from "@/types/user";

export function getCurrentUser(): Promise<FlowOpsUserProfile> {
  return apiClient<FlowOpsUserProfile>("/auth/me");
}
