export const PUBLIC_PAGES = [
  { id: "home", path: "/", label: "Inicio", indexable: true },
  { id: "talleres", path: "/talleres", label: "Talleres", indexable: false },
  {
    id: "intensivos",
    path: "/intensivos",
    label: "Intensivos",
    indexable: false,
  },
  {
    id: "eventos-privados",
    path: "/eventos-privados",
    label: "Eventos privados",
    indexable: false,
  },
  {
    id: "quienes-somos",
    path: "/quienes-somos",
    label: "Quiénes somos",
    indexable: true,
  },
  { id: "contacto", path: "/contacto", label: "Contacto", indexable: false },
] as const;
