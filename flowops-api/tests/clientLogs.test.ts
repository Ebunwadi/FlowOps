import request from "supertest";

import { createApp } from "../src/app";

describe("client logs endpoint", () => {
  it("accepts structured browser logs for Seq forwarding", async () => {
    const response = await request(createApp())
      .post("/api/logs/client")
      .send({
        logs: [
          {
            level: "info",
            message: "[UI][app] Frontend logging connected to API",
            context: {
              origin: "ui",
              area: "app",
              event: "logging.initialized",
            },
            url: "http://localhost:5173/",
          },
        ],
      })
      .expect(202);

    expect(response.body).toEqual({
      success: true,
      message: "Client logs accepted",
      data: { accepted: 1 },
    });
  });

  it("rejects empty log batches", async () => {
    const response = await request(createApp())
      .post("/api/logs/client")
      .send({ logs: [] })
      .expect(400);

    expect(response.body.success).toBe(false);
  });
});
