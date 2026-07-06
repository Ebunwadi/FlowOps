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
    "/organisations/{id}/members": {
      get: {
        summary: "List organisation members",
        tags: ["Members"],
        security: [{ bearerAuth: [] }],
        parameters: [{ $ref: "#/components/parameters/OrganisationId" }],
        responses: {
          "200": {
            description: "Returns active members when the caller has members:view."
          },
          "403": {
            description: "Caller lacks members:view permission."
          },
          "404": {
            description: "Organisation not found or caller is not a member."
          }
        }
      }
    },
    "/organisations/{id}/members/{memberId}/role": {
      patch: {
        summary: "Update member role",
        tags: ["Members"],
        security: [{ bearerAuth: [] }],
        parameters: [
          { $ref: "#/components/parameters/OrganisationId" },
          { $ref: "#/components/parameters/MemberId" }
        ],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: { $ref: "#/components/schemas/UpdateMemberRoleRequest" }
            }
          }
        },
        responses: {
          "200": {
            description: "Member role updated successfully."
          },
          "403": {
            description: "Caller lacks members:update-role permission."
          },
          "404": {
            description: "Member or role not found."
          },
          "409": {
            description: "Cannot demote or remove the last Owner."
          }
        }
      }
    },
    "/organisations/{id}/members/{memberId}": {
      delete: {
        summary: "Remove organisation member",
        tags: ["Members"],
        security: [{ bearerAuth: [] }],
        parameters: [
          { $ref: "#/components/parameters/OrganisationId" },
          { $ref: "#/components/parameters/MemberId" }
        ],
        responses: {
          "200": {
            description: "Member removed successfully."
          },
          "403": {
            description: "Caller lacks members:remove permission."
          },
          "404": {
            description: "Member not found."
          },
          "409": {
            description: "Cannot remove the last Owner."
          }
        }
      }
    },
    "/workflow-requests/{id}/attachments": {
      get: {
        summary: "List workflow request attachments",
        tags: ["Attachments"],
        security: [{ bearerAuth: [] }],
        parameters: [{ $ref: "#/components/parameters/WorkflowRequestId" }],
        responses: {
          "200": {
            description:
              "Returns attachment metadata when the caller can access the workflow request."
          },
          "403": {
            description: "Caller cannot access this workflow request."
          },
          "404": {
            description: "Workflow request not found."
          }
        }
      },
      post: {
        summary: "Upload workflow request attachment",
        tags: ["Attachments"],
        security: [{ bearerAuth: [] }],
        parameters: [{ $ref: "#/components/parameters/WorkflowRequestId" }],
        requestBody: {
          required: true,
          content: {
            "multipart/form-data": {
              schema: {
                type: "object",
                required: ["file"],
                properties: {
                  file: {
                    type: "string",
                    format: "binary",
                    description:
                      "PDF, PNG, JPG, DOCX, XLSX, CSV, or TXT up to 10MB"
                  }
                }
              }
            }
          }
        },
        responses: {
          "201": {
            description: "Attachment uploaded successfully."
          },
          "400": {
            description: "Invalid or unsupported file."
          },
          "403": {
            description: "Caller cannot upload to this workflow request."
          },
          "404": {
            description: "Workflow request not found."
          }
        }
      }
    },
    "/attachments/{id}/download": {
      get: {
        summary: "Download attachment file",
        tags: ["Attachments"],
        security: [{ bearerAuth: [] }],
        parameters: [{ $ref: "#/components/parameters/AttachmentId" }],
        responses: {
          "200": {
            description:
              "Streams the file when the caller can access the linked workflow request."
          },
          "403": {
            description: "Caller cannot download this attachment."
          },
          "404": {
            description: "Attachment not found."
          }
        }
      }
    },
    "/attachments/{id}": {
      delete: {
        summary: "Delete attachment",
        tags: ["Attachments"],
        security: [{ bearerAuth: [] }],
        parameters: [{ $ref: "#/components/parameters/AttachmentId" }],
        responses: {
          "200": {
            description:
              "Attachment deleted from object storage and the database."
          },
          "403": {
            description: "Caller cannot delete this attachment."
          },
          "404": {
            description: "Attachment not found."
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
      },
      MemberId: {
        name: "memberId",
        in: "path",
        required: true,
        description: "Organisation membership UUID",
        schema: {
          type: "string",
          format: "uuid"
        }
      },
      WorkflowRequestId: {
        name: "id",
        in: "path",
        required: true,
        description: "Workflow request UUID",
        schema: {
          type: "string",
          format: "uuid"
        }
      },
      AttachmentId: {
        name: "id",
        in: "path",
        required: true,
        description: "Attachment UUID",
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
      },
      UpdateMemberRoleRequest: {
        type: "object",
        required: ["roleId"],
        properties: {
          roleId: {
            type: "string",
            format: "uuid",
            description: "Role id belonging to the same organisation"
          }
        }
      }
    }
  }
} as const;
