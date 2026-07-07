export interface ApiKeySummary {
  id: string;
  organisationId: string;
  name: string;
  keyPrefix: string;
  scopes: unknown;
  lastUsedAt: string | null;
  expiresAt: string | null;
  revokedAt: string | null;
  createdAt: string;
  createdBy: {
    id: string;
    firstName: string | null;
    lastName: string | null;
    email: string;
  };
}

export interface CreatedApiKey extends ApiKeySummary {
  rawKey: string;
}

export interface CreateApiKeyInput {
  name: string;
  expiresAt?: string;
}
