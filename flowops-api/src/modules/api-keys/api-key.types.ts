export interface RequestApiKeyContext {
  id: string;
  name: string;
  organisationId: string;
  keyPrefix: string;
  scopes: unknown;
}

export interface ApiKeyAuthenticationResult {
  apiKey: RequestApiKeyContext;
  organisation: {
    id: string;
    name: string;
    slug: string;
    createdById: string;
    createdAt: Date;
    updatedAt: Date;
  };
}
