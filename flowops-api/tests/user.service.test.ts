import type { AuthenticatedUser } from "../src/auth/types";
import {
  mapAuthUserToProfileInput,
  profileNeedsUpdate,
  toUserProfileResponse,
} from "../src/modules/users/user.mapper";
import { syncUserFromKeycloak } from "../src/modules/users/user.service";
import * as userRepository from "../src/modules/users/user.repository";

jest.mock("../src/modules/users/user.repository");

const authUser: AuthenticatedUser = {
  id: "keycloak-user-id-1",
  username: "test.user",
  email: "test.user@flowops.local",
  name: "Test User",
  roles: ["user"],
  clientId: "flowops-web",
};

const profileInput = mapAuthUserToProfileInput(authUser);

const localUser = {
  id: "local-user-id-1",
  keycloakUserId: authUser.id,
  email: profileInput.email,
  firstName: "Test",
  lastName: "User",
  createdAt: new Date("2026-06-08T12:00:00.000Z"),
  updatedAt: new Date("2026-06-08T12:00:00.000Z"),
};

describe("user sync service", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("creates a local profile when the Keycloak user is new", async () => {
    jest.mocked(userRepository.findUserByKeycloakUserId).mockResolvedValue(null);
    jest.mocked(userRepository.createUserFromProfile).mockResolvedValue(localUser);

    const result = await syncUserFromKeycloak(authUser);

    expect(userRepository.createUserFromProfile).toHaveBeenCalledWith(profileInput);
    expect(result).toEqual(localUser);
  });

  it("returns the existing profile without creating a duplicate", async () => {
    jest.mocked(userRepository.findUserByKeycloakUserId).mockResolvedValue(localUser);

    const result = await syncUserFromKeycloak(authUser);

    expect(userRepository.createUserFromProfile).not.toHaveBeenCalled();
    expect(userRepository.updateUserProfile).not.toHaveBeenCalled();
    expect(result).toEqual(localUser);
  });

  it("updates the profile when token claims have changed", async () => {
    const updatedUser = {
      ...localUser,
      email: "admin.user@flowops.local",
      firstName: "Admin",
      lastName: "User",
      updatedAt: new Date("2026-06-08T13:00:00.000Z"),
    };

    jest.mocked(userRepository.findUserByKeycloakUserId).mockResolvedValue(localUser);
    jest.mocked(userRepository.updateUserProfile).mockResolvedValue(updatedUser);

    const result = await syncUserFromKeycloak({
      ...authUser,
      email: "admin.user@flowops.local",
      name: "Admin User",
    });

    expect(userRepository.updateUserProfile).toHaveBeenCalledWith(localUser.id, {
      keycloakUserId: authUser.id,
      email: "admin.user@flowops.local",
      firstName: "Admin",
      lastName: "User",
    });
    expect(result).toEqual(updatedUser);
  });
});

describe("user mapper", () => {
  it("maps a local user and auth session into an API response", () => {
    expect(toUserProfileResponse(localUser, authUser)).toEqual({
      id: localUser.id,
      keycloakUserId: localUser.keycloakUserId,
      email: localUser.email,
      firstName: localUser.firstName,
      lastName: localUser.lastName,
      username: authUser.username,
      roles: authUser.roles,
      createdAt: localUser.createdAt.toISOString(),
      updatedAt: localUser.updatedAt.toISOString(),
    });
  });

  it("detects when profile fields differ from incoming claims", () => {
    expect(
      profileNeedsUpdate(localUser, {
        ...profileInput,
        email: "other@flowops.local",
      }),
    ).toBe(true);

    expect(profileNeedsUpdate(localUser, profileInput)).toBe(false);
  });
});
