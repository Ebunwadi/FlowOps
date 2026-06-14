import type { Organisation } from "../../generated/prisma/client";

export interface OrganisationResponse {
  id: string;
  name: string;
  slug: string;
  role: string;
  createdAt: string;
  updatedAt: string;
}

export interface OrganisationCreatedResponse {
  id: string;
  name: string;
  slug: string;
  role: string;
}

export function toOrganisationCreatedResponse(
  organisation: Organisation,
  roleName: string,
): OrganisationCreatedResponse {
  return {
    id: organisation.id,
    name: organisation.name,
    slug: organisation.slug,
    role: roleName,
  };
}

export function toOrganisationResponse(
  organisation: Organisation,
  roleName: string,
): OrganisationResponse {
  return {
    id: organisation.id,
    name: organisation.name,
    slug: organisation.slug,
    role: roleName,
    createdAt: organisation.createdAt.toISOString(),
    updatedAt: organisation.updatedAt.toISOString(),
  };
}
