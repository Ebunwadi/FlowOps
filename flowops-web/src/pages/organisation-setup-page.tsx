import { useState } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { Navigate, useNavigate } from "react-router-dom";

import { createOrganisation } from "@/api/organisations";
import { useOrganisation } from "@/auth/use-organisation";
import { AuthLoadingScreen } from "@/components/auth/auth-loading-screen";
import { Button } from "@/components/ui/button";
import { DismissibleAlert } from "@/components/ui/dismissible-alert";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { clientLogger } from "@/lib/logger";
import {
  organisationSetupSchema,
  slugifyOrganisationName,
  type OrganisationSetupFormValues,
} from "@/schemas/organisation-setup.schema";
import { ApiClientError } from "@/types/api";

const TEAM_SIZE_OPTIONS = [
  { label: "Select team size (optional)", value: "" },
  { label: "1-10", value: "1-10" },
  { label: "11-50", value: "11-50" },
  { label: "51-200", value: "51-200" },
  { label: "201-500", value: "201-500" },
  { label: "500+", value: "500+" },
];

const INDUSTRY_OPTIONS = [
  { label: "Select industry (optional)", value: "" },
  { label: "Education", value: "education" },
  { label: "Healthcare", value: "healthcare" },
  { label: "Finance", value: "finance" },
  { label: "Technology", value: "technology" },
  { label: "Government", value: "government" },
  { label: "Other", value: "other" },
];

export function OrganisationSetupPage() {
  const navigate = useNavigate();
  const {
    organisations,
    organisationsLoading,
    setCurrentOrganisation,
    refreshOrganisations,
  } = useOrganisation();
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [slugEdited, setSlugEdited] = useState(false);

  const {
    register,
    handleSubmit,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<OrganisationSetupFormValues>({
    resolver: zodResolver(organisationSetupSchema),
    defaultValues: {
      name: "",
      slug: "",
      industryType: "",
      teamSize: "",
    },
  });

  if (organisationsLoading) {
    return <AuthLoadingScreen message="Checking your organisation access..." />;
  }

  if (organisations.length > 0) {
    return <Navigate replace to="/dashboard" />;
  }

  const onSubmit = handleSubmit(async (values) => {
    setSubmitError(null);

    try {
      const organisation = await createOrganisation({
        name: values.name,
        slug: values.slug,
      });

      await refreshOrganisations();
      setCurrentOrganisation(organisation);

      clientLogger.info({
        area: "organisation",
        event: "organisation.created",
        message: "Organisation created from setup page",
        context: {
          organisationId: organisation.id,
          organisationName: organisation.name,
          industryType: values.industryType || undefined,
          teamSize: values.teamSize || undefined,
        },
      });

      navigate("/dashboard", { replace: true });
    } catch (error) {
      const message =
        error instanceof ApiClientError
          ? error.message
          : error instanceof Error
            ? error.message
            : "Unable to create organisation.";

      setSubmitError(message);

      clientLogger.error({
        area: "organisation",
        event: "organisation.create_failed",
        message: "Organisation setup form submission failed",
        context: { reason: message },
      });
    }
  });

  return (
    <div className="mx-auto flex min-h-[70vh] max-w-3xl items-center py-8">
      <Card className="w-full border-[#E2E8F0] shadow-sm">
        <CardHeader className="space-y-2">
          <CardTitle className="text-[28px] font-semibold tracking-tight">
            Set up your organisation
          </CardTitle>
          <CardDescription className="text-base text-[#475569]">
            Create a workspace to manage workflows, requests, and team approvals.
            You will be assigned as the organisation owner.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form className="space-y-6" onSubmit={(event) => void onSubmit(event)}>
            <div className="space-y-2">
              <Label htmlFor="name">Organisation name</Label>
              <Input
                id="name"
                placeholder="FlowOps Demo Organisation"
                {...register("name", {
                  onChange: (event) => {
                    if (slugEdited) {
                      return;
                    }

                    setValue(
                      "slug",
                      slugifyOrganisationName(event.target.value),
                      { shouldValidate: event.target.value.trim().length > 0 },
                    );
                  },
                })}
                aria-invalid={Boolean(errors.name)}
              />
              {errors.name ? (
                <p className="text-sm text-red-600">{errors.name.message}</p>
              ) : null}
            </div>

            <div className="space-y-2">
              <Label htmlFor="slug">Organisation slug</Label>
              <Input
                id="slug"
                placeholder="flowops-demo"
                {...register("slug", {
                  onChange: () => {
                    setSlugEdited(true);
                  },
                })}
                aria-invalid={Boolean(errors.slug)}
              />
              <p className="text-sm text-muted-foreground">
                Used in URLs and identifiers. Lowercase letters, numbers, and hyphens
                only.
              </p>
              {errors.slug ? (
                <p className="text-sm text-red-600">{errors.slug.message}</p>
              ) : null}
            </div>

            <div className="grid gap-6 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="industryType">Industry / type</Label>
                <Select id="industryType" {...register("industryType")}>
                  {INDUSTRY_OPTIONS.map((option) => (
                    <option key={option.value || "empty"} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="teamSize">Team size</Label>
                <Select id="teamSize" {...register("teamSize")}>
                  {TEAM_SIZE_OPTIONS.map((option) => (
                    <option key={option.value || "empty"} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </Select>
              </div>
            </div>

            {submitError ? (
              <DismissibleAlert
                messageKey={submitError}
                onDismiss={() => {
                  setSubmitError(null);
                }}
                variant="error"
              >
                {submitError}
              </DismissibleAlert>
            ) : null}

            <Button className="w-full sm:w-auto" disabled={isSubmitting} type="submit">
              {isSubmitting ? "Creating organisation..." : "Create organisation"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
