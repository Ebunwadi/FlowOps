import * as roleRepository from "../src/modules/roles/role.repository";
import { viewerCanDeleteAttachment } from "../src/modules/attachments/attachment.access";

jest.mock("../src/modules/roles/role.repository");

describe("attachment access", () => {
  const viewer = {
    userId: "660e8400-e29b-41d4-a716-446655440001",
    roleId: "55555555-5555-4555-8555-555555555555",
  };

  beforeEach(() => {
    jest.clearAllMocks();
    jest.mocked(roleRepository.findPermissionKeysByRoleId).mockResolvedValue([]);
  });

  it("allows the uploader to delete their attachment", async () => {
    await expect(
      viewerCanDeleteAttachment(viewer, { uploadedById: viewer.userId }),
    ).resolves.toBe(true);

    expect(roleRepository.findPermissionKeysByRoleId).not.toHaveBeenCalled();
  });

  it("allows users with requests:view-all to delete attachments", async () => {
    jest
      .mocked(roleRepository.findPermissionKeysByRoleId)
      .mockResolvedValue(["requests:view-all"]);

    await expect(
      viewerCanDeleteAttachment(viewer, {
        uploadedById: "880e8400-e29b-41d4-a716-446655440003",
      }),
    ).resolves.toBe(true);
  });

  it("denies delete when the user is neither uploader nor view-all", async () => {
    await expect(
      viewerCanDeleteAttachment(viewer, {
        uploadedById: "880e8400-e29b-41d4-a716-446655440003",
      }),
    ).resolves.toBe(false);
  });
});
