import type { ComponentProps } from "react";
import type { Icon } from "../atoms/icon";
import { TrustItem } from "../molecules/trust-item";
type Claim = {
  id: string;
  label: string;
  icon: ComponentProps<typeof Icon>["name"];
};
export function TrustRow({ claims }: { claims: readonly Claim[] }) {
  if (!claims.length) return null;
  return (
    <section aria-label="Confianza">
      <div className="grid gap-6 border-y border-tan-400 py-8 sm:grid-cols-3">
        {claims.map((claim) => (
          <TrustItem key={claim.id} label={claim.label} icon={claim.icon} />
        ))}
      </div>
    </section>
  );
}
