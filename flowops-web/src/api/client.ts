import { getRegisteredAccessToken } from "@/auth/token-access";
import { getRegisteredOrganisationId } from "@/auth/organisation-context-access";
import { env } from "@/config/env";
import { ApiClientError, type ApiResponse } from "@/types/api";

interface RequestOptions extends Omit<RequestInit, "body"> {
  body?: unknown;
}

export async function apiClient<TData>(
  path: string,
  options: RequestOptions = {},
): Promise<TData> {
  const { body, headers, ...rest } = options;
  const accessToken = await getRegisteredAccessToken();
  const organisationId = getRegisteredOrganisationId();

  const response = await fetch(`${env.apiBaseUrl}${path}`, {
    ...rest,
    headers: {
      "Content-Type": "application/json",
      ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
      ...(organisationId ? { "x-organisation-id": organisationId } : {}),
      ...headers,
    },
    body: body === undefined ? undefined : JSON.stringify(body),
  });

  const payload = (await response.json()) as ApiResponse<TData>;

  if (!response.ok || payload.success !== true) {
    const message = payload.success === false ? payload.message : "Request failed";
    const fieldErrors = payload.success === false ? (payload.errors ?? []) : [];
    throw new ApiClientError(message, response.status, fieldErrors);
  }

  return payload.data;
}
