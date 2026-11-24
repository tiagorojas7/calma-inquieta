import type {
  IntensiveRequestGroup,
  IntensiveRequestRow,
} from "./intensive-requests";

/** Which reservations the owner looks at: every one, or one state. */
export type ReservationFilter =
  "todas" | "por-confirmar" | "deben-saldo" | "pagadas";

export const RESERVATION_FILTERS: readonly ReservationFilter[] = [
  "todas",
  "por-confirmar",
  "deben-saldo",
  "pagadas",
];

/** How many people a reservation list shows before asking for a search. */
export const RESERVATION_PAGE = 6;

/** The anchor of the list's own controls, kept after a filter or a search. */
export const RESERVATIONS_ANCHOR = "reservas";

export interface ReservationBrowse {
  readonly filter: ReservationFilter;
  /** What the owner typed, as typed. */
  readonly search: string;
  /** The request just acted on: always shown, whatever the filter. */
  readonly focus: string | null;
}

export const DEFAULT_BROWSE: ReservationBrowse = {
  filter: "todas",
  search: "",
  focus: null,
};

const MAX_SEARCH = 80;
const FOCUS = /^[\w-]{1,64}$/;

/** `?estado=`, `?buscar=` and `?ver=`; anything unknown falls back to every one. */
export function parseReservationBrowse(
  params: URLSearchParams,
): ReservationBrowse {
  const asked = params.get("estado");
  const filter = RESERVATION_FILTERS.find((value) => value === asked);
  const focus = params.get("ver");
  return {
    filter: filter ?? "todas",
    search: (params.get("buscar") ?? "").trim().slice(0, MAX_SEARCH),
    focus: focus !== null && FOCUS.test(focus) ? focus : null,
  };
}

export type ActiveStatus = Exclude<
  IntensiveRequestGroup["status"],
  "cancelled"
>;

export interface BrowsedCard {
  readonly status: ActiveStatus;
  readonly row: IntensiveRequestRow;
}

/** A confirmed request that still owes its balance. */
export function owesBalance(row: IntensiveRequestRow): boolean {
  return row.balance === null && row.balanceDue !== null;
}

function filterOf(card: BrowsedCard): Exclude<ReservationFilter, "todas"> {
  if (card.status === "pending_confirmation") return "por-confirmar";
  return owesBalance(card.row) ? "deben-saldo" : "pagadas";
}

/** Lower case, without accents, so "nunez" finds "Núñez". */
function fold(text: string): string {
  return text
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .toLocaleLowerCase("es-AR");
}

export interface BrowsedReservations {
  /** The cards to show, the focused one first when it would be hidden. */
  readonly cards: readonly BrowsedCard[];
  /** Active reservations per filter. */
  readonly counts: Readonly<Record<ReservationFilter, number>>;
  /** Active reservations that match the filter and the search. */
  readonly matching: number;
}

/**
 * The active reservations (pending first, then confirmed) that match the
 * filter and the search, cut to one page. The request just acted on stays in
 * view so the page comes back to it.
 */
export function browseReservations(
  groups: readonly IntensiveRequestGroup[],
  browse: ReservationBrowse,
): BrowsedReservations {
  const all: BrowsedCard[] = groups.flatMap((group) =>
    group.status === "cancelled"
      ? []
      : group.rows.map((row) => ({ status: group.status, row })),
  ) as BrowsedCard[];
  const counts: Record<ReservationFilter, number> = {
    todas: all.length,
    "por-confirmar": 0,
    "deben-saldo": 0,
    pagadas: 0,
  };
  for (const card of all) counts[filterOf(card)] += 1;

  const query = fold(browse.search);
  const matches = all.filter(
    (card) =>
      (browse.filter === "todas" || filterOf(card) === browse.filter) &&
      (query === "" ||
        [card.row.name, card.row.email, card.row.projectName ?? ""].some(
          (text) => fold(text).includes(query),
        )),
  );
  const page = matches.slice(0, RESERVATION_PAGE);
  const focused = all.find((card) => card.row.id === browse.focus);
  const cards = focused && !page.includes(focused) ? [focused, ...page] : page;
  return { cards, counts, matching: matches.length };
}

/** Whether the list needs its filters and search: many people, or one asked. */
export function needsBrowsing(
  counts: Readonly<Record<ReservationFilter, number>>,
  browse: ReservationBrowse,
): boolean {
  return (
    counts.todas > RESERVATION_PAGE ||
    browse.filter !== "todas" ||
    browse.search !== ""
  );
}

/**
 * The list's address with a browse state: the page's own query first, then
 * `estado`, `buscar` and `ver`, each only when it differs from the default.
 */
export function browseHref(
  basePath: string,
  browse: ReservationBrowse,
  anchor?: string,
): string {
  const [path = "", query = ""] = basePath.split("?");
  const params = new URLSearchParams(query);
  for (const name of ["estado", "buscar", "ver"]) params.delete(name);
  if (browse.filter !== "todas") params.set("estado", browse.filter);
  if (browse.search !== "") params.set("buscar", browse.search);
  if (browse.focus !== null) params.set("ver", browse.focus);
  const text = params.toString();
  return `${path}${text === "" ? "" : `?${text}`}${anchor ? `#${anchor}` : ""}`;
}

/** The page's own query fields, for a native search form that keeps them. */
export function baseFields(basePath: string): readonly [string, string][] {
  const [, query = ""] = basePath.split("?");
  return [...new URLSearchParams(query).entries()].filter(
    ([name]) => !["estado", "buscar", "ver"].includes(name),
  );
}
