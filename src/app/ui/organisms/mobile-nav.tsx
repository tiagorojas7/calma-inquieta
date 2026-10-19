import { Icon } from "../atoms/icon";

/**
 * Menu toggle: also the close button of the full-screen overlay (it stays
 * above it, z-50, and swaps its icon and label when open).
 */
export function MobileNav({
  menuOpen,
  onMenuOpenChange,
}: {
  menuOpen: boolean;
  onMenuOpenChange: (open: boolean) => void;
}) {
  return (
    <button
      type="button"
      className="relative z-50 inline-flex size-11 items-center justify-center rounded-full text-ink-900 transition-[background-color,transform] duration-200 ease-calm hover:bg-sand-200 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-clay-800 motion-safe:active:scale-95 lg:hidden"
      aria-expanded={menuOpen}
      aria-controls="menu-principal"
      aria-label={menuOpen ? "Cerrar menú" : "Abrir menú"}
      onClick={() => {
        onMenuOpenChange(!menuOpen);
      }}
    >
      <Icon name={menuOpen ? "close" : "menu"} />
    </button>
  );
}
