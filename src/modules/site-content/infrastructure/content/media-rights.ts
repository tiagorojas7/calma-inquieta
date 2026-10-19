import type { ExcludedSource, RightsEntry } from "../../domain/media";

/** The studio owner's grant for the four face photos (owner decision OD-6). */
const OWNER_CONSENT = {
  by: "Studio owner, relayed by the project owner",
  recordedOn: "2026-10-16",
} as const;

const facesGranted = (sourceId: string): RightsEntry => ({
  sourceId,
  people: "faces",
  consent: "granted",
  consentSource: OWNER_CONSENT,
});

const handsOnly = (sourceId: string): RightsEntry => ({
  sourceId,
  people: "hands",
  consent: "not-required",
});

const noPeople = (sourceId: string): RightsEntry => ({
  sourceId,
  people: "none",
  consent: "not-required",
});

/**
 * One row per client source id, shared by every crop of that source. A source
 * without a row is pending: its assets are not publishable (see `isPublishable`).
 * The three excluded sources never get a row.
 */
export const MEDIA_RIGHTS: readonly RightsEntry[] = [
  // Recognizable faces: granted by the studio owner. Only wa0030 is placed here.
  facesGranted("img-20261015-wa0030"),
  facesGranted("img-20261015-wa0018"),
  facesGranted("img-20260926-144641667-hdr"),
  facesGranted("img-20260801-182047855-hdr"),
  // Hands only, including the catalog picks that this change does not place.
  handsOnly("img-20261007-194043183-hdr"),
  handsOnly("img-20260411-wa0106"),
  handsOnly("img-20261015-wa0029"),
  handsOnly("img-20260325-wa0013"),
  handsOnly("img-20260411-wa0110"),
  handsOnly("img-20260306-wa0071"),
  // Every other placed source shows no people.
  noPeople("img-20260819-174607732-hdr"),
  noPeople("img-20260530-wa0021"),
  noPeople("img-20260530-wa0026"),
  noPeople("img-20260419-wa0044"),
  noPeople("img-20260530-wa0032"),
  noPeople("img-20260709-wa0009"),
  noPeople("img-20260912-131514909-hdr"),
  noPeople("img-20260511-wa0019"),
  noPeople("img-20260411-wa0013"),
  noPeople("img-20260530-wa0019"),
];

/** Sources that may never be registered, whatever the ledger says (owner decisions OD-5 and OD-7). */
export const EXCLUDED_SOURCES: readonly ExcludedSource[] = [
  {
    sourceId: "img-20260808-130700502-hdr-portrait",
    reason: "not-the-owner",
    decidedOn: "2026-10-16",
  },
  {
    sourceId: "img-20260926-153632786-hdr",
    reason: "minor",
    decidedOn: "2026-10-16",
  },
  {
    sourceId: "VID_20260717_155248707",
    reason: "minor",
    decidedOn: "2026-10-16",
  },
];
