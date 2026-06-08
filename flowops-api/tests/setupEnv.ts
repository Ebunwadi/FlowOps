process.env.DATABASE_URL ??=
  "postgresql://flowops:flowops@localhost:5432/flowops?schema=public";

jest.mock("../src/config/keycloak", () => ({
  getKeycloakTokenVerifier: jest.fn(() => ({
    verifyAccessToken: jest.fn(),
  })),
  resetKeycloakTokenVerifier: jest.fn(),
}));
