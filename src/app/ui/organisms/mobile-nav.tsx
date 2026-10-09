import { Button } from "../atoms/button";
import { Icon } from "../atoms/icon";

export function MobileNav({
  menuOpen,
  onMenuOpenChange,
}: {
  menuOpen: boolean;
  onMenuOpenChange: (open: boolean) => void;
}) {
  return (
    <Button
      type="button"
      className="relative z-50 lg:hidden"
      aria-expanded={menuOpen}
      aria-controls="menu-principal"
      aria-label={menuOpen ? "Cerrar menú" : "Abrir menú"}
      onClick={() => {
        onMenuOpenChange(!menuOpen);
      }}
    >
      <Icon name={menuOpen ? "close" : "menu"} />
    </Button>
  );
}
