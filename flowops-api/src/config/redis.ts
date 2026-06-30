import type { ConnectionOptions } from "bullmq";

import { env } from "./env";

export function getRedisConnectionOptions(): ConnectionOptions {
  return {
    url: env.redisUrl,
    maxRetriesPerRequest: null,
  };
}
