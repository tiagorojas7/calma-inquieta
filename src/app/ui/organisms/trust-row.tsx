import { TrustItem } from "../molecules/trust-item";
type Claim = { id: string; label: string; icon?: string };
export function TrustRow({ claims }: { claims: readonly Claim[] }) {
  if (!claims.length) return null;
  return (
    <section aria-label="Confianza">
      <div>
        {claims.map((claim) => (
          <TrustItem key={claim.id} label={claim.label} icon="arrow" />
        ))}
      </div>
    </section>
  );
}
