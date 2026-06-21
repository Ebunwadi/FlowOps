import { ValidationError } from "../src/common/errors/httpErrors";
import {
  type TemplateFieldDefinition,
  validateRequestValues,
} from "../src/modules/workflow-requests/workflow-request.validator";

const shortText: TemplateFieldDefinition = {
  id: "11111111-1111-4111-8111-111111111111",
  fieldKey: "item_requested",
  label: "Item requested",
  fieldType: "SHORT_TEXT",
  isRequired: true,
  options: null,
};

const numberField: TemplateFieldDefinition = {
  id: "22222222-2222-4222-8222-222222222222",
  fieldKey: "quantity",
  label: "Quantity",
  fieldType: "NUMBER",
  isRequired: false,
  options: null,
};

const dropdown: TemplateFieldDefinition = {
  id: "33333333-3333-4333-8333-333333333333",
  fieldKey: "urgency",
  label: "Urgency",
  fieldType: "DROPDOWN",
  isRequired: true,
  options: ["Low", "Medium", "High"],
};

const checkbox: TemplateFieldDefinition = {
  id: "44444444-4444-4444-8444-444444444444",
  fieldKey: "accessories",
  label: "Accessories",
  fieldType: "CHECKBOX",
  isRequired: false,
  options: ["Mouse", "Keyboard", "Dock"],
};

const fileUpload: TemplateFieldDefinition = {
  id: "55555555-5555-4555-8555-555555555555",
  fieldKey: "receipt",
  label: "Receipt",
  fieldType: "FILE_UPLOAD",
  isRequired: true,
  options: null,
};

const allFields = [shortText, numberField, dropdown, checkbox];

/** Runs the validator expecting failure and returns the joined detail messages. */
function expectValidationError(
  fields: TemplateFieldDefinition[],
  values: Parameters<typeof validateRequestValues>[1],
): string {
  try {
    validateRequestValues(fields, values);
  } catch (error) {
    expect(error).toBeInstanceOf(ValidationError);
    return ((error as ValidationError).details ?? [])
      .map((detail) => detail.message)
      .join(" | ");
  }

  throw new Error("Expected validation to throw");
}

describe("validateRequestValues", () => {
  it("returns normalised values for a valid submission", () => {
    const result = validateRequestValues(allFields, [
      { workflowFieldId: shortText.id, value: "Laptop" },
      { workflowFieldId: numberField.id, value: 2 },
      { workflowFieldId: dropdown.id, value: "High" },
      { workflowFieldId: checkbox.id, value: ["Mouse", "Dock"] },
    ]);

    expect(result).toEqual([
      { workflowFieldId: shortText.id, value: "Laptop" },
      { workflowFieldId: numberField.id, value: 2 },
      { workflowFieldId: dropdown.id, value: "High" },
      { workflowFieldId: checkbox.id, value: ["Mouse", "Dock"] },
    ]);
  });

  it("rejects values for fields that are not in the template", () => {
    expect(() =>
      validateRequestValues(allFields, [
        { workflowFieldId: shortText.id, value: "Laptop" },
        { workflowFieldId: "99999999-9999-4999-8999-999999999999", value: "x" },
        { workflowFieldId: dropdown.id, value: "High" },
      ]),
    ).toThrow(ValidationError);
  });

  it("rejects missing required fields on submission", () => {
    const messages = expectValidationError(allFields, [
      { workflowFieldId: dropdown.id, value: "High" },
    ]);

    expect(messages).toMatch(/Item requested is required/);
  });

  it("allows missing required fields when enforceRequired is false (draft)", () => {
    const result = validateRequestValues(
      allFields,
      [{ workflowFieldId: numberField.id, value: 5 }],
      { enforceRequired: false },
    );

    expect(result).toEqual([{ workflowFieldId: numberField.id, value: 5 }]);
  });

  it("rejects a value whose type does not match the field type", () => {
    const messages = expectValidationError(allFields, [
      { workflowFieldId: shortText.id, value: "Laptop" },
      { workflowFieldId: numberField.id, value: "two" },
      { workflowFieldId: dropdown.id, value: "High" },
    ]);

    expect(messages).toMatch(/Quantity must be a number/);
  });

  it("rejects dropdown values outside the allowed options", () => {
    const messages = expectValidationError(allFields, [
      { workflowFieldId: shortText.id, value: "Laptop" },
      { workflowFieldId: dropdown.id, value: "Critical" },
    ]);

    expect(messages).toMatch(/Urgency has an invalid selected option/);
  });

  it("rejects checkbox values outside the allowed options", () => {
    const messages = expectValidationError(allFields, [
      { workflowFieldId: shortText.id, value: "Laptop" },
      { workflowFieldId: dropdown.id, value: "High" },
      { workflowFieldId: checkbox.id, value: ["Mouse", "Monitor"] },
    ]);

    expect(messages).toMatch(/Accessories has an invalid selected option/);
  });

  it("rejects duplicate values for the same field", () => {
    const messages = expectValidationError(allFields, [
      { workflowFieldId: shortText.id, value: "Laptop" },
      { workflowFieldId: shortText.id, value: "Desktop" },
      { workflowFieldId: dropdown.id, value: "High" },
    ]);

    expect(messages).toMatch(/Duplicate value submitted/);
  });

  it("rejects invalid date strings", () => {
    const dateField: TemplateFieldDefinition = {
      id: "66666666-6666-4666-8666-666666666666",
      fieldKey: "needed_by",
      label: "Needed by",
      fieldType: "DATE",
      isRequired: true,
      options: null,
    };

    const messages = expectValidationError([dateField], [
      { workflowFieldId: dateField.id, value: "not-a-date" },
    ]);

    expect(messages).toMatch(/Needed by must be a valid date/);
  });

  it("skips FILE_UPLOAD fields without requiring them", () => {
    const result = validateRequestValues([shortText, fileUpload], [
      { workflowFieldId: shortText.id, value: "Laptop" },
    ]);

    expect(result).toEqual([{ workflowFieldId: shortText.id, value: "Laptop" }]);
  });

  it("aggregates multiple field errors into one ValidationError", () => {
    try {
      validateRequestValues(allFields, [
        { workflowFieldId: numberField.id, value: "two" },
        { workflowFieldId: dropdown.id, value: "Critical" },
      ]);
      throw new Error("expected validation to fail");
    } catch (error) {
      expect(error).toBeInstanceOf(ValidationError);
      const details = (error as ValidationError).details ?? [];
      expect(details.length).toBeGreaterThanOrEqual(3);
    }
  });
});
