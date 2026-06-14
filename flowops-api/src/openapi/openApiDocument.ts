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
    "/organisations": {
      post: {
        summary: "Create organisation",
        tags: ["Organisations"],
        security: [{ bearerAuth: [] }],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: { $ref: "#/components/schemas/CreateOrganisationRequest" }
            }
          }
        },
        responses: {
          "201": {
            description: "Organisation created; creator is assigned the Owner role."
          },
          "409": {
            description: "Organisation slug already exists."
          }
        }
      },
      get: {
        summary: "List organisations for the current user",
        tags: ["Organisations"],
        security: [{ bearerAuth: [] }],
        responses: {
          "200": {
            description: "Returns organisations the user belongs to."
          }
        }
      }
    },
    "/organisations/current": {
      get: {
        summary: "Get current organisation",
        tags: ["Organisations"],
        security: [{ bearerAuth: [] }],
        responses: {
          "200": {
            description:
              "Returns the user's most recently joined active organisation."
          },
          "404": {
            description: "User has no active organisation memberships."
          }
        }
      }
    },
    "/organisations/{id}": {
      get: {
        summary: "Get organisation by ID",
        tags: ["Organisations"],
        security: [{ bearerAuth: [] }],
        parameters: [{ $ref: "#/components/parameters/OrganisationId" }],
        responses: {
          "200": {
            description: "Returns the organisation when the user is a member."
          },
          "404": {
            description: "Organisation not found or user is not a member."
          }
        }
      },
      patch: {
        summary: "Update organisation",
        tags: ["Organisations"],
        security: [{ bearerAuth: [] }],
        parameters: [{ $ref: "#/components/parameters/OrganisationId" }],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: { $ref: "#/components/schemas/UpdateOrganisationRequest" }
            }
          }
        },
        responses: {
          "200": {
            description: "Organisation updated successfully."
          },
          "404": {
            description: "Organisation not found or user is not a member."
          },
          "409": {
            description: "Organisation slug already exists."
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
    },
    parameters: {
      OrganisationId: {
        name: "id",
        in: "path",
        required: true,
        description: "Organisation UUID (from create or list response)",
        schema: {
          type: "string",
          format: "uuid"
        }
      }
    },
    schemas: {
      CreateOrganisationRequest: {
        type: "object",
        required: ["name", "slug"],
        properties: {
          name: {
            type: "string",
            example: "FlowOps Demo Organisation"
          },
          slug: {
            type: "string",
            example: "flowops-demo",
            description: "Lowercase letters, numbers, and hyphens only"
          }
        }
      },
      UpdateOrganisationRequest: {
        type: "object",
        minProperties: 1,
        properties: {
          name: {
            type: "string",
            example: "Updated Organisation Name"
          },
          slug: {
            type: "string",
            example: "updated-slug",
            description: "Lowercase letters, numbers, and hyphens only"
          }
        }
      }
    }
  }
} as const;
