import { instagramUrl } from "./links";

/** A fact the client may not have confirmed yet; consumers never see it unconfirmed. */
export interface Fact<T> {
  readonly value: T;
  readonly confirmed: boolean;
}

export interface Address {
  /** "Albert Sabin 6079" */
  readonly street: string;
  /** The neighborhood, "Argüello". */
  readonly locality: string;
  /** "Córdoba" */
  readonly city: string;
  readonly region: string;
  readonly countryCode: "AR";
}

export interface WhatsAppLine {
  readonly display: string;
  readonly provisional: boolean;
}

export type WhatsAppTopic =
  "general" | "talleres" | "intensivos" | "eventos-privados";

export interface OpeningHoursSpec {
  readonly days: readonly ("Mo" | "Tu" | "We" | "Th" | "Fr" | "Sa" | "Su")[];
  readonly opens: string;
  readonly closes: string;
}

export interface GeoPoint {
  readonly lat: number;
  readonly lng: number;
}

export interface RawBusinessProfile {
  readonly name: string;
  readonly bajada: string;
  readonly address: Address;
  readonly instagramHandle: string;
  readonly whatsapp: WhatsAppLine;
  /** Prefilled es-AR voseo messages, one per topic. */
  readonly whatsappMessages: Readonly<Record<WhatsAppTopic, string>>;
  readonly email?: Fact<string>;
  readonly phone?: Fact<string>;
  readonly hours?: Fact<readonly OpeningHoursSpec[]>;
  readonly geo?: Fact<GeoPoint>;
}

export interface BusinessProfile extends Omit<
  RawBusinessProfile,
  "email" | "phone" | "hours" | "geo" | "instagramHandle"
> {
  readonly instagram: { readonly handle: string; readonly url: string };
  readonly email?: string;
  readonly phone?: string;
  readonly hours?: readonly OpeningHoursSpec[];
  readonly geo?: GeoPoint;
}

/** Exposes a fact only once the client confirmed it; unconfirmed facts are left out entirely. */
export function publishProfile(raw: RawBusinessProfile): BusinessProfile {
  const { email, phone, hours, geo, instagramHandle, ...rest } = raw;
  return {
    ...rest,
    instagram: { handle: instagramHandle, url: instagramUrl(instagramHandle) },
    ...(email?.confirmed ? { email: email.value } : {}),
    ...(phone?.confirmed ? { phone: phone.value } : {}),
    ...(hours?.confirmed ? { hours: hours.value } : {}),
    ...(geo?.confirmed ? { geo: geo.value } : {}),
  };
}
