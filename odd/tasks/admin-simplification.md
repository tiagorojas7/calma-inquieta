# Admin simplification

Objective: make the admin simple enough for the owners to publish, charge and handle materials in few steps, and to replace their Excel sheets with clear statistics.
Branches: one chained PR per unit, starting at `feat/admin-simple-visual` (worktree `CalmaInquieta-admin-simple`). Delivery: chained PRs, owner merges in order.
Test runner: `pnpm vitest run --project unit --project ui <paths>`; db tests `pnpm test:db` one directory at a time with `TEST_DATABASE_URL`.

## Specs

S1. Visual system that differentiates. Owner: "la ui no es nada diferenciable, te mezclas mucho mucho con los oclores y los componentes". Approved proposal point 7: light grey page background with white, clearly separated cards; one strong primary button per screen, secondary buttons outlined, red only for delete/cancel; fixed status colors (Por cobrar = orange, Pagado = green, Pedido = blue, Cancelado = grey); larger titles, less text.

S2. Short navigation. Approved point 6: main entries Inicio · Inscripciones · Talleres · Intensivos · Materiales · Asistencia; a "Más" group with Profesoras, Proveedores, Alumnas, Eventos privados, Recordatorios, Estadísticas.

S3. Taller in one screen. Owner: "muy complicado y frustante crear nuevos talleres", "tiene que ser todo seguido y muy simple poder publicar talles". Approved point 1: one "Nuevo taller" page with name, description, teacher, fee, photos, turnos inline (day, time, capacity, "+ otro turno") and optional materials; one button "Publicar y abrir inscripciones" that creates, publishes and opens the current month; slug generated automatically, summary optional, percentage only shown for third-party teachers; next months via "Abrir <mes>" on the taller card, one click, copying the previous month.

S4. Taller photos. Owner: "Tampoco esta la opcion de cargar imaganes en talleres". Upload like intensivos (reuse `/admin/imagenes`, `ImageField`, media module); shown on the public taller card and detail. Needs persistence (new table) and fixing `openMonth` refusing when the previous period has images.

S5. Intensivo in one screen. Approved point 2: name, description, date and time, teacher, price, deposit, capacity, photos; minimum seats defaults to 1 and policy text to a standard text (both still editable under "Opciones avanzadas"); one button "Publicar"; save goes to the intensivo detail, not the list.

S6. Charging from the list. Owner: "para cobrar, es un quilombo barbaro", "Lo mismo con las inscripciones, tiene que ser mas dinamico, sin tener que vovler atras". Approved point 3: tabs Por cobrar · Pagadas · Canceladas; each "Por cobrar" card has "Marcar pagado" with amount prefilled to the order total and today's date, one click, staying on the list; cancel from the same card.

S7. Materials in one screen. Owner: "En la parte de materiales, siento que es muy tedioso todo", "no me deja poner la opcion de materiales recibidos y que materia lcorresponde a cada alumna, solo me dice el resumen". Approved point 4: one "Materiales" screen with "Para pedir" (by supplier, "Copiar pedido por WhatsApp", "Ya lo pedí") and "Para entregar" (each student with her own materials, "Recibido" per student order and "Marcar todo recibido"); in the main nav.

S8. Inicio and statistics that replace Excel. Owner: "las estadisiticas tiene que ser claras, por que esto viene a remplazar los excel que tenian, asi que necesito una buenas estructura de todo, lo que espero es algo bien organziado, facil de usar". Approved point 5: Inicio shows "Hoy tenés que…" lines, each with its button (pending charges, materials to ask, month to open). Statistics: month selector, big summary figures (cobrado, ocupación, a pagar a profesoras, alumnas que repiten) and a well-structured per-taller/intensivo table like a spreadsheet. Assumption (not requested verbatim): a "Descargar planilla" CSV export of that month's tables, because it replaces Excel.

S9. Material photo in the public selector. Owner: "a la hora de que el cliente eliga el material para el taller mensual, tiene que tener la posiblidad de ver la imagen del materia lque va a pedir, que va a ser la misma imagen que se cargue desde el panel". The public enrollment materials step (`enrollment-materials-page.tsx`) shows each material's image uploaded in the admin material form (`image_asset_id`/`image_alt`), with its alt text, and the variant color swatch when set; a neutral placeholder when the material has no image. Today the selector shows no image at all.

## Tasks

- [x] U1 — S1, S2: admin visual system and short nav. Route: delegated (sequential, RAM). Commit: see PR feat/admin-simple-visual
- [ ] U2 — S3: taller one-screen create + publish + open month, "Abrir <mes>" one click. Route: delegated. Commit: —
- [ ] U3 — S4: taller photos (migration). Risk: item 1. Route: delegated + independent verifier. Commit: —
- [ ] U4 — S5: intensivo one screen. Route: delegated. Commit: —
- [ ] U5 — S6: charging from the list. Route: delegated. Commit: —
- [ ] U6 — S7: materials screen with per-student delivery. Route: delegated. Commit: —
- [ ] U7 — S8: Inicio "Hoy tenés que…" and Excel-replacing statistics. Route: delegated. Commit: —
- [ ] U8 — S9: material photo in the public materials selector. Route: delegated. Commit: —

Route evidence: one bounded writer per unit because each unit is several minutes of work and the parent context is past the long-session backstop; units run one after another because the machine has 7.8 GB RAM.

## Log

L1 (2026-10-30, owner, verbatim): "La verdad, siento qu es muy complicado y frustante crear nuevos talleres, inttesivos y demas, tiene que ser mucho mas cumple, hay muchisimas funciones que la verdad que te marean y no sabes que hace cada una, lo mismo para cobrar, es un quilombo barbaro, al pedir materiales tambien, la idea es que sea simple, que las dueñas lo puedan manejar simple y en pcoos passo ya puedan cobrar, publicar y ver los materiales, no puede haber tantos pasos y que sean tan confusos, tiene que ser todo seguido y muy simple poder publicar talles, etc. Lo mismo con las inscripciones, tiene que ser mas dinamico, sin tener que vovler atras, todo mas simple. En la parte de materiales, siento que es muy tedioso todo, hay que simplificarlo muchisimo, para que sea sencilllo y facil. Tampoco me deja poner la opcion de materiales recibidos y que materia lcorresponde a cada alumna, solo me dice el resumen., las estadisticas son confusas tambien. NECESITO REALMETNE QUE SEA TODO MAS SIMPLE, INTUITIVO Y ORDENADO, ES UN QUILOMBO BARBARO ESTO ,se mezcla todo y es muy tedioso utilziar este panbel, cuando el obejtivop era que sea simple / Tampoc esta la opcion de cargar imaganes en talleres,"

L2 (owner, verbatim): "perfecto, construila rapido si ntanta vuelta cuando la apruebe, lo mismo para todas las otras secciones, es mu ytedioso realmente, ademas la ui no es nada diferenciable, te mezclas mucho mucho con los oclores y los componentes. realmente tiene que ser todo mas simple y facil de utilziar"

L3 (owner approval, verbatim): "perfecto, haz los cambios, que sea todo mas intuitivo, facil de usar, las estadisiticas tiene que ser claras, por que esto viene a remplazar los excel que tenian, asi que necesito una buenas estructura de todo, lo que espero es algo bien organziado, facil de usar"

L5 (owner, verbatim): "perfecto, esper oque la ui este mucho mas ordenada e intutiva de utilizar, por que actualmente no se entiende bien, y otra cosa, a la hora de que el cliente eliga el material para el taller mensual, tiene que tener la posiblidad de ver la imagen del materia lque va a pedir, que va a ser la misma imagen que se cargue desde el panel,"

L4 (mapping evidence): taller from zero to enrollable is about 10 clicks over 5 page loads (workshop, turno, publish, open month, publish month); `parseWorkshopDraft` hardcodes `images: []` and no workshop image table exists; payment confirm only on order detail with amount not prefilled; order lines have no status and "received" is per order only (`markMaterialsReceived`), no bulk; intensivo create/edit redirect to the list.
