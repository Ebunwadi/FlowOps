import { ConflictError, NotFoundError } from "../src/common/errors/httpErrors";
import { prisma } from "../src/config/database";
import { createWorkflowTemplate } from "../src/modules/workflows/workflow-template.service";
import * as workflowTemplateRepository from "../src/modules/workflows/workflow-template.repository";
import * as roleRepository from "../src/modules/roles/role.repository";

jest.mock("../src/modules/workflows/workflow-template.repository");
jest.mock("../src/modules/roles/role.repository");
jest.mock("../src/config/database", () => ({
  prisma: {
    $transaction: jest.fn(),
  },
}));

describe("workflow template service", () => {
  const organisationId = "550e8400-e29b-41d4-a716-446655440000";
  const createdById = "770e8400-e29b-41d4-a716-446655440002";
  const managerRoleId = "11111111-1111-4111-8111-111111111111";
  const itRoleId = "22222222-2222-4222-8222-222222222222";

  const createInput = {
    name: "Equipment Request",
    description: "Used by staff to request work equipment.",
    category: "IT",
    fields: [
      {
        label: "Item requested",
        fieldKey: "item_requested",
        fieldType: "SHORT_TEXT" as const,
        isRequired: true,
        fieldOrder: 1,
      },
      {
        label: "Reason",
        fieldKey: "reason",
        fieldType: "LONG_TEXT" as const,
        isRequired: true,
        fieldOrder: 2,
      },
    ],
    steps: [
      {
        name: "Manager Approval",
        stepOrder: 1,
        approverRoleId: managerRoleId,
        slaHours: 48,
        allowDelegation: true,
      },
      {
        name: "IT Approval",
        stepOrder: 2,
        approverRoleId: itRoleId,
        slaHours: 72,
        allowDelegation: false,
      },
    ],
  };

  const createdTemplate = {
    id: "99999999-9999-4999-8999-999999999999",
    name: createInput.name,
    status: "DRAFT" as const,
    isActive: false,
    fieldsCount: 2,
    stepsCount: 2,
  };

  beforeEach(() => {
    jest.clearAllMocks();
    jest
      .mocked(workflowTemplateRepository.findWorkflowTemplateByNameInOrganisation)
      .mockResolvedValue(null);
    jest.mocked(roleRepository.findRolesByIdsInOrganisation).mockResolvedValue([
      { id: managerRoleId, name: "Manager" },
      { id: itRoleId, name: "Admin" },
    ]);
    jest.mocked(prisma.$transaction).mockImplementation(async (callback) =>
      callback({} as never),
    );
    jest
      .mocked(workflowTemplateRepository.createWorkflowTemplateWithRelations)
      .mockResolvedValue(createdTemplate);
  });

  it("creates a workflow template with fields and steps", async () => {
    const result = await createWorkflowTemplate(
      organisationId,
      createdById,
      createInput,
    );

    expect(result).toEqual(createdTemplate);
    expect(
      workflowTemplateRepository.createWorkflowTemplateWithRelations,
    ).toHaveBeenCalledWith(
      {
        organisationId,
        createdById,
        ...createInput,
      },
      expect.anything(),
    );
    expect(roleRepository.findRolesByIdsInOrganisation).toHaveBeenCalledWith(
      organisationId,
      [managerRoleId, itRoleId],
    );
  });

  it("throws when the template name already exists in the organisation", async () => {
    jest
      .mocked(workflowTemplateRepository.findWorkflowTemplateByNameInOrganisation)
      .mockResolvedValue({ id: "existing-template-id" });

    await expect(
      createWorkflowTemplate(organisationId, createdById, createInput),
    ).rejects.toThrow(ConflictError);
  });

  it("throws when an approver role does not belong to the organisation", async () => {
    jest.mocked(roleRepository.findRolesByIdsInOrganisation).mockResolvedValue([
      { id: managerRoleId, name: "Manager" },
    ]);

    await expect(
      createWorkflowTemplate(organisationId, createdById, createInput),
    ).rejects.toThrow(NotFoundError);
  });

  it("throws when field orders are duplicated", async () => {
    await expect(
      createWorkflowTemplate(organisationId, createdById, {
        ...createInput,
        fields: [
          createInput.fields[0],
          {
            ...createInput.fields[1],
            fieldKey: "notes",
            fieldOrder: 1,
          },
        ],
      }),
    ).rejects.toThrow("Duplicate fieldOrder value: 1");
  });
});
