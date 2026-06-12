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
    },
    "/logs/client": {
      post: {
        summary: "Ingest browser client logs",
        tags: ["Logging"],
        responses: {
          "202": {
            description: "Client logs accepted for forwarding to Seq."
          }
        }
      }
    },
    "/auth/me": {
      get: {
        summary: "Get current authenticated user",
        tags: ["Auth"],
        security: [{ bearerAuth: [] }],
        responses: {
          "200": {
            description:
              "Returns the synced local FlowOps user profile with Keycloak session roles."
          },
          "401": {
            description: "Missing or invalid access token."
          }
        }
      }
    },
  },
  components: {
    securitySchemes: {
      bearerAuth: {
        type: "http",
        scheme: "bearer",
        bearerFormat: "JWT"
      }
    }
  }
} as const;
