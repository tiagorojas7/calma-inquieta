# Calma Inquieta: visual analysis of the 20 proposal images

Source: accepted proposal "PROPUESTA COMERCIAL Y PRESUPUESTO", V1.0, 30/09/2026, prepared by TR_WebStudio x Linkealo. Text was extracted to `proposal.md`; images to `word/media/image1.png` ... `image20.png`.

Scope rules applied in this analysis:
- WhatsApp Business API is OUT of scope. Automated notifications will go by email instead.
- WhatsApp click-to-chat buttons with a prefilled message (wa.me links) are fine and are NOT the API.
- Anything that needs API-only behavior (automated sending, Meta-approved templates, campaigns, bulk sending, delivery tracking) is tagged **[API-FLAG]**.

Delta tags used below: **[NEW]** shown in the image but absent from the proposal text; **[CONFLICT]** contradicts the text or another image; **[SCOPE]** touches something the proposal excludes; **[DATA]** internal inconsistency in example data; **[LOCALE]** wrong country, currency or language convention for an Argentine business; **[MISSING]** the text promises it but the image does not show it.

---

## 0. Method, conventions and caveats

- All 20 PNGs were viewed one by one. Images 4 to 20 are 1672 x 941 px desktop canvases (16:9), except image10 at 1672 x 940. Image1 is 784 x 784 (RGBA, circular badge), image2 is 1174 x 375 (RGBA), image3 is 1080 x 1080.
- In the DOCX each mockup is placed full-width (6,629,400 EMU = 7.25 in x 4.08 in), one per row. There are no captions, figure numbers or "illustrative" disclaimers anywhere in the proposal. Mapping to screens below is by content only.
- Document order: image4 sits right after the WhatsApp Business API section. The gallery "IMAGENES DE LA PROPUESTA" then runs: 5, 9, 6, 7, 8, 13, 10, 12 (public site), then 11, 16, 15, 14, 17, 18, 19, 20 (admin).
- Hex values were measured by sampling flat-colored regions of the PNGs (error of a few RGB units). Photo regions were not sampled. Font families, radii and spacing are visual estimates at the 1672 px canvas and are labelled "approx." or "unclear".
- No mobile layout exists in the set. The only phone is a WhatsApp preview inside image4.
- The screens look like concept renders, not production specs: the same people, prices, schedules and IDs change from screen to screen (see section 3.5). This is an inference from the visible inconsistencies.

---

## 1. Index

| Image | Doc position | Classification | Frame | Proposal item illustrated |
|---|---|---|---|---|
| image1 | Cover header, slot 1 | Logo: TR_WebStudio (agency) | none, circular badge | "Preparado por TR_WebStudio x Linkealo" |
| image2 | Cover header, slot 2 | Logo: Linkealo (NFC/QR signage partner) | none | same |
| image3 | Cover header, slot 3 | Logo: Calma Inquieta monogram (client) | none, square | Cliente |
| image4 | After WhatsApp Business API section | Admin module: Recordatorios ("Envío de recordatorios") | desktop, with embedded phone preview | Recordatorios; optional API add-on |
| image5 | Gallery 1 | Public page: Inicio | desktop | Web pública, Inicio |
| image9 | Gallery 2 | Public page: Talleres mensuales (listing) | desktop | Talleres mensuales |
| image6 | Gallery 3 | Public page: monthly taller detail plus enrollment form (Encordado) | desktop | Talleres mensuales detail; flow steps 1 to 3 |
| image7 | Gallery 4 | Public page: material selection plus order summary | desktop | Flow steps 3 to 6 |
| image8 | Gallery 5 | Public page: Workshops (listing plus expanded card) | desktop | Workshops |
| image13 | Gallery 6 | Public page: Eventos privados | desktop | Eventos privados |
| image10 | Gallery 7 | Public page: "Solicitud registrada" confirmation | desktop | Flow steps 6 to 10 |
| image12 | Gallery 8 | Public page: Quiénes somos (with an embedded Contacto section) | desktop | Quienes somos / Contacto |
| image11 | Gallery 9 | Admin module: Resumen general | desktop | Panel general |
| image16 | Gallery 10 | Admin module: Gestión de alumnas (list plus drawer) | desktop | Gestión de alumnas |
| image15 | Gallery 11 | Admin module: student record (ficha) | desktop | Gestión de alumnas; Cuotas y asistencia |
| image14 | Gallery 12 | Admin module: Talleres y workshops (list plus edit drawer) | desktop | Talleres y workshops |
| image17 | Gallery 13 | Admin module: Pedidos de materiales (kanban plus provider order) | desktop | Materiales |
| image18 | Gallery 14 | Admin module: Métricas del negocio | desktop | Indicadores; Profesores |
| image19 | Gallery 15 | Admin module: Catálogo de materiales (grid plus edit drawer) | desktop | Materiales |
| image20 | Gallery 16 | Admin module: Eventos privados (list plus detail drawer) | desktop | Eventos privados |

No image is a signage piece (QR/NFC) and none is a pricing graphic.

---

## 2. Per-image analysis

### image1.png: Tr_WebStudio logo

1. **Id / class / frame:** image1, logo (agency TR_WebStudio). Cover header slot 1, shown about 0.98 in square. No device frame. Circular badge with transparent corners.
2. **Layout:** circular navy badge. Top half: large white "TR" monogram (T and R interlocked with a diagonal cut). Middle: wordmark. Below: tagline. Bottom: a rounded blue bar.
3. **UI components:** none (static brand asset).
4. **Visible copy:** "Tr_WebStudio"; "AGENCIA DE DISEÑO WEB".
5. **Data shown:** none.
6. **Visual design:** navy about #090E21 (surrounding RGBA edge #0A0F22), white lettering, blue bar about #3766B8. Heavy geometric sans (Montserrat-like, unclear). Edges look slightly soft (low-resolution source). Flat, corporate-tech tone.
7. **Deltas:** agency branding, not client branding. Its navy/blue palette is unrelated to Calma Inquieta and must stay out of the site design system. Consistent with "Preparado por TR_WebStudio x Linkealo". No other delta.

### image2.png: Linkealo logo

1. **Id / class / frame:** image2, logo (partner Linkealo, maker of the QR/NFC signage). Cover header slot 2, about 2.05 x 0.65 in. No device frame.
2. **Layout:** left, an icon: a navy rounded "L" shape fused with a blue rounded square that holds a pointing hand and signal arcs (tap/NFC symbol). Right, the wordmark "Linkealo" with a blue chevron notch in the "k/e" join.
3. **UI components:** none.
4. **Visible copy:** "Linkealo".
5. **Data shown:** none.
6. **Visual design:** navy about #0B112A on white. Icon blue gradient from about #017FFE (top) to about #0E32FE (bottom). Bold geometric sans, large rounded corners. Modern tech tone.
7. **Deltas:** partner brand, not part of the client's design system. It is the only visual in the whole set related to the "Carteleria interior" deliverable (two QR/NFC signs); no sign mockup exists.

### image3.png: Calma Inquieta monogram

1. **Id / class / frame:** image3, logo (client, Calma Inquieta). Cover header slot 3, about 1.16 in square. No device frame.
2. **Layout:** square sand background with a centered black calligraphic monogram. A large script "C" merges with a butterfly wing on the right, forming an "i" stem with a dot. No wordmark inside this file.
3. **UI components:** none.
4. **Visible copy:** none (monogram only).
5. **Data shown:** none.
6. **Visual design:** background #E6D7C4, strokes #000000. Monoline script with thick-thin contrast, single-line wing outline. Elegant, handwritten, delicate, feminine tone.
7. **Deltas:** the background sand #E6D7C4 matches the sidebar and header tones used in the mockups, so it is the brand's base color. The monogram appears in the mockups on a sand tile (image6, 7, 8, 13) or bare (others), next to either a spaced-caps wordmark "CALMA INQUIETA" or a serif "Calma Inquieta" (image16, 18). Which lockup is official is not stated.

### image4.png: Admin, Recordatorios ("Envío de recordatorios")

1. **Id / class / frame:** image4, admin module Recordatorios. Desktop frame; contains an iPhone-style frame as a WhatsApp preview. Placed after the WhatsApp Business API section, so it visualizes that add-on.
2. **Layout (top to bottom):**
   - Left sidebar: logo, 8 nav items, footer wordmark.
   - Top bar: global search, notification bell with dot, user chip.
   - Title block: H1 plus subtitle.
   - Three cards in a row: (a) "Filtros" plus a recipient checklist, (b) "Mensaje" composer, (c) "Vista previa en WhatsApp" with a phone frame.
3. **UI components:** sidebar nav (active item = filled brown pill with white text); search input; bell with badge dot; avatar chip with dropdown; three labelled dropdowns; text link "Limpiar filtros"; search field; checkbox list with initials avatars and a vertical scrollbar; four template chips (one selected); textarea with character counter "178/1000" and link "Restablecer plantilla"; four variable chips (click to insert); hint box with lightbulb icon; full-width primary button with paper-plane icon; info note with "i" icon; phone mockup with WhatsApp chat header, green outgoing bubble with double ticks and a composer bar.
4. **Visible copy (verbatim):**
   - Nav: "Resumen", "Alumnas", "Talleres", "Workshops", "Materiales", "Eventos privados", "Recordatorios" (active), "Métricas". Sidebar footer: "CALMA INQUIETA" / "TALLERES CREATIVOS".
   - Top bar: "Buscar alumnas, talleres o reservas...", "María Pérez", "Administradora".
   - "Envío de recordatorios"; "Selecciona alumnas, personaliza tu mensaje y prepara el envío por WhatsApp."
   - "Filtros", "Limpiar filtros", "Taller o workshop" (value "Cerámica inicial"), "Próxima clase" (value "Esta semana"), "Estado de cuota" (value "Todas"), "Alumnas (8 seleccionadas)", "Buscar alumna...".
   - "Mensaje", "Elige una plantilla o escribe tu propio mensaje.", chips "Próxima clase", "Materiales", "Pago pendiente", "Cambio de horario"; "Restablecer plantilla".
   - Message body: "Hola {{nombre}} [sparkles emoji] / Te recuerdo que tu próxima clase de {{actividad}} es el {{fecha}} a las {{hora}}. / Nos vemos en el taller. / Un abrazo, / Calma Inquieta".
   - "Variables (haz clic para insertar)": "{{nombre}}", "{{actividad}}", "{{fecha}}", "{{hora}}".
   - "Las variables se reemplazarán automáticamente con los datos de cada alumna seleccionada."
   - Button "Preparar envío por WhatsApp"; note "El envío automático o masivo requiere WhatsApp Business API."
   - "Vista previa en WhatsApp"; "Así verá el mensaje una de las alumnas seleccionadas."; phone: "9:41", "Ana Cristina López", "en línea", bubble "Hola Ana Cristina [sparkles] / Te recuerdo que tu próxima clase de Cerámica inicial es el sábado 12 de abril a las 10:00. / Nos vemos en el taller. / Un abrazo, / Calma Inquieta", timestamp "9:41".
5. **Data shown:** students (initials AC, VM, LC, SO, DR, PC, FM, JM, CM, AV): "Ana Cristina López", "Valentina Martínez", "Lucía Cabrera", "Sofía Ortega", "Daniela Rivas", "Paula Castro", "Fernanda Morales", "Julieta Mora" (all checked), "Camila Torres", "Agustina Vidal" (unchecked). Each row shows the activity "Cerámica inicial" and next class "Sáb 12 abr · 10:00". Entities implied: Student, Activity, Class session, Cuota status, Message template with variables. Filter dimensions: activity, next-class window, cuota status. Message limit 1000 characters; 4 template types; 4 variables.
6. **Visual design:** sidebar about #E8DAC9 (very subtle vertical gradient #EADDCF to #E8D9C8); page about #FAF6F2; cards #FBF7F3 with a hairline border about #EDE8E4, radius approx. 8 to 10 px. Primary clay brown about #916C52 (button), active chip #936E55, active nav pill #9B775F, checked boxes #89634A. Hint box sage-grey #E6E6DB. Chat bubble #E4F5DB on chat background #ECE4DB. Links about #A27E6C. Display serif H1 (about 52 to 58 px, near-black), sans UI text. Photoreal black-bezel phone. Calm, airy, text-first.
7. **Deltas:**
   - **[API-FLAG]** The whole screen is built around WhatsApp: template chips (Próxima clase, Materiales, Pago pendiente, Cambio de horario are the same categories as the API add-on's utility messages), a WhatsApp phone preview, and the explicit note that automatic or bulk sending needs the API. With 8 recipients selected, "Preparar envío por WhatsApp" can only mean eight separate wa.me chats without the API. Under the email-only scope this screen must be redesigned around email (subject, body, email preview, sent log) and/or a one-by-one wa.me queue.
   - **[NEW]** Filters "Próxima clase" and "Estado de cuota" (text only says "Selección de alumnas por taller o workshop"); template library; variable system; 1000-character counter; "Restablecer plantilla".
   - **[MISSING]** Send log ("registro de los envíos"), scheduling, consent flag per contact (text: sends only to contacts with consent), recipients lacking a phone or email.
   - **[CONFLICT]** The proposal lists template creation, contact segmentation, message personalization and send logs as part of the paid optional API add-on, while this base-module screen already shows templates, segmentation by activity and cuota status, and variable personalization.
   - Copy uses neutral "tú" forms ("Selecciona", "Elige", "haz clic") while the public pages use Argentine voseo.

### image5.png: Public page, Inicio

1. **Id / class / frame:** image5, public page "Inicio". Desktop. Gallery position 1.
2. **Layout (top to bottom):**
   - Header bar (beige) with logo, 6 nav links, CTA.
   - Hero: left text block (eyebrow, H1, subtitle, 2 CTAs, 3 trust items); right a torn-paper photo collage with a handwritten note and vertical keywords.
   - Two-column band: left "Talleres mensuales" with 3 cards; right "Workshops" list with 3 upcoming items.
   - Bottom strip "Comunidad": heading plus 3 testimonial cards with carousel arrows.
3. **UI components:** top nav with underline on active link; pill CTA with arrow; primary pill and outlined pill buttons; icon trust row; photo collage; cards with image, title, text, calendar and pin meta rows, outlined button; vertical list with date label, title, description and round arrow button; text links with arrow; testimonial cards with avatar, quote, name, 5 stars; carousel prev/next arrows.
4. **Visible copy (verbatim):**
   - Nav: "Inicio" (active), "Talleres", "Workshops", "Eventos privados", "Quiénes somos", "Contacto"; CTA "Ver actividades".
   - "CALMA INQUIETA"; H1 "Talleres que despiertan tu creatividad" (the word "creatividad" in italic); "Un espacio para aprender, crear y compartir desde lo manual, en un ambiente cálido y auténtico."; buttons "Ver talleres", "Ver workshops".
   - Trust row: "Talleres presenciales", "Materiales incluidos", "Grupos reducidos".
   - Collage note: "Crear también es una forma de volver a ti"; vertical words "ARTE / MANOS / ENCUENTRO / BIENESTAR".
   - "TALLERES", "Talleres mensuales", "Ver todos los talleres". Cards: "Encordado" ("Explorá técnicas de nudos y creá piezas únicas para tu hogar.", "Todos los martes", "18:30 – 21:00 h", "Calma Inquieta Studio", "Ver taller"); "Bordado" ("Aprendé puntos esenciales y diseñá tus propias creaciones.", "Todos los jueves", "18:30 – 21:00 h"); "Acuarela" ("Conectá con tu creatividad a través del color y la naturaleza.", "Todos los sábados", "10:00 – 12:30 h").
   - "PRÓXIMOS", "Workshops", "Ver todos": "12 ABR / Cerámica inicial / Una introducción al barro, sus formas y posibilidades."; "26 ABR / Acuarela botánica / Flores, texturas y color en una jornada creativa."; "10 MAY / Workshop especial Día de la Madre / Una experiencia creativa para compartir."
   - "COMUNIDAD", "Lo que dicen de Calma Inquieta": "María Fernández" ("Un espacio hermoso, con una energía única. Aprendí, me relajé y me llevé una pieza que amo. ¡Súper recomendable!"), "Lucía Torres" ("Los talleres son mágicos. Todo está pensado con tanto detalle y calidez. Volvería mil veces."), "Daniela Rojas" ("Calma Inquieta es mucho más que un taller, es un espacio para conectar con una misma y con otras mujeres increíbles."), all 5 stars.
5. **Data shown:** monthly taller: name, short description, weekday, time range, location label "Calma Inquieta Studio" (no price, teacher or capacity on the home cards). Workshop: date (day plus month, no year), name, one-line description. Testimonial: author, quote, rating (5). Business rules hinted: weekly recurrence ("Todos los martes"); classes 2.5 h here.
6. **Visual design:** header #E6D8C8; hero #F9F3ED; lower sections #F9F6F2; cards white #FFFFFF with a soft shadow, radius approx. 10 px; testimonial strip #F0E7DD with cards #F8F5F0. Primary clay #92694E to #936B51; CTAs are fully rounded pills; secondary is an outlined pill. H1 in a light, high-contrast serif (Cormorant-like, unclear) with an italic accent word, near-black; body sans (Montserrat-like) about #5E5B57; eyebrows in tracked uppercase about #968A84. Collage in torn-paper and washi-tape style with a handwriting script note; warm macro photography of hands (macramé, watercolor, pottery, embroidery). Warm, handmade, calm tone with Argentine voseo ("Explorá", "creá", "Aprendé").
7. **Deltas:**
   - **[NEW]** Testimonials carousel ("Lo que dicen de Calma Inquieta") is not in the text; its content source (manual admin entry? Google reviews?) is undefined.
   - **[CONFLICT]** Trust item "Materiales incluidos" contradicts the monthly flow, where materials are a mandatory extra purchase on top of the cuota (images 6, 7, 10). It fits workshops (image8) but not monthly talleres.
   - Matches the text's Inicio description ("proximas actividades, talleres destacados, beneficios y accesos rapidos para inscribirse").
   - This is the only mockup whose nav equals the six proposal pages (Inicio, Talleres, Workshops, Eventos privados, Quiénes somos, Contacto), although "Talleres" is shorter than "Talleres mensuales".
   - **[DATA]** Encordado is Tuesday 18:30 to 21:00 here but Monday 10:00 to 12:00 (images 9, 14) and Wednesday 18:00 to 20:00 (image6). Workshop names and dates differ from image8.
   - **[NEW]** Hero photos, collage and testimonial portraits are placeholders that cannot be reused: the proposal excludes professional photo and video production and says content is supplied by the client.
   - Header CTA "Ver actividades" duplicates the hero CTAs; the other public mockups that have a header CTA use different labels (images 9, 10, 12, 13), and images 6, 7 and 8 have none.

### image6.png: Public page, monthly taller detail and enrollment form (Encordado)

1. **Id / class / frame:** image6, public detail page "Taller mensual de encordado" plus enrollment form. Desktop. Gallery position 3. Flow steps 1 to 3.
2. **Layout (left to right, then top to bottom):** header (logo tile, wordmark, 5 links, search and bag icons). Three columns: a large photo; an information column (breadcrumb, H1, description, attribute list, availability pill, "projects" thumbnails); and a sticky enrollment card (form, fee, CTA).
3. **UI components:** nav with underline; breadcrumb in tracked caps; icon-circle attribute rows with hairline dividers; sage availability pill; 3 square thumbnails; form with 3 text inputs, 1 select, 1 checkbox with link, fee line, full-width primary button with arrow, info note.
4. **Visible copy (verbatim):** wordmark "CALMA INQUIETA"; nav "Talleres" (active), "Nosotras", "Materiales", "Diario", "Contacto". "TALLERES / ARTE TEXTIL"; H1 "Taller mensual de encordado"; "Un espacio para explorar la belleza del hilo, el metal y la paciencia. En este taller vas a aprender técnicas de encordado con fibras naturales sobre estructuras de metal, creando piezas decorativas únicas para tu hogar." Attributes: "Profesora / Valentina Ríos / Artista textil y tallerista"; "Días y horario / Miércoles de 18:00 a 20:00 h"; "Duración de la clase / 2 horas"; "Cuota mensual / $ 45.000"; pill "4 lugares disponibles"; "PROYECTOS QUE VAMOS A REALIZAR". Form: "Inscribite al taller", "COMPLETÁ TUS DATOS PARA RESERVAR TU LUGAR", "Nombre y apellido" (placeholder "Tu nombre y apellido"), "Teléfono" ("Ej. 11 1234 5678"), "Correo electrónico" ("tucorreo@ejemplo.com"), "Turno" (select "Miércoles de 18:00 a 20:00 h"), checkbox "Acepto las condiciones del taller, incluyendo la política de cancelación y reembolso.", link "Ver condiciones", "Cuota mensual $ 45.000", button "Seleccionar materiales", note "La selección de materiales es obligatoria."
5. **Data shown:** Taller: category (Arte textil), name, description, teacher with bio line, weekday and time range, class duration, monthly fee, available seats, project gallery. Enrollment request: name, phone, email, turno, policy acceptance. Rule: materials selection is mandatory before confirming.
6. **Visual design:** header #F7F5F0 with a sand logo tile #E3D1BC; page #F7F5F1; card #FAF6F3; icon circles #E2D0B9; sage pill #B7BDAB; CTA #91694F with radius approx. 14 to 15 px (not a pill). Large light serif H1 near-black; sans body; tracked uppercase breadcrumb and form subtitle. Warm macro photo of hands weaving a gold metal hoop. Calm, artisanal.
7. **Deltas:**
   - **[NEW]** "Correo electrónico" is collected (useful: email notifications are now the automated channel). The text only says "completa sus datos personales".
   - **[NEW]** "Turno" selector implies several schedules per taller; the admin form (image14) has a single day plus time pair and the text lists only "días, horarios".
   - **[NEW]** Policy acceptance checkbox with "Ver condiciones"; breadcrumb category "ARTE TEXTIL" (no category field in any admin form); "PROYECTOS QUE VAMOS A REALIZAR" gallery.
   - **[CONFLICT]** Nav "Nosotras", "Materiales", "Diario" plus search and bag: "Diario" (blog) is not in the six pages; "Materiales" is not a top-level page in the text.
   - **[DATA]** Fee $ 45.000 here becomes $ 35.000 on the very next step (image7) and $ 48.000 on the confirmation (image10).
   - **[DATA]** Teacher "Valentina Ríos" here versus "Sofía Rivas" in the admin (image14).
   - Placeholder phone "Ej. 11 1234 5678" uses the Buenos Aires area code 11, not Córdoba (351).
   - Returning students: the form has no path for a student who already has a ficha, although the text rule says a student can join several activities "sin duplicar su ficha".

### image7.png: Public page, material selection and order summary

1. **Id / class / frame:** image7, public "Elegí los materiales para tu proyecto" plus summary side card. Desktop. Gallery position 4. Flow steps 3 to 6.
2. **Layout:** header; breadcrumb, H1 and intro on the left; two product sections ("Bastidores metálicos", "Kits de hilos") as 3-card rows; sticky right card "Resumen de tu inscripción" with student data, material lines, subtotal, fee, total and CTA.
3. **UI components:** header with search, account and cart icons (cart badge "3"); breadcrumb; section headings with rule; product cards (photo, name, description, size chips or color swatches, price, "Agregar" button); summary card with quantity steppers (minus, 1, plus), "Editar" link, totals rows, highlighted total bar, primary CTA with arrow, lock-icon note.
4. **Visible copy (verbatim):** nav "Talleres", "Materiales" (active), "Nosotras", "Diario", "Contacto". "Taller de encordado / Materiales"; H1 "Elegí los materiales para tu proyecto"; "Acá vas a encontrar los bastidores y kits de hilos que vas a usar en el taller. Podés sumar lo que necesites según el proyecto que quieras realizar." "Bastidores metálicos": "Bastidor Círculo" ("Estructura metálica dorada, ideal para proyectos decorativos.", "Tamaño" chips "20 cm" (selected), "30 cm", "40 cm", "$ 8.500"), "Bastidor Arco" ("Estructura metálica dorada, perfecta para diseños de pared.", "30 cm" selected, "$ 9.800"), "Bastidor Corazón" ("Estructura metálica dorada, para proyectos con formas únicas.", "20 cm" selected, "$ 9.800"). "Kits de hilos": "Kit Tierra" ("Hilos de algodón en tonos neutros, inspirados en la naturaleza."), "Kit Terracota" ("Hilos de algodón en tonos cálidos para darle un toque único a tu pieza."), "Kit Verde" ("Hilos de algodón en tonos verdes y crudos, ideales para diseños orgánicos."), each "$ 12.500" with 5 color swatches. Buttons "Agregar". Summary: "Resumen de tu inscripción", "Nombre / Sofía Ramírez", "Taller / Taller de encordado", "Cuota mensual / $ 35.000", "Materiales", "Editar", lines "Bastidor Círculo 20 cm $ 8.500", "Bastidor Corazón 20 cm $ 9.800", "Kit Tierra $ 12.500", "Subtotal materiales $ 30.800", "Cuota mensual $ 35.000", "Total a transferir $ 65.800", button "Confirmar solicitud y continuar por WhatsApp", note "Realizarás una única transferencia por la cuota y los materiales".
5. **Data shown:** Material: category (Bastidores metálicos, Kits de hilos), name, description, variant dimensions (size, color), price per size, image. Order lines: item, variant, quantity, price. Totals: materials subtotal plus monthly fee equals total to transfer (8.500 + 9.800 + 12.500 = 30.800; 30.800 + 35.000 = 65.800, arithmetic correct). Prices differ by model (Círculo 20 cm $8.500, Arco 30 cm $9.800, Corazón 20 cm $9.800); each card shows a single price for the selected size, so whether size changes the price is not visible here (image19 does show per-variation prices).
6. **Visual design:** header #FCF8F4 with tile #F2DAC0; page #F9F5F0; cards #FBF8F3 to #F8F3EE; selected chips and buttons #8F6954 (radius approx. 13 to 14 px); total bar #ECE0D2; swatches (#EADBC9, #D5C4B1, #92735B, #81836B, #A08583). Light serif H1 and section headings; sans body; thin-line icons. Calm, catalog-like.
7. **Deltas:**
   - **[CONFLICT]** Fee $ 35.000 versus $ 45.000 on the previous step (image6) and $ 48.000 on the next (image10).
   - **[CONFLICT]** Catalog content (gold metal hoops, $8.500 to $9.800, sizes 20/30/40 cm, kits $12.500) conflicts with the admin catalog (image19: wooden punch-needle hoops, $12.500 to $14.500, 20/25 cm, kits $28.000) and with the confirmation page (image10: "Cuerda de algodón ...").
   - **[CONFLICT]** An account icon sits in the header, but the text says the student completes the process "sin crear una cuenta".
   - **[NEW]** Variant model: size chips on hoops and color swatches on kits; whether a variant changes the price is not visible on the cards. The "carrito" in the text is realized as the summary card plus the header cart badge.
   - **[MISSING]** No validation state shown for the mandatory-materials rule (for example disabled CTA with zero items); no "no materials needed" path.
   - Steps 6 and 7 of the 12-step flow are merged into one CTA ("Confirmar solicitud y continuar por WhatsApp"); the click-to-chat opens WhatsApp with a prefilled message (allowed, not API).

### image8.png: Public page, Workshops (listing)

1. **Id / class / frame:** image8, public page "Workshops". Desktop. Gallery position 5.
2. **Layout:** header (tile, wordmark, 5 links, search and bag); hero with eyebrow, H1, intro and photo; filter bar; row of 4 workshop cards plus a fifth expanded detail card with a close button; footer strip with 3 value items and a policy note.
3. **UI components:** nav with underline; date-picker dropdowns "Desde" and "Hasta"; "Técnica" select; result count; sort select; image cards with white date badge, title, duration and teacher meta, price, deposit, seats line and full-width primary button with arrow; expanded card with close "x", description, 3 icon badges and CTA; icon value row; info note.
4. **Visible copy (verbatim):** nav "Inicio", "Workshops" (active), "Tienda", "Sobre mí", "Contacto". "CREA · EXPLORA · CONECTA"; H1 "Workshops de fin de semana"; "Experiencias creativas de un día para aprender, desconectar y disfrutar con las manos. Cada persona se lleva a casa lo que crea." Filters: "Próximas fechas", "Desde", "Hasta", "Técnica" ("Todas"), "4 workshops", "Fecha: más próxima". Cards: "SÁB 12 ABR / Cerámica botánica / 5 horas / por Valentina Ríos / $ 82.000 / Seña: $ 25.000 / 8 cupos disponibles"; "DOM 20 ABR / Acuarela floral / 5 horas / por Camila Torres / $ 72.000 / Seña: $ 20.000 / 6 cupos disponibles"; "SÁB 26 ABR / Bordado libre / 4 horas / por Ana Morales / $ 68.000 / Seña: $ 20.000 / 7 cupos disponibles"; "DOM 4 MAY / Lámpara de hilo / 5 horas / por Sofía Herrera / $ 78.000 / Seña: $ 25.000 / 5 cupos disponibles"; each "Reservar lugar". Expanded card (Cerámica botánica): "Un taller para modelar piezas únicas inspiradas en la naturaleza. Exploraremos texturas, impresiones botánicas y formas orgánicas, en un ambiente cálido y relajado. Te llevas a casa la pieza que crees." Badges "Seña para confirmar", "Cupo limitado", "Materiales incluidos". Footer: "Experiencias creativas y significativas", "Grupos reducidos", "Todo incluido, te llevas a casa lo que creas", "La seña confirma tu lugar. Podés cancelar hasta 72 horas antes del taller. En caso de ausencia del participante, no se realiza reembolso."
5. **Data shown:** Workshop: date (weekday, day, month; no year), name, duration in hours, teacher, full price, deposit (seña), available seats, technique, description. Rules: seña confirms the seat; free cancellation up to 72 hours before; no refund for no-shows; materials included in the workshop price. Seña ratio varies (25/82 about 30%, 20/72 about 28%, 20/68 about 29%, 25/78 about 32%), so it looks like a fixed amount per workshop, not a fixed percentage.
6. **Visual design:** header #F4EFE9; hero #F7F4EF; cards #FAF8F4; primary #927157, radius approx. 12 px. Light serif H1 near-black; tracked caps eyebrow; sans body. Macro hand-crafting photos with warm light. Warm, calm.
7. **Deltas:**
   - **[NEW]** "Técnica" and date-range filters, sort control and result count; expanded detail card with badges.
   - **[CONFLICT]** Policy footer shows a 72-hour cancellation rule and no-show without refund. The text promises "cancelacion por falta de cupo minimo, devolucion correspondiente y política ante inasistencia": the minimum-seats cancellation is not shown and the 72-hour rule is new.
   - **[SCOPE]** Nav item "Tienda" (general e-commerce is out of scope) and a bag icon.
   - **[MISSING]** The registration form for a workshop (text: the interested person fills in data on the workshop page and the request is saved before WhatsApp opens) is not shown; the card only has "Reservar lugar".
   - **[DATA]** Dates fall on 2025 weekdays (12 April 2025 was a Saturday; in 2026 it is a Sunday), while the proposal is dated 30/09/2026. Admin (image14) shows the same workshop with seña $28.000, teacher "Valentina Cruz", 10:00 to 14:00 and 0 seats left, versus $25.000, "Valentina Ríos", 5 horas and 8 seats here.
   - Copy mixes voseo ("Podés cancelar") with neutral "tú" forms ("Te llevas a casa", "la pieza que crees").
   - Nav "Sobre mí" (first person singular) while image12 presents two founders.

### image9.png: Public page, Talleres mensuales (listing)

1. **Id / class / frame:** image9, public page "Talleres mensuales". Desktop. Gallery position 2.
2. **Layout (top to bottom):** beige header with 5 links and a CTA; hero with eyebrow, H1, intro text and filter pills on the left and a still-life photo with a handwritten note on the right; a row of 6 taller cards; a floating WhatsApp button at bottom right.
3. **UI components:** letter-spaced uppercase nav with underline on active; pill CTA; filter pills (one filled active); image cards with title, teacher line, calendar row, price with "/ mes" suffix, sage availability pill and a full-width "Ver taller" button; round black floating action button with the WhatsApp glyph.
4. **Visible copy (verbatim):** Nav "INICIO", "TALLERES" (active), "NOSOTRAS", "EL ESPACIO", "CONTACTO"; CTA "RESERVÁ TU LUGAR". "CREATIVIDAD EN COMUNIDAD"; H1 "Talleres mensuales"; "Clases semanales de dos horas para explorar técnicas, conectar con tu creatividad y ser parte de una comunidad que valora los procesos lentos."; pills "Todos", "Mañana", "Tarde", "Con cupo"; note "Crear también es una forma de estar bien." Cards: "Encordado / Por Valentina Ríos / Lunes · 10:00 a 12:00 / $ 58.000 / mes / 4 lugares disponibles"; "Bordado / Por Camila Torres / Martes · 10:00 a 12:00 / $ 58.000 / mes / 6 lugares disponibles"; "Acuarela / Por Sofía Méndez / Miércoles · 10:00 a 12:00 / $ 58.000 / mes / 5 lugares disponibles"; "Cerámica / Por Lucía Herrera / Jueves · 10:00 a 12:00 / $ 62.000 / mes / 3 lugares disponibles"; "Tejido / Por Martina Silva / Jueves · 17:00 a 19:00 / $ 58.000 / mes / 7 lugares disponibles"; "Técnicas mixtas / Por Ana Espinosa / Viernes · 17:00 a 19:00 / $ 62.000 / mes / 4 lugares disponibles". Every card button: "Ver taller".
5. **Data shown:** Taller: name, teacher, weekday, time range, monthly price, available seats. Rule: weekly two-hour classes. Prices $58.000 and $62.000 per month. Seats left from 3 to 7.
6. **Visual design:** header #E7D9C6; hero #F9F6F0; cards #FAF7F2/white; active pill and card buttons #946D53; availability pill #CED2C1 with dark-olive text #42483C; floating button #101010 (black, not WhatsApp green). Pills are fully rounded; card buttons radius approx. 16 px. Serif display H1 (Cormorant-like, light), tracked caps nav, sans body. Warm photographic cards (hands crafting).
7. **Deltas:**
   - **[NEW]** Filter pills "Mañana", "Tarde", "Con cupo" are not in the text (they serve the stated goal of filling morning slots).
   - **[NEW]** Floating WhatsApp button (wa.me click-to-chat, allowed). Visual defect: it overlaps the last card's "Ver taller" button.
   - **[NEW]** Nav "NOSOTRAS" and "EL ESPACIO" do not match the six proposal pages.
   - **[DATA]** Monday classes conflict with studio hours "Martes a Sábados" (image12). Prices, teachers and schedules conflict with images 5, 6, 10, 11, 14.
   - This is the only mockup listing six talleres (Encordado, Bordado, Acuarela, Cerámica, Tejido, Técnicas mixtas); other screens use other lists.
   - Text says the list shows "profesor, días, horarios, cuota, cupos, descripción, imágenes y botón": description is not on the card (it is on the detail page, image6).

### image10.png: Public page, "Solicitud registrada" confirmation

1. **Id / class / frame:** image10, public confirmation page. Desktop. Gallery position 7. Flow steps 6 to 10.
2. **Layout:** header with 5 links and CTA; main band with a lifestyle photo on each side of a central confirmation card (check icon, H1, thanks line, order box, WhatsApp CTA); footer ribbon with 4 numbered steps.
3. **UI components:** uppercase nav, pill CTA; centered card with check badge; order box with ID, student, status badge, line items table, highlighted total row; large pill WhatsApp button; 4-step ribbon with numbered circles, icons and arrows.
4. **Visible copy (verbatim):** nav "TALLERES", "MATERIALES", "SOBRE NOSOTRAS", "GALERÍA", "PREGUNTAS FRECUENTES"; CTA "QUIERO SUMARME". H1 "Solicitud registrada"; "¡Gracias, Sofía! Tu solicitud fue registrada correctamente. Te enviaremos los detalles por WhatsApp para continuar con el pago." Order box: "Pedido #CI-2026-0148", "Sofía Ramírez", badge "Pendiente de confirmación"; "Taller mensual de encordado / Modalidad presencial · Cupo mensual / $ 48.000"; "Materiales seleccionados": "Cuerda de algodón 3 mm (100 m)" qty 1 "$ 11.800"; "Cuerda de algodón 4 mm (50 m)" qty 1 "$ 5.900"; "Total a transferir $ 65.800". Button "Continuar por WhatsApp". Steps: "1 Enviá el resumen / Hacé clic en el botón y compartí tu pedido por WhatsApp."; "2 Recibí el alias / Te enviaremos por WhatsApp el alias para el pago."; "3 Realizá una única transferencia / Por el total de tu pedido."; "4 Adjuntá el comprobante / En el mismo chat para confirmar tu lugar."
5. **Data shown:** Order: number format CI-YYYY-NNNN, student, activity, modality, fee, selected materials with quantities and prices, total, status "Pendiente de confirmación". Rule: one transfer for fee plus materials; proof of payment is attached in the WhatsApp chat.
6. **Visual design:** page #F7F2F0, card #F9F5F0, order box #F2EDE6, total bar #E8DBCC, status badge #967156 with white text (pill), CTA olive #7D7F6B (not WhatsApp green) with a WhatsApp glyph, step circles #777A65, header CTA #9B7459. Light serif H1; the order box uses a sans with generous letter-spacing. Photos: speckled mug and cotton rope, macramé wall hanging. Calm, reassuring.
7. **Deltas:**
   - **[NEW]** Order number format "#CI-2026-0148" (the text only says the order number is shown). Other screens use "#CI-2024-087" (image15) and "#M-0017" (image17).
   - **[DATA]** 48.000 + 11.800 + 5.900 = 65.700, but the total says $ 65.800. Fee $ 48.000 differs from images 6 ($45.000) and 7 ($35.000); material lines differ from image7.
   - **[NEW]** "Modalidad presencial · Cupo mensual": meaning unclear. "Presencial" implies other modalities exist; the text defines modality only for private events.
   - **[API-FLAG]** "Te enviaremos los detalles por WhatsApp" can be read as the system sending a WhatsApp message automatically. In scope, the student opens WhatsApp via wa.me with a prefilled message and the owner replies manually (text steps 7 and 8); automated outbound messages are email-only. Copy should be reworded, and the missing "we emailed you the summary" confirmation should be designed.
   - **[NEW]** Nav "GALERÍA" and "PREGUNTAS FRECUENTES" are not among the six pages.
   - Matches the text's status "Pendiente de confirmación" and steps 6 to 10.

### image11.png: Admin, Resumen general

1. **Id / class / frame:** image11, admin "Resumen general" (Panel general). Desktop. Gallery position 9.
2. **Layout:** sidebar (about 279 px) with logo, 8 nav items and footer wordmark. Top bar with search, month selector, "Crear actividad" and user. Title block. KPI row of 4 cards. Row 2: bar chart and "Próximas clases" table. Row 3: "Alertas pendientes" list and "Embudo de solicitudes" funnel with legend.
3. **UI components:** sidebar with tonal active item; global search; month dropdown; primary button with plus icon; KPI cards with icon circle, label, large serif number and drill-in arrow button; vertical bar chart with 0 to 100% axis and value labels; table with 5 rows and inline progress bars; alert rows with count pills and chevrons; trapezoid funnel with legend.
4. **Visible copy (verbatim):** nav "Resumen" (active), "Alumnas", "Talleres", "Workshops", "Materiales", "Eventos privados", "Recordatorios", "Métricas"; footer "CALMA INQUIETA". Top: "Buscar alumnas, talleres o actividades...", "Septiembre 2026", "Crear actividad", "Admin". "BIENVENIDA"; "Resumen general"; "Aquí tienes un vistazo general de la actividad de Calma Inquieta este mes." KPIs: "Alumnas activas 48", "Ocupación promedio 76%", "Pagos pendientes 9", "Pedidos de materiales 12". "Ocupación por actividad" ("Septiembre 2026"): Encordado 82%, Bordado 68%, Acuarela 61%, Cerámica 79%, Tejido 70%. "Próximas clases", "Ver todas": columns "FECHA Y HORA", "ACTIVIDAD", "PROFESORA", "ALUMNAS", "CAPACIDAD"; rows "Mar 8 sep 10:00 – 12:00 / Cerámica / Sofía R. / 10 / 12", "Mar 8 sep 17:00 – 19:00 / Bordado / Lucía M. / 8 / 10", "Mié 9 sep 10:00 – 13:00 / Acuarela / Valentina G. / 11 / 12", "Jue 10 sep 17:00 – 19:00 / Tejido / Camila P. / 7 / 10", "Sáb 12 sep 10:00 – 13:00 / Encordado / Sofía R. / 9 / 12". "Alertas pendientes", "Ver todas": "Pagos pendientes / Alumnas con cuotas por regularizar / 9", "Recuperaciones / Alumnas inactivas (más de 30 días) / 6", "Pedidos de materiales / Materiales por solicitar o pendientes de entrega / 12". "Embudo de solicitudes" ("Septiembre 2026"): funnel 36, 21, 58%; legend "Solicitudes / Nuevas inscripciones / 36", "Confirmadas / Inscripciones pagadas / 21", "Conversión / De solicitudes a confirmadas / 58%".
5. **Data shown:** KPIs: active students, average occupancy, pending payments, material orders. Occupancy per activity (percent). Upcoming class sessions: date, time range, activity, teacher, enrolled/capacity (capacities 10 and 12). Alerts with counts. Funnel: requests 36, confirmed (paid) 21, conversion 21/36 = 58%. Weekday dates are consistent with the 2026 calendar (8 September 2026 is a Tuesday).
6. **Visual design:** sidebar #E5D5C3 to #E6D7C6, active item #D7C5B1; page #F9F6F1; KPI cards #F5EFE8 with icon circles #E6D5C0; primary button #936F56. Chart palette: clay #B08F74 and #9A765B, sage #A5A892 and #A7AA94, tan #E3D1BC. Funnel: #B3967C, #B1B29F, #E3D1BD. Light serif H1 (about 55 to 60 px, near-black) and serif KPI numerals; muted subtitle about #918F8C; sans table text. Cards have hairline borders and radius approx. 10 to 12 px. Calm, data-friendly.
7. **Deltas:**
   - **[CONFLICT]** Alert "Recuperaciones" is defined as "Alumnas inactivas (más de 30 días)". In the proposal and image15, "recuperación" means a make-up class for an absence. Two different concepts share one name.
   - **[MISSING]** The text's Panel general also lists señas and ingresos registrados; neither appears here (revenue is only in image18).
   - **[NEW]** Month selector, global search, "Crear actividad" shortcut, "Próximas clases" table with capacity bars, "BIENVENIDA" greeting.
   - **[DATA]** The average of the five bars is 72%, but the KPI says 76% (weighting undefined). Funnel here has 3 values; image18 has 4 stages for the same September 2026 with very different numbers. Classes of 3 hours (Acuarela, Encordado) conflict with "dos horas" elsewhere. The user chip says only "Admin".
   - Alert counts match the KPI counts (9 payments, 12 material orders).

### image12.png: Public page, Quiénes somos (with Contacto)

1. **Id / class / frame:** image12, public page "Quiénes somos" with a Contacto section. Desktop. Gallery position 8.
2. **Layout:** header with 5 links and a WhatsApp CTA; hero text block (eyebrow, H1, two paragraphs) beside a photo mosaic (two founders laughing, studio with logo on the wall, speckled mugs); values row (3 items); second mosaic strip of studio photos; contact band with heading, text, CTA, contact details list, stylized map and storefront photo.
3. **UI components:** nav; pill WhatsApp CTA (header and body); icon circles for values; photo mosaics with rounded corners; contact list with icons; illustrated map card with pin and label; image of a chalkboard sign.
4. **Visible copy (verbatim):** nav "INICIO", "QUIÉNES SOMOS", "TALLERES", "TIENDA", "CONTACTO"; CTA "ESCRIBIR POR WHATSAPP". "CALMA INQUIETA"; H1 "Un espacio para crear sin apuro"; "Somos Cami y Agus, dos amigas que creemos en el poder de las manos, en los procesos lentos y en todo lo que sucede cuando nos damos un tiempo para crear." "Calma Inquieta nació en Córdoba en 2021 como un pequeño taller de cerámica. Hoy es un espacio vivo, donde compartimos talleres, piezas hechas a mano y una comunidad que nos inspira todos los días." Values: "Creatividad / Exploramos, probamos y celebramos lo único.", "Comunidad / Creamos lazos reales a través del hacer.", "Bienestar / Creemos en una vida más simple y presente." Poster text in a photo: "MANOS IDEAS PERSONAS LUGARES MÁS VIDA". "CONTACTO"; H2 "Vení a conocernos"; "Te esperamos en nuestro taller para vivir la experiencia, conocer nuestras piezas y sumarte a los próximos talleres." Button "Escribir por WhatsApp". "Dirección / Fray Mamerto Esquiú 1234 / Córdoba, Argentina"; "Horarios / Martes a Sábados / 10:00 a 19:00 hs"; "Instagram / @calmainquieta"; "Email / hola@calmainquieta.com.ar"; "WhatsApp / +54 9 351 555 1234"; map label "NUEVA CÓRDOBA"; chalkboard sign "Calma Inquieta".
5. **Data shown:** Business profile: founders (first names), founding year 2021, origin as a ceramics studio, values, address, opening hours (Tuesday to Saturday 10:00 to 19:00), Instagram handle, email, WhatsApp number. The 555 number looks like a placeholder.
6. **Visual design:** header #F4F0EB; hero #F5F1EB; contact band #E6D6C2; map card #E3DACF with sage leaf illustration #A9A68D; value icon circles tan #E8D8C0, clay #967156, olive #969375; CTA #987358 as a pill. Light serif H1 near-black; sans body. Warm natural-light photography with people. Intimate, friendly, community tone.
7. **Deltas:**
   - **[CONFLICT]** "Quiénes somos" and "Contacto" are merged in one screen; the text lists them as two separate pages. Nav here (INICIO, QUIÉNES SOMOS, TALLERES, TIENDA, CONTACTO) also lacks Workshops and Eventos privados.
   - **[SCOPE]** Nav item "TIENDA".
   - **[MISSING]** The text promises "videos, fotos y trabajos realizados"; no video block is visible (photos only).
   - **[NEW]** Founders' names (Cami y Agus), 2021 start, values trio, stylized map (not an interactive map; the proposal excludes Google Maps work but promises "dirección e información necesaria para encontrar el local").
   - **[DATA]** Opening hours "Martes a Sábados 10:00 a 19:00" conflict with Monday classes (images 9, 14) and evening classes until 21:00 (image5).
   - All WhatsApp buttons here are click-to-chat (allowed, not API).
   - Photos (team, studio, storefront) are placeholders; real assets must come from the client.

### image13.png: Public page, Eventos privados

1. **Id / class / frame:** image13, public page "Eventos privados". Desktop. Gallery position 6.
2. **Layout:** header (tile, wordmark, 6 links, CTA); hero with eyebrow, H1, subtitle, 4 event-type icons and a large photo; row with two venue cards ("En Calma Inquieta", "A domicilio") plus a request form card; bottom gallery strip with a short text block.
3. **UI components:** nav with underline; 4 icon labels; venue cards with photo, text, 3 check bullets and an outlined button with arrow; form (2-column grid) with text inputs, selects, date input with calendar icon and textarea; primary button with WhatsApp glyph; 4-photo strip.
4. **Visible copy (verbatim):** nav "Talleres", "Eventos" (active), "A domicilio", "Galería", "Sobre nosotras", "Contacto"; CTA "Reservar taller". "EVENTOS PRIVADOS"; H1 "Eventos privados para crear y compartir"; "Celebraciones únicas, con experiencias creativas que conectan, inspiran y dejan un recuerdo especial." Icons "CUMPLEAÑOS", "ENCUENTROS", "CELEBRACIONES", "GRUPOS ESPECIALES". "En Calma Inquieta": "Te recibimos en nuestro taller, un espacio cálido y equipado para que solo te ocupes de disfrutar."; "Ambiente acogedor y creativo", "Todo el material incluido", "Acompañamiento personalizado"; button "Conocer el taller". "A domicilio": "Llevamos la experiencia creativa a tu casa, oficina o el lugar que elijas."; "Nos adaptamos a tu espacio", "Todos los materiales y montaje", "Ideal para grupos y celebraciones especiales"; button "Cómo funciona". "Creatividad para todo tipo de encuentros": "Cumpleaños, despedidas, team buildings, reuniones familiares o simplemente una excusa para celebrar creando." Form: "Contanos tu idea", "Completá el formulario y te enviamos una propuesta personalizada."; fields "Nombre completo" ("Tu nombre"), "Teléfono" ("Tu número"), "Tipo de evento" ("Seleccioná una opción"), "Fecha tentativa" ("dd / mm / aaaa"), "Cantidad de participantes" ("Ej: 10"), "Edades de los participantes" ("Ej: 8 a 12 años, adultas, mixto"), "Actividad de interés" ("Seleccioná una opción"), "¿Dónde será el evento?" (default "En Calma Inquieta"), "Comentarios o detalles adicionales" ("Contanos tu idea, temática, horarios u otra información que quieras sumarnos."); button "Solicitar propuesta por WhatsApp".
5. **Data shown:** Event request: name, phone, event type, tentative date, participant count, ages, preferred activity, location mode (local or home), comments. Event types hinted: cumpleaños, encuentros, celebraciones, grupos especiales, despedidas, team buildings, reuniones familiares.
6. **Visual design:** header #FAF6F1; hero #FBF8EF; cards #F5EEE5/#F7F1EB; form card #F8F4EF with inputs #FBF8F2; CTA #976D52 to #996D53, radius approx. 10 to 13 px; check icons sage-olive #9A957A. Light serif H1 near-black; small sans labels; line-art event icons. Warm photos of a group painting ceramics with a birthday cake. Festive but calm.
7. **Deltas:**
   - **[MISSING]** The text's form data includes "medio preferido para responder", "duración" and "materiales"; the form has none of them, and it has no email field.
   - **[NEW]** Two separate venue cards with extra CTAs "Conocer el taller" and "Cómo funciona" (extra pages or sections?); nav items "Eventos", "A domicilio", "Galería" are not in the six pages; header CTA "Reservar taller" is mislabeled for an events page.
   - **[NEW]** Admin counterpart (image20) stores Instagram and Ciudad, which this form does not collect.
   - The CTA "Solicitar propuesta por WhatsApp" is click-to-chat (allowed). The text says the request is first saved in the database; the label suggests WhatsApp-only submission.
   - Matches the text on modality ("En el local ... o a domicilio"), type, tentative date, quantity and ages.

### image14.png: Admin, Talleres y workshops (list plus edit drawer)

1. **Id / class / frame:** image14, admin "Talleres y workshops". Desktop. Gallery position 12.
2. **Layout:** sidebar (about 218 px) with account switcher at the bottom. Top bar. Title row with segmented control, search, status filter and primary CTA. Table of 4 activities (first row highlighted). Right drawer (about 400 px) "Editar taller mensual".
3. **UI components:** sidebar; breadcrumb-like top label; segmented control; search; dropdown "Publicados"; primary button "Nueva actividad"; table with thumbnail, type chip, teacher avatar and name, schedule, price, progress bar with ratio, available count, toggle and "..." actions; drawer with inputs, 2 selects, number inputs, percentage input with "%" suffix, image with edit pencil, textarea, toggle, capacity summary box with progress bar, primary and outlined buttons.
4. **Visible copy (verbatim):** top "Calma Inquieta | Administración", "Carla". H1 "Talleres y workshops"; tabs "Talleres mensuales" (active), "Workshops"; "Buscar actividad...", "Publicados", "Nueva actividad". Columns "ACTIVIDAD", "TIPO", "PROFESORA", "DÍAS Y HORARIO", "PRECIO", "INSCRIPTAS", "DISPONIBLES", "PUBLICADO", "ACCIONES". Rows: "Encordado / Taller mensual / Sofía Rivas / Lunes 10:00 – 12:00 / $ 45.000 / mes / 6 / 10 / 4 lugares"; "Bordado / Taller mensual / Lucía Torres / Miércoles 17:00 – 19:00 / $ 42.000 / mes / 8 / 12 / 4 lugares"; "Acuarela / Taller mensual / Martina López / Viernes 10:00 – 12:00 / $ 40.000 / mes / 5 / 10 / 5 lugares"; "Cerámica botánica / Workshop / Valentina Cruz / Sábado 12 de abril 10:00 – 14:00 / $ 28.000 / seña / 10 / 10 / 0 lugares". Drawer: "Editar taller mensual", "Nombre de la actividad" (Encordado), "Profesora" (Sofía Rivas), "Días y horario" (Lunes, 10:00 – 12:00), "Arancel mensual" ($ 45.000), "Cupo máximo" (10), "Porcentaje para la profesora" (60 %), "Imagen", "Descripción" ("Técnicas de encordado para crear piezas decorativas y funcionales. Un espacio para explorar materiales, nudos y diseño con calma."), toggle "Publicado" ("La actividad se muestra en la web y en el calendario."), "Cupo de inscripciones" ("6 / 10 lugares ocupados", "4 lugares disponibles"), buttons "Guardar cambios", "Pausar inscripciones".
5. **Data shown:** Activity: name, type (Taller mensual or Workshop), teacher, weekday and time range (or specific date for a workshop), price (monthly fee, or seña for a workshop), enrolled/max capacity, available seats (max minus enrolled), published flag, image, description, teacher percentage (60%). Rules: capacity counts confirmed enrollments; the teacher's share is configured per activity; a full activity shows 0 lugares.
6. **Visual design:** sidebar #E9DBC9 with active item #D5C1AB; page cream; drawer #F8F4EF; fields #FBF7F3; primary #8D6A50 to #957055 (radius approx. 12 to 13 px); type chips #E8D8C6 (monthly) and #DADAD0 (workshop); toggles and progress fills sage #848874 to #868A78 on track #E5D4C3; selected row #F1E5D9. Serif H1, small tracked-caps column headers, sans body. Circular avatar photos and square thumbnails. Calm, orderly.
7. **Deltas:**
   - **[NEW]** The teacher percentage is edited inside the activity ("Porcentaje para la profesora"); in the text it belongs to the Profesores module.
   - **[MISSING]** No field for seña, workshop dates, minimum seats, cancellation conditions, project gallery, assigned materials, turnos, or "modalidad propia o de terceros".
   - **[NEW]** "Pausar inscripciones" and a "Publicado" toggle (both match the text's pause and publish rules).
   - **[DATA]** The "Talleres mensuales" tab is active but row 4 is a Workshop. For a workshop the price column shows the seña, not the price. Teachers, prices and schedules differ from public pages (images 5, 6, 8, 9). The admin form allows only one weekday and one time range, while the public form has a "Turno" select (image6).
   - Admin label "Arancel mensual" versus public "Cuota mensual".
   - Row actions "..." contents are unknown (the text mentions alta, edición, baja).

### image15.png: Admin, student record (Sofía Ramírez)

1. **Id / class / frame:** image15, admin student record (ficha). Desktop. Gallery position 11.
2. **Layout:** sidebar; top bar with search and user; breadcrumb; profile header (avatar, name, contact line, activity chips, 2 action buttons); tab bar; two-column content. Left: "Cuota de septiembre" card, "Asistencia de septiembre" card with 4 class rows and a recovery banner. Right: "Pedido de materiales" card and "Notas" timeline.
3. **UI components:** breadcrumb; avatar; contact meta row with icons; filled and outlined chips; primary and outlined buttons; tabs with underline; cards with status badges; month dropdown; attendance rows with date tile, class label and status pill; per-row "..." menu; peach banner with button; timeline list with author and time; "Añadir nota" outlined button.
4. **Visible copy (verbatim):** top "Buscar alumnas, talleres o materiales...", "María Torres", "Administradora". "Alumnas > Sofía Ramírez"; H1 "Sofía Ramírez"; "+52 55 3487 2901", "sofia.ramirez@gmail.com", "Se unió el 12 de marzo de 2024"; chips "Encordado", "Workshop de acuarela"; buttons "Registrar pago", "Editar alumna". Tabs "Resumen", "Cuotas", "Asistencia", "Materiales", "Historial". "Cuota de septiembre" badge "Pagada": "Monto $1,800 MXN", "Fecha de pago 3 de septiembre de 2024", "Concepto Mensualidad / 4 clases". "Asistencia de septiembre" ("Septiembre 2024"): "Mié 4 / Clase 1 · Encordado / 10:00 – 12:00 / Asistió"; "Mié 11 / Clase 2 · Encordado / Faltó"; "Mié 18 / Clase 3 · Encordado / Recuperada"; "Mié 25 / Clase 4 · Encordado / Asistió". Banner "1 clase a recuperar / Sofía tiene 1 clase pendiente de recuperación de septiembre." with "Registrar recuperación". "Pedido de materiales": "Pedido #CI-2024-087", "28 de agosto de 2024", "Total $760 MXN", "Estado Solicitado al proveedor", "3 productos". "Notas", "Añadir nota": "3 sep 2024 / Realizó el pago de la mensualidad de septiembre. / Por María Torres · 10:14"; "18 sep 2024 / Recuperó la clase del 11 de septiembre. / Por María Torres · 12:20"; "12 ago 2024 / Comentó que llevará su propio set de pinceles para el workshop. / Por María Torres · 16:03".
5. **Data shown:** Student: name, phone, email, join date, enrolled activities (monthly taller plus workshop). Cuota: month, amount, payment date, concept (Mensualidad covering 4 classes), status (Pagada). Attendance per class: class number, date, activity, time, status (Asistió, Faltó, Recuperada), pending recoveries count. Material order: ID, date, total, status, product count. Notes: date, text, author, time. Rule: one monthly fee covers 4 weekly classes.
6. **Visual design:** sidebar #E7D8C7, active item #DCCBB8; page #F9F6F1; cards #F7F1E9; primary #9C7359; tab underline #CAB6A5; activity chips clay #9C735B (taller) and sage #9E9F8E (workshop); status badges soft fills: Pagada #D8DEC9, Asistió/Recuperada #DBE3CF to #DBE2D0, Faltó #EDD6CD, "Solicitado al proveedor" #EBCDA6. Serif name heading, serif card titles, sans body; circular portrait. Warm, human, clean.
7. **Deltas:**
   - **[LOCALE]** "$1,800 MXN", "$760 MXN" and a +52 phone are Mexican conventions; the project is Argentine pesos with dot thousands ("$ 45.000"; image19 explicitly says "Precio (ARS)"). Dates are 2024.
   - **[NEW]** Tab set "Resumen / Cuotas / Asistencia / Materiales / Historial", join date, timestamped notes with author, "Registrar pago", "Editar alumna".
   - **[NEW]** Attendance states "Asistió", "Faltó", "Recuperada" and a recovery banner with "Registrar recuperación" (matches the text's "inasistencias y clases pendientes o realizadas de recuperacion").
   - **[DATA]** 11 September is marked "Faltó" and 18 September "Recuperada" (note: "Recuperó la clase del 11 de septiembre"), yet the banner still says "1 clase a recuperar": the model for recoveries is unclear.
   - **[DATA]** A student in two activities (monthly taller plus workshop) shows one cuota card only and no seña line: unclear whether cuotas and señas are per student or per activity.
   - **[DATA]** Order number "#CI-2024-087" uses another format than "#CI-2026-0148" (image10); a 3-digit sequence and no seña/cuota split.
   - **[MISSING]** Contents of the Cuotas, Asistencia, Materiales and Historial tabs; "Registrar pago" and "Registrar recuperación" dialogs.
   - Same name "Sofía Ramírez" appears as the new applicant (images 7, 10) and as a member since 2024 (here) and as an event client (image20): returning-student matching is not defined.

### image16.png: Admin, Gestión de alumnas (list plus drawer)

1. **Id / class / frame:** image16, admin "Gestión de alumnas". Desktop. Gallery position 10.
2. **Layout:** sidebar (about 229 px); top bar with wordmark, bell and user; title block with CTA; filter row; wide table (10 rows, first selected); right drawer (about 355 px) with a student summary.
3. **UI components:** sidebar; wordmark with small caps subtitle; primary button with plus; search plus 4 dropdown filters; table with avatars, tag chips for activities, status pills with check or clock icon, ratio text, soft badges and "..." actions; selected row with left clay accent bar; drawer with avatar, name, status badge, 4 tabs, contact list with icons, chips, notes box and 3 quick-action rows with chevrons.
4. **Visible copy (verbatim):** top "Calma Inquieta / TALLERES CREATIVOS", "María Torres", "Administradora". H1 "Gestión de alumnas"; "Todas las alumnas, sus actividades y estado de pagos en un solo lugar."; "Agregar alumna". Filters "Buscar alumna", "Taller", "Workshop", "Estado de cuota", "Período". Columns "Alumna", "Contacto", "Actividades", "Cuota septiembre", "Asistencia", "Materiales", "Acciones". Drawer: "Lucía Fernández", "Alumna activa"; tabs "Información", "Actividades", "Pagos", "Asistencia"; "Contacto", "luciaf@gmail.com", "+34 612 345 678", "Madrid, España"; "Actividades inscritas": "Cerámica", "Acuarela"; "Notas": "Le interesa el workshop de cianotipia. Prefiere material incluido."; "Acciones rápidas": "Ver ficha", "Asignar actividad", "Enviar recordatorio".
5. **Data shown (10 rows):** Lucía Fernández (Cerámica, Acuarela; Pagada; 3 / 4; Cobrado); Carla Sánchez (Cerámica, Encuadernación; Pendiente; 2 / 4; Cobrado); Marta López (Acuarela, Lettering; Pagada; 4 / 4; Cobrado); Ana Romero (Cerámica, Tinte natural; Pagada; 3 / 4; Sin pedido); Elena Martín (Acuarela, Collage; Pendiente; 1 / 4; Cobrado); Paula Díaz (Cerámica, Bordado; Pagada; 4 / 4; Cobrado); Sofía Navarro (Encuadernación, Acuarela; Pendiente; 2 / 4; Sin pedido); Julia Castillo (Cerámica, Lettering; Pagada; 3 / 4; Cobrado); Valentina Molina (Tinte natural, Collage; Pagada; 4 / 4; Cobrado); Claudia Rivas (Cerámica, Acuarela; Pendiente; 1 / 4; Cobrado). Emails and phones sit under "Contacto" (phones all +34). Entities implied: Student, Activity enrollment (several per student), Monthly cuota status, Attendance ratio (attended of 4), Material order status.
6. **Visual design:** sidebar #E7D7C3, active item #D5C1A9; page #F9F6F1; table card #FAF7F2; selected row #F0E5DA with a #93664D accent bar; primary #93654A (radius approx. 11 px); chips #E3D4C5; status pills Pagada/Cobrado #D4D5C2 (text about #364230), Pendiente #E2CDBB (text about #4E3C30), Sin pedido #EAE8E4. Serif H1 and wordmark, sans table text; avatar portraits. Dense but airy, warm.
7. **Deltas:**
   - **[LOCALE]** +34 phone numbers and "Madrid, España" are Spanish, not Argentine.
   - **[NEW]** Table columns for cuota, attendance and materials give an at-a-glance status; filters "Estado de cuota" and "Período" go beyond "búsqueda y filtros por actividad".
   - **[NEW]** Quick actions "Ver ficha", "Asignar actividad" (manual assignment per the text) and "Enviar recordatorio" (leads to image4; channel must be email under the current scope). **[API-FLAG]** if it means a direct WhatsApp send.
   - **[DATA]** Activity names (Encuadernación, Lettering, Tinte natural, Collage, Cerámica, Acuarela, Bordado) differ from the public catalog (image9). A student with two activities has a single "Cuota septiembre" status. Drawer tabs ("Información, Actividades, Pagos, Asistencia") differ from the ficha tabs (image15).
   - **[NEW]** A note records interest in a future workshop ("cianotipia"): a lead or wish-list concept the text does not mention.
   - Top bar shows a wordmark rather than a search field (other admin screens show search).

### image17.png: Admin, Pedidos de materiales (kanban plus consolidated provider order)

1. **Id / class / frame:** image17, admin "Pedidos de materiales". Desktop. Gallery position 13.
2. **Layout:** sidebar (about 227 px); top bar with search and user; title block with two buttons; filter row of four labelled dropdowns; 4-column kanban; bottom panel "Pedido para herrería" with a consolidated table and a provider note card.
3. **UI components:** sidebar; global search; outlined button with gear icon and primary button with plus; 4 labelled dropdowns; kanban columns with colored headers and count pills; order cards with thumbnail, ID, date, student, taller line, 2 item lines with icons and price; consolidated table with shape icons; date input; "Copiar resumen" button; notes box; provider contact block.
4. **Visible copy (verbatim):** top "Buscar pedidos, alumnas, talleres o proveedores...", "María", "Administradora". H1 "Pedidos de materiales"; "GESTIÓN DE PEDIDOS Y PROVEEDORES"; buttons "Gestionar catálogo", "Preparar pedido a proveedor". Filters "Taller" ("Todos los talleres"), "Período" ("Este mes"), "Proveedor" ("Todos los proveedores"), "Estado" ("Todos los estados"). Columns: "Pendiente de confirmación" (3), "Cobrado" (2), "Solicitado al proveedor" (3), "Recibido" (2). Cards, Pendiente: "#M-0017 12 abr 2025 Laura Méndez / Taller de aros florales / Aro dorado 30 cm / Flores secas variadas / $ 12.500"; "#M-0018 14 abr 2025 Sofía Rivas / Taller de cuadros botánicos / Marco rectangular latón / Vidrios y soldadura / $ 18.000"; "#M-0023 16 abr 2025 Camila Torres / Workshop de atrapasoles / Vidrio texturizado / Tira de cobre / $ 14.200". Cobrado: "#M-0015 10 abr 2025 Valentina Pérez / Taller de cuadros botánicos / Marco ovalado latón / Vidrios y soldadura / $ 16.800"; "#M-0016 11 abr 2025 Martina López / Taller de móviles de luna / Aro dorado 20 cm / Cadenas y argollas / $ 13.400". Solicitado: "#M-0014 09 abr 2025 Renata Silva / Taller de espejos / Marco irregular herrería / Soldadura / $ 22.000"; "#M-0019 13 abr 2025 Lucía Fernández / Taller de aros florales / Aro dorado 40 cm / Flores secas variadas / $ 15.600"; "#M-0021 15 abr 2025 Jazmín Herrera / Taller de cuadros botánicos / Marco arco latón / Vidrios y soldadura / $ 19.800". Recibido: "#M-0012 05 abr 2025 Daniela Ruiz / Taller de móviles de luna / Aro dorado 25 cm / Cristales y cadenas / $ 14.900"; "#M-0013 07 abr 2025 Paula Gómez / Taller de espejos / Marco redondo herrería / Soldadura / $ 21.500". Panel: "Pedido para herrería", "RESUMEN CONSOLIDADO PARA PROVEEDOR", "Fecha estimada de entrega" ("26 abr 2025"), "Copiar resumen"; columns "Forma / Referencia", "Imagen", "Cantidad", "Medida", "Uso en talleres"; rows "Marco redondo / 8 / Ø 30 cm / Espejos y aros florales", "Marco rectangular / 6 / 20 × 30 cm / Cuadros botánicos", "Marco arco / 5 / 25 × 35 cm / Cuadros botánicos", "Marco irregular / 4 / 40 × 50 cm / Espejos"; "Notas para el proveedor": "Fabricar en hierro macizo, terminación lisa. Incluir perforaciones para soldadura. Confirmar disponibilidad y plazo de entrega."; "Proveedor / Herrería del Sur / +56 9 9876 5432 / Santiago, Chile".
5. **Data shown:** Material order: ID (M-NNNN), date, student, activity, item lines (variant, component), amount, status (4 states). Consolidated supplier order: shape or reference, quantity, dimensions, workshops that use it, estimated delivery, supplier notes, supplier contact. Rules: orders are grouped by status; consolidation is by taller, period and supplier; the Kanban column counts are 3, 2, 3, 2.
6. **Visual design:** sidebar #E9DBC9, active #DEC9B1; page #F8F3EE; cards #FCF8F4; column headers: Pendiente #E5D4C1 (sand), Cobrado #ACB6A4 (sage), Solicitado #D7B8A1 (terracotta), Recibido #EBDDC5 (cream); primary #95725D; outlined button #F7F3EE. Serif H1 and column titles, small caps subtitles, sans body; product thumbnails of gold hoops, framed botanicals, mirrors. Organized, tidy.
7. **Deltas:**
   - Matches the text: the four order states and the filters by taller, period and provider ("filtrar y consolidar materiales por taller, período y proveedor").
   - **[NEW]** A "Proveedor" entity with contact data, "Gestionar catálogo", "Preparar pedido a proveedor", consolidated supplier table, delivery date, supplier notes, "Copiar resumen". The copy-summary action implies manual communication (no API dependency).
   - **[DATA]** All talleres here (aros florales, cuadros botánicos, móviles de luna, espejos, atrapasoles) exist nowhere else in the mockups. Dates are April 2025. Provider is in Chile (+56, "Santiago, Chile") **[LOCALE]**.
   - **[CONFLICT]** The Kanban models material orders only (amount excludes the monthly fee), but the text's "pedido" is one request for fee plus materials that turns "Cobrado" as a whole. How the enrollment order and the materials order relate is undefined.
   - **[MISSING]** The control that moves a card between states (drag and drop? button?) and what each change triggers (cupo discount, email) is not shown.
   - Sidebar icon for "Workshops" is a gift box here but a leaf or calendar elsewhere.

### image18.png: Admin, Métricas del negocio

1. **Id / class / frame:** image18, admin "Métricas del negocio". Desktop. Gallery position 14.
2. **Layout:** sidebar (about 242 px); top bar with label, date-range picker, bell and user; title with period subtitle; KPI row of 4; chart row of 3 cards (stacked columns, horizontal bars, funnel); full-width table "Liquidación estimada a profesores" with export button.
3. **UI components:** sidebar with filled active pill; date-range dropdown; KPI cards with icon circle, value and green trend arrow plus "vs. mes anterior"; stacked bar chart with legend and y-axis; horizontal progress bars with percent labels; funnel with 4 trapezoids and counts; data table with header tint and an outlined "Exportar CSV" button.
4. **Visible copy (verbatim):** top "Calma Inquieta | Panel de administración", "01/09/2026 — 30/09/2026", "MP", "María Paz", "Administradora". H1 "Métricas del negocio"; "Resumen del período 01/09/2026 — 30/09/2026". KPIs "Ingresos registrados $ 4.892.300 +12% vs. mes anterior"; "Ocupación 78% +8%"; "Conversión de solicitudes 42% +6%"; "Alumnas recurrentes 64% +9%". "Ingresos mensuales por categoría": legend "Cuotas", "Señas", "Materiales"; axis $ 0 to $ 6.000.000; months "Abr 2026" to "Sep 2026". "Ocupación por taller": "Cerámica inicial 92%", "Cerámica intermedia 78%", "Modelado creativo 68%", "Torno 56%", "Acuarela botánica 88%", "Encuadernación 73%", "Workshops 61%". "De solicitudes a inscripciones": "Solicitudes 320", "Contactos 268 84%", "Entrevistas 176 55%", "Inscripciones pagas 134 42%". "Liquidación estimada a profesores", "Exportar CSV"; columns "Profesor/a", "Actividad", "Alumnas", "Ingresos registrados", "% acordado", "Monto estimado"; rows: "Laura Méndez / Cerámica inicial / 28 / $ 1.260.000 / 60% / $ 756.000"; "Martín Rivas / Torno / 12 / $ 840.000 / 60% / $ 504.000"; "Sofía Duarte / Acuarela botánica / 18 / $ 720.000 / 50% / $ 360.000"; "Camila Torres / Encuadernación / 16 / $ 640.000 / 50% / $ 320.000"; "Valentina Ruiz / Modelado creativo / 14 / $ 560.000 / 50% / $ 280.000"; "Julián Pérez / Workshops especiales / 10 / $ 912.300 / 60% / $ 547.380".
5. **Data shown:** KPIs with month-over-month deltas; revenue by month and category (Cuotas, Señas, Materiales; the September stack is about $5.0M); occupancy per activity; funnel counts; teacher settlement rows. Business rule confirmed by arithmetic: settlement = ingresos registrados x agreed percentage (all six rows check). Revenue per student implies fees of about $45.000 (Cerámica inicial) and $40.000 (Acuarela, Encuadernación, Modelado). Percentages in the funnel are relative to the first stage (268/320 = 84%, 176/320 = 55%, 134/320 = 42%).
6. **Visual design:** sidebar #E6D7C5 with a filled clay active pill #A17C5F and white text; page #F9F6F1; KPI cards #F2ECE4 to #F4EEE4; table header #EFE7DD; chart series Cuotas #A58266, Señas #DBC7AC, Materiales #A5AF94; occupancy bars from #997459 and #99A487 down to pale #E7D8C5; trend arrows green #038F4D; funnel #A27E62, #DECAB2, #E7D8C5, sage. Serif H1, serif KPI numerals, small muted sans labels, thin gridlines. Calm, report-like.
7. **Deltas:**
   - **[CONFLICT]** The funnel stages "Contactos" and "Entrevistas" do not exist in the 12-step flow or the text ("Solicitudes recibidas, pendientes y confirmadas").
   - **[DATA]** For the same period (September 2026), image11 shows occupancy 76%, conversion 58% and 36 requests; this screen shows 78%, 42% and 320. Teacher table sum of "Ingresos registrados" is $4.932.300 but the KPI says $4.892.300. Student counts in the table add to 98 versus "Alumnas activas 48" in image11.
   - **[NEW]** "Exportar CSV", month-over-month deltas, date-range picker, "Alumnas recurrentes" KPI (matches the text's "recurrencia").
   - **[MISSING]** No materials metrics (orders by state, project, taller, period, supplier), no attendance, absence or recovery indicators, no "modalidad propia o de terceros" column in the teacher table.
   - **[DATA]** Taller names (Cerámica inicial, Cerámica intermedia, Modelado creativo, Torno, Acuarela botánica, Encuadernación) match no other screen.
   - Active nav uses a filled brown pill here (like image4) but a tonal sand item in most other admin screens.

### image19.png: Admin, Catálogo de materiales (grid plus edit drawer)

1. **Id / class / frame:** image19, admin "Catálogo de materiales". Desktop. Gallery position 15.
2. **Layout:** sidebar (about 224 px) with a wordmark under the logo and an account chip at the bottom; top bar with breadcrumb, search icon and avatar; title block; toolbar with search, 3 filters and primary button; result count, sort and view toggle; 3 x 2 card grid; right drawer (about 370 px) "Editar material".
3. **UI components:** breadcrumb; search; 3 labelled dropdowns; primary button with plus; sort select; grid/list toggle; product cards with photo, name, price, description, assignment chip, availability toggle and edit and delete icons; drawer with image, trash icon, "Cambiar imagen" button, required fields (asterisks), textarea, number input with stepper, variation rows (swatch, label, price, trash), "Agregar variación" button, multi-select with removable chip, primary and outlined buttons.
4. **Visible copy (verbatim):** top "Admin / Materiales", "CI"; sidebar "CALMA INQUIETA", "Estudio Calma Inquieta". H1 "Catálogo de materiales"; "Gestioná los materiales disponibles para tus talleres y workshops."; "Buscar materiales...", "Taller" ("Todos"), "Tipo" ("Todos"), "Disponibilidad" ("Todos"), "Agregar material"; "6 materiales", "Ordenar por" ("Más recientes"). Cards: "Bastidor círculo / $ 12.500 / Bastidor de madera natural, ideal para bordado en punch needle."; "Bastidor arco / $ 14.000 / Bastidor de madera en forma de arco, perfecto para diseños decorativos."; "Bastidor corazón / $ 14.500 / Bastidor de madera en forma de corazón. Ideal para proyectos especiales."; "Kit tierra / $ 28.000", "Kit terracota / $ 28.000", "Kit verde / $ 28.000" ("Kit completo con lanas, aguja mágica, tela y guía paso a paso."); every card chip "Taller de Punch Needle" and toggle "Disponible". Drawer: "Editar material", "Imagen del material", "Cambiar imagen", "Nombre *" (Bastidor círculo), "Descripción *", "Precio (ARS) *" (12500), "Variaciones" ("20 cm $ 12.500", "25 cm $ 14.500"), "Agregar variación", "Asignado a talleres *" ("Taller de Punch Needle"), buttons "Guardar cambios", "Desactivar".
5. **Data shown:** Material: image, name, description, base price in ARS, variations (label such as size or color, own price, swatch), availability flag, assigned taller or talleres (many), type (filter "Tipo"). Count "6 materiales". Required fields marked with an asterisk: name, description, price, assignment.
6. **Visual design:** sidebar #E6D7C6, active #D8C3AD; page #F9F6F1; cards #FBF8F3; primary #977156 to #9A7358 (radius approx. 12 px); toggles sage #869175; chips #F8F4E9; delete icons red about #CA3D28; swatch #D0BEAB. Heavier, higher-contrast display serif for H1 and card titles (Playfair-like, unclear) than in image5/9. Warm product photography on neutral linen. Tidy, friendly.
7. **Deltas:**
   - Matches the text: image, description, price, availability, link to taller.
   - **[NEW]** Variation model (label, own price, swatch), "Tipo" filter, grid/list toggle, sort, "Desactivar" (soft delete), edit and delete icons per card.
   - **[CONFLICT]** Catalog content contradicts image7: wood hoops for "Taller de Punch Needle" at $12.500 to $14.500 with 20 and 25 cm versus gold metal hoops at $8.500 to $9.800 with 20, 30 and 40 cm; kits $28.000 ("lanas, aguja mágica, tela") versus $12.500 ("Hilos de algodón"). "Taller de Punch Needle" exists in no other screen.
   - **[MISSING]** No supplier field per material, although the text requires consolidating by "proveedor"; no stock quantity (availability is just on or off); no cost versus sale price.
   - Only mockup that states the currency ("Precio (ARS)"), confirming ARS.
   - Voseo in admin copy ("Gestioná") versus neutral "tú" in other admin screens ("Selecciona", "Aquí tienes").

### image20.png: Admin, Eventos privados (list plus detail drawer)

1. **Id / class / frame:** image20, admin "Eventos privados". Desktop. Gallery position 16.
2. **Layout:** sidebar (about 228 px) with a photo tile and tagline at the bottom; page header with eyebrow, H1 and CTA; KPI row of 4; filter row; table of 8 inquiries (first selected); right drawer (about 393 px) with an event photo header and sections.
3. **UI components:** sidebar; primary button with plus; KPI cards with icon circles; 3 labelled dropdowns plus search; table with thumbnails, status pills with dot, row chevrons; drawer with photo, name, status pill, definition list with icons, client data with a WhatsApp icon, message bubble, internal notes box, vertical timeline, and three stacked buttons (primary, sage, outlined).
4. **Visible copy (verbatim):** sidebar tagline "CREAR TAMBIÉN ES ENCONTRARSE". "ADMINISTRACIÓN"; H1 "Eventos privados"; "Nueva consulta". KPIs "7 Consultas nuevas", "5 Presupuestos enviados", "4 Eventos confirmados", "3 Próximos eventos / en los próximos 30 días". Filters "Fecha" ("Todas las fechas"), "Modalidad" ("Todos"), "Estado" ("Todos"), "Buscar por nombre o evento...". Columns "CLIENTE", "TIPO DE EVENTO", "FECHA TENTATIVA", "PARTICIPANTES", "MODALIDAD", "ACTIVIDAD PREFERIDA", "CONTACTO", "ESTADO". Rows: "Sofía Ramírez / Cumpleaños (adulta) / 12 abr 2025 / 12 / En el local / Cerámica libre / +54 351 648 2291 / Consulta nueva"; "Valentina Torres / Despedida de soltera / 24 abr 2025 / 14 / A domicilio / Pintura en cerámica / +54 351 512 7784 / Presupuesto enviado"; "Lucía Herrera / Team building (empresarial) / 8 may 2025 / 18 / En el local / Modelado en arcilla / +54 351 305 9910 / Confirmado"; "María Ponce / Baby shower / 17 may 2025 / 10 / A domicilio / Pintura en cerámica / Presupuesto enviado"; "Carolina Díaz / Cumpleaños (infantil) / 31 may 2025 / 15 / En el local / Cerámica libre / Consulta nueva"; "Julián González / Evento corporativo / 14 jun 2025 / 20 / A domicilio / Modelado en arcilla / En seguimiento"; "Agustina Ruiz / Bridal shower / 21 jun 2025 / 12 / En el local / Pintura en cerámica / Confirmado"; "Florencia Mena / Cumpleaños (adulta) / 5 jul 2025 / 10 / A domicilio / Modelado en arcilla / Consulta nueva". Drawer: "Cumpleaños de Martina", "Consulta nueva"; "Información del evento": "Tipo de evento Cumpleaños (adulta)", "Fecha tentativa 12 de abril de 2025", "Cantidad de participantes 12 personas", "Modalidad En el local (Córdoba)", "Actividad preferida Cerámica libre (con guía)"; "Datos de la clienta": "Nombre completo Sofía Ramírez", "Teléfono +54 351 648 2291", "Email sofiaramirez@gmail.com", "Instagram @sofiaramirez", "Ciudad Córdoba, Argentina"; "Mensaje de la consulta": "Hola! Quiero organizar el cumpleaños de Martina para 12 personas. Nos encanta la idea de hacer piezas libres, algo relajado y creativo. ¿Tienen disponibilidad para el 12 de abril por la tarde?"; "Notas internas": "Le interesa merienda incluida. Prefiere horario 17 hs. Consultar disponibilidad de profe y stock de materiales. Enviar propuesta completa."; "Historial / Seguimiento": "Hoy 10:24 Nueva consulta recibida", "Hoy 11:02 Se respondió primer mensaje", "Hace 2 días En seguimiento"; buttons "Preparar mensaje por WhatsApp", "Marcar como confirmado", "Editar consulta".
5. **Data shown:** Inquiry: client name, event type (with adult or child variant), tentative date, participants, modality (En el local or A domicilio), preferred activity, phone, email, Instagram, city, original message, internal notes, status, history timeline. Statuses: "Consulta nueva", "Presupuesto enviado", "En seguimiento", "Confirmado". KPIs: counts by status and upcoming events in 30 days. No quote amount is shown anywhere although "Presupuesto enviado" exists. Phones use +54 351 (Córdoba).
6. **Visual design:** sidebar #E7D8C7 (with a photo tile at the bottom), active item #DCCCBD; page #FAF6F1; drawer #FAF5F1; selected row #F0E5D7; primary #936C50 (radius approx. 12 px); status pills: Consulta nueva #ECD1B7 (peach), Presupuesto enviado and En seguimiento #E0DFDF (neutral grey), Confirmado #B8BCA9 (sage); "Marcar como confirmado" #A3A591 sage button with white text; WhatsApp glyph dark green about #24773F. Serif H1 and drawer title, sans table text. Event thumbnails per row. Warm, organized.
7. **Deltas:**
   - Matches the text's "fecha, lugar, cantidad de participantes, datos de contacto y observaciones" (lugar is modality; observaciones is "Notas internas").
   - **[NEW]** Pipeline statuses, KPI row, "Nueva consulta" (manual entry), message and notes fields, history timeline, Instagram and ciudad fields, per-row thumbnails.
   - **[API-FLAG]** The timeline entry "Se respondió primer mensaje" implies tracked conversation state; with wa.me there is no delivery or reply detection, so it must be a manual log entry.
   - "Preparar mensaje por WhatsApp" is a prefilled click-to-chat (allowed, matches the text "continuación por WhatsApp con un mensaje preparado").
   - **[MISSING]** "Presupuesto" amount, event price, staff or materials assignment, calendar blocking; lost or cancelled status.
   - **[DATA]** Dates are 2025. Drawer title "Cumpleaños de Martina" is for client "Sofía Ramírez", the same name as the student in images 7, 10, 15. Timeline order is odd ("Hace 2 días" listed after "Hoy").
   - Tagline here ("CREAR TAMBIÉN ES ENCONTRARSE") differs from images 5 and 9.

---

## 3. Cross-cutting analysis

### 3.1 Screen inventory versus the proposal

#### Public pages (six in the proposal)

| Proposal page | Mockup status | Image ids | Notes |
|---|---|---|---|
| Inicio | has mockup | 5 | Adds testimonials not in text |
| Talleres mensuales | has mockup | 9 (listing), 6 (detail plus form), 7 (materials), 10 (confirmation) | Full enrollment path covered |
| Workshops | has mockup (partial) | 8 | Listing and expanded card; no workshop registration form, no detail page |
| Eventos privados | has mockup | 13 | Form misses email, contact preference, duration, materials |
| Quienes somos | has mockup | 12 | No video block |
| Contacto | partial | 12 (section only) | No separate page; no contact form; embedded section with address, hours, social, map |

Extra public screens not in the proposal list: confirmation page "Solicitud registrada" (10). Nav items in mockups that are not among the six pages: "Tienda" (8, 12), "Diario" (6, 7), "Galería" (10, 13), "Preguntas frecuentes" (10), "El espacio" (9), "A domicilio" (13), "Materiales" (6, 7, 10). Label variants of Quiénes somos: "Nosotras" (6, 7, 9), "Sobre nosotras" (10, 13), "Sobre mí" (8).

#### Admin modules (nine in the proposal)

| Proposal module | Mockup status | Image ids | Notes |
|---|---|---|---|
| Panel general | has mockup | 11 | Lacks señas and ingresos registrados; extra KPIs |
| Gestión de alumnas | has mockup | 16 (list), 15 (ficha) | Ficha tabs other than "Resumen" not shown |
| Cuotas y asistencia | partial | 15, 16 | Only inside the student record and list; no standalone module, no per-class attendance-taking screen, no cuota-generation or "Registrar pago" or "Registrar recuperación" dialogs |
| Talleres y workshops | has mockup (partial) | 14 | Monthly edit drawer only; no workshop form (fecha, seña, cupo mínimo), no "Nueva actividad" form |
| Inscripciones | no mockup | none | The screen where the owner verifies payment and confirms a request is not shown (image17 shows material-order states only) |
| Profesores | partial | 18 (settlement table), 14 (percentage field) | No teacher list or profile; no "modalidad propia o de terceros" |
| Materiales | has mockup | 19 (catalog), 17 (orders and supplier order) | No supplier field on materials |
| Eventos privados | has mockup | 20 | Pipeline statuses added |
| Recordatorios | has mockup | 4 | Built on WhatsApp templates; **[API-FLAG]**; no email variant |

Sidebar actually used in all 9 admin mockups (8 items): "Resumen", "Alumnas", "Talleres", "Workshops", "Materiales", "Eventos privados", "Recordatorios", "Métricas". It adds "Métricas" (not in the proposal's module table), splits "Talleres" and "Workshops" into two items although image14 puts both on one page behind a tab, and has no entry for "Inscripciones", "Profesores" or "Cuotas y asistencia". There is no login or user-management mockup, although the text promises protected access for administrator users.

#### Metrics and indicators (six in the proposal)

| Indicator | Mockup status | Image ids | Notes |
|---|---|---|---|
| Ocupación | has mockup | 11, 18, 14 | Percent by taller; enrolled/available per activity in 14; workshops aggregated as one row in 18 |
| Conversión | has mockup | 11, 18 | Stage definitions conflict (3 versus 4 stages) |
| Ingresos registrados | has mockup | 18 | By month and category (Cuotas, Señas, Materiales); not by activity |
| Alumnas (participación, recurrencia, asistencias, faltas, recuperaciones) | partial | 18 ("Alumnas recurrentes"), 15, 16 | Aggregate attendance, absence and recovery metrics not shown |
| Materiales (by state, project, taller, period, supplier) | partial | 17, 11 (KPI) | Counts by state only; no metrics view |
| Profesores | has mockup | 18 | Settlement table plus "Exportar CSV" |

#### Twelve-step monthly enrollment flow

| Step | Content | Mockup | Image ids |
|---|---|---|---|
| 1 | Select monthly taller and enter personal data | has mockup | 9, 6 |
| 2 | System shows teacher, days, times, fee, seats | has mockup | 6 (also 9) |
| 3 | Access the materials catalog for that taller | has mockup | 6 (CTA "Seleccionar materiales"), 7 |
| 4 | Select materials, quantities, variants (mandatory) | has mockup | 7 |
| 5 | Review summary with fee, materials and total | has mockup | 7 |
| 6 | Confirm; saved as "Pendiente de confirmación" with order number | has mockup | 7 (confirm button), 10 |
| 7 | WhatsApp opens with prefilled message (student, taller, materials, order, total) | partial | 7, 10 (button only; the prefilled message itself is not mocked) |
| 8 | Owner sends alias and checks seats | partial | 10 (student-side step 2); no owner-side screen |
| 9 | Student makes one transfer | has mockup (informational) | 10 |
| 10 | Student attaches proof in WhatsApp | has mockup (informational) | 10 |
| 11 | Owner verifies payment and sets the order to "Cobrado" | partial | 17 (state exists); the control is not shown; "Registrar pago" in 15 |
| 12 | System confirms enrollment, discounts seat, records fee and materials, links to the ficha | partial | results visible in 14 (seat counters) and 15 (cuota, material order); no confirmation or email step |

Order states: "Pendiente de confirmación" (10, 17), "Cobrado" (16, 17), "Solicitado al proveedor" (15, 17), "Recibido" (17) are all visible.

#### Other proposal items

| Item | Mockup status | Notes |
|---|---|---|
| Cartelería interior (Google Reseñas and Instagram QR/NFC) | no mockup | Only the Linkealo logo (image2) appears |
| Pricing and payment terms | no mockup | Text tables only |
| Mobile experience | no mockup | Every UI image is a desktop canvas |
| Email notifications (new scope) | no mockup | No template, preview or send-log screen exists |
| Login and permissions | no mockup | |
| SEO | not visual | |
| Workshop policies page or modal ("Ver condiciones") | no mockup | Only a link in 6 and a footer note in 8 |

### 3.2 WhatsApp Business API scope check

Depends on API-only behavior (must change under the email-only scope):
- **image4:** Meta-style template chips, WhatsApp phone preview, and the note "El envío automático o masivo requiere WhatsApp Business API." Automatic or bulk sending to the 8 selected students needs the API; without it only manual one-by-one wa.me chats are possible. Rebuild as an email reminder composer (subject, body, variables, email preview, sent log, consent flag), or a one-by-one wa.me queue.
- **image10:** "Te enviaremos los detalles por WhatsApp para continuar con el pago." Ambiguous; if it means a system-initiated WhatsApp message, it needs the API. In-scope reading: the student clicks "Continuar por WhatsApp" (wa.me prefilled) and the owner replies manually.
- **image16:** quick action "Enviar recordatorio" must route to the email reminder flow.
- **image20:** timeline "Se respondió primer mensaje" must be a manual entry (no reply detection without the API).

Fine (wa.me click-to-chat or manual): image7 and image10 CTA "Continuar por WhatsApp"; image9 floating button; image12 header and body "Escribir por WhatsApp"; image13 "Solicitar propuesta por WhatsApp"; image20 "Preparar mensaje por WhatsApp" and the WhatsApp icon next to the phone; image17 "Copiar resumen" (manual copy).

Not depicted at all (so no conflict, but no design either): campaigns, marketing templates and segmentation, send log of automated messages.

### 3.3 Consolidated design-system draft

**Palette (sampled from the PNGs; approximate)**

| Token | Hex | Use |
|---|---|---|
| Sand (brand base) | #E6D7C4 | Logo tile, sidebar (#E5D6C3 to #EADDCF, nearly flat), beige header bands (#E6D8C8 to #E7D9C6) |
| Sand deep (tonal active) | #D5C1A9 to #DCCBB8 | Active sidebar item in most admin screens; icon circles |
| Cream (page) | #F9F6F1 | Admin page; public heroes #F9F3ED to #F5F1EB |
| Surface | #FBF7F3 (range #FAF7F2 to #FCF8F4); white #FFFFFF on public cards (5, 9) | Cards, inputs, drawers |
| Surface tint | #F5EFE8, #F2ECE4, #EFE7DD | KPI cards, table headers, summary boxes |
| Clay brown (primary) | #936D53 (range #8D6A50 to #9C7359) | Primary buttons, active chips and pills, checkboxes, bars; filled active nav pill in images 4 and 18 (#9B775F, #A17C5F) |
| Clay light | #A27E66 | Link text; chart brown #B08F74, #9A765B |
| Sage | #A6A992 | Chart bars, capacity bars; soft fills #D4D5C2, #D8DEC9, #DBE3CF for "good" badges; deep olive #7D7F6B (image10 CTA), toggles #868A78 to #869175 |
| Tan | #E3D1BC, #DECAB1, #E7D8C5 | Chart series, pale chips |
| Attention soft | #E2CDBB, #ECD1B7 (pending, new); #EDD6CD (absence); #EBCDA6 (supplier requested) | Status badges |
| Kanban headers | #E5D4C1, #ACB6A4, #D7B8A1, #EBDDC5 | Pendiente de confirmación, Cobrado, Solicitado al proveedor, Recibido |
| Text | headings near #000000 to #111111; body #5E5B57; labels #4C4B4B; muted #908E8A; eyebrows #968A7E; table headers #7E7872 | |
| Semantic | success or trend #038F4D; destructive #CA3D28 (trash icons); chat ticks #52A1C6 (phone preview only) | |
| Lines | borders #EDE8E4; dividers #E9E3DB | |
| Not part of the client system | TR_WebStudio navy #090E21 with blue #3766B8; Linkealo navy #0B112A with blue #017FFE to #0E32FE | Agency and partner logos only |

**Typography (family names unclear; estimates)**
- Display: high-contrast, light serif with elegant italics, closest to Cormorant Garamond, for public H1/H2 and also admin H1, card titles and KPI numerals. Image19 (and some admin headings) look sturdier, Playfair-like. Sizes at the 1672 px canvas, estimated from measured cap heights: public H1 about 55 to 60 px on most pages (images 5, 8, 12, 13), 70 px (image6) and 90 px (image9); admin H1 about 40 to 60 px (images 4, 11, 14, 15, 16, 17, 18, 19, 20); KPI numerals about 40 px. The H1 scale is therefore inconsistent from page to page and needs one type scale.
- UI and body: clean geometric or humanist sans (Montserrat or Mulish-like), 13 to 16 px; table text about 13 px.
- Eyebrows, nav (public), column headers: uppercase, wide letter-spacing (about 0.15 to 0.2 em), 11 to 12 px.
- Accent: handwriting script used only as a photo overlay note ("Crear también es una forma de volver a ti"), and calligraphic monogram.

**Spacing, radius, elevation (approx., 1672 px canvas)**
- Generous whitespace; gutters about 24 px; card padding about 20 to 24 px; hairline 1 px borders; very soft shadows on public cards, almost none in admin.
- Cards: radius about 8 to 12 px. Admin buttons: about 12 px. Public hero CTAs, filter pills, badges and status pills: fully rounded (pill). Inputs: about 6 to 8 px. Photos: about 8 to 12 px. Avatars: circles.
- Sidebar width varies from 218 to 279 px across the admin screens; drawers about 355 to 400 px.

**Components**
- Buttons: filled clay with white text (primary), outlined (secondary), text link with arrow, icon plus label. Sage "positive" button (image20) and olive WhatsApp CTA (image10).
- Chips and badges: filter pills (filled when active), size chips, soft-fill status badges with optional check, clock or dot icon.
- Tables: tinted header, light dividers, avatar plus name cells, selected row tint plus left accent bar (image16), inline progress bars (11, 14).
- Drawers: right panel with close "x", form fields, primary plus outlined footer (14, 16, 19, 20).
- Forms: label above field, light placeholders, asterisk for required (19), select with chevron, date with calendar icon, brown checkbox, sage toggles, quantity stepper.
- Navigation: public top bar (logo or tile, 5 to 6 text links, underlined active, CTA pill, search and bag icons); admin sidebar (8 items, thin-line icons).
- Charts: vertical and horizontal bars, stacked bars, trapezoid funnels, progress bars, all in the clay, sage and tan family.
- KPI card: icon circle, label, serif number, optional green trend arrow, drill arrow.
- Imagery: warm photographic macro shots of hands crafting; beige linen, dried flowers, speckled stoneware; torn-paper collage with script note on the home page; portrait avatars. Photography appears synthetic or stock and must be replaced (the proposal excludes professional photo and video production).
- Iconography: thin-line outline icons; the set is inconsistent (sidebar "Workshops" icon is a leaf in most screens, a calendar in 14 and 19, a gift in 17, a graduation cap in 18).

**Brand tone:** calm, warm, handmade, "sin apuro", feminine and community-oriented ("alumnas", "profesora", "Cami y Agus"). Public copy uses Argentine voseo ("Inscribite", "Elegí", "Podés", "Vení a conocernos") with slips into neutral "tú" forms (image4, 8, 11, 15, 16).

**Measured contrast (approximate, from the renders)**
- White on primary clay #936D53: 4.6 to 1 (passes AA for normal text, barely); on #9C7359: 4.2 to 1 (fails); on olive #7D7F6B: 4.1 to 1 (fails).
- Muted text #908E8A on cream: 3.0 to 1; eyebrows #968A7E: 3.1 to 1; link #A27E66: 3.4 to 1; placeholders #BCB8B4: 1.9 to 1; white on sage #A3A591 (image20 button): 2.5 to 1; pale tan chart bars versus cream: 1.4 to 1. All fail AA text or non-text thresholds and need darker values in production.
- Body text #5E5B57 on cream: 6.3 to 1 (passes).

**Inconsistencies to normalize before building:** header band beige (5, 9) versus cream (6, 7, 8, 10, 12, 13); active admin nav as filled clay pill (4, 18) versus tonal sand (11, 14, 15, 16, 17, 19, 20); admin top bar variants (search, wordmark, breadcrumb, label); button shape (pill versus about 12 px); logo lockup (monogram only, tile plus spaced caps, serif wordmark, "TALLERES CREATIVOS" subtitle); tagline variants.

### 3.4 Consolidated data-model hints

**Entities and fields seen**
- **Student (alumna):** name, avatar, email, phone with country prefix, city, join date ("Se unió el ..."), status ("Alumna activa"; inactive if idle more than 30 days, image11), interest notes, timestamped notes with author (15), enrolled activities (many).
- **Activity (taller mensual or workshop):** name, type, category or technique ("Arte textil", "Técnica"), teacher, schedule (weekday plus time range for monthly; date plus time range for workshops), turnos (image6), class duration (2 horas, 4 or 5 horas), price (monthly fee "Arancel mensual / Cuota mensual", or workshop price), seña (workshops), max capacity, enrolled count, available seats (max minus confirmed), published flag, enrollment paused flag, image, description, project gallery, materials-included flag, teacher percentage (60 in 14), policy text.
- **Teacher (profesora/profesor):** name, avatar, short bio ("Artista textil y tallerista"), agreed percentage (per activity), activities, estimated settlement; own or third-party modality (text only, not seen).
- **Enrollment or request (solicitud / pedido):** order number (CI-YYYY-NNNN), student, activity, turno, status, fee, material lines, total to transfer, date, payment proof (WhatsApp, not stored), policy acceptance.
- **Cuota or payment:** student, period (month), amount, payment date, concept ("Mensualidad", covers 4 classes), status (Pagada, Pendiente); income categories: Cuotas, Señas, Materiales.
- **Class session and attendance:** activity, date, time, class number within the month, student, status (Asistió, Faltó, Recuperada), pending-recovery count, recovery record.
- **Material (catalog):** name, description, image, base price (ARS), variations (label, price, swatch), availability flag, type, category (Bastidores metálicos, Kits de hilos), assigned activities (many), active flag. Supplier and stock are implied but not shown.
- **Material order:** ID (M-NNNN), student, activity, item lines (item, variant, quantity), amount, status, date, supplier, estimated delivery.
- **Supplier (proveedor):** name, phone, location, notes; consolidated order rows (shape or reference, image, quantity, measure, usage in talleres).
- **Private event inquiry:** client name, event type (with adult or child variant), tentative date, participants, ages, modality (En el local or A domicilio), preferred activity, phone, email, Instagram, city, message, internal notes, status, history timeline.
- **Reminder or message template:** name (Próxima clase, Materiales, Pago pendiente, Cambio de horario), body with variables {{nombre}}, {{actividad}}, {{fecha}}, {{hora}}, 1000-character limit, recipient filters (activity, next-class window, cuota status).
- **Testimonial (public home):** author, quote, rating, avatar. Source undefined.
- **Admin user:** name, role label "Administradora", avatar.

**Relationships:** Student M:N Activity (through Enrollment). Enrollment 1:N Payments (cuota, seña, materials) and 1:N Material order lines. Activity N:1 Teacher; Activity 1:N Class sessions; Class session N:M Student via Attendance. Material M:N Activity; Material N:1 Supplier (implied). Material order N:1 Student and N:1 Activity; Supplier order aggregates many Material orders. Event inquiry is separate from Student (the same name appears in both). Notes N:1 Student with author.

**Statuses seen**
- Order or request: "Pendiente de confirmación", "Cobrado", "Solicitado al proveedor", "Recibido".
- Cuota: "Pagada", "Pendiente".
- Attendance: "Asistió", "Faltó", "Recuperada".
- Student: "Alumna activa" (and inactive over 30 days).
- Event inquiry: "Consulta nueva", "Presupuesto enviado", "En seguimiento", "Confirmado".
- Material: "Disponible" toggle and "Desactivar".
- Activity: "Publicado" toggle and "Pausar inscripciones"; full activity shows "0 lugares".
- Student materials column: "Cobrado", "Sin pedido".

**Business rules revealed by example values**
- A monthly taller is a weekly class of about 2 hours; the monthly fee covers 4 classes (15).
- Capacity is 10 or 12 per class; seats left shown as "N lugares disponibles"; seats only count confirmed (paid) enrollments (14, text).
- Monthly fees seen: $35.000 (7), $40.000 to $45.000 (14, 18), $48.000 (10), $58.000 to $62.000 (9). Workshop prices $68.000 to $82.000 with seña $20.000 to $28.000 (8, 14); not a fixed percentage.
- Workshop policy: seña confirms the seat; cancel up to 72 hours before; no refund for absence (8).
- Teacher settlement = revenue attributed to the activity x agreed percentage (50 or 60 in 14, 18).
- Order total = monthly fee + materials subtotal, paid in one transfer (7, 10).
- Funnel percentage is relative to the number of requests (18).
- Inactivity threshold of 30 days (11).
- Opening hours Tuesday to Saturday 10:00 to 19:00 (12).

### 3.5 Cross-screen data conflicts (placeholder data; do not treat any single image as the source of truth)

| Attribute | Values seen (image ids) |
|---|---|
| Encordado monthly fee | $45.000 (6, 14); $35.000 (7); $48.000 (10); $58.000 (9) |
| Encordado schedule | Miércoles 18:00 a 20:00 (6); Lunes 10:00 a 12:00 (9, 14); Martes 18:30 a 21:00 (5); Sáb 12 sep 10:00 a 13:00 (11) |
| Encordado teacher | Valentina Ríos (6, 9); Sofía Rivas (14); Sofía R. (11) |
| Bordado | $58.000 Martes with Camila Torres (9); $42.000 Miércoles with Lucía Torres (14); Jueves 18:30 to 21:00 (5); Mar 8 sep 17:00 with Lucía M. (11) |
| Acuarela | $58.000 Miércoles with Sofía Méndez (9); $40.000 Viernes with Martina López (14); Sábados 10:00 to 12:30 (5); Mié 9 sep 10:00 to 13:00 (11) |
| Class length | 2 h (6, 9, 14); 2.5 h (5); 3 h (11) |
| Ceramic workshop 12 abr | "Cerámica inicial" (5); "Cerámica botánica" $82.000, seña $25.000, 8 cupos, Valentina Ríos, 5 h (8); $28.000 seña, 10/10, Valentina Cruz, 10:00 to 14:00 (14) |
| Material catalog | Gold metal hoops $8.500 to $9.800 (7); wood punch-needle hoops $12.500 to $14.500 (19); kits $12.500 (7) versus $28.000 (19); "Cuerda de algodón" lines (10); metalwork pieces (17) |
| Order IDs | #CI-2026-0148 (10); #CI-2024-087 (15); #M-0017 to #M-0023 (17) |
| Order arithmetic | 48.000 + 11.800 + 5.900 = 65.700, shown 65.800 (10) |
| Revenue arithmetic | Teacher table sum $4.932.300 versus KPI $4.892.300 (18) |
| September 2026 KPIs | Occupancy 76% (11) versus 78% (18); conversion 58% (11) versus 42% (18); requests 36 (11) versus 320 (18); active students 48 (11) versus 98 in the teacher table (18) |
| Funnel stages | 3 (11); 4 with "Contactos" and "Entrevistas" (18) |
| Currency, phone, city | "$ 45.000" ARS (most); "$1,800 MXN" and +52 (15); +34 and Madrid (16); +56 and Santiago, Chile (17) |
| Year | 2024 (15, explicit); 2025 (4, 8 and 14 by weekday match; 17 and 20 explicit "abr 2025"); 2026 (11 and 18 explicit; 10 only through the order number); no year or weekday (5) |
| Admin user | María Pérez (4); Admin (11); Carla (14); María Torres (15, 16); María (17); María Paz (18); "CI" (19); none (20) |
| Studio hours versus classes | Tue to Sat 10:00 to 19:00 (12) versus Monday classes (9, 14) and evening classes until 21:00 (5) |
| Tagline | "Crear también es una forma de volver a ti" (5); "... de estar bien." (9); "CREAR TAMBIÉN ES ENCONTRARSE" (20) |
| Public nav lists | Eight different lists across images 5, 6, 7, 8, 9, 10, 12, 13 (seven distinct item sets; images 6 and 7 differ only in item order) |

### 3.6 Open questions for the product owner

**Scope and channel**
- (4, 16) Is the reminders screen to be rebuilt for email? Which events send an email (request received, payment confirmed "Cobrado", class reminder, pending cuota, schedule change, material received) and who triggers them: a button, a schedule, or a status change?
- (4) Does "Preparar envío por WhatsApp" become a sequential list of wa.me links for the selected students, or is the WhatsApp channel dropped from reminders?
- (10) Is "Te enviaremos los detalles por WhatsApp" to be replaced by an email summary? Should the public flow also send the student an email on registration?
- (20) Is "Se respondió primer mensaje" a manual log entry or expected automatic tracking?
- (all) Are these mockups illustrative or contractual? They contain out-of-scope items ("Tienda", cart, "Diario") and conflicting data, and the proposal carries no disclaimer.

**Information architecture**
- (5, 6, 7, 8, 9, 10, 12, 13) Which navigation is canonical? The six pages (Inicio, Talleres mensuales, Workshops, Eventos privados, Quienes somos, Contacto) versus the variants with "Tienda", "Diario", "Galería", "Preguntas frecuentes", "El espacio", "A domicilio", "Materiales". Are "Galería" or "Preguntas frecuentes" wanted as additional pages?
- (12) Are "Quiénes somos" and "Contacto" one page or two? Is a map embed acceptable given that the proposal excludes Google Maps work?
- (all) Mobile layouts are missing for the public site and the enrollment flow; are mobile mockups needed before development, and is the admin desktop-only?
- (all) One header CTA label: "Ver actividades", "Reservá tu lugar", "Quiero sumarme", "Escribir por WhatsApp" or "Reservar taller"?

**Business data and rules**
- (6, 7, 9, 10, 14) What are the real monthly fees, workshop prices and seña amounts? Is the seña a fixed amount or a percentage? (8, 14)
- (5, 6, 9, 11, 12, 14) Real schedules, class length (2, 2.5 or 3 hours), studio opening days (does the studio open on Monday?) and teachers per taller.
- (6, 14) What exactly is "Turno"? Can one taller have several turnos with separate capacities, and how does the admin form (single day and time) represent them?
- (6, 7, 10, 15) How are returning students identified (phone, email) to avoid duplicate fichas, given that the flow creates no account? How do continuing students pay each following month's fee and choose materials (the text calls materials mandatory for the "inscripción mensual")?
- (15, 16) Is the cuota per student or per activity? How are 5-week months, mid-month joins and proration handled? Why does a student in two activities show one cuota?
- (15) How are recoveries modeled: a status on the missed class, a separate session, a deadline, a maximum number?
- (11) Rename or redefine the "Recuperaciones" alert (inactive students) to avoid confusion with make-up classes; is 30 days configurable?
- (8) Cancellation rules: 72 hours versus the text's "cancelación por falta de cupo mínimo"; where is the minimum seat count stored?
- (14, 18) Is the teacher percentage set per teacher, per activity or per month? What is the base of the settlement (fees only, or also señas and materials)? Where is the own versus third-party modality captured?
- (18, 11) Define each KPI formula (average occupancy simple or weighted, "Alumnas activas", "Alumnas recurrentes", conversion stages). Remove or define the "Contactos" and "Entrevistas" stages.
- (7, 17, 19) What is the real materials catalog? Is there a supplier per material, stock, or cost versus sale price? How do the enrollment order and the supplier order relate (one order number or two)?
- (17) How does a card change state (drag, button) and what does each change trigger?
- (13, 20) Final list of event types, whether a budget amount is stored, and extra statuses (lost, done). Add email, contact preference, duration and materials to the public form as the text requires.
- (5) Where do testimonials come from (admin entry, Google Reviews) and do the people consent to appear?
- (12) Are "Cami y Agus", "2021", the address "Fray Mamerto Esquiú 1234", the number "+54 9 351 555 1234" and "hola@calmainquieta.com.ar" real or placeholders? What domain will be used?

**Missing screens to design**
- (no image exists) Inscripciones module (verify payment, confirm, assign manually), Profesores module, Cuotas y asistencia module (take attendance per class, generate fees), "Registrar pago" dialog, "Registrar recuperación" flow, workshop edit form and registration form, "Nueva actividad" and "Agregar alumna" forms, login and user management, email notification templates and log, empty, full and error states (what a full taller or workshop shows publicly: waitlist?), the prefilled WhatsApp message content, and the two QR/NFC signs.

**Visual and locale cleanup**
- (15, 16, 17) Replace MXN, +52, +34, +56 and Madrid or Santiago placeholders by ARS formatting ("$ 45.000"), +54 351 numbers and Córdoba. Choose one date format and one time format ("10:00 a 12:00" versus "10:00 – 12:00" versus "de 18:00 a 20:00 h").
- (all) Choose one voice: Argentine voseo throughout, including the admin.
- (all) Confirm the licensed typefaces and the official logo lockup; replace synthetic photography with client-supplied photos.
- (7, 10) Fix the order total arithmetic and keep prices consistent across the flow.
