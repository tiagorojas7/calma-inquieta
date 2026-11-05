import { AdminButton as Button } from "./admin-button";
import { AdminButtonLink } from "./admin-button-link";
import { AdminPageHeader } from "./admin-page";
import { FormError } from "./form-fields";
import { ImageField, type ImageFieldUpload } from "./image-field";
import { materialCatalogCopy } from "./material-catalog-copy";
import { ADMIN_SHEET } from "./admin-sections";

const copy = materialCatalogCopy.photo;
const LIST = "/admin/materiales";

/** One-field screen to set a material's photo without opening its full form. */
export function MaterialPhoto({
  name,
  current,
  upload,
  backHref,
  formError,
}: {
  name: string;
  current?: { assetId: string; src: string; alt: string } | undefined;
  upload: ImageFieldUpload;
  backHref: string;
  formError?: string | undefined;
}) {
  return (
    <section className={ADMIN_SHEET}>
      <AdminPageHeader
        title={`${copy.title}: ${name}`}
        description={copy.intro}
        breadcrumbs={[
          { label: "Panel", href: "/admin" },
          { label: "Materiales", href: LIST },
          { label: name },
        ]}
        back={{ href: backHref, label: copy.cancel }}
      />
      <form method="post" noValidate className="flex flex-col gap-4">
        <FormError message={formError} />
        <ImageField
          name="image"
          label={copy.image}
          upload={upload}
          current={current}
        />
        <div className="flex flex-wrap gap-3">
          <Button type="submit">{copy.save}</Button>
          <AdminButtonLink href={backHref} variant="outline">
            {copy.cancel}
          </AdminButtonLink>
        </div>
      </form>
    </section>
  );
}
