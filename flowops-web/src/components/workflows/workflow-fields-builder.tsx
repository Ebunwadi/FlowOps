import { useState } from "react";
import { useFieldArray, useFormContext } from "react-hook-form";

import { Button } from "@/components/ui/button";
import { DismissibleAlert } from "@/components/ui/dismissible-alert";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import {
  createEmptyField,
  FIELD_TYPE_LABELS,
  reorderItems,
  slugifyFieldKey,
  WORKFLOW_FIELD_TYPES,
  type CreateWorkflowTemplateFormValues,
} from "@/schemas/workflow-template.schema";

import { FormFieldError } from "./form-field-error";

const OPTION_FIELD_TYPES = new Set(["DROPDOWN", "RADIO", "CHECKBOX"]);

export function WorkflowFieldsBuilder() {
  const {
    control,
    register,
    watch,
    setValue,
    formState: { errors },
  } = useFormContext<CreateWorkflowTemplateFormValues>();

  const [fieldKeyEditedIds, setFieldKeyEditedIds] = useState<Set<string>>(() => new Set());

  const { fields, append, remove, replace } = useFieldArray({
    control,
    name: "fields",
  });

  const watchedFields = watch("fields");

  const handleAddField = () => {
    append(createEmptyField(fields.length + 1));
  };

  const handleMoveField = (index: number, direction: "up" | "down") => {
    const reordered = reorderItems(watchedFields, index, direction, "fieldOrder");
    replace(reordered);
  };

  const handleRemoveField = (index: number) => {
    remove(index);
    const next = watchedFields
      .filter((_, fieldIndex) => fieldIndex !== index)
      .map((field, fieldIndex) => ({
        ...field,
        fieldOrder: fieldIndex + 1,
      }));
    replace(next);
  };

  return (
    <div className="space-y-4">
      {errors.fields?.root?.message ? (
        <DismissibleAlert
          messageKey={errors.fields.root.message}
          variant="error"
        >
          {errors.fields.root.message}
        </DismissibleAlert>
      ) : null}

      {typeof errors.fields?.message === "string" ? (
        <DismissibleAlert messageKey={errors.fields.message} variant="error">
          {errors.fields.message}
        </DismissibleAlert>
      ) : null}

      {fields.length === 0 ? (
        <div className="rounded-lg border border-dashed px-4 py-8 text-center text-sm text-muted-foreground">
          No form fields yet. Add a field to collect information from requesters.
        </div>
      ) : null}

      <div className="space-y-4">
        {fields.map((field, index) => {
          const fieldErrors = errors.fields?.[index];
          const fieldType = watchedFields[index]?.fieldType ?? "SHORT_TEXT";
          const showOptions = OPTION_FIELD_TYPES.has(fieldType);
          const options = watchedFields[index]?.options ?? [];

          return (
            <div
              key={field.id}
              className="rounded-lg border bg-muted/10 p-4 shadow-sm"
            >
              <div className="mb-4 flex items-center justify-between gap-3">
                <p className="text-sm font-medium text-foreground">
                  Field {index + 1}
                </p>
                <div className="flex flex-wrap gap-1.5">
                  <Button
                    disabled={index === 0}
                    onClick={() => {
                      handleMoveField(index, "up");
                    }}
                    size="sm"
                    type="button"
                    variant="outline"
                  >
                    Move up
                  </Button>
                  <Button
                    disabled={index === fields.length - 1}
                    onClick={() => {
                      handleMoveField(index, "down");
                    }}
                    size="sm"
                    type="button"
                    variant="outline"
                  >
                    Move down
                  </Button>
                  <Button
                    onClick={() => {
                      handleRemoveField(index);
                    }}
                    size="sm"
                    type="button"
                    variant="outline"
                  >
                    Remove
                  </Button>
                </div>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-1.5 sm:col-span-2">
                  <Label htmlFor={`field-label-${index}`}>Label</Label>
                  <Input
                    id={`field-label-${index}`}
                    placeholder="e.g. Item requested"
                    {...register(`fields.${index}.label`, {
                      onChange: (event) => {
                        if (fieldKeyEditedIds.has(field.id)) {
                          return;
                        }

                        setValue(
                          `fields.${index}.fieldKey`,
                          slugifyFieldKey(event.target.value),
                          { shouldDirty: true },
                        );
                      },
                    })}
                  />
                  <FormFieldError message={fieldErrors?.label?.message} />
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor={`field-key-${index}`}>Field key</Label>
                  <Input
                    id={`field-key-${index}`}
                    placeholder="item_requested"
                    {...register(`fields.${index}.fieldKey`, {
                      onChange: () => {
                        setFieldKeyEditedIds((current) => new Set(current).add(field.id));
                      },
                    })}
                  />
                  <FormFieldError message={fieldErrors?.fieldKey?.message} />
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor={`field-type-${index}`}>Field type</Label>
                  <Select
                    id={`field-type-${index}`}
                    {...register(`fields.${index}.fieldType`)}
                  >
                    {WORKFLOW_FIELD_TYPES.map((type) => (
                      <option key={type} value={type}>
                        {FIELD_TYPE_LABELS[type]}
                      </option>
                    ))}
                  </Select>
                  <FormFieldError message={fieldErrors?.fieldType?.message} />
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor={`field-placeholder-${index}`}>Placeholder</Label>
                  <Input
                    id={`field-placeholder-${index}`}
                    placeholder="Optional placeholder text"
                    {...register(`fields.${index}.placeholder`)}
                  />
                  <FormFieldError message={fieldErrors?.placeholder?.message} />
                </div>

                <div className="space-y-1.5 sm:col-span-2">
                  <Label htmlFor={`field-help-${index}`}>Help text</Label>
                  <Input
                    id={`field-help-${index}`}
                    placeholder="Optional guidance shown below the field"
                    {...register(`fields.${index}.helpText`)}
                  />
                  <FormFieldError message={fieldErrors?.helpText?.message} />
                </div>

                <div className="flex items-center gap-2 sm:col-span-2">
                  <input
                    className="h-4 w-4 rounded border-input"
                    id={`field-required-${index}`}
                    type="checkbox"
                    {...register(`fields.${index}.isRequired`)}
                  />
                  <Label htmlFor={`field-required-${index}`}>Required field</Label>
                </div>

                {showOptions ? (
                  <div className="space-y-2 sm:col-span-2">
                    <div className="flex items-center justify-between gap-2">
                      <Label>Options</Label>
                      <Button
                        onClick={() => {
                          setValue(`fields.${index}.options`, [...options, ""]);
                        }}
                        size="sm"
                        type="button"
                        variant="outline"
                      >
                        Add option
                      </Button>
                    </div>
                    {options.length === 0 ? (
                      <p className="text-xs text-muted-foreground">
                        Add at least one option for this field type.
                      </p>
                    ) : null}
                    <div className="space-y-2">
                      {options.map((_, optionIndex) => (
                        <div key={optionIndex} className="flex gap-2">
                          <Input
                            placeholder={`Option ${optionIndex + 1}`}
                            {...register(`fields.${index}.options.${optionIndex}`)}
                          />
                          <Button
                            onClick={() => {
                              setValue(
                                `fields.${index}.options`,
                                options.filter((__, i) => i !== optionIndex),
                              );
                            }}
                            size="sm"
                            type="button"
                            variant="outline"
                          >
                            Remove
                          </Button>
                        </div>
                      ))}
                    </div>
                    <FormFieldError message={fieldErrors?.options?.message} />
                  </div>
                ) : null}
              </div>
            </div>
          );
        })}
      </div>

      <Button onClick={handleAddField} type="button" variant="outline">
        Add field
      </Button>
    </div>
  );
}
