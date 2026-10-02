---
schema: eval-anatomy/v1
id: e12-sin-ai-slop
name: Sin AI slop
version: "0.1.0"
status: approved
language: es
summary: 'Dice, con listas y conteos, si un texto suena a máquina: relleno, adjetivos vacíos, signos de chat y moldes repetidos.'
authors:
  - name: Santiago Llaguno
    github: SantiagoLlag
owner: Santiago Llaguno
license: CC-BY-4.0
created: "2026-10-01"
updated: "2026-10-02"
contact: https://github.com/SantiagoLlag/eval-anatomy/issues
source_format: vault-evals
applies_to: [web, app, folleto, pdf, presentacion, reporte-markdown, dashboard]

purpose:
  question: '¿El texto está libre de las señales contables de redacción automática: muletillas, exceso de conectores, adjetivos sin criterio, emoji y exclamaciones, rayas de inciso, aperturas repetidas, secciones sin dato propio, moldes y contrastes de fórmula?'
  decision: 'Si el texto se entrega o se reescribe: cada pregunta en FAIL dice qué señal quitar. En reporte-markdown y pdf, un solo emoji o signo de exclamación (gate G-E12-1) reprueba el artefacto.'
  construct: 'Señales léxicas y de forma que se pueden contar o citar: muletillas de una lista cerrada (tolerancia 0); conectores por cada 1 000 palabras (18 o menos); adjetivos de gusto sin lo observado al lado; emoji y exclamaciones (0); rayas de inciso por cada 1 000 palabras (4 o menos); rachas de oraciones seguidas que abren igual (falla con 5 con una palabra o 4 con dos); secciones sin una oración que solo podría estar en este artefacto; tres oraciones o párrafos seguidos con el mismo esqueleto; contrastes «no es X: es Y» sin dato propio.'
  out_of_scope:
    - 'Tríadas, cadencia (variación del largo de oración) y líneas «Etiqueta: texto»: el script las informa, pero en 35 corridas nunca decidieron un veredicto.'
    - 'Revelaciones con dos puntos («la clave:»): pista informativa sin veredicto, porque ninguna fuente la documenta.'
    - 'La lista de fuentes o referencias: su forma la dicta la norma APA, no el autor.'
    - 'Las citas entre comillas: son palabras de otra persona o menciones.'
    - 'Palabras sueltas que suenan a IA y no están en la lista cerrada («garantizar», «paradigma», «landscape»).'
    - 'El largo del texto: explicar más no suma ni resta.'
  origin_failures:
    - '35 corridas ciegas de la lente «AI slop» con una lista ad hoc, del 2026-09-19 al 2026-09-30, sobre páginas web, un CV, un plan comercial, un plan de curso y trabajos universitarios.'
    - 'Falsos positivos de esas corridas que fijaron las exclusiones: la lista de fuentes convirtió un PASS en FAIL en 8 corridas y «cita garantizada» se contó como muletilla en 5.'
    - 'Calibración contra 55 textos humanos (53 lecturas universitarias y 2 textos de autoría humana segura).'
    - 'Seis fallos de slop (S1 a S6) plantados en copias de las muestras malas de calibración (ver examples/README.md).'

taxonomy:
  origin: product-eval
  purpose: regression
  moment: offline
  interaction: static
  structure: single-turn
  grader: [code, llm-judge]
  judgment: pointwise
  inputs_origin: [real, curated]
  dimension: [text-quality]
  system_type: [document-generation]

system:
  fixed: false
  description: 'Cualquier sistema que produce un documento con texto: una persona, un modelo o un flujo con LLM. La eval mira solo el texto final, no cómo se hizo.'

cases:
  modality: [text, html, markdown]
  source: [curated]
  collected: "2026-09-14"
  tags: [clean-sample, planted-failures]
  examples:
    - id: buena-reporte
      input: examples/buena-reporte.md
      reference: 'Ancla 5: pasan 9 de 9 (0 muletillas, 1,6 conectores por 1 000, 0 rayas, una cifra propia en cada sección, ningún molde). Gate G-E12-1 aplica y pasa.'
      tags: [clean-sample, reporte-markdown]
    - id: mala-reporte
      input: examples/mala-reporte.md
      reference: 'E12-01 FAIL: scripts/slop.py v1.0 cuenta 4 muletillas («el presente documento», «de manera integral», «holística» en la l. 5; «potenciar el» en la l. 30). E12-02 pasa con 13,7 conectores por 1 000. Gate G-E12-1 aplica y pasa: la muestra original no tiene emoji ni exclamaciones.'
      tags: [planted-failures, reporte-markdown]

reference:
  kind: none

criteria:
  - id: E12-01
    question: '¿El texto tiene cero muletillas de IA de la lista del script?'
    failure_mode: 'Relleno (sin relleno; la complejidad innecesaria baja la valoración del autor).'
    evidence: 'Campo `muletillas.total` de `slop.py` y la cita de cada aparición con su línea.'
    pass_example: '`muletillas: 0` en las 1 318 palabras del resumen de un plan comercial.'
    fail_example: '`examples/mala-reporte.md`, l. 5 y 41: "de manera integral y holística", "Cabe destacar que", "es importante señalar que".'
    gate: false
    grader: slop
    sources:
      - https://digital.gov/guides/plain-language
      - https://cahill.people.unm.edu/480-21/Oppenheimer-2006-Applied_Cognitive_Psychology.pdf
      - https://arxiv.org/abs/2406.07016
      - https://arxiv.org/abs/2403.07183
      - https://arxiv.org/abs/2501.15654
  - id: E12-02
    question: '¿Los conectores quedan en 18 o menos por cada 1 000 palabras?'
    failure_mode: 'Relleno por exceso de conectores.'
    evidence: 'Campo `conectores.por_mil` del script y el desglose por conector. NA si el texto está en inglés o tiene menos de 100 palabras.'
    pass_example: 'Un trabajo universitario real (corrida 1): 6 conectores en 2 248 palabras, 2,7 por 1 000. `examples/mala-reporte.md`: 13,7 por 1 000 ("así como" ×2, "asimismo", "es importante señalar"…), pasa.'
    fail_example: 'Copia de la muestra de calibración `mala/pagina.html` con el fallo plantado S4 (no incluida), sección "Servicios": 9 conectores en 68 palabras ("Además", "Asimismo", "Por otro lado", "Sin embargo"…); la página sube a 26 por 1 000.'
    gate: false
    grader: slop
    sources:
      - https://digital.gov/guides/plain-language
      - https://arxiv.org/abs/2406.07016
      - https://en.wikipedia.org/wiki/Wikipedia:Signs_of_AI_writing
    applies_when: 'Texto en español con 100 palabras o más.'
  - id: E12-03
    question: '¿Ningún adjetivo de la lista del contrato califica el artefacto o su tema sin decir al lado qué se observa?'
    failure_mode: 'Palabras prohibidas sin operacionalizar; autoelogio sin evidencia.'
    evidence: 'Campo `adjetivos_prohibidos.detalle` del script y la oración completa de cada aparición; el juez marca cuáles tienen criterio al lado.'
    pass_example: 'Muestra de calibración `buena/pagina.html`: "Pagas en efectivo o con tarjeta", sustantivo. Un CV en español: "en el mejor caso, cerca de 20 % más ventas", con su número al lado.'
    fail_example: 'Muestra de calibración `mala/pagina.html`: "los más altos estándares de calidad", "el mejor taller de la ciudad", "la mejor experiencia posible", sin ningún dato al lado.'
    gate: false
    grader: [slop, juez]
    sources:
      - https://arxiv.org/abs/2410.02736
      - https://arxiv.org/abs/2403.07183
  - id: E12-04
    question: '¿El texto tiene cero emoji y cero signos de exclamación?'
    failure_mode: 'Registro de chat en un texto publicado.'
    evidence: 'Campos `emoji.total` y `exclamaciones.total` del script, con la cita. Los emoji que son controles de la interfaz ("★", "✓") se descuentan y se anotan.'
    pass_example: 'Texto visible de la web de un negocio de servicios, en español: emoji 0, exclamaciones 0 en 1 537 palabras; la flecha de "Continue to quote →" no es emoji.'
    fail_example: 'Plan de curso de IA v2.1, l. 119: "⚠" decorando un título. Muestra de calibración `mala/presentacion.html`: "¡GRACIAS!".'
    gate: true
    grader: [slop, juez]
    sources:
      - https://en.wikipedia.org/wiki/Wikipedia:Signs_of_AI_writing
      - https://www.rae.es/dpd/raya
      - https://www.chicagomanualofstyle.org/qanda/data/faq/topics/Punctuation/faq0013.html
  - id: E12-05
    question: '¿Las rayas de inciso quedan en 4 o menos por cada 1 000 palabras?'
    failure_mode: 'Exceso de rayas de inciso.'
    evidence: 'Campo `rayas.por_mil` del script y la cita de los incisos. NA con menos de 100 palabras.'
    pass_example: '`examples/buena-reporte.md`: 0 rayas. Una lectura universitaria de la línea base humana: 3 incisos en 847 palabras, 3,5 por 1 000, pasa.'
    fail_example: 'Texto visible de la misma web de servicios: 14 incisos en 1 537 palabras, 9,1 por 1 000. "La limpieza no es un gasto — es el combustible…".'
    gate: false
    grader: [slop, juez]
    sources:
      - https://en.wikipedia.org/wiki/Wikipedia:Signs_of_AI_writing
      - https://www.rae.es/dpd/raya
    applies_when: 'Texto con 100 palabras o más.'
  - id: E12-06
    question: '¿Ninguna racha de oraciones seguidas abre con la misma palabra 5 veces o con las mismas dos palabras 4 veces?'
    failure_mode: 'Aperturas repetidas que la vista salta al escanear.'
    evidence: 'Campos `aperturas.racha_max_1_palabra` y `racha_max_2_palabras` del script, con la primera oración de la racha y su línea. Las aperturas que son rótulo ("market:") no cuentan.'
    pass_example: 'La misma lectura universitaria, l. 23: "Que sea adecuada… Que se adapte… Que sea apropiada… Que se ajuste…": racha de 4 con una palabra, pasa.'
    fail_example: 'Copia de `examples/mala-reporte.md` con el fallo plantado S2 (no incluida), l. 11: "Este trimestre mostró… Este trimestre confirmó… Este trimestre dejó… Este trimestre exige…": racha de 4 con dos palabras.'
    gate: false
    grader: [slop, juez]
    sources:
      - https://www.nngroup.com/articles/f-shaped-pattern-reading-web-content/
  - id: E12-07
    question: '¿Cada sección con 3 oraciones o más tiene al menos una oración que solo podría estar en este artefacto, porque nombra a alguien, algo o una cifra propia?'
    failure_mode: 'Falta de concreción: secciones intercambiables con las de cualquier otro texto.'
    evidence: 'Por sección (o diapositiva, o pantalla): la oración citada, o la sección donde no hay ninguna. Pista: campo `dato_concreto.pct` del script.'
    pass_example: '`examples/buena-reporte.md`, sección "Qué no funcionó": "Los sábados de 15:00 a 18:00 vendimos en promedio 620 pesos por hora."'
    fail_example: 'Muestra de calibración `mala/presentacion.html`, diapositiva "Resultados": nueve viñetas como "Consolidamos alianzas estratégicas con stakeholders clave del ecosistema local y regional", ninguna con nombre, cifra ni caso.'
    gate: false
    grader: [slop, juez]
    sources:
      - https://heathbrothers.com/books/made-to-stick/
      - https://stevenpinker.com/publications/sense-style-thinking-persons-guide-writing-21st-century
    applies_when: 'Hay secciones con 3 oraciones o más; las secciones de consulta (glosario, contacto, fuentes, instrucciones de uso) son NA.'
  - id: E12-08
    question: '¿Ninguna serie de 3 o más oraciones o párrafos seguidos repite el mismo esqueleto con palabras distintas?'
    failure_mode: 'Molde de plantilla.'
    evidence: 'Las tres oraciones o párrafos citados, con el esqueleto escrito por el juez ("El reto X exige una respuesta Y"). Las viñetas de una lista no cuentan.'
    pass_example: 'Muestra de calibración `buena/presentacion.html`: ninguna diapositiva repite el esqueleto de otra; la 6 abre con un dato y la 7 con un caso.'
    fail_example: 'Copia de la muestra `mala/presentacion.html` con el fallo plantado S5 (no incluida), diapositiva "Retos": "El reto financiero exige una respuesta decidida. El reto operativo exige una respuesta coordinada. El reto político exige una respuesta inmediata."'
    gate: false
    grader: juez
    sources:
      - https://arxiv.org/abs/2501.15654
      - https://en.wikipedia.org/wiki/Wikipedia:Signs_of_AI_writing
    applies_when: 'Alguna sección llega a 3 oraciones.'
  - id: E12-09
    question: '¿El texto tiene cero contrastes de fórmula ("no es X: es Y", "no solo X, sino Y") sin dato propio al lado?'
    failure_mode: 'Paralelismo negativo contra una alternativa que nadie propuso.'
    evidence: 'Campo `informativas.pistas_para_el_juez.contrastes` del script más la lectura completa; la cita de cada caso. Un contraste con dato propio no cuenta.'
    pass_example: '`examples/buena-reporte.md`, título de sección: "más clientes, no precios más altos", contraste con dato (tickets +12 %, precio igual).'
    fail_example: 'Texto visible de la web de servicios, l. 39: "La limpieza no es un gasto: es el combustible más barato que va a comprar." Copia de la muestra `mala/presentacion.html`, fallo S6: "No es un gasto: es una inversión."'
    gate: false
    grader: [slop, juez]
    sources:
      - https://en.wikipedia.org/wiki/Wikipedia:Signs_of_AI_writing
      - https://arxiv.org/abs/2501.15654

graders:
  - id: slop
    kind: code
    description: 'scripts/slop.py v1.0. Imprime PASS o FAIL para E12-01, 02, 04, 05 y 06 con los umbrales de la versión 0.1; lista las apariciones de E12-03 para el juez (REVISAR) y deja pistas para E12-07 (porcentaje de oraciones con dato) y E12-09 (contrastes). Con --tipo dice si el gate G-E12-1 aplica. Excluye frontmatter, código, comentarios HTML, bloques de cita, citas entre comillas y la sección de fuentes, y dice qué excluyó. Solo biblioteca estándar de Python 3.'
    script: scripts/slop.py --tipo <tipo> --json …
  - id: juez
    kind: llm-judge
    model: Claude
    output_format: reason-then-verdict
    description: 'Decide E12-03, 07, 08 y 09 con la salida del script a la vista; en E12-04, 05 y 06 revisa los descuentos sobre el veredicto del script (controles de la interfaz, pies de foto, rótulos).'
    prompt: |-
      Eres el juez de la eval E12, Sin AI slop. Dices, con listas y conteos, si un texto suena a máquina: relleno, adjetivos vacíos, signos de chat y moldes repetidos.

      Entradas:
      <tipo>web | app | folleto | pdf | presentacion | reporte-markdown | dashboard</tipo>
      <texto>texto extraído del artefacto. Web: contenido principal, sin menús ni pies. Presentación: texto de las diapositivas más notas del orador. PDF o folleto: texto extraído.</texto>
      <script>salida de scripts/slop.py --tipo <tipo> --json</script>

      Procedimiento:
      1. E12-01, 02, 04, 05 y 06: usa el veredicto del script. Copia el número y la primera cita de cada señal. Descuenta los emoji que son controles de la interfaz ("★" de calificación, "✓" de selección) y anótalos.
      2. E12-03: lee la oración completa de cada aparición que lista el script. Cuenta solo las que califican el artefacto o su tema sin decir qué se observa. No cuentan los sustantivos ("el profesional", "pagar en efectivo"), los adjetivos de época ("psicología moderna") ni "mejor" con su número al lado.
      3. Lee todo el texto antes de seguir. No respondas conforme lees.
      4. E12-07: en cada sección, diapositiva o pantalla con 3 oraciones o más, cita la oración que solo podría estar en este artefacto porque nombra a alguien, algo o una cifra propia. Si en alguna no la encuentras, cita la sección y responde FAIL. El porcentaje de oraciones con dato es una pista: por debajo del 30 %, revisa con más cuidado.
      5. E12-08: busca tres oraciones o párrafos seguidos con el mismo esqueleto y palabras distintas. Cita los tres y escribe el esqueleto. Las viñetas de una lista no cuentan.
      6. E12-09: revisa los contrastes que marca el script y el resto del texto. Cuenta solo los que niegan algo que nadie propuso ("no es un gasto: es una inversión"). Un contraste con dato propio o la tesis de una fuente citada no cuentan.
      7. Anota en "evals ambiguos" cada descuento de los pasos 1, 2 y 6, y cada revelación con dos puntos ("la clave:"), con su cita y sin veredicto.

      Reglas:
      - En cada pregunta: evidencia citada, razón en 2 frases o menos, veredicto PASS, FAIL, NA o UNKNOWN. Sin evidencia citada, FAIL. UNKNOWN nunca cuenta como PASS.
      - NA: E12-02 y E12-05 con menos de 100 palabras; E12-02 en inglés; E12-07 y E12-08 si ninguna sección llega a 3 oraciones; en E12-07, las secciones de consulta (glosario, contacto, fuentes, instrucciones de uso). Si solo hay una imagen sin texto legible, todas son UNKNOWN.
      - La lista de fuentes y las citas entre comillas quedan fuera de todas las preguntas.
      - Gate G-E12-1: un FAIL en E12-04 reprueba el artefacto solo en reporte-markdown y pdf; en los demás tipos solo baja la nota.

      Errores que no debes cometer:
      - Contar la lista de fuentes, o una palabra suelta que suena a IA y no está en la lista del script.
      - Contar como adjetivo prohibido un sustantivo o un adjetivo de época.
      - Marcar FAIL en E12-04 por un control de la interfaz o por una exclamación dentro de una cita ajena; reprobar una web o una presentación por un "¡Gracias!".
      - Contar como raya de inciso un separador de pie de foto o una atribución.
      - Contar como racha una lista de rótulos iguales o las celdas de una tabla.
      - Dar PASS en E12-07 porque el total de oraciones con dato pasa del 40 %; contar como dato propio una remisión ("ver figura 1"), un rótulo con mayúscula o una sigla genérica como "IA".
      - Tomar el paralelismo de una lista de viñetas como molde; contar dos veces la misma serie en E12-06 y E12-08.
      - Contar en E12-09 un contraste con dato o la tesis de una fuente citada; dar FAIL por una revelación con dos puntos.
      - Bajar la nota por tríadas, cadencia o líneas "Etiqueta: texto": son informativas.
      - Premiar un texto porque explica más: el largo no cuenta.

      Salida: una línea por pregunta, de E12-01 a E12-09, con este formato:
      id | evidencia | razón | veredicto
      Después, la lista "evals ambiguos".

verdict:
  scale: binary-na-unknown
  levels:
    - value: PASS
      anchor: 'Pasa, con evidencia citada: el número del script y la primera cita, o la oración que lo prueba.'
    - value: FAIL
      anchor: 'Falla. Sin evidencia citada, el veredicto es FAIL.'
    - value: NA
      anchor: 'No aplica: texto de menos de 100 palabras (E12-02, E12-05), texto en inglés (E12-02) o ninguna sección con 3 oraciones (E12-07, E12-08).'
    - value: UNKNOWN
      anchor: 'No se pudo ver: solo hay una imagen sin texto legible. Nunca cuenta como PASS.'
  pass_cut: PASS
  na_rule: 'Con menos de 100 palabras, E12-02 y E12-05 son NA: la densidad por 1 000 palabras no es fiable. E12-07 y E12-08 son NA cuando ninguna sección llega a 3 oraciones; las secciones de consulta (glosario, contacto, fuentes, instrucciones de uso) son NA en E12-07. En inglés, E12-02 es NA porque el umbral se calibró solo en español. Si el juez solo tiene una imagen sin texto legible, todas las preguntas son UNKNOWN. Las citas entre comillas y la lista de fuentes quedan fuera. La tabla por tipo de artefacto está en la sección 6 del cuerpo.'

aggregation:
  method: banded-score
  formula: 'PASS / (PASS + FAIL) sobre las preguntas aplicables; NA y UNKNOWN no entran. La nota es la banda más alta cuyo min_pass_rate se alcanza. Si el gate G-E12-1 aplica y falla, la nota es 1. UNKNOWN nunca cuenta como PASS: se reporta aparte.'
  uncertainty: none
  breakdown: [criterion]
  bands:
    - score: 5
      min_pass_rate: 1.0
      anchor: 'Nada lo delata. Ejemplo: examples/buena-reporte.md: 0 muletillas, 1,6 conectores por 1 000, 0 rayas, cada sección con una cifra propia ("620 pesos por hora") y ningún molde. Pasan 9 de 9.'
    - score: 4
      min_pass_rate: 0.85
    - score: 3
      min_pass_rate: 0.70
      anchor: 'Sin muletillas, pero con molde. Ejemplo: un taller universitario de teorías en su corrida 3. Tiene 0 muletillas, 0 emoji y 0 rayas, pero dos oraciones gemelas y una conclusión con el mismo esqueleto en las cuatro teorías. Pasarían 7 de 9.'
    - score: 2
      min_pass_rate: 0.50
    - score: 1
      min_pass_rate: 0.0
      anchor: 'Suena a chat desde la primera línea. Ejemplo: la copia de la muestra mala/pagina.html con los fallos plantados: "En la era digital, es importante destacar que…", nueve conectores en 68 palabras, "el mejor taller de la ciudad" sin dato y "¡Click aquí…!". Pasan 4 de 9; como es web, el "¡Click aquí…!" baja la nota pero no activa el gate.'

threshold:
  per_case: 'Cada pregunta trae su umbral (0 muletillas, 18 conectores o menos por 1 000 palabras, 0 emoji y 0 exclamaciones, 4 rayas o menos por 1 000 palabras, rachas menores de 5 y 4).'
  gates:
    - id: G-E12-1
      criteria: [E12-04]
      applies_when: 'Solo en reporte-markdown y pdf. En web, app, folleto, presentacion y dashboard, E12-04 es pregunta normal: un FAIL baja la nota y no reprueba.'
      effect: 'Reprueba el artefacto: nota final 1.'
  rationale: 'La exclamación repetida solo cabe en literatura, publicidad y registro informal; por eso el gate se acota a reporte-markdown y pdf. Ninguno de los 55 textos humanos de la calibración tuvo emoji ni exclamaciones.'

validation:
  planted_failures: examples/README.md
  calibration: 'Umbrales calibrados el 2026-10-01 contra 55 textos humanos (53 lecturas universitarias y 2 textos de autoría humana segura), después de 35 corridas ciegas (2026-09-19 a 2026-09-30). 0 muletillas, 0 emoji y 0 exclamaciones en los 55; conectores con percentil 90 de 18 por 1 000 palabras (5 de las 55 lecturas quedan por encima); rayas de inciso con máximo humano de 3,1 por 1 000; rachas de apertura con máximo humano de 4 con una palabra y 2 con dos. El porcentaje de oraciones con dato no es umbral: 30 de los 55 textos humanos quedaron por debajo del 40 % y los dos controles de IA por encima. Sin cifras de acuerdo juez-humano publicadas.'
  meta_eval: 'M1-M12 (12 criterios que revisan la propia ficha de eval): 12 de 12 el 2026-10-01; aprobada el 2026-10-02 con las seis fuentes nuevas verificadas.'

run:
  command: 'python3 -B scripts/slop.py <archivo> --tipo <tipo> --json; después, el juez LLM con el prompt del grader juez para E12-03, E12-07, E12-08 y E12-09.'

history:
  - version: "0.1.0"
    date: "2026-10-01"
    change: 'Primera versión. 9 preguntas, 1 gate (G-E12-1 en E12-04). Sale de las 35 corridas ciegas de la lente slop y de la calibración contra 55 textos humanos. Decisiones: dos listas (muletillas a tolerancia 0; conectores por densidad, umbral 25 por 1 000, alternativa 18); el porcentaje de oraciones con dato deja de ser umbral y pasa a pista de E12-07; rayas por densidad (4 por 1 000); rachas de 5 y 4. Script slop.py v1.0.'
    author: agente E12 (Fable 5.1)
  - version: "0.1.0"
    date: "2026-10-01"
    change: 'Segunda vuelta, decisiones de Santiago Llaguno: la familia «es importante + verbo» pasa de muletillas a conectores; el umbral de E12-02 baja a 18 por 1 000 (percentil 90 humano; 5 de 55 lecturas quedan por encima); el gate G-E12-1 reprueba solo en reporte-markdown y pdf; rayas de 4 o menos por 1 000 confirmadas. slop.py v1.0 acepta --tipo.'
    author: agente E12 (Fable 5.1)
  - version: "0.1.0"
    date: "2026-10-01"
    change: 'Tercera vuelta: seis fuentes nuevas sobre marcadores de texto generado en E12-01, 02, 03, 04, 05, 08 y 09; ya no queda ninguna pregunta sin fuente. E12-09 queda solo con los contrastes de fórmula; la «revelación con dos puntos» pasa a pista informativa sin veredicto, porque ninguna fuente la documenta.'
    author: agente E12 (Fable 5.1)
  - version: "0.1.0"
    date: "2026-10-02"
    change: 'Estado aprobado, con 12 de 12 en el meta-eval M1-M12, las seis fuentes nuevas verificadas y el gate G-E12-1 justificado.'
    author: Santiago Llaguno; integró Claude (Fable 5.1)

limitations:
  - 'La lista de muletillas es cerrada: una palabra que suena a IA y no está en ella no cuenta.'
  - 'Umbrales calibrados solo en español: en inglés, E12-02 es NA y la densidad de conectores queda como informativa.'
  - 'El detector de idioma cuenta palabras frecuentes; con texto mezclado marca «mixto» y aplica las dos listas.'
  - '«★» y «✓» de una interfaz cuentan como emoji por rango Unicode, y una raya que separa un pie de foto cuenta como inciso: el juez los descuenta.'
  - 'El script no lee PDF ni imágenes: hay que pasarle el texto extraído.'
  - 'Los umbrales de conectores, rayas y rachas, y la tolerancia 0 de muletillas, emoji y exclamaciones, son del proyecto: ninguna fuente fija un número.'
sensitive_data: none
---

# E12 — Sin AI slop

> Estado: aprobada por el autor el 2026-10-02 (versión 0.1.0 del 2026-10-01). Sale de 35 corridas ciegas de la lente «AI slop» (del 2026-09-19 al 2026-09-30) y de una calibración contra 55 textos humanos. Las seis fuentes sobre marcadores de texto generado quedaron verificadas, con matices, el 2026-10-01. Aprobada con 12 de 12 en el meta-eval M1-M12.
>
> El id E00 que aparece en el texto es otra eval del mismo autor (claridad), todavía fuera de este catálogo.

## 1. Qué mide, en una frase

Dice, con listas y conteos, si un texto suena a máquina: relleno, adjetivos vacíos, signos de chat y moldes repetidos.

## 2. Por qué importa

"AI slop" (AI: inteligencia artificial; slop: bazofia, texto de relleno) es el texto con rasgos de redacción automática: relleno, adjetivos vacíos, ritmo uniforme y moldes que se repiten. Un lector lo nota en segundos y deja de confiar en el resto, aunque los datos sean correctos. Dos fuentes lo respaldan: la complejidad innecesaria baja la valoración del autor ([Consequences of Erudite Vernacular Utilized Irrespective of Necessity](https://cahill.people.unm.edu/480-21/Oppenheimer-2006-Applied_Cognitive_Psychology.pdf)) y el autoelogio sin evidencia no cuenta como mérito ([Justice or Prejudice? Quantifying Biases in LLM-as-a-Judge](https://arxiv.org/abs/2410.02736)).

La señal es léxica y se puede contar. Lo muestran dos estudios de corpus ([Delving into LLM-assisted writing in biomedical publications](https://arxiv.org/abs/2406.07016), [Monitoring AI-Modified Content at Scale](https://arxiv.org/abs/2403.07183)) y uno con detectores humanos expertos ([People who frequently use ChatGPT for writing tasks are accurate and robust detectors of AI-generated text](https://arxiv.org/abs/2501.15654)).

Este eval nace de 35 corridas ciegas de una lista ad hoc, del 2026-09-19 al 2026-09-30. Después se calibró contra 55 textos humanos: 53 lecturas universitarias y dos textos de autoría humana segura. Los umbrales de la sección 4 salen de esos números, no del gusto.

Términos que usa este eval:

- **Muletilla de IA**: frase de relleno típica de un texto generado, como "es importante destacar" o "en la era digital". La lista cerrada vive en `scripts/slop.py` (`MULETILLAS_ES`, `MULETILLAS_EN`). Tolerancia 0.
- **Conector**: palabra o frase que enlaza o presenta ideas, como "por lo tanto", "asimismo" o "es importante señalar". Son normales en español académico y se miden por densidad: apariciones por cada 1 000 palabras. Lista `CONECTORES_ES`.
- **Adjetivo prohibido**: una de las palabras de gusto del contrato de claridad del autor, sus reglas de redacción ("bonito", "profesional", "claro"…), con plurales y femeninos. Solo cuenta si al lado no se dice qué se observa.
- **Raya de inciso**: guion largo (—) o medio (–) que abre o cierra un paréntesis dentro de una oración. No cuentan los rangos ("10–12") ni la raya que atribuye una cita ("…" — un cliente).
- **Racha de aperturas**: oraciones seguidas, dentro de la misma sección, que empiezan con la misma palabra o con las mismas dos palabras.
- **Molde**: el mismo esqueleto de oración o de párrafo, repetido con palabras distintas. Ejemplo: "El reto X exige una respuesta Y" tres veces seguidas.
- **Prueba de sustitución**: preguntar, sección por sección, si alguna oración solo podría estar en este artefacto porque nombra a alguien, algo o una cifra propia.
- **Script**: programa corto que hace una tarea automática. Aquí, `scripts/slop.py` v1.0.
- **Juez LLM**: un modelo de lenguaje (Claude) que aplica las preguntas y responde con evidencia.
- **Gate**: pregunta que, si falla, reprueba todo el artefacto. En este eval, E12-04 activa el gate G-E12-1 solo en `reporte-markdown` y `pdf`; en los otros cinco tipos es pregunta normal.
- **Veredictos**: PASS (pasa), FAIL (falla), NA (no aplica), UNKNOWN (no se pudo ver). Sin evidencia citada, el veredicto es FAIL. UNKNOWN nunca cuenta como PASS.

## 3. Cómo evaluarlo

Orden obligatorio en cada pregunta: evidencia → razón (2 frases o menos) → veredicto.

1. Extrae el texto del artefacto. Web: contenido principal, sin menús ni pies. Presentación: texto de diapositivas más notas del orador. PDF o folleto: texto extraído. Si solo hay imagen sin texto legible, ve a la sección 6.
2. Corre `python3 scripts/slop.py archivo --tipo <tipo> --json`. El script quita el frontmatter, el código, las citas (`>`) y la lista de fuentes, y dice qué excluyó. Con `--tipo` dice si el gate G-E12-1 aplica. Si el idioma detectado es inglés, E12-02 es NA.
3. Responde E12-01, E12-02, E12-04, E12-05 y E12-06 con los veredictos del script. Copia el número y la primera cita de cada señal. Si el script marca un emoji que es un control de la interfaz ("★" de calificación, "✓" de selección), descuéntalo y anótalo. Las apariciones dentro de citas entre comillas ya vienen descontadas.
4. Para E12-03, toma cada aparición que lista el script y lee la oración completa. Cuenta solo las que califican el artefacto o su tema sin decir qué se observa. No cuentan los sustantivos ("el profesional", "pagar en efectivo"), los adjetivos de época ("psicología moderna") ni "mejor" con su número al lado.
5. Lee todo el artefacto antes de seguir. No respondas conforme lees.
6. Para E12-07, recorre cada sección (o diapositiva, o pantalla) con 3 oraciones o más. En cada una, cita la oración que solo podría estar en este artefacto. Si en alguna no la encuentras, cita la sección y responde FAIL. El porcentaje de oraciones con dato que da el script es una pista: por debajo del 30 %, revisa con más cuidado.
7. Para E12-08, busca tres oraciones o párrafos seguidos con el mismo esqueleto y palabras distintas. Cita los tres y escribe el esqueleto. Las viñetas de una lista no cuentan: ahí la forma paralela es la convención.
8. Para E12-09, revisa las pistas "contrastes" del script y el resto del texto. Cuenta solo los contrastes que niegan algo que nadie propuso ("no es un gasto: es una inversión"). Un contraste con dato propio o la tesis de una fuente citada no cuentan. Las revelaciones con dos puntos ("la clave:", "algo más:") son solo una pista: anótalas en "evals ambiguos", sin veredicto.
9. Anota en "evals ambiguos" cada descuento que hiciste en los pasos 3, 4 y 8, con su cita.

## 4. Preguntas

Las 9 preguntas, con la evidencia que buscar, un ejemplo PASS y uno FAIL, están en el frontmatter (`criteria`). Aquí queda el principio de cada una y sus fuentes.

| id | Pregunta | Principio y fuente | Gate |
|---|---|---|---|
| E12-01 | ¿El texto tiene cero muletillas de IA de la lista del script? | Sin relleno ([Federal Plain Language Guidelines](https://digital.gov/guides/plain-language)); la complejidad innecesaria baja la valoración del autor ([Consequences of Erudite Vernacular](https://cahill.people.unm.edu/480-21/Oppenheimer-2006-Applied_Cognitive_Psychology.pdf)). Los textos pasados por un modelo traen palabras marcadoras medibles: exceso de "delves", "underscores" y "showcasing" en PubMed 2024 ([Delving into LLM-assisted writing](https://arxiv.org/abs/2406.07016)); adjetivos de elogio ×9,8 a ×34,7 en las revisiones de un congreso de aprendizaje automático en 2024 ([Monitoring AI-Modified Content at Scale](https://arxiv.org/abs/2403.07183)); el vocabulario es la pista más citada por detectores humanos expertos, 53,1 % ([People who frequently use ChatGPT…](https://arxiv.org/abs/2501.15654)). La lista en español y la tolerancia 0 son del proyecto: 0 apariciones en los 55 textos humanos. | no |
| E12-02 | ¿Los conectores quedan en 18 o menos por cada 1 000 palabras? | Sin relleno ([Federal Plain Language Guidelines](https://digital.gov/guides/plain-language)). "Additionally" y "notably" están entre las 10 palabras comunes en exceso de PubMed 2024 ([Delving into LLM-assisted writing](https://arxiv.org/abs/2406.07016)). Matiz: los conectores sueltos no son señal fuerte ([Wikipedia: Signs of AI writing](https://en.wikipedia.org/wiki/Wikipedia:Signs_of_AI_writing)); por eso es pregunta y no gate. Umbral 18 del proyecto (percentil 90 de 55 textos humanos; ninguna fuente fija número); 5 de las 55 lecturas quedan por encima. | no |
| E12-03 | ¿Ningún adjetivo de la lista del contrato califica el artefacto o su tema sin decir al lado qué se observa? | Palabras prohibidas sin operacionalizar (contrato de claridad); el autoelogio sin evidencia no cuenta como mérito ([Justice or Prejudice?](https://arxiv.org/abs/2410.02736)). Refuerzo indirecto: los adjetivos de elogio ("commendable", "meticulous") son los marcadores más estables de texto generado en inglés ([Monitoring AI-Modified Content at Scale](https://arxiv.org/abs/2403.07183)). | no |
| E12-04 | ¿El texto tiene cero emoji y cero signos de exclamación? | Registro de texto publicado, no de chat. Emoji delante de títulos y viñetas como señal de chatbot ([Wikipedia: Signs of AI writing](https://en.wikipedia.org/wiki/Wikipedia:Signs_of_AI_writing)). La exclamación repetida solo cabe en literatura, publicidad y registro informal (Ortografía de la lengua española, § 3.4.9.2; [DPD de la RAE: raya, y Ortografía, § 3.4.9](https://www.rae.es/dpd/raya)): por eso el gate se acota a reporte-markdown y pdf. En inglés, Chicago aconseja quitar todos los signos de exclamación ([Chicago Manual of Style, Q&A sobre exclamaciones](https://www.chicagomanualofstyle.org/qanda/data/faq/topics/Punctuation/faq0013.html)). El 0 es del proyecto: 0 apariciones en 55 textos humanos. | sí (G-E12-1; solo reporte-markdown y pdf) |
| E12-05 | ¿Las rayas de inciso quedan en 4 o menos por cada 1 000 palabras? | Exceso de rayas "formulario y trillado" como señal de texto generado, hoy en retirada ([Wikipedia: Signs of AI writing](https://en.wikipedia.org/wiki/Wikipedia:Signs_of_AI_writing)); qué es un inciso entre rayas y qué usos no lo son (diálogo, atribución, lista, rango) ([DPD de la RAE: raya](https://www.rae.es/dpd/raya)). Umbral 4 por 1 000 del proyecto (máximo humano 3,1); alternativa 0. | no |
| E12-06 | ¿Ninguna racha de oraciones seguidas abre con la misma palabra 5 veces o con las mismas dos palabras 4 veces? | Escaneo: la vista salta las primeras palabras cuando varias líneas empiezan igual ([F-Shaped Pattern of Reading on the Web](https://www.nngroup.com/articles/f-shaped-pattern-reading-web-content/)). Umbral del proyecto: máximo humano 4 con una palabra y 2 con dos. | no |
| E12-07 | ¿Cada sección con 3 oraciones o más tiene al menos una oración que solo podría estar en este artefacto, porque nombra a alguien, algo o una cifra propia? | Concreción ([Made to Stick](https://heathbrothers.com/books/made-to-stick/)); cada sección con afirmación general lleva un ejemplo con nombres, cifras o situación ([The Sense of Style](https://stevenpinker.com/publications/sense-style-thinking-persons-guide-writing-21st-century)). E00-09 pide un solo ejemplo en todo el artefacto; aquí se pide uno por sección. | no |
| E12-08 | ¿Ninguna serie de 3 o más oraciones o párrafos seguidos repite el mismo esqueleto con palabras distintas? | Molde de plantilla. Las estructuras formularias de oración y de documento son la segunda pista de los detectores humanos expertos, 35,9 % ([People who frequently use ChatGPT…](https://arxiv.org/abs/2501.15654)); la regla de tres y la "fórmula rígida" de los cierres ([Wikipedia: Signs of AI writing](https://en.wikipedia.org/wiki/Wikipedia:Signs_of_AI_writing)). El "3 o más seguidas" es del proyecto; evidencia interna: la plantilla repetida tres veces fue la señal que más pesó para los 4 jueces ciegos del 2026-09-23. | no |
| E12-09 | ¿El texto tiene cero contrastes de fórmula ("no es X: es Y", "no solo X, sino Y") sin dato propio al lado? | Paralelismo negativo "no es X, es Y" y "no solo…, sino también" ([Wikipedia: Signs of AI writing](https://en.wikipedia.org/wiki/Wikipedia:Signs_of_AI_writing)); "not only… but also" como patrón previsible de texto generado ([People who frequently use ChatGPT…](https://arxiv.org/abs/2501.15654)). Evidencia interna: decidió 3 de los 4 FAIL de relleno en las 35 corridas. La "revelación con dos puntos" salió de esta pregunta: ninguna fuente la documenta; queda como pista informativa (sección 7). | no |

## 5. Anclas

La nota la calcula el script: 5 = 100 % de PASS sobre preguntas aplicables; 4 = ≥ 85 %; 3 = ≥ 70 %; 2 = ≥ 50 %; 1 = < 50 %. Las anclas solo describen cómo se ve cada nivel.

- **1 —** Suena a chat desde la primera línea. Ejemplo: la copia de la muestra `mala/pagina.html` con los fallos plantados: "En la era digital, es importante destacar que…", nueve conectores en 68 palabras, "el mejor taller de la ciudad" sin dato y "¡Click aquí…!". Pasan 4 de 9; como es web, el "¡Click aquí…!" baja la nota pero no activa el gate.
- **3 —** Sin muletillas, pero con molde. Ejemplo: un taller universitario de teorías en su corrida 3. Tiene 0 muletillas, 0 emoji y 0 rayas, pero dos oraciones gemelas y una conclusión con el mismo esqueleto en las cuatro teorías. Pasarían 7 de 9.
- **5 —** Nada lo delata. Ejemplo: `examples/buena-reporte.md`: 0 muletillas, 1,6 conectores por 1 000, 0 rayas, cada sección con una cifra propia ("620 pesos por hora") y ningún molde. Pasan 9 de 9.

## 6. Reglas NA y UNKNOWN

Reglas generales:

- Este eval trabaja con texto. No requiere captura. Si el juez solo tiene una imagen sin texto legible, todas las preguntas son UNKNOWN.
- Con menos de 100 palabras, E12-02 y E12-05 son NA: la densidad por 1 000 palabras no es fiable. E12-07 y E12-08 son NA cuando ninguna sección llega a 3 oraciones.
- Texto en inglés: el script usa `MULETILLAS_EN` y `ADJ_PROHIBIDOS_EN`. E12-02 es NA, porque el umbral se calibró solo en español; la densidad en inglés se anota como informativa.
- Las citas entre comillas no cuentan para E12-01, E12-03, E12-04 ni E12-09. Son palabras de otra persona o menciones, como cuando un reporte cita una muletilla para señalarla. El script las descuenta y dice cuántas hubo.
- Las secciones de consulta (glosario, contacto, fuentes, instrucciones de uso) son NA en E12-07: no hacen afirmaciones.
- El gate G-E12-1 (E12-04) reprueba el artefacto solo en `reporte-markdown` y `pdf`. En `web`, `app`, `folleto`, `presentacion` y `dashboard`, E12-04 es pregunta normal: un FAIL baja la nota y no reprueba. El script lo dice con `--tipo`; sin `--tipo` imprime el FAIL y avisa que el gate depende del tipo.
- La lista de fuentes o referencias queda fuera de todas las preguntas. Su forma la dicta la norma APA (el formato de citas de la Asociación Americana de Psicología), no el autor.
- Este eval también se aplica a las propias fichas de eval, como `reporte-markdown`. En ellas, E12-03 se solapa con un criterio del meta-eval M1-M12: aquí cuenta como señal de relleno, no como falta de formato.

| Tipo de artefacto | Qué se considera "texto" | Preguntas NA | Preguntas que requieren captura | ¿Reprueba el gate G-E12-1? |
|---|---|---|---|---|
| web | Contenido principal; sin menús, pies ni avisos. En una página de venta aplica todo. | Ninguna, salvo las reglas generales. | Ninguna. | No: E12-04 solo baja la nota. |
| app | Pantallas, mensajes, ayuda y textos de botones. | E12-07 y E12-08 si no hay párrafos. E12-06 mira solo párrafos, no etiquetas de la interfaz. | Ninguna; si solo hay capturas, UNKNOWN. | No. |
| folleto | Texto extraído o transcrito. | Ninguna, salvo las reglas generales. | Ninguna; si está escaneado sin OCR (reconocimiento de texto), UNKNOWN. | No. |
| pdf | Texto extraído. Un CV se trata como pdf: sus rótulos ("Experiencia:") no cuentan para E12-06 ni E12-08. | Ninguna, salvo las reglas generales. | Ninguna. | Sí. |
| presentacion | Texto de diapositivas más notas del orador. El juez puede correr el script por separado sobre lo visible y sobre las notas. | E12-08 se aplica por diapositiva, no entre viñetas de una misma lista. | Ninguna. | No. |
| reporte-markdown | Todo el archivo sin frontmatter ni lista de fuentes. Un guion de video se trata como reporte: cada escena es una sección. | Ninguna. | Ninguna. | Sí. |
| dashboard | Título, subtítulos, etiquetas, leyendas y notas. | E12-02, E12-05, E12-06, E12-07 y E12-08 si no hay párrafos; quedan E12-01, E12-03, E12-04 y E12-09 sobre los textos cortos. | Ninguna; si solo hay capturas, UNKNOWN. | No. |

## 7. Errores comunes del juez

- Contar la lista de fuentes. En 8 de las 35 corridas, las fichas de un mismo autor seguidas convertían un PASS en FAIL. El script la excluye; el juez no la vuelve a meter.
- Contar como muletilla una palabra suelta que suena a IA ("garantizar", "paradigma", "landscape"). Solo cuenta la lista cerrada del script: "cita garantizada" fue falso positivo en cinco corridas y `\landscape` es una orden de LaTeX.
- Contar un sustantivo o un adjetivo de época como adjetivo prohibido: "el profesional de la salud", "pagar en efectivo", "la psicología moderna", "a lo mejor". E12-03 solo mira adjetivos que califican sin criterio al lado.
- Marcar FAIL en E12-04 por un control de la interfaz ("★" de calificación, "✓" de selección) o por una exclamación dentro de una cita ajena. Se descuentan y se anotan.
- Reprobar una presentación o una página web por un "¡Gracias!". El gate G-E12-1 reprueba solo en `reporte-markdown` y `pdf`; en los demás tipos, E12-04 baja la nota y nada más.
- Contar como raya de inciso un separador de pie de foto ("Los Cabos — La Paz") o una atribución ("…" — un cliente). Solo cuentan las rayas dentro de una oración de prosa.
- Contar como racha una lista de rótulos iguales ("market:" ×4) o cuatro definiciones de una tabla que empiezan con "Es". E12-06 mide oraciones de prosa; las viñetas de una línea y las celdas quedan fuera.
- Dar PASS en E12-07 porque el total de oraciones con dato pasa del 40 %. En la calibración, 30 de 55 textos humanos quedaron por debajo del 40 % y los dos controles de IA por encima. El porcentaje no decide; la prueba por sección sí.
- Contar como dato propio una remisión ("ver figura 1"), un rótulo con mayúscula ("b) Representantes") o una sigla genérica como "IA". Los jueces corrigieron esos tres casos a mano en 20 corridas.
- Tomar el paralelismo de una lista de viñetas como molde en E12-08. En una lista, la forma paralela es la convención; el molde se busca en oraciones y párrafos seguidos.
- Contar dos veces la misma serie. Si cuatro oraciones abren igual y además comparten esqueleto, fallan E12-06; E12-08 no las vuelve a contar.
- Contar en E12-09 un contraste con dato ("más clientes, no precios más altos", con tickets y precio medidos) o la tesis de una fuente citada. Solo cuenta el que opone una alternativa de paja.
- Dar FAIL en E12-09 por una revelación con dos puntos ("La clave: constancia."). Desde la tercera vuelta es solo una pista informativa: ninguna fuente la documenta. Se anota en "evals ambiguos" y no se califica.
- Bajar la nota por tríadas, cadencia o líneas "Etiqueta: texto". Son señales informativas: en 35 corridas nunca decidieron un veredicto, y el coeficiente de variación más bajo medido (0,28) fue de un texto humano.
- Premiar un texto porque "explica más". El largo no cuenta: un juez LLM tiende a preferir la respuesta más larga ([Judging LLM-as-a-Judge with MT-Bench and Chatbot Arena](https://arxiv.org/abs/2306.05685)).

## Sources

- Federal Plain Language Guidelines — https://digital.gov/guides/plain-language
- The Sense of Style. The Thinking Person's Guide to Writing in the 21st Century — https://stevenpinker.com/publications/sense-style-thinking-persons-guide-writing-21st-century
- Made to Stick. Why Some Ideas Survive and Others Die — https://heathbrothers.com/books/made-to-stick/
- Consequences of Erudite Vernacular Utilized Irrespective of Necessity: Problems with Using Long Words Needlessly — https://cahill.people.unm.edu/480-21/Oppenheimer-2006-Applied_Cognitive_Psychology.pdf
- Delving into LLM-assisted writing in biomedical publications through excess vocabulary — https://arxiv.org/abs/2406.07016
- Monitoring AI-Modified Content at Scale (ICML 2024) — https://arxiv.org/abs/2403.07183
- People who frequently use ChatGPT for writing tasks are accurate and robust detectors of AI-generated text — https://arxiv.org/abs/2501.15654
- Wikipedia: Signs of AI writing (WikiProject AI Cleanup) — https://en.wikipedia.org/wiki/Wikipedia:Signs_of_AI_writing
- Diccionario panhispánico de dudas, entrada «raya», y Ortografía de la lengua española, § 3.4.9 (RAE y ASALE) — https://www.rae.es/dpd/raya
- The Chicago Manual of Style Online, Q&A sobre énfasis y signos de exclamación — https://www.chicagomanualofstyle.org/qanda/data/faq/topics/Punctuation/faq0013.html
- F-Shaped Pattern of Reading on the Web: Misunderstood, But Still Relevant (Even on Mobile) — https://www.nngroup.com/articles/f-shaped-pattern-reading-web-content/
- Judging LLM-as-a-Judge with MT-Bench and Chatbot Arena — https://arxiv.org/abs/2306.05685
- Justice or Prejudice? Quantifying Biases in LLM-as-a-Judge — https://arxiv.org/abs/2410.02736
