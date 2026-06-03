import request from "supertest";

import { createApp } from "../src/app";

interface HealthResponse {
  data: {
    environment: string;
    service: string;
    status: string;
    timestamp: string;
    uptimeSeconds: number;
  };
  message: string;
  success: boolean;
}

describe("health endpoint", () => {
  it("returns the API health status", async () => {
    const response = await request(createApp()).get("/api/health").expect(200);
    const body = response.body as HealthResponse;

    expect(body.success).toBe(true);
    expect(body.message).toBe("Service is healthy");
    expect(body.data.environment).toBe("test");
    expect(body.data.service).toBe("flowops-api");
    expect(body.data.status).toBe("ok");
    expect(typeof body.data.timestamp).toBe("string");
    expect(typeof body.data.uptimeSeconds).toBe("number");
  });
});
