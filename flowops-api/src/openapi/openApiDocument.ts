export const openApiDocument = {
  openapi: "3.0.3",
  info: {
    title: "FlowOps API",
    version: "0.1.0",
    description: "Backend API for the FlowOps workflow automation platform."
  },
  servers: [
    {
      url: "/api"
    }
  ],
  paths: {
    "/health": {
      get: {
        summary: "Check API health",
        tags: ["Health"],
        responses: {
          "200": {
            description: "The API process is healthy."
          }
        }
      }
    }
  }
} as const;
