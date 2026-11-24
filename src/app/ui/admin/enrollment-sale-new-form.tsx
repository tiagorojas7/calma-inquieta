import { Text } from "../atoms/heading";
import { AdminButton as Button } from "./admin-button";
import { AdminButtonLink } from "./admin-button-link";
import { ADMIN_SHEET, AdminColumns } from "./admin-sections";
import {
  EnrollmentNewMaterials,
  type EnrollmentMaterialChoice,
  type EnrollmentMaterialLine,
} from "./enrollment-new-materials";
import { FormError } from "./form-fields";

export const enrollmentSaleNewCopy = {
  title: "Nueva venta de materiales",
  back: "Volver a la inscripción",
  context: (student: string, workshop: string, month: string, number: string) =>
    `Venta para ${student}, de ${workshop} (${month}). Va bajo la inscripción ${number}.`,
  hint: "Elegí los materiales del catálogo. La venta queda pendiente hasta que confirmes su cobro y no cambia el total de la inscripción.",
  submit: "Crear venta",
  cancel: "Cancelar",
} as const;

const copy = enrollmentSaleNewCopy;

/**
 * A later material purchase of a student, under her monthly record. A native
 * `<form method="post">`, never a router `Form`: the Worker gate denies
 * `/admin/**.data`. Each chosen variant is posted as a
 * `line:<material>:<variant>` quantity, like the manual enrollment.
 */
export function EnrollmentSaleNewForm({
  order,
  materials,
  lines = [],
  errors = {},
  formError,
  cancelHref,
}: {
  order: {
    readonly id: string;
    readonly number: string;
    readonly studentName: string;
    readonly workshopName: string;
    readonly month: string;
  };
  readonly materials: readonly EnrollmentMaterialChoice[];
  /** The lines of a refused submit, shown again. */
  readonly lines?: readonly EnrollmentMaterialLine[];
  readonly errors?: { readonly materials?: string | undefined };
  readonly formError?: string | undefined;
  readonly cancelHref: string;
}) {
  return (
    <form
      method="post"
      noValidate
      aria-label={copy.title}
      className={ADMIN_SHEET}
    >
      <FormError message={formError} />
      <AdminColumns
        start={
          <>
            <Text>
              {copy.context(
                order.studentName,
                order.workshopName,
                order.month,
                order.number,
              )}
            </Text>
          </>
        }
        end={
          <>
            <EnrollmentNewMaterials
              choices={materials}
              initialLines={lines}
              hint={copy.hint}
              error={errors.materials}
            />
          </>
        }
      />
      <div className="flex flex-wrap gap-3">
        <Button type="submit">{copy.submit}</Button>
        <AdminButtonLink href={cancelHref} variant="outline">
          {copy.cancel}
        </AdminButtonLink>
      </div>
    </form>
  );
}
