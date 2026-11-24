import { Text } from "../atoms/heading";
import { AdminButton as Button } from "./admin-button";
import { AdminSection } from "./admin-sections";
import { ConfirmedSubmit } from "./confirmed-submit";
import {
  CheckboxField,
  FormError,
  TextAreaField,
  TextField,
} from "./form-fields";
import { ImageField } from "./image-field";
import { uploadIntensiveImage } from "./intensive-form";
import {
  ProjectMaterials,
  type ProjectMaterialChoice,
  type ProjectMaterialLine,
} from "./intensive-project-materials";
import { adminMicrocopy } from "./microcopy";

const copy = adminMicrocopy.intensives.projects;

export type ProjectField =
  "name" | "price" | "deposit" | "description" | "image";
type ProjectErrors = Readonly<Partial<Record<ProjectField, string>>>;

/** What a project form shows: the text typed and the chosen image, if any. */
export interface ProjectFormValues {
  readonly name: string;
  readonly price: string;
  readonly deposit: string;
  readonly description: string;
  readonly image: {
    readonly assetId: string;
    readonly src?: string;
    readonly alt: string;
  } | null;
}

export interface IntensiveProjectCard {
  readonly id: string;
  readonly name: string;
  readonly description: string | null;
  /** Already formatted for reading, e.g. "$ 30.000". */
  readonly amounts: { readonly price: string; readonly deposit: string };
  readonly image: { readonly src: string; readonly alt: string } | null;
  readonly values: ProjectFormValues;
  /** The project's bill of materials, in the order the lines were added. */
  readonly materials: readonly ProjectMaterialLine[];
}

/** A refused submission: which form it came from, what was typed and why it failed. */
export interface RejectedProject {
  /** A project id, or `new` for the add form. */
  readonly target: string;
  readonly values: ProjectFormValues;
  readonly errors: ProjectErrors;
  readonly formError?: string | undefined;
}

/** A refused bill line: which project it belongs to and why it failed. */
export interface RejectedMaterial {
  readonly projectId: string;
  readonly message: string;
}

const EMPTY_VALUES: ProjectFormValues = {
  name: "",
  price: "",
  deposit: "",
  description: "",
  image: null,
};

const ROW =
  "flex flex-col gap-3 rounded-md border border-admin-line p-4 sm:p-5";
const SUMMARY =
  "inline-flex min-h-11 cursor-pointer items-center font-semibold text-clay-800 underline underline-offset-4";

function ProjectForm({
  intent,
  projectId,
  values,
  errors,
  formError,
  submitLabel,
  submitVariant,
}: {
  intent: "project-add" | "project-save";
  projectId?: string;
  values: ProjectFormValues;
  errors: ProjectErrors;
  formError?: string | undefined;
  submitLabel: string;
  submitVariant: "success" | "primary";
}) {
  const image = values.image;
  return (
    <form method="post" noValidate className="mt-3 flex flex-col gap-4">
      <input type="hidden" name="intent" value={intent} />
      {projectId !== undefined && (
        <input type="hidden" name="projectId" value={projectId} />
      )}
      <FormError message={formError} />
      <TextField
        label={copy.form.name}
        name="name"
        defaultValue={values.name}
        error={errors.name}
        autoComplete="off"
      />
      <div className="grid gap-4 sm:grid-cols-2">
        <TextField
          label={copy.form.price}
          name="price"
          inputMode="numeric"
          defaultValue={values.price}
          error={errors.price}
        />
        <TextField
          label={copy.form.deposit}
          name="deposit"
          inputMode="numeric"
          defaultValue={values.deposit}
          error={errors.deposit}
        />
      </div>
      <TextAreaField
        label={copy.form.description}
        name="description"
        rows={3}
        defaultValue={values.description}
        error={errors.description}
      />
      <ImageField
        name="image"
        label={copy.form.image}
        upload={uploadIntensiveImage}
        current={
          image?.src
            ? { assetId: image.assetId, src: image.src, alt: image.alt }
            : undefined
        }
      />
      {errors.image && (
        <p role="alert" className="text-sm text-terracotta-700">
          {errors.image}
        </p>
      )}
      {image && (
        <CheckboxField label={copy.form.removeImage} name="removeImage" />
      )}
      <div>
        <Button type="submit" variant={submitVariant}>
          {submitLabel}
        </Button>
      </div>
    </form>
  );
}

function MoveButton({
  projectId,
  direction,
  name,
  disabled,
}: {
  projectId: string;
  direction: "up" | "down";
  name: string;
  disabled: boolean;
}) {
  return (
    <form method="post">
      <input type="hidden" name="intent" value="project-move" />
      <input type="hidden" name="projectId" value={projectId} />
      <input type="hidden" name="direction" value={direction} />
      <Button
        type="submit"
        variant="outline"
        disabled={disabled}
        aria-label={name}
      >
        {direction === "up" ? copy.moveUp : copy.moveDown}
      </Button>
    </form>
  );
}

/**
 * The selectable projects of a workshop, in display order: add, edit,
 * reorder (up and down) and delete, each a native post form of its own so
 * none nests inside the workshop form. Each project also carries its bill of
 * materials. The route owns the actions and the formatting; this only presents.
 */
export function IntensiveProjects({
  projects,
  materialChoices = [],
  rejected,
  rejectedMaterial,
  error,
}: {
  projects: readonly IntensiveProjectCard[];
  /** The catalog variants an owner may add to a project's list. */
  materialChoices?: readonly ProjectMaterialChoice[];
  rejected?: RejectedProject | undefined;
  rejectedMaterial?: RejectedMaterial | undefined;
  /** A refusal that belongs to no form, such as a project still in use. */
  error?: string | undefined;
}) {
  return (
    <AdminSection title={copy.title} description={copy.description}>
      <FormError message={error} />
      {projects.length === 0 ? (
        <Text tone="muted">{copy.empty}</Text>
      ) : (
        <ul aria-label={copy.title} className="flex flex-col gap-4">
          {projects.map((project, index) => {
            const refused = rejected?.target === project.id ? rejected : null;
            return (
              <li key={project.id} className={ROW}>
                <div className="flex flex-wrap items-center gap-4">
                  {project.image ? (
                    <img
                      src={project.image.src}
                      alt={project.image.alt}
                      className="size-16 rounded-sm object-cover"
                    />
                  ) : (
                    <span className="flex size-16 items-center justify-center rounded-sm bg-sand-100 text-center text-xs text-ink-700">
                      {copy.noImage}
                    </span>
                  )}
                  <div className="flex min-w-0 flex-col gap-1">
                    <p className="font-semibold text-ink-900">{project.name}</p>
                    <p className="text-sm text-ink-700">
                      {copy.amounts(
                        project.amounts.price,
                        project.amounts.deposit,
                      )}
                    </p>
                    {project.description && (
                      <p className="text-sm text-ink-700">
                        {project.description}
                      </p>
                    )}
                  </div>
                </div>
                <div className="flex flex-wrap gap-2">
                  <MoveButton
                    projectId={project.id}
                    direction="up"
                    name={copy.moveUpName(project.name)}
                    disabled={index === 0}
                  />
                  <MoveButton
                    projectId={project.id}
                    direction="down"
                    name={copy.moveDownName(project.name)}
                    disabled={index === projects.length - 1}
                  />
                  <ConfirmedSubmit
                    intent="project-delete"
                    label={copy.delete}
                    buttonName={copy.deleteName(project.name)}
                    title={copy.confirmDelete.title}
                    message={copy.confirmDelete.message(project.name)}
                    tone="destructive"
                    fields={{ projectId: project.id }}
                  />
                </div>
                <ProjectMaterials
                  projectId={project.id}
                  projectName={project.name}
                  lines={project.materials}
                  choices={materialChoices}
                  error={
                    rejectedMaterial?.projectId === project.id
                      ? rejectedMaterial.message
                      : undefined
                  }
                />
                <details open={refused !== null || undefined}>
                  <summary className={SUMMARY}>{copy.editSummary}</summary>
                  <ProjectForm
                    intent="project-save"
                    projectId={project.id}
                    values={refused?.values ?? project.values}
                    errors={refused?.errors ?? {}}
                    formError={refused?.formError}
                    submitLabel={copy.save}
                    submitVariant="primary"
                  />
                </details>
              </li>
            );
          })}
        </ul>
      )}
      <details open={rejected?.target === "new" || undefined}>
        <summary className={SUMMARY}>{copy.addTitle}</summary>
        <ProjectForm
          intent="project-add"
          values={rejected?.target === "new" ? rejected.values : EMPTY_VALUES}
          errors={rejected?.target === "new" ? rejected.errors : {}}
          formError={
            rejected?.target === "new" ? rejected.formError : undefined
          }
          submitLabel={copy.add}
          submitVariant="success"
        />
      </details>
    </AdminSection>
  );
}
