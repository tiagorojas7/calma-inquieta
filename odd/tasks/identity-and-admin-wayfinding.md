# Identity pass (public site) and admin wayfinding

Objective: give the public site real brand identity, life and contrast, and make admin navigation obvious with large direction buttons, icons and color, using the `impeccable` skill (`.agents/skills/impeccable/SKILL.md`).
Branches: `feat/public-identity` (P1), then `feat/admin-wayfinding` (A1). One PR each, chained only if they share files. Owner merges.
Test runner: `pnpm vitest run --project unit --project ui <paths>`.

## Specs

S1. Public site with identity, life and contrast. Owner, verbatim: "lo veo muy plano y demasiado sin vida, necesito un poco mas de indentidad del negocio, por ejemplo en la pagina quienes somos, el texto es muy plano, no es la idea, la idea es meterle un poco mas de vida y contraste a todo. ya que veo todo demasiado simple y realmente aburrido y 0 limpio y profesional. no hay diferencias de textos, la parte de quewres sumarte es horrible, un cuadro marron demasiado simple, no, horrible. hay qque darle mas vidda, con mas detalle que hagan la diferencia, ya sea en lops botones, los subtitulos, en los titulos, en los componentens todo, nada de componentes planos." and "tiene qque ser todo mas lindo e intuitvo en e lsentido del front la ui y la ux". Scope: every public page (Inicio, Talleres list/detail, Intensivos list/detail, Quiénes somos, Contacto, Eventos privados, inscription flow, order page, errors), with special attention to Quiénes somos text hierarchy and the "¿Querés sumarte?" closing band. Impeccable mode: Persuade; command: `bolder` on the incumbent identity (refinement: keep brand, copy and functions; ask before changing factual copy).

S2. Admin wayfinding with direction buttons, icons and color. Owner, verbatim: "En la parte del panel admin, la parte del front la mejoria, agregaria botones de direccion, ya que actualmente los link son con los nombres y se ven demaisado chicos, seria mas intituitov en ese sentido, tambien la diferenciacion con los contrastes y las tipografias, agregaria iconos representativos y un poco mas decolro al panel, para que se logre indetificar correctamente." Impeccable mode: Operate; commands: `colorize` + `layout` + `typeset` on the incumbent admin system (U1 tokens, `StatusChip`, `AdminButton`).

## Tasks

- [ ] P1 — S1: public identity pass (bolder). Route: delegated (one writer; machine runs one agent at a time). Commit: —
- [x] A1 — S2: admin wayfinding (direction buttons, icons, color, type contrast). Route: delegated. Commit: see branch `feat/admin-wayfinding` (feat(admin): wayfinding with direction buttons, area icons and color). Gate observed: format, typecheck, lint, `vitest --project unit --project ui src/app`.

## Log

L1 (2026-11-02, owner, verbatim): "1) Primero quiero hacer algunas modificaciones en el front, lo veo muy plano y demasiado sin vida, necesito un poco mas de indentidad del negocio, por ejemplo en la pagina quienes somos, el texto es muy plano, no es la idea, la idea es meterle un poco mas de vida y contraste a todo. ya que veo todo demasiado simple y realmente aburrido y 0 limpio y profesional. no hay diferencias de textos, la parte de quewres sumarte es horrible, un cuadro marron demasiado simple, no, horrible. hay qque darle mas vidda, con mas detalle que hagan la diferencia, ya sea en lops botones, los subtitulos, en los titulos, en los componentens todo, nada de componentes planos. usa la siguiente skill: / 2) En la parte del panel admin, la parte del front la mejoria, agregaria botones de direccion, ya que actualmente los link son con los nombres y se ven demaisado chicos, seria mas intituitov en ese sentido, tambien la diferenciacion con los contrastes y las tipografias, agregaria iconos representativos y un poco mas decolro al panel, para que se logre indetificar correctamente."

L2 (owner, verbatim): "@.agents/skills/impeccable/SKILL.md esta es la skill, tiene qque ser todo mas lindo e intuitvo en e lsentido del front la ui y la ux"

L3 (context): `impeccable context` reported NO_PRODUCT_MD and SCOPED_EXISTING_ALLOWED; both units are refinements of the incumbent system, so they proceed on the incumbent code and brand evidence (`docs/brand/dmr-calma-inquieta.md`: Ci butterfly monogram, sand/cream base, terracotta and chocolate accents, voseo, warm community voice) and offer `/impeccable init` afterwards.
