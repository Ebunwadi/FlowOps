import { getRegisteredAccessToken } from "@/auth/token-access";
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

  const response = await fetch(`${env.apiBaseUrl}${path}`, {
    ...rest,
    headers: {
      "Content-Type": "application/json",
      ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
      ...headers,
    },
    body: body === undefined ? undefined : JSON.stringify(body),
  });

  const payload = (await response.json()) as ApiResponse<TData>;

  if (!response.ok || payload.success !== true) {
    const message = payload.success === false ? payload.message : "Request failed";
    throw new ApiClientError(message, response.status);
  }

  return payload.data;
}
