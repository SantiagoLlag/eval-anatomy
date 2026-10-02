---
schema: eval-anatomy/v1
id: e05-carga-cognitiva
name: Carga cognitiva
version: "0.1.0"
status: approved
language: es
summary: 'Mide si el artefacto obliga a recordar, buscar o leer dos veces lo que podría verse de una vez.'
authors:
  - name: Santiago Llaguno
    github: SantiagoLlag
owner: Santiago Llaguno
license: CC-BY-4.0
created: "2026-10-01"
updated: "2026-10-01"
contact: https://github.com/SantiagoLlag/eval-anatomy/issues
source_format: vault-evals
applies_to: [web, app, folleto, pdf, presentacion, reporte-markdown, dashboard]

purpose:
  question: '¿El artefacto deja ver de una vez lo que el lector necesita, sin obligarlo a recordar, buscar o leer dos veces?'
  decision: 'Si el documento se entrega como está o vuelve a corrección: cada pregunta en FAIL dice qué parte rehacer y la nota de 1 a 5 resume cuánto falta.'
  construct: 'Carga extraña: la parte del esfuerzo de la memoria de trabajo que viene de cómo se presenta el contenido. Se observa en 10 preguntas sí/no: figura y explicación en lugares distintos, texto en pantalla que repite la voz, prosa que repite la figura, movimiento o sonido sin pausa, sistemas de más de 4 partes sin presentación previa, adornos sin función, conjuntos retenidos o listas visibles de más de 4 elementos sin subgrupos con nombre, números de 5 o más dígitos sin partir y primera pantalla sin lector nombrado.'
  out_of_scope:
    - 'Menús largos, reconocer en vez de recordar, una acción principal por pantalla y las tres filas de la ley de Fitts: van a otra eval del autor sobre artefactos interactivos (E08).'
    - 'Las hojas de juez humano de carga cognitiva autoinformada: son de la calibración; el juez LLM no las aplica.'
    - 'Párrafos de más de 6 líneas y oraciones de más de 30 palabras: los mide la eval de claridad (E00-10 y E00-06).'
    - 'Diapositivas con más de 40 palabras: gate extra del perfil de presentación.'
    - 'Figuras sin rótulos (E07) y estilo como sombras, subrayados o texto repetido en color (E06, E11).'
    - 'El desfase en el tiempo entre un rótulo y la voz que lo nombra (contigüidad temporal): queda como aviso.'
  origin_failures:
    - '35 corridas ciegas de la lente de carga cognitiva, del 2026-09-20 al 2026-09-30, sobre guías de estudio, videos narrados, decks comerciales, páginas web, un CV, una bio de LinkedIn y planes de curso.'
    - 'Las 8 filas de documento del mapa de fuentes B1 (carga cognitiva y memoria); las 6 filas de artefactos interactivos pasaron a E08.'
    - 'Fallos plantados en las muestras malas de calibración: lista de 9 ítems, agenda de 10 viñetas, marquesina que no se detiene (ver examples/README.md).'

taxonomy:
  origin: product-eval
  purpose: regression
  moment: offline
  interaction: static
  structure: single-turn
  grader: [code, llm-judge, human]
  judgment: pointwise
  inputs_origin: [real, curated]
  dimension: [text-quality, user-experience]
  system_type: [document-generation]

system:
  fixed: false
  description: 'Cualquier sistema que produce un documento: una persona, un modelo o un flujo con LLM. La eval mira solo el artefacto final, no cómo se hizo.'

cases:
  modality: [text, html, markdown, pdf, screenshot, audio, video]
  source: [curated]
  collected: "2026-09-14"
  tags: [clean-sample, planted-failures]
  examples:
    - id: buena-presentacion
      input: examples/buena-presentacion.html
      reference: 'Sin fallos plantados. scripts/conteos.py --max-items 4 --diapositivas: 4 listas, máximo 3 ítems, 0 listas de más de 4 (E05-08 PASS); 10 diapositivas, máximo 38 palabras y 3 viñetas.'
      tags: [clean-sample, presentacion]
    - id: mala-presentacion
      input: examples/mala-presentacion.html
      reference: 'Fallos plantados P1 y P2: E05-07 FAIL (agenda de 10 puntos que hay que retener) y E05-08 FAIL (listas de 10 y 9 ítems sin subgrupos con nombre).'
      tags: [planted-failures, presentacion]

reference:
  kind: none

criteria:
  - id: E05-01
    question: '¿Cada figura lleva sus rótulos y la frase que la explica en la misma página, pantalla o diapositiva, sin otro bloque en medio y sin remisiones a otro lugar?'
    failure_mode: 'Atención dividida (principio: texto e imagen juntos).'
    evidence: 'Lista de figuras (tablas incluidas) con la ubicación de la figura, de sus rótulos y de su explicación. Lista de remisiones ("ver figura 3", "como muestra el tablero") y dónde está lo señalado. Umbral: 0 figuras con rótulos o explicación en otra página o pantalla; 0 remisiones a una figura o a un dato que vive en otra página, pantalla o archivo. Una remisión a una figura de la misma página no cuenta. En video: cada rótulo sobre su elemento en el mismo fotograma.'
    pass_example: 'Guía de estudio universitaria, corrida 2: la oración que lee la figura 2 ("… llama ejecución a la conducta final…") va justo antes de la figura, en la misma p. 3.'
    fail_example: 'Plan de curso de IA (inteligencia artificial) v2.1: el título "What changed in v2.1" y su frase de entrada están en la p. 1; la tabla que explican, en la p. 2.'
    gate: false
    grader: juez
    sources:
      - https://link.springer.com/article/10.1007/s10648-019-09465-5
    applies_when: 'Hay al menos una figura (una tabla con encabezados cuenta como figura).'
  - id: E05-02
    question: 'Si hay narración, ¿ningún texto en pantalla repite una oración completa de la voz mientras suena?'
    failure_mode: 'Redundancia (a): texto y voz.'
    evidence: 'Guion o audio alineado con el texto en pantalla. Umbral: 0 bloques con 9 o más palabras seguidas iguales a la voz, mostrados mientras la voz las dice. No cuentan los rótulos de hasta 8 palabras, los títulos ni un resumen de una frase. El corte de 9 palabras es convención de este proyecto, tomada de las corridas sobre videos narrados. NA sin guion ni voz.'
    pass_example: 'Guion de un video comercial, ronda 2: el rótulo más largo, "Cita al día siguiente · video de cada visita" (8 palabras), resume una oración de 16 de la voz.'
    fail_example: 'Video de estudio universitario, corrida 1, escena 7 (3:51). La tarjeta "Representaciones colectivas: ideas que una sociedad comparte y que pesan sobre cada persona" sale mientras la voz dice esas 13 palabras.'
    gate: false
    grader: juez
    sources:
      - https://link.springer.com/article/10.1007/s10648-019-09465-5
    applies_when: 'Hay narración o voz.'
  - id: E05-03
    question: '¿Ningún bloque de prosa junto a una figura repite lo que la figura ya muestra?'
    failure_mode: 'Redundancia (b): prosa y gráfico.'
    evidence: 'Para cada figura, las oraciones de prosa que la rodean. Umbral: 0 bloques de 3 o más oraciones seguidas que solo repiten rótulos, valores u orden de la figura. No cuentan el título, el pie de figura ni un resumen de hasta 2 oraciones que dé la conclusión. Explicar (decir lo que la figura no muestra) sí vale; describir (repetir sus rótulos) no. El corte de 3 oraciones es convención de este proyecto. NA si no hay figuras con rótulos.'
    pass_example: 'Guía de estudio sobre pertenencia, corrida 2: bajo el esquema de la p. 7 queda una sola oración, "El esquema se lee de adentro hacia afuera…".'
    fail_example: 'Guía de estudio sobre pertenencia, corrida 1: dos párrafos (7 oraciones, 85 palabras) bajo el esquema repiten sus rótulos: "Al centro están los sujetos con sus cuerpos. Los rodean los grupos, luego la organización…".'
    gate: false
    grader: juez
    sources:
      - https://link.springer.com/article/10.1007/s10648-019-09465-5
    applies_when: 'Hay figuras con rótulos.'
  - id: E05-04
    question: '¿Todo lo que se mueve o suena (video, audio, animación, texto que se desplaza) se puede pausar o viene en trozos que el lector reanuda?'
    failure_mode: 'Información transitoria.'
    evidence: 'En HTML: `<video>` y `<audio>` con `controls`; 0 `autoplay` sin controles; 0 `<marquee>`; animaciones que no quitan contenido. En un video: el reproductor pausa, cada escena termina con todo su contenido en pantalla y hay un corte entre escenas. Umbral: 100 % con pausa o en trozos. NA si nada se mueve.'
    pass_example: 'Web de un negocio de servicios: 0 `<video>`, 0 `<audio>`, 0 `autoplay`; la única animación dura 0,7 s, no quita contenido y se apaga con `prefers-reduced-motion`.'
    fail_example: 'Muestra de calibración `mala/pagina.html` (no incluida aquí): un `<marquee>` con texto que se desplaza solo y no se puede detener. En las 35 corridas ciegas ninguna falló esta fila.'
    gate: false
    grader: [conteos, juez]
    sources:
      - https://link.springer.com/article/10.1007/s10648-019-09465-5
    applies_when: 'Algo se mueve o suena.'
  - id: E05-05
    question: 'Cuando un bloque junta más de 4 partes que se nombran entre sí, ¿hay antes un bloque que presenta cada parte por separado?'
    failure_mode: 'Elementos aislados antes de integrarlos.'
    evidence: 'Lista de sistemas o procesos con más de 4 partes (un ciclo, una pila de herramientas, un esquema, una clave de códigos). Para cada uno, el bloque anterior con una línea por parte: glosario, lista o una oración por parte. Umbral: 0 sistemas de más de 4 partes sin bloque previo. Una línea dentro del mismo diagrama que las une no es "previo". En narración, cada parte nueva entra en su propia oración antes de la oración que las junta.'
    pass_example: 'Plan de curso de IA v2.3: "Words used in this plan" (p. 2) presenta Project, Connector, Skill, Routine, Cowork y Memory, una línea por parte, antes de la primera sesión (p. 4).'
    fail_example: 'Deck comercial para un cliente, diap. 8: un ciclo de 5 partes ("Diagnóstico" → "Resultados y plan" → "Práctica" → "Análisis continuo" → "Nuevo diagnóstico"); antes solo se había presentado "Práctica".'
    gate: false
    grader: juez
    sources:
      - https://link.springer.com/article/10.1007/s10648-019-09465-5
      - https://doi.org/10.1017/S0140525X01003922
  - id: E05-06
    question: '¿Cada imagen, icono, fondo, animación, anécdota o dato curioso aporta algo que la idea de su bloque usa?'
    failure_mode: 'Detalles seductores (adornos irrelevantes).'
    evidence: 'Lista de elementos y, para cada uno, una frase con su función. Función: aporta un dato, una relación o una ubicación, o identifica un producto o marca que el texto no da. "Decora", "da ambiente", "atrae" y "da contexto" no cuentan. Umbral: 0 elementos sin función nombrable. Sin función: imagen de fondo detrás de texto, logotipo repetido en la misma pantalla, icono que repite el texto de su tarjeta, anécdota que ningún dato del bloque usa.'
    pass_example: 'Guía de estudio sobre pertenencia: el obrero que resuelve problemas en sueños (l. 119) ilustra "La pertenencia viaja con uno"; el recuadro verde marca dónde empieza "En una frase".'
    fail_example: 'El mismo deck comercial, diap. 6, 9 y 10: 4 círculos beige vacíos y 7 iconos (palomita, candado, birrete…) sobre tarjetas cuyo texto ya dice lo mismo.'
    gate: false
    grader: juez
    sources:
      - https://link.springer.com/article/10.1007/s10648-020-09522-4
  - id: E05-07
    question: '¿Cada conjunto que el lector debe retener sin verlo tiene 4 elementos o menos, o está partido en subgrupos de 4 o menos con nombre?'
    failure_mode: 'Límite de la memoria de trabajo: unos 4 trozos.'
    evidence: 'Lista de conjuntos retenidos. Cuentan: pasos o partes anunciados con un número y desarrollados después; enumeraciones y cifras dentro de una oración; códigos definidos en otra página; opciones de un diálogo que se cierra. Umbral: hasta 4 pasa; 5 pasa con aviso; 6 o más falla, salvo subgrupos de hasta 4 con nombre. Un conjunto anunciado no se retiene si sigue a la vista: índice o figura en la misma página, o rótulo de posición en cada diapositiva ("3 de 10"). Las listas visibles van a E05-08.'
    pass_example: 'Guía de estudio sobre pertenencia, corrida 2: "La pertenencia pasa por 6 niveles, en 2 grupos de 3", con "Tres niveles miran a la sociedad" y "Tres niveles miran a la persona".'
    fail_example: 'Plan de curso de IA v2.1, línea 215: una oración con 9 cantidades que hay que sumar de cabeza. Dice: "8 sessions, weekly, 16 h total (M0 90 min · M1–M6 2 h · M7 2.5 h) + two 45-min clinics (day 30 / day 60)".'
    gate: false
    grader: juez
    sources:
      - https://doi.org/10.1017/S0140525X01003922
  - id: E05-08
    question: '¿Toda lista visible de 5 o más elementos está partida en subgrupos de 4 o menos con nombre?'
    failure_mode: 'Capacidad limitada: agrupar, no recortar.'
    evidence: 'Salida de `scripts/conteos.py --max-items 4`: `listas.listas_con_mas_de_4_items` (sección, ítems, subítems) y `listas.max_items_por_lista`. Más las listas que el script no ve, contadas a mano: tarjetas, celdas con "·", pasos en prosa. Umbral: hasta 4 pasa; 5 pasa con aviso; 6 o más falla si no hay subgrupos con nombre (subtítulo o categoría). No se recortan: se agrupan. Los menús de navegación y las filas de una tabla no cuentan aquí (menús: E08).'
    pass_example: 'Taller universitario de teorías, corrida 2: "cinco estudios" partidos en "Dos…" y "Los otros tres…". Video de estudio universitario: las 5 capacidades de la agencia en 2 + 3 (escena 5).'
    fail_example: 'Plan de curso de IA v2.3: `conteos.py` reporta 9 listas de 5 a 7 temas (M1 y M2 con 7) sin subgrupos. Muestra de calibración `mala/reporte.md`: "Plan de acción" con 9 ítems seguidos.'
    gate: false
    grader: [conteos, juez]
    sources:
      - https://www.frontiersin.org/articles/10.3389/fpsyg.2012.00230/full
      - https://doi.org/10.1017/S0140525X01003922
  - id: E05-09
    question: '¿Todo número de 5 o más dígitos que el lector copia o dicta va partido en grupos de 2 a 4?'
    failure_mode: 'Trozos en números largos.'
    evidence: 'Coincidencias de `[0-9]{5,}` sobre el texto visible, con su ubicación. Umbral: 0 secuencias de 5 o más dígitos seguidos sin espacio, guion, punto ni coma. Pasan los años de 4 cifras y los importes con separador de miles. No cuentan direcciones web, DOI (código que identifica un artículo), código ni atributos del HTML, porque se copian enteros o se pulsan. Teléfonos, folios, cuentas y claves sí cuentan.'
    pass_example: 'Un CV: los teléfonos van con el prefijo de país y grupos de 2 a 4 dígitos separados por espacios; la expresión regular da 0.'
    fail_example: 'Taller universitario, portada: el número de cuenta del alumno, 9 dígitos seguidos.'
    gate: false
    grader: [conteos, juez]
    sources:
      - https://doi.org/10.1017/S0140525X01003922
  - id: E05-10
    question: '¿La primera página, pantalla o diapositiva nombra a su lector y, si puede, lo que ya sabe del tema?'
    failure_mode: 'Audiencia declarada (inversión por pericia).'
    evidence: 'Cita de la primera página, pantalla, diapositiva o de los primeros 10 segundos, y la frase que nombra al lector. Umbral: 1 frase con el lector. Vale nombrarlo por su papel ("capitán", "docente"), por su empresa o por lo que tiene ("su casco"); los dos últimos pasan con aviso. No vale un propósito sin lector ("hecho para armar la matriz") ni una frase que aparece al final o tras el corte "ver más".'
    pass_example: 'Guía de estudio sobre pertenencia, p. 1: "Escrita para Santiago Llaguno López, que ya vio los temas […] y va a armar el mapa mental de la Actividad 2."'
    fail_example: 'Bio de LinkedIn v2: la única frase con el lector es la última del About ("If you''re putting a voice agent in front of customers…"), después del corte "ver más".'
    gate: false
    grader: juez
    sources:
      - https://link.springer.com/article/10.1007/s10648-019-09465-5

graders:
  - id: conteos
    kind: code
    description: 'Cuenta listas e ítems por lista (E05-08), palabras y viñetas por diapositiva. La parte automática se completa con dos búsquedas de texto: `[0-9]{5,}` sobre el texto visible, sin URL, DOI ni código (E05-09), y `<video`, `<audio`, `autoplay`, `controls`, `<marquee` y `animation` en HTML (E05-04). En video, E05-04 pide además mirar que el reproductor pausa y el último fotograma de cada escena. Solo biblioteca estándar de Python 3.'
    script: scripts/conteos.py --max-items 4 --json …
  - id: juez
    kind: llm-judge
    model: Claude
    output_format: reason-then-verdict
    description: 'Decide las 10 preguntas. En E05-04, E05-08 y E05-09 parte de lo que miden los scripts.'
    prompt: |-
      Eres el juez de la eval E05, Carga cognitiva. Mide si el artefacto obliga a recordar, buscar o leer dos veces lo que podría verse de una vez.

      Entradas:
      <tipo>web | app | folleto | pdf | presentacion | reporte-markdown | dashboard</tipo>
      <artefacto>texto, HTML o Markdown; PDF renderizado o capturas; guion con su texto en pantalla, o fotogramas del video</artefacto>
      <scripts>salida de scripts/conteos.py --max-items 4 --json; coincidencias de [0-9]{5,} sobre el texto visible; búsqueda de <video, <audio, autoplay, controls, <marquee y animation</scripts>

      Procedimiento:
      1. Anota qué tienes. Lo que falte vuelve UNKNOWN las preguntas que lo necesitan.
      2. Lee todo el artefacto antes de responder.
      3. Lista todas las figuras (una tabla con encabezados es figura) con tres datos: dónde está, dónde están sus rótulos y dónde está la frase que la explica. Anota cada remisión. Responde E05-01 y E05-03.
      4. Si hay guion o narración, alinea cada texto en pantalla con lo que la voz dice en ese momento; anota los bloques con 9 o más palabras seguidas iguales. Responde E05-02.
      5. Lista cada sistema o proceso con más de 4 partes que se nombran entre sí y busca el bloque anterior que las presenta una por una. Responde E05-05.
      6. Lista cada imagen, icono, fondo, animación, anécdota y dato curioso, y escribe en una frase qué dato, relación, ubicación o marca aporta. Si no sale la frase, no tiene función. Responde E05-06.
      7. Lista los conjuntos que el lector retiene sin verlos y cuenta sus elementos y subgrupos. Responde E05-07 y, con la salida del script más lo que cuentes a mano (tarjetas, celdas con "·", enumeraciones en prosa), E05-08.
      8. Cita la primera página, pantalla o diapositiva (en video, los primeros 10 segundos) y la frase que nombra al lector. Responde E05-10.
      9. Responde E05-04 y E05-09 con la salida de los scripts. En E05-09 descarta direcciones web, DOI y código. En un video, comprueba que el reproductor pausa y mira el último fotograma de cada escena.

      Reglas:
      - En cada pregunta: evidencia citada, razón en 2 frases o menos, veredicto PASS, FAIL, NA o UNKNOWN. Sin evidencia citada, FAIL. UNKNOWN nunca cuenta como PASS.
      - NA solo cuando el objeto no existe: sin figuras, E05-01 y E05-03; sin voz, E05-02; nada se mueve, E05-04. Si el objeto es el propio texto (E05-05, 07, 08, 09) y no hay fallas, PASS citando qué revisaste.
      - E05-01 necesita ver las páginas o pantallas reales; con solo el archivo fuente, UNKNOWN. Las notas del orador que no suenan son otra pantalla.
      - Deja un aviso junto al PASS cuando el caso roza el umbral (5 elementos en E05-07 o E05-08; lector nombrado por su empresa o por lo que tiene en E05-10). El aviso no cambia la nota.

      Errores que no debes cometer:
      - Contar un párrafo o una oración larga como conjunto; contar en E05-07 una lista visible o un menú.
      - Fiarte de conteos.py para E05-08: solo ve viñetas y <li>.
      - Dar PASS en E05-07 a una agenda porque los títulos la repiten: hace falta un rótulo de posición en cada diapositiva o un índice a la vista.
      - Tratar una tabla como si no fuera figura; marcar FAIL en E05-01 una figura sin rótulos (eso es otra eval); contar como remisión "la figura 2 muestra…" con la figura justo debajo; dar PASS en E05-01 con la paginación estimada de un .docx.
      - Aceptar "da contexto", "da ambiente" o "es habitual" como función; pasar un logotipo cuando la marca ya está escrita en la misma pantalla; mandar a E05-06 lo que es estilo.
      - Confundir explicar con describir en E05-03; dar PASS en E05-02 porque "son palabras clave" con 9 o más palabras iguales a la voz.
      - Dar PASS en E05-04 porque "todo reproductor pausa" sin mirar si cada escena termina completa; correr la expresión de E05-09 sobre el HTML fuente.
      - Dar PASS en E05-10 porque se deduce quién lee; marcar NA para no responder.

      Salida: una línea por pregunta, de E05-01 a E05-10, con este formato:
      id | evidencia | razón | veredicto | aviso (opcional)
  - id: humano
    kind: human
    description: 'Hojas de carga cognitiva autoinformada que responde una persona. Se usan en la calibración y no entran en la nota de E05; el juez LLM no las aplica.'

verdict:
  scale: binary-na-unknown
  levels:
    - value: PASS
      anchor: 'Pasa, con evidencia citada. Puede llevar un aviso si roza el umbral; el aviso no cambia la nota.'
    - value: FAIL
      anchor: 'Falla. Sin evidencia citada, el veredicto es FAIL.'
    - value: NA
      anchor: 'No aplica: el objeto de la pregunta no existe (sin figuras, sin voz, nada se mueve).'
    - value: UNKNOWN
      anchor: 'No se pudo ver (falta la captura, el render, el guion o el video). Nunca cuenta como PASS.'
  pass_cut: PASS
  na_rule: 'NA solo cuando el objeto de la pregunta no existe: sin figuras, E05-01 y E05-03; sin voz, E05-02; nada se mueve, E05-04. Cuando el objeto es el propio texto (E05-05, 07, 08 y 09) y la revisión encontró 0 fallas, es PASS citando qué se revisó. UNKNOWN cuando falta lo necesario para ver: E05-01 sin páginas o pantallas reales; E05-02 sin la lista del texto en pantalla; E05-04 en video sin el archivo o sus fotogramas. UNKNOWN se reporta aparte y no entra en el porcentaje. La tabla por tipo de artefacto está en la sección 6 del cuerpo.'

aggregation:
  method: banded-score
  formula: 'PASS / (PASS + FAIL) sobre las preguntas aplicables; NA y UNKNOWN no entran. La nota es la banda más alta cuyo min_pass_rate se alcanza. Un gate fallido deja la nota en 1 (E05 no tiene gates). UNKNOWN nunca cuenta como PASS: se reporta aparte.'
  uncertainty: none
  breakdown: [criterion]
  bands:
    - score: 5
      min_pass_rate: 1.0
      anchor: 'Nada que recordar, nada repetido, nada que distraiga. Ejemplo: la guía de estudio sobre pertenencia en su segunda corrida. Los 6 niveles van en 2 grupos de 3, bajo el esquema queda una sola oración y las 4 palabras nuevas se presentan antes del esquema.'
    - score: 4
      min_pass_rate: 0.85
    - score: 3
      min_pass_rate: 0.70
      anchor: 'Lo básico está en su sitio, pero algo obliga a recordar o a leer dos veces. Ejemplo: la misma guía en su primera corrida. Las figuras van junto a su texto y el lector está nombrado, pero un esquema se describe dos veces y hay 6 niveles sin agrupar.'
    - score: 2
      min_pass_rate: 0.50
    - score: 1
      min_pass_rate: 0.0
      anchor: 'El lector trabaja por el autor. Las tablas quedan en una página y su explicación en otra. La agenda tiene 10 puntos, un ciclo de 5 partes aparece de golpe y nadie dice quién lee. Ejemplo: el plan de curso de IA v2.1, con códigos M0-M7 usados 22 veces antes de presentarlos y una oración con 9 cantidades.'

threshold:
  per_case: 'Cada pregunta trae su umbral en `evidence` (por ejemplo, 0 figuras separadas de su explicación; listas de 6 o más sin subgrupos fallan).'
  gates: []
  rationale: 'Sin gates: al aprobar la versión 0.1.0, el autor decidió que ninguna pregunta reprueba sola el artefacto; la nota sale de la banda.'

validation:
  planted_failures: examples/README.md
  calibration: 'Umbrales fijados con 35 corridas ciegas sobre artefactos reales (2026-09-20 a 2026-09-30): guías de estudio, videos narrados, decks, páginas web, un CV, una bio y planes de curso. Los cortes de 9 palabras (E05-02) y de 3 oraciones (E05-03) son convención del proyecto. Las hojas de carga cognitiva autoinformada quedan para una calibración humana; sin cifras de acuerdo juez-humano publicadas.'
  meta_eval: 'M1-M12 (12 criterios que revisan la propia ficha de eval): 12 de 12 el 2026-10-01, requisito para aprobarla.'

run:
  command: 'python3 -B scripts/conteos.py <archivo> --max-items 4 --json (añade --diapositivas en una presentación); grep -noE "[0-9]{5,}" sobre el texto visible; después, el juez LLM con el prompt del grader juez.'

history:
  - version: "0.1.0"
    date: "2026-10-01"
    change: 'Primera versión. 10 preguntas a partir de las 8 filas de documento del mapa de fuentes B1 (la redundancia se parte en texto-voz y prosa-gráfico; la memoria de trabajo, en conjuntos retenidos y listas visibles) y de 35 corridas ciegas. 0 gates, pendiente de decisión.'
    author: agente E05 (Fase 4)
  - version: "0.1.0"
    date: "2026-10-01"
    change: 'Estado aprobado, con 12 de 12 en el meta-eval M1-M12 y la decisión "sin gate".'
    author: Santiago Llaguno; integró Claude (Fable 5.1)

limitations:
  - 'conteos.py solo ve viñetas y <li>: tarjetas, celdas con "·" y enumeraciones en prosa se cuentan a mano.'
  - 'E05-01 y E05-06 necesitan ver el artefacto renderizado; con solo el archivo fuente, E05-01 es UNKNOWN. La paginación estimada de un .docx no vale.'
  - 'Los cortes de 9 palabras (E05-02) y de 3 oraciones (E05-03) son convenciones del proyecto, no de una fuente.'
  - 'La búsqueda de E05-09 se corre sobre el texto visible; sobre el HTML fuente cuenta direcciones y atributos.'
  - 'Los tipos que el mapa B1 no tiene se asimilan: un guion o video narrado como presentación, un CV como pdf, un texto para una plataforma ajena como web.'
sensitive_data: none
---

# E05 — Carga cognitiva

> Estado: aprobada, versión 0.1.0 (2026-10-01). Sale de las 8 filas de documento del mapa de fuentes B1 (carga cognitiva y memoria) y de 35 corridas ciegas (2026-09-20 a 2026-09-30). Aprobada con 12 de 12 en el meta-eval M1-M12, sin gates. Las 6 filas de artefactos interactivos de B1 van a E08; las 3 hojas de juez humano, a la calibración.
>
> Los ids E00, E01, E06, E07, E08 y E11 que aparecen en el texto son otras evals del mismo autor, todavía fuera de este catálogo.

## 1. Qué mide, en una frase

Mide si el artefacto obliga a recordar, buscar o leer dos veces lo que podría verse de una vez.

## 2. Por qué importa

La memoria de trabajo sostiene unos 4 trozos a la vez ([The magical number 4 in short-term memory](https://doi.org/10.1017/S0140525X01003922)).
Cuando el texto y su imagen van separados, el lector gasta esa memoria en juntarlos y no en entender ([Cognitive Architecture and Instructional Design: 20 Years Later](https://link.springer.com/article/10.1007/s10648-019-09465-5)).
Lo mismo pasa si algo se dice dos veces o si un adorno atrae la vista sin aportar nada ([Cognitive Architecture and Instructional Design](https://link.springer.com/article/10.1007/s10648-019-09465-5); [Keep it Coherent: seductive details](https://link.springer.com/article/10.1007/s10648-020-09522-4)).

Términos que usa este eval, en cuatro grupos:

Sobre la memoria:

- **Carga cognitiva**: esfuerzo que exige la memoria de trabajo al procesar algo nuevo. La parte que viene de cómo se presenta el contenido se llama carga extraña, y es la que mide este eval.
- **Memoria de trabajo**: lo que una persona sostiene en la cabeza mientras lee o escucha. Caben unos 4 trozos.
- **Trozo**: una unidad con sentido: un paso, una cifra, un nombre, una opción.
- **Conjunto retenido**: elementos que el lector guarda en la memoria porque ya no los ve. Ejemplos: pasos anunciados y desarrollados después, cifras dentro de una oración, códigos definidos en otra página.

Sobre las figuras:

- **Figura**: imagen, gráfico, esquema, foto o tabla con datos. En este eval, una tabla con encabezados cuenta como figura.
- **Rótulo**: etiqueta de texto pegada a una parte de la figura: el nombre de un eje, de una caja o de una flecha.
- **Remisión**: frase que manda al lector a otro lugar, como "ver figura 3" o "como se ve en el tablero".
- **Bloque**: una diapositiva, una sección con título, una pantalla o una tarjeta.

Sobre el sonido y las listas:

- **Narración o guion**: el texto que una voz dice en un video o en una presentación.
- **Lista visible**: viñetas, tarjetas o filas que siguen en pantalla mientras se leen.

Sobre el procedimiento:

- **Script**: programa corto que cuenta. Aquí: `scripts/conteos.py` y una expresión regular, que es un patrón de búsqueda de texto.
- **Juez LLM**: un modelo de lenguaje (Claude) que aplica estas preguntas y responde con evidencia.
- **Veredictos**: PASS (pasa), FAIL (falla), NA (no aplica), UNKNOWN (no se pudo ver). Sin evidencia citada, el veredicto es FAIL. UNKNOWN nunca cuenta como PASS.
- **Aviso**: nota que el juez deja junto a un PASS cuando el caso roza el umbral. No es un veredicto y no cambia la nota.

## 3. Cómo evaluarlo

Orden obligatorio en cada pregunta: evidencia → razón (≤ 2 frases) → veredicto. Son 10 pasos en cuatro grupos: primero los scripts, después el juez.

Preparar:

1. Anota qué tienes: texto, HTML o Markdown, PDF con sus páginas, capturas, guion con su texto en pantalla, o video. Lo que falte vuelve UNKNOWN a las preguntas que lo necesitan (sección 6).

Scripts:

2. Corre `scripts/conteos.py --max-items 4` sobre el archivo; en una presentación añade `--diapositivas`. Anota `listas.max_items_por_lista` y cada entrada de `listas.listas_con_mas_de_4_items` (sección e ítems). Cuenta a mano las listas que el script no ve: tarjetas, celdas con "·" y enumeraciones en prosa. Sirve para E05-08.
3. Extrae el texto visible (no el HTML fuente) y busca `[0-9]{5,}`, por ejemplo con `grep -noE '[0-9]{5,}'`. Descarta direcciones web, DOI (código que identifica un artículo) y código. Anota cada coincidencia con su ubicación. Sirve para E05-09.
4. En HTML busca `<video`, `<audio`, `autoplay`, `controls`, `<marquee` y `animation`. En un video comprueba que el reproductor pausa y mira el último fotograma de cada escena. Sirve para E05-04.

Juez, figuras y voz:

5. Lee todo el artefacto antes de responder. Haz una lista de todas las figuras, tablas incluidas, con tres datos: dónde está la figura, dónde están sus rótulos y dónde está la frase que la explica. Anota cada remisión. Responde E05-01 y E05-03.
6. Si hay guion o narración, alinea cada texto en pantalla con la frase que la voz dice en ese momento. Anota los bloques con 9 o más palabras seguidas iguales. Responde E05-02.

Juez, partes, adornos, conjuntos y lector:

7. Lista cada sistema o proceso con más de 4 partes que se nombran entre sí. Para cada uno busca el bloque anterior que presenta las partes una por una. Responde E05-05.
8. Lista cada imagen, icono, fondo, animación, anécdota y dato curioso. Escribe en una frase qué dato, relación, ubicación o marca aporta a la idea de su bloque. Si no sale la frase, el elemento no tiene función. Responde E05-06.
9. Lista los conjuntos que el lector retiene sin verlos: pasos anunciados con un número, enumeraciones y cifras dentro de una oración, códigos definidos en otra página. Cuenta sus elementos y sus subgrupos. Responde E05-07 y, con la salida del paso 2, E05-08.
10. Cita la primera página, pantalla o diapositiva; en un video, los primeros 10 segundos. Busca la frase que nombra al lector y lo que sabe. Responde E05-10.

## 4. Preguntas

Las 10 preguntas, con la evidencia que buscar, un ejemplo PASS y uno FAIL, están en el frontmatter (`criteria`). Aquí queda el principio de cada una y su fuente.

| id | Pregunta | Principio y fuente | Gate |
|---|---|---|---|
| E05-01 | ¿Cada figura lleva sus rótulos y la frase que la explica en la misma página, pantalla o diapositiva, sin otro bloque en medio y sin remisiones a otro lugar? | Atención dividida: texto e imagen juntos. [Cognitive Architecture and Instructional Design](https://link.springer.com/article/10.1007/s10648-019-09465-5) | no |
| E05-02 | Si hay narración, ¿ningún texto en pantalla repite una oración completa de la voz mientras suena? | Redundancia (a): texto y voz. [Cognitive Architecture and Instructional Design](https://link.springer.com/article/10.1007/s10648-019-09465-5) | no |
| E05-03 | ¿Ningún bloque de prosa junto a una figura repite lo que la figura ya muestra? | Redundancia (b): prosa y gráfico. [Cognitive Architecture and Instructional Design](https://link.springer.com/article/10.1007/s10648-019-09465-5) | no |
| E05-04 | ¿Todo lo que se mueve o suena (video, audio, animación, texto que se desplaza) se puede pausar o viene en trozos que el lector reanuda? | Información transitoria. [Cognitive Architecture and Instructional Design](https://link.springer.com/article/10.1007/s10648-019-09465-5) | no |
| E05-05 | Cuando un bloque junta más de 4 partes que se nombran entre sí, ¿hay antes un bloque que presenta cada parte por separado? | Elementos aislados antes de integrarlos. [Cognitive Architecture and Instructional Design](https://link.springer.com/article/10.1007/s10648-019-09465-5), [The magical number 4](https://doi.org/10.1017/S0140525X01003922) | no |
| E05-06 | ¿Cada imagen, icono, fondo, animación, anécdota o dato curioso aporta algo que la idea de su bloque usa? | Detalles seductores (adornos irrelevantes). [Keep it Coherent](https://link.springer.com/article/10.1007/s10648-020-09522-4) | no |
| E05-07 | ¿Cada conjunto que el lector debe retener sin verlo tiene 4 elementos o menos, o está partido en subgrupos de 4 o menos con nombre? | Límite de la memoria de trabajo: unos 4 trozos. [The magical number 4](https://doi.org/10.1017/S0140525X01003922) | no |
| E05-08 | ¿Toda lista visible de 5 o más elementos está partida en subgrupos de 4 o menos con nombre? | Capacidad limitada: agrupar, no recortar. [PowerPoint presentation flaws and failures](https://www.frontiersin.org/articles/10.3389/fpsyg.2012.00230/full), [The magical number 4](https://doi.org/10.1017/S0140525X01003922) | no |
| E05-09 | ¿Todo número de 5 o más dígitos que el lector copia o dicta va partido en grupos de 2 a 4? | Trozos en números largos. [The magical number 4](https://doi.org/10.1017/S0140525X01003922) | no |
| E05-10 | ¿La primera página, pantalla o diapositiva nombra a su lector y, si puede, lo que ya sabe del tema? | Audiencia declarada (inversión por pericia). Misma pregunta que E01; B1 aporta la razón. [Cognitive Architecture and Instructional Design](https://link.springer.com/article/10.1007/s10648-019-09465-5) | no |

## 5. Anclas

La nota la calcula el script: 5 = 100 % de PASS sobre preguntas aplicables; 4 = ≥ 85 %; 3 = ≥ 70 %; 2 = ≥ 50 %; 1 = < 50 %. Las anclas solo describen cómo se ve cada nivel.

- **1 —** El lector trabaja por el autor. Las tablas quedan en una página y su explicación en otra. La agenda tiene 10 puntos, un ciclo de 5 partes aparece de golpe y nadie dice quién lee. Ejemplo: el plan de curso de IA v2.1, con códigos M0-M7 usados 22 veces antes de presentarlos y una oración con 9 cantidades.
- **3 —** Lo básico está en su sitio, pero algo obliga a recordar o a leer dos veces. Ejemplo: la guía de estudio sobre pertenencia en su primera corrida. Las figuras van junto a su texto y el lector está nombrado, pero un esquema se describe dos veces y hay 6 niveles sin agrupar.
- **5 —** Nada que recordar, nada repetido, nada que distraiga. Ejemplo: la misma guía en su segunda corrida. Los 6 niveles van en 2 grupos de 3, bajo el esquema queda una sola oración y las 4 palabras nuevas se presentan antes del esquema.

## 6. Reglas NA y UNKNOWN

Reglas generales, en tres grupos:

Tipos y alcance:

- Tipos que el mapa B1 no tiene. Un guion o un video narrado se trata como presentacion con narración: aplican E05-02 y E05-04. Un CV se trata como pdf. Un texto para una plataforma ajena (una bio de LinkedIn) se trata como web. Ahí solo se juzga el texto: botones, menús y fotos de la plataforma no son del autor.
- Documento Word con portada de plantilla. Se trata como pdf. La "primera página" de E05-10 es la primera página de texto. Los fallos de la plantilla (marca de agua, número de cuenta) se reportan aparte.
- Qué queda fuera de E05 y a dónde va. Menús largos, reconocer en vez de recordar, una acción principal por pantalla y las tres filas de Fitts: E08. Las hojas de juez humano de carga cognitiva autoinformada: hoja humana de calibración; el juez LLM no las aplica. Párrafos de más de 6 líneas y oraciones de más de 30 palabras: E00-10 y E00-06. Diapositiva con más de 40 palabras: gate extra del perfil de presentación.

Veredictos:

- PASS o NA cuando no hay nada que contar. NA cuando el objeto de la pregunta no existe: sin figuras, E05-01 y E05-03; sin voz, E05-02; nada se mueve, E05-04. PASS cuando el objeto es el propio texto y la revisión encontró 0 fallas (E05-05, E05-07, E05-08, E05-09), citando qué se revisó.
- UNKNOWN nunca cuenta como PASS. Se reporta aparte y no entra en el porcentaje.
- El desfase en el tiempo entre un rótulo y la voz que lo nombra no falla E05-01; se deja como aviso (es contigüidad temporal, lente B2 de aprendizaje multimedia).

Captura y notas:

- Qué requiere captura o render. E05-01 necesita ver las páginas o pantallas reales (PDF renderizado, diapositivas, capturas); con solo el archivo fuente, UNKNOWN. E05-06 necesita ver las imágenes; si solo hay su descripción, se juzga por la descripción y se deja aviso. E05-02 necesita el guion y el texto en pantalla, o el video; sin la lista del texto en pantalla, UNKNOWN. E05-04 en video necesita el archivo o sus fotogramas.
- Las notas del orador que no suenan con la diapositiva son otra pantalla. No cuentan como explicación (E05-01) ni como bloque previo (E05-05), y E05-02 es NA.

| Tipo de artefacto | Qué se juzga | Preguntas NA | Preguntas que requieren captura |
|---|---|---|---|
| web | Contenido principal; sin menús ni pies (los menús van a E08). | E05-02 si no hay voz; E05-04 si nada se mueve. | E05-01 (misma pantalla en el celular) y E05-06. |
| app | Pantallas con texto y figuras. | E05-02 si no hay voz; E05-03 si no hay figuras con rótulos. | E05-01 y E05-06; E05-04 si hay animaciones. |
| folleto | Texto y figuras del folleto. | E05-02 y E05-04. | E05-01 (paginación) y E05-06. |
| pdf | Páginas renderizadas; las tablas son figuras. | E05-02 y E05-04. | E05-01 (cortes de página) y E05-06. |
| presentacion | Diapositivas más notas; con narración o video aplican E05-02 y E05-04. | E05-02 si se lee sola y sin voz; E05-04 si nada se mueve. | E05-01 y E05-06; E05-02 (texto en pantalla); E05-04 (fotogramas). |
| reporte-markdown | Todo el archivo. El frontmatter cuenta como primera pantalla en E05-10 (campos `para` o `audiencia`). "Misma pantalla" = sin otro bloque entre la figura y su texto. | E05-02 y E05-04. | Ninguna; las imágenes enlazadas se abren. |
| dashboard | Título, gráficos, leyendas y notas. | E05-02; E05-05 si no describe procesos. | E05-01 y E05-06. |

## 7. Errores comunes del juez

Dieciséis errores vistos en las 35 corridas, en cuatro grupos.

Al contar conjuntos y listas:

- Contar un párrafo largo o una oración larga como "conjunto". E05-07 cuenta elementos del mismo tipo: pasos, cifras, nombres, opciones. Lo demás es E00-06 y E00-10.
- Contar en E05-07 una lista visible (la mide E05-08) o un menú (lo mide E08).
- Fiarse de `conteos.py` para E05-08. El script solo ve viñetas y `<li>`; no ve tarjetas, celdas con "·" ni enumeraciones en prosa. Hay que contarlas a mano.
- Dar PASS en E05-07 a una agenda o a "N pasos" anunciados porque "los títulos los repiten". En presentación hace falta un rótulo de posición en cada diapositiva; en documento, un índice o figura a la vista.

Con las figuras:

- Tratar una tabla como si no fuera figura. Para E05-01 y E05-03, una tabla con encabezados es una figura.
- Marcar FAIL en E05-01 una figura sin rótulos. Eso es E07. Aquí falla solo si los rótulos o la explicación están en otra página o pantalla.
- Contar como remisión "la figura 2 muestra…" cuando la figura está justo debajo. Solo cuenta si manda a otra página, pantalla o archivo para poder entender la frase. Una cita de evidencia tras un argumento completo ("ver tabla 1, filas a y d") no cuenta.
- Dar PASS en E05-01 con la paginación estimada de un archivo .docx. Sin el PDF, UNKNOWN.

Con adornos y redundancia:

- Aceptar "da contexto", "da ambiente" o "es habitual" como función en E05-06. La función se nombra con un dato, una relación, una ubicación o una marca; si no sale en una frase, no hay función.
- Pasar un logotipo o un icono porque "identifica la marca" cuando la marca ya está escrita en la misma pantalla.
- Mandar a E05-06 lo que es estilo: sombras, subrayados, texto repetido en color. Eso es E06 o E11.
- Confundir explicar con describir en E05-03. Explicar añade lo que la figura no muestra; describir repite sus rótulos. Y dar PASS en E05-02 porque "son palabras clave" cuando hay 9 o más palabras seguidas iguales a la voz.

Con scripts, lector y veredictos:

- Dar PASS en E05-04 porque "todo reproductor pausa" sin mirar si cada escena termina completa.
- Correr la expresión regular de E05-09 sobre el HTML fuente. Ahí cuenta direcciones y atributos; se corre sobre el texto visible.
- Dar PASS en E05-10 porque se deduce quién lee. Hace falta una frase citada; un propósito sin lector no basta.
- Marcar NA para no responder, o PASS sin evidencia. NA solo en los casos de la sección 6; sin cita, FAIL.

## Sources

- Cognitive Architecture and Instructional Design: 20 Years Later — https://link.springer.com/article/10.1007/s10648-019-09465-5
- The magical number 4 in short-term memory: A reconsideration of mental storage capacity — https://doi.org/10.1017/S0140525X01003922
- Keep it Coherent: A Meta-Analysis of the Seductive Details Effect — https://link.springer.com/article/10.1007/s10648-020-09522-4
- PowerPoint presentation flaws and failures: a psychological analysis — https://www.frontiersin.org/articles/10.3389/fpsyg.2012.00230/full
