import { data, redirect, useActionData, useLoaderData } from "react-router";
import {
  CONSOLIDATION_FEEDBACK,
  consolidationAction,
  loadConsolidation,
  MATERIALS_PATH,
  withCount,
} from "./enrollment-consolidation-view";
import { failureResponse } from "~/app/admin/failure-response";
import { feedbackCode } from "~/app/admin/feedback-code";
import { parseMaterialFilterKey } from "~/app/admin/material-list-query";
import {
  catalogAnchor,
  catalogSearch,
  materialAnchor,
  parseSearchText,
  studioCards,
  studioSearch,
} from "~/app/admin/material-stock-view";
import { stayOnPage } from "~/app/admin/return-to";
import { servicesContext } from "~/app/context";
import { adminCopy } from "~/app/ui/admin/copy";
import { MaterialsScreen } from "~/app/ui/admin/materials-screen";
import { requireAdmin } from "./require-admin";
import type { Route } from "./+types/materials";

const copy = adminCopy.materiales;
const FEEDBACK = [
  "created",
  "deleted",
  "arrived",
  "kept",
  "unkept",
  ...CONSOLIDATION_FEEDBACK,
] as const;
const MAX_NOTICE_COUNT = 100_000;
const ID_MAX = 64;

export function meta() {
  return [{ title: "Materiales | Panel | Calma Inquieta" }];
}

function countOf(params: URLSearchParams): number | null {
  const count = Number(params.get("n"));
  return Number.isInteger(count) && count > 0 && count <= MAX_NOTICE_COUNT
    ? count
    : null;
}

export async function loader({ request, context }: Route.LoaderArgs) {
  const actor = requireAdmin(request, context);
  const params = new URL(request.url).searchParams;
  const estado = parseMaterialFilterKey(params.get("estado"));
  const query = parseSearchText(params.get("q"));
  const studioQuery = parseSearchText(params.get("estudio"));
  const services = context.get(servicesContext);
  const [listed, consolidation] = await Promise.all([
    services.materials.listWithStock(actor, {
      state: estado === "inactivos" ? "inactive" : "active",
    }),
    loadConsolidation({ request, context }),
  ]);
  if (!listed.ok) throw failureResponse(listed.error);

  const code = feedbackCode(request, FEEDBACK);
  const count = countOf(params);
  const { notice, ...month } = consolidation;
  const created = params.get("nuevo");
  const highlighted =
    code === "created" || code === "kept" || code === "unkept"
      ? listed.value.find((material) => material.id === created)
      : undefined;
  let saved: string | null = null;
  if (highlighted && code === "kept") saved = copy.saved.kept(highlighted.name);
  else if (highlighted && code === "unkept")
    saved = copy.saved.unkept(highlighted.name);
  else if (highlighted) saved = copy.saved.created(highlighted.name);
  else if (code === "arrived" && count !== null)
    saved = copy.saved.arrived(count);
  else if (code === "deleted") saved = copy.saved.deleted;
  else if (notice) saved = copy.saved[notice.kind](notice.count);

  const view = new URLSearchParams();
  if (query !== "") view.set("q", query);
  if (studioQuery !== "") view.set("estudio", studioQuery);
  view.set("mes", month.period);
  if (estado !== "activos") view.set("estado", estado);

  const studio = studioCards(listed.value);
  return {
    ...month,
    studio: studioSearch(studio, studioQuery),
    studioTotal: studio.length,
    studioQuery,
    catalog: {
      ...catalogSearch(listed.value, query),
      total: listed.value.length,
    },
    query,
    estado,
    returnTo: `${MATERIALS_PATH}?${view.toString()}`,
    saved,
    ...(highlighted ? { highlightId: highlighted.id } : {}),
  };
}

const UNITS = /^[0-9]{1,6}$/;
const UNITS_MAX = 100_000;

function text(form: FormData, key: string): string {
  const value = form.get(key);
  return typeof value === "string" ? value : "";
}

/** "Llegaron": adds whole units to one variant through the stock adjustment. */
async function arrived({ request, context }: Route.ActionArgs, form: FormData) {
  const actor = requireAdmin(request, context);
  const materialId = text(form, "materialId").slice(0, ID_MAX);
  const variantId = text(form, "variantId").slice(0, ID_MAX);
  const units = text(form, "units").trim();
  const anchor = materialAnchor(materialId);
  if (!UNITS.test(units) || Number(units) < 1 || Number(units) > UNITS_MAX)
    return data(
      {
        arrivedError: {
          anchor,
          message:
            units !== "" && UNITS.test(units) && Number(units) > UNITS_MAX
              ? copy.stock.unitsTooMany
              : copy.stock.noUnits,
        },
      },
      { status: 422 },
    );
  const adjusted = await context
    .get(servicesContext)
    .materials.adjustStock(actor, materialId, variantId, {
      delta: units,
      reason: copy.arrivedReason,
    });
  if (!adjusted.ok) {
    if (
      adjusted.error.kind === "invalid" ||
      adjusted.error.kind === "insufficient-stock"
    )
      return data(
        { arrivedError: { anchor, message: copy.stock.noUnits } },
        { status: 422 },
      );
    throw failureResponse(adjusted.error);
  }
  if (!form.get("anchor")) form.set("anchor", anchor);
  const to = stayOnPage(form, { fallback: MATERIALS_PATH, code: "arrived" });
  return redirect(withCount(to, Number(units)));
}

/** `to` with the material the owner just marked, so the page can name it. */
function withMaterial(to: string, id: string): string {
  const [base = "", anchor] = to.split("#");
  const joined = `${base}${base.includes("?") ? "&" : "?"}nuevo=${encodeURIComponent(id)}`;
  return anchor === undefined ? joined : `${joined}#${anchor}`;
}

/** "Lo tenemos en el estudio": the yes or no of one material, from the catalog search. */
async function setKept({ request, context }: Route.ActionArgs, form: FormData) {
  const actor = requireAdmin(request, context);
  const materialId = text(form, "materialId").slice(0, ID_MAX);
  const kept = text(form, "kept") === "1";
  const changed = await context
    .get(servicesContext)
    .materials.setKeptInStudio(actor, materialId, kept);
  if (!changed.ok) throw failureResponse(changed.error);
  if (!form.get("anchor")) form.set("anchor", catalogAnchor(materialId));
  const to = stayOnPage(form, {
    fallback: MATERIALS_PATH,
    code: kept ? "kept" : "unkept",
  });
  return redirect(withMaterial(to, materialId));
}

export async function action(args: Route.ActionArgs) {
  const form = await args.request
    .clone()
    .formData()
    .catch(() => null);
  if (form?.get("intent") === "arrived") return arrived(args, form);
  if (form?.get("intent") === "set-kept") return setKept(args, form);
  return consolidationAction(args);
}

export default function AdminMaterials() {
  const loaded = useLoaderData<typeof loader>();
  const result = useActionData<typeof action>();
  return (
    <MaterialsScreen
      {...loaded}
      formError={result && "formError" in result ? result.formError : undefined}
      arrivedError={
        result && "arrivedError" in result ? result.arrivedError : undefined
      }
    />
  );
}
