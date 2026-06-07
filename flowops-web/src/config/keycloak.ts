import Keycloak from "keycloak-js";

import { env } from "@/config/env";

/** Shared Keycloak client instance for the FlowOps web application. */
export const keycloak = new Keycloak({
  url: env.keycloakUrl,
  realm: env.keycloakRealm,
  clientId: env.keycloakClientId,
});

/** Minimum remaining token lifetime (seconds) before a silent refresh is attempted. */
export const TOKEN_MIN_VALIDITY_SECONDS = 30;

let initPromise: Promise<boolean> | null = null;

/**
 * Initialise Keycloak once. React StrictMode may mount effects twice in
 * development, so the init promise is cached to avoid duplicate redirects.
 */
export function initKeycloak(): Promise<boolean> {
  if (!initPromise) {
    initPromise = keycloak.init({
      onLoad: "check-sso",
      pkceMethod: "S256",
      // Avoid third-party cookie issues during local development.
      checkLoginIframe: false,
      silentCheckSsoRedirectUri: `${window.location.origin}/silent-check-sso.html`,
    });
  }

  return initPromise;
}
