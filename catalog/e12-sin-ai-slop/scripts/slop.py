#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
slop.py — Señales de "AI slop" en un texto: muletillas de IA, densidad de conectores, adjetivos vacíos,
emoji, exclamaciones, rayas de inciso, aperturas repetidas, oraciones con dato y cadencia.

Versión 1.0 · 2026-10-01 · Eval que lo usa: ../eval.md (E12, v0.1).
Reemplaza a un escaneo ad hoc anterior (2026-09-19).

Uso:
    python3 slop.py archivo.md                      # salida en texto
    python3 slop.py archivo.md --json               # salida en JSON
    python3 slop.py pagina.html --sin-seccion "Anexo"   # excluye además la sección "Anexo"
    python3 slop.py guion.txt --seccion "Contenido"     # mide solo las secciones cuyo título contiene ese texto
    python3 slop.py archivo.md --con-fuentes            # NO excluye la lista de fuentes
    python3 slop.py archivo.md --incluir-tablas         # las celdas de tabla entran como oraciones
    python3 slop.py archivo.md --tipo reporte-markdown  # dice si el gate G-E12-1 aplica (solo reporte-markdown y pdf)

Acepta .md, .txt y .html. Solo usa la biblioteca estándar de Python 3.

QUÉ EXCLUYE SIEMPRE (regla R11 del contrato de claridad y decisiones de las 35 corridas ciegas de la lente slop):
    - Las citas entre comillas («…», "…", “…”) no cuentan para las listas (E12-01, E12-03) ni para emoji y
      exclamaciones (E12-04): son palabras de otra persona o menciones, como cuando un reporte cita una muletilla
      para señalarla. El script dice cuántas apariciones quedaron dentro de citas.
    - El frontmatter (bloque entre dos líneas ---), los bloques de código, los comentarios HTML, las imágenes
      y los bloques de cita (líneas que empiezan con ">"): ahí van los ejemplos de texto malo (R11).
    - La sección de referencias: todo encabezado que empiece por "Fuentes", "Referencias", "Bibliografía",
      "Obras citadas", "References", "Bibliography" o "Works cited" queda fuera hasta el siguiente encabezado
      del mismo nivel o superior. Motivo: su forma la dicta la norma APA, no el autor; en 8 de las 35 corridas
      la lista de fuentes convertía un PASS en FAIL por las fichas de un mismo autor seguidas. La salida dice qué
      secciones excluyó. Con --con-fuentes se incluyen; con --sin-seccion se excluyen otras.

DOS NIVELES DE TEXTO:
    - "texto total": todo lo que queda tras las exclusiones, incluidas celdas de tabla, títulos y viñetas de una
      línea. Sobre él se cuentan las listas de palabras (muletillas, conectores, adjetivos), los emoji, las
      exclamaciones y las rayas. La densidad por 1 000 palabras usa sus palabras como denominador.
    - "oraciones": las de 4 palabras o más que salen de los párrafos de prosa y de las viñetas de varias líneas,
      más las viñetas de una línea con 6 palabras o más. Las celdas de tabla no entran salvo con --incluir-tablas.
      Sobre ellas se miden las aperturas repetidas, las oraciones con dato y la cadencia.

LAS TRES LISTAS (decisión de Santiago, 2026-10-01):
    - MULETILLAS_ES / MULETILLAS_EN: frases de relleno típicas de texto generado. Tolerancia 0. Todas son
      frases de dos o más palabras o palabras que un texto humano casi nunca usa ("tapiz", "delve"). Las
      palabras sueltas de uso normal ("garantizar", "paradigma", "fomentar") no están aquí: en las corridas
      dieron falsos positivos ("cita garantizada"). La familia "es importante + verbo" tampoco: está en
      CONECTORES_ES por decisión de Santiago (4 de 55 lecturas humanas la usan).
    - CONECTORES_ES / CONECTORES_EN: conectores de discurso y fórmulas de presentación normales en español
      académico ("por lo tanto", "asimismo", "es importante señalar"). Se miden por densidad (apariciones por
      cada 1 000 palabras); el umbral, 18, es el percentil 90 de 55 textos humanos. Un "por lo tanto" no
      reprueba a nadie.
    - ADJ_PROHIBIDOS_ES: los adjetivos "prohibidos sin operacionalizar" del contrato de claridad, con sus
      flexiones. El script solo lista cada aparición con su oración; el juez decide si al lado se dice qué se
      observa. ADJ_PROHIBIDOS_EN son sus equivalentes para texto en inglés.

CÓMO SE DECIDE SI UNA ORACIÓN TIENE UN DATO CONCRETO (medida informativa; los jueces la corrigieron a mano en 20
corridas y en la calibración 30 de 55 textos humanos quedaron por debajo del 40 %, así que no es umbral):
    Cuenta si tiene al menos uno de: (1) una cifra en dígitos que no sea una remisión al propio documento
    ("figura 1", "tabla 2", "sección 3", "p. 57"); (2) un número escrito en letra, de "dos" en adelante;
    (3) una cita textual entre comillas de 3 palabras o más; (4) un nombre propio: palabra con mayúscula inicial
    que no abre la oración y no va tras "¿", "¡" o dos puntos, excluidas las siglas de 2 letras ("AI", "IA") y el
    pronombre inglés "I"; también cuenta la palabra con mayúscula que abre la oración si en otra parte del texto
    aparece con mayúscula dentro de una oración (así "Apellido dice…" cuenta); (5) un símbolo de unidad o moneda
    (%, $, €, £). Los rótulos "b) Representantes" y los encabezados de columna no entran porque no son oraciones.

APERTURAS REPETIDAS:
    Se mira la primera palabra y las dos primeras palabras de cada oración. Una "racha" es una serie de oraciones
    seguidas, dentro de la misma sección, con la misma clave. Falla con una racha de 5 o más con la misma primera
    palabra (el máximo humano medido fue 4: cuatro definiciones seguidas con "El") o de 4 o más con las dos
    primeras palabras (máximo humano: 2). Las aperturas que son rótulo ("market:") no cuentan. Además se informan,
    sin veredicto, las claves de 2 palabras que abren 4 oraciones o más en todo el texto, aunque estén dispersas.

CADENCIA:
    Sobre las oraciones de 6 palabras o más: media, desviación, coeficiente de variación (CV = desviación entre
    media) y la más larga. Es informativa: en las 35 corridas el CV más bajo fue 0,30 y nunca decidió un veredicto.

VEREDICTOS QUE IMPRIME (los umbrales son los del eval E12 v0.1; ver UMBRALES abajo):
    E12-01 muletillas = 0 · E12-02 conectores ≤ 18 por 1 000 palabras · E12-03 adjetivos prohibidos: PASS si 0,
    REVISAR si hay (el juez decide) · E12-04 emoji = 0 y exclamaciones = 0; su gate G-E12-1 reprueba solo en
    reporte-markdown y pdf, así que con --tipo el script dice si aplica y sin --tipo avisa · E12-05 rayas de inciso ≤ 4 por 1 000
    palabras · E12-06 sin rachas de apertura (5 con una palabra, 4 con dos). Para E12-07 (prueba de sustitución),
    E12-08 (molde repetido) y E12-09 (contrastes de fórmula) el script solo deja pistas: porcentaje de oraciones
    con dato y contrastes. Esas tres las decide el juez. Las revelaciones con dos puntos ("la clave:") y el
    metadiscurso son pistas informativas sin veredicto: ninguna fuente documenta la revelación (tercera vuelta).

LÍMITES CONOCIDOS:
    - El detector de idioma es una cuenta de palabras frecuentes; con texto mezclado marca "mixto" y aplica las
      dos listas.
    - "★" y "✓" de una interfaz cuentan como emoji por rango Unicode; el juez los descuenta (E12, sección 7).
    - Una raya que separa un pie de foto ("Los Cabos — La Paz") se cuenta como inciso si tiene letras a ambos
      lados; el juez la descuenta si no está en una oración de prosa.
    - No lee PDF ni imágenes: hay que pasarle el texto extraído.
"""

import argparse
import html as html_mod
import json
import math
import os
import re
import sys
import unicodedata

VERSION = "1.0"
FECHA = "2026-10-01"

TIPOS = ("web", "app", "folleto", "pdf", "presentacion", "reporte-markdown", "dashboard")
TIPOS_CON_GATE = ("reporte-markdown", "pdf")   # G-E12-1 (E12-04) solo reprueba en estos tipos (decisión de Santiago, 2026-10-01)

UMBRALES = {
    "muletillas": 0,                 # E12-01: apariciones
    "conectores_por_mil": 18.0,      # E12-02: por cada 1 000 palabras. Percentil 90 de 55 textos humanos (decisión de Santiago, 2026-10-01)
    "adjetivos": 0,                  # E12-03: apariciones sin operacionalizar (el juez decide)
    "emoji": 0,                      # E12-04
    "exclamaciones": 0,              # E12-04
    "rayas_por_mil": 4.0,            # E12-05: rayas de inciso por cada 1 000 palabras. Máximo humano 3,1 + margen. Alternativa: 0 (REP-01)
    "racha_aperturas_1": 5,          # E12-06: falla con una racha de este tamaño o mayor con la misma primera palabra (máximo humano: 4)
    "racha_aperturas_2": 4,          # E12-06: ídem con las dos primeras palabras (máximo humano: 2)
    "dato_pct_alarma": 30.0,         # informativo: por debajo, el juez revisa E12-07 sección por sección (30 de 55 textos humanos dan < 40 %)
    "min_palabras": 100,             # con menos palabras, E12-02 queda NA (la densidad no es fiable)
}

# ---------------------------------------------------------------------------
# Listas
# ---------------------------------------------------------------------------

MULETILLAS_ES = [
    # Tolerancia 0. Regla de admisión: 0 apariciones en los 55 textos humanos de la calibración del 2026-10-01
    # (53 lecturas universitarias y 2 textos de autoría humana segura) y ninguna de las palabras sueltas que
    # dieron falsos positivos en las 35 corridas ("garantizar", "paradigma", "landscape", "permite").
    # Decisión de Santiago (2026-10-01, segunda vuelta): la familia "es importante + verbo" (destacar, señalar,
    # mencionar, resaltar…) no está aquí sino en CONECTORES_ES, porque 4 de 55 lecturas humanas la usan.
    # fórmulas de énfasis vacío
    "es preciso destacar", "es menester", "resulta crucial", "es crucial", "es innegable que", "es un hecho innegable",
    # marco temporal genérico
    "en la era digital", "en la era de la información", "en el mundo actual", "en el mundo de hoy",
    "en un mundo cada vez más", "en el panorama actual", "en constante evolución", "en constante cambio",
    "desde tiempos inmemoriales", "a lo largo de la historia de la humanidad",
    # papel y relevancia
    "juega un papel fundamental", "juega un papel crucial", "juega un papel clave", "desempeña un papel fundamental",
    "desempeña un papel crucial", "desempeña un papel clave", "papel fundamental", "papel crucial", "rol fundamental",
    "rol crucial", "de vital importancia",
    # amplitud vacía
    "de manera integral", "de forma integral", "de manera holística", "de forma holística", "enfoque holístico",
    "enfoque integral", "en todos los ámbitos", "a todos los niveles",
    # metáforas y vocabulario de texto generado
    "sumergirse en", "sumergirnos en", "sumérgete en", "navegar por el", "navegar por la", "navegar por este", "navegar por los", "navegar por las",
    "un tapiz", "el tapiz", "tapiz de", "es un testimonio de", "es testimonio de", "es un claro testimonio",
    "es un fiel reflejo", "es un claro ejemplo de cómo", "revolucionar la forma", "revolucionar la manera",
    "revolucionado la forma", "revolucionado la manera", "transformar la forma en que", "cambiar las reglas del juego",
    "un cambio de paradigma", "desbloquear el potencial", "desbloquear todo el potencial", "liberar el potencial",
    "liberar todo el potencial", "llevar al siguiente nivel", "al siguiente nivel", "marcar la diferencia",
    "hacer la diferencia", "un antes y un después", "la clave del éxito", "clave para el éxito",
    "no es solo una herramienta", "sinergia", "sinergias", "vibrante", "holístico", "holística", "holísticos", "holísticas", "potenciar el", "potenciar la",
    "potenciar su", "potenciar las", "potenciar los", "con esto en mente",
    # arranques y cierres de chatbot o de blog
    "espero que este", "espero que esta", "espero que te", "espero haber", "no dudes en", "si tienes alguna duda",
    "¡comencemos", "¡empecemos", "¡vamos a ello", "¡manos a la obra", "en este blog", "en este post",
    "en esta publicación", "en esta entrada", "en el presente documento", "en el presente trabajo",
    "en el presente artículo", "el presente documento", "el presente trabajo", "el presente informe",
]

MULETILLAS_EN = [
    # Tolerancia 0. Vocabulario marcado de texto generado en inglés (estudios de corpus de 2024 y las listas de las corridas).
    "delve", "delves", "delving", "delved", "tapestry", "a testament to", "testament to", "stands as a testament",
    "it's important to note", "it is important to note", "it's worth noting", "it is worth noting",
    "it's worth mentioning", "it is worth mentioning", "it's crucial to", "it is crucial to", "it's essential to",
    "it is essential to", "it's vital to", "it is vital to", "needless to say", "it goes without saying",
    "in today's", "in the realm of", "in the world of", "in the landscape of", "the landscape of", "digital landscape",
    "ever-evolving", "ever-changing", "fast-paced world", "in this digital age", "in the digital age", "in the modern era",
    "game-changer", "game changer", "game-changing", "unlock the potential", "unlock your", "unlock the power",
    "unleash", "harness the power", "harness the", "leverage the power", "elevate your", "take it to the next level",
    "to the next level", "embark on", "a journey of", "the journey of", "navigate the", "navigating the",
    "dive into", "deep dive", "let's dive", "let's explore", "let's delve", "let's take a look", "look no further",
    "whether you're", "whether you are a", "whether you are an", "at the end of the day", "the bottom line is",
    "seamless", "seamlessly", "cutting-edge", "state-of-the-art", "holistic", "holistically", "synergy", "synergies",
    "paradigm shift", "revolutionize", "revolutionizing", "revolutionise", "transformative", "disruptive",
    "a plethora of", "a myriad of", "myriad", "multifaceted", "nuanced", "robust and",
    "plays a crucial role", "plays a vital role", "plays a key role", "plays a pivotal role", "pivotal role",
    "crucial role", "vital role", "key takeaways", "key takeaway", "in this article", "in this blog post",
    "in this post", "in this guide", "stay tuned", "happy coding", "i hope this helps", "hope this helps",
    "it's no secret", "it is no secret", "more than just a", "not just a tool", "a world where", "imagine a world",
    "empower", "empowers", "empowering", "foster a culture", "fostering a culture",
    "vibrant", "bustling", "meticulous", "meticulously", "intricate", "intricacies", "beacon", "realm", "endeavor",
    "endeavour", "embrace the", "embracing the", "unwavering", "underscore", "underscores", "underscoring",
    "showcase", "showcases", "showcasing", "boasts", "boasting", "indelible", "profound impact", "rich history",
    "rich tapestry", "treasure trove", "well-crafted", "craft a", "crafting a", "comprehensive guide", "ultimate guide",
]

CONECTORES_ES = [
    # Densidad por 1 000 palabras. Conectores de discurso y fórmulas de presentación, reformulación o cierre que el
    # español académico humano usa con normalidad (varias aparecieron en las lecturas humanas de la calibración).
    "sin embargo", "no obstante", "además", "asimismo", "así mismo", "por lo tanto", "por tanto", "por ende",
    "por consiguiente", "en consecuencia", "de este modo", "de esta manera", "de esta forma", "de igual manera",
    "de igual forma", "de igual modo", "del mismo modo", "de la misma manera", "en este sentido", "en cuanto a",
    "con respecto a", "respecto a", "respecto de", "en relación con", "con relación a", "por un lado", "por otro lado",
    "por una parte", "por otra parte", "en primer lugar", "en segundo lugar", "en tercer lugar", "por último",
    "finalmente", "en conclusión", "en resumen", "en síntesis", "en definitiva", "en suma", "es decir",
    "a lo largo de", "en el marco de", "a nivel de", "no solo", "no sólo", "sino también", "sino que también",
    "en efecto", "ahora bien", "de hecho", "en particular", "en general", "en términos generales", "a su vez",
    "así como", "con el fin de", "a fin de", "con el objetivo de", "con el propósito de", "de acuerdo con",
    "en la medida en que", "en lo que respecta a", "por su parte", "en cambio", "aun así", "de manera que",
    "de modo que", "puesto que", "dado que", "ya que", "es por ello que", "es por eso que", "es por esto que",
    "dicho esto", "teniendo esto en cuenta", "en última instancia", "en otras palabras", "en pocas palabras",
    "dicho de otro modo", "dicho de otra manera", "dicho de otra forma", "a modo de conclusión", "a modo de cierre",
    "a modo de resumen", "como se mencionó anteriormente", "como se mencionó previamente", "como ya se mencionó",
    "como hemos visto", "como se puede observar", "como podemos observar", "como podemos ver", "podemos concluir que",
    "cabe destacar", "cabe mencionar", "cabe señalar", "cabe resaltar", "cabe recalcar", "cabe subrayar",
    "es importante destacar", "es importante mencionar", "es importante señalar", "es importante recalcar",
    "es importante resaltar", "es importante tener en cuenta", "es importante recordar", "es importante notar",
    "cabe preguntarse", "vale la pena destacar", "vale la pena mencionar", "vale la pena señalar", "sin lugar a dudas",
    "sin duda alguna", "no cabe duda de que", "es esencial", "es imprescindible", "es fundamental", "resulta fundamental",
    "resulta esencial", "resulta imprescindible", "de suma importancia", "de gran importancia", "cobra relevancia",
    "cobra especial relevancia", "adquiere relevancia", "juega un papel importante", "desempeña un papel importante",
    "una amplia gama de", "un amplio abanico de", "una gran variedad de", "un sinfín de", "en todos los aspectos",
    "en el contexto actual", "en la sociedad actual", "en el entorno actual", "hoy en día", "en la actualidad",
]

CONECTORES_EN = [
    # Densidad por 1 000 palabras. Sin umbral calibrado: informativo. Incluye los conectores de cierre y reformulación.
    "however", "moreover", "furthermore", "additionally", "in addition", "therefore", "thus", "hence", "consequently",
    "as a result", "in this sense", "in this regard", "with regard to", "regarding", "on the one hand", "on the other hand",
    "first of all", "in the first place", "firstly", "secondly", "lastly", "in conclusion", "in summary", "to summarize",
    "to sum up", "in short", "that is to say", "throughout", "within the framework of", "not only", "but also", "indeed",
    "in fact", "in particular", "in general", "in turn", "as well as", "in order to", "according to", "nevertheless",
    "nonetheless", "likewise", "similarly", "for this reason", "given that", "overall", "ultimately", "with that said",
    "that being said", "having said that", "as mentioned earlier", "as mentioned above", "as previously mentioned",
    "as we have seen", "as we can see", "in other words", "put simply", "simply put", "in a nutshell", "a wide range of",
    "the importance of", "best practices",
]

ADJ_PROHIBIDOS_ES = [
    "bonito", "bonita", "bonitos", "bonitas", "atractivo", "atractiva", "atractivos", "atractivas", "agradable",
    "agradables", "profesional", "profesionales", "claro", "clara", "claros", "claras", "entendible", "entendibles",
    "limpio", "limpia", "limpios", "limpias", "ordenado", "ordenada", "ordenados", "ordenadas", "moderno", "moderna",
    "modernos", "modernas", "elegante", "elegantes", "intuitivo", "intuitiva", "intuitivos", "intuitivas",
    "fácil de usar", "sencillo", "sencilla", "sencillos", "sencillas", "simple", "simples", "coherente", "coherentes",
    "consistente", "consistentes", "de calidad", "riguroso", "rigurosa", "rigurosos", "rigurosas", "eficaz", "eficaces",
    "efectivo", "efectiva", "efectivos", "efectivas", "útil", "útiles", "impactante", "impactantes", "potente", "potentes",
    "bueno", "buena", "buenos", "buenas", "buen", "malo", "mala", "malos", "malas", "mejor", "mejores", "óptimo",
    "óptima", "óptimos", "óptimas",
]

ADJ_PROHIBIDOS_EN = [
    "beautiful", "attractive", "pleasant", "nice", "professional", "clear", "understandable", "clean", "tidy", "neat",
    "modern", "elegant", "intuitive", "user-friendly", "easy to use", "simple", "coherent", "consistent", "quality",
    "high-quality", "rigorous", "effective", "efficient", "useful", "impactful", "powerful", "good", "bad", "better",
    "best", "optimal", "great", "amazing", "excellent",
]

# Encabezados que se excluyen por defecto (se comparan sin acentos, en minúsculas y sin número inicial).
SECCIONES_EXCLUIDAS = ["fuentes", "referencias", "bibliograf", "obras citadas", "lista de referencias",
                       "references", "bibliography", "works cited", "enlaces del recurso"]

# Rótulos de remisión al propio documento: "figura 1", "tabla 2", "p. 57"… no cuentan como dato.
RE_REMISION = re.compile(
    r"\b(figuras?|fig\.|tablas?|cuadros?|secci[oó]n(?:es)?|cap[ií]tulos?|p[aá]ginas?|p\.|pp\.|p[aá]gs?\.|apartados?|"
    r"anexos?|diapositivas?|l[ií]neas?|notas?|pasos?|partes?|puntos?|unidad(?:es)?|m[oó]dulos?|temas?|fases?|"
    r"sesi[oó]n(?:es)?|actividad(?:es)?|tareas?|secuencias?|escenas?|columnas?|filas?|incisos?|art[ií]culos?|"
    r"figures?|tables?|sections?|chapters?|pages?|slides?|steps?|parts?|items?|modules?|lessons?|weeks?|days?)"
    r"\s*(?:n[.º°]?\s*)?\d+[a-z]?\b", re.I)

NUMEROS_EN_LETRA = (
    r"\b(dos|tres|cuatro|cinco|seis|siete|ocho|nueve|diez|once|doce|trece|catorce|quince|diecis[eé]is|diecisiete|"
    r"dieciocho|diecinueve|veinte|veinti\w+|treinta|cuarenta|cincuenta|sesenta|setenta|ochenta|noventa|cien|ciento|"
    r"cientos|doscient[oa]s|trescient[oa]s|cuatrocient[oa]s|quinient[oa]s|seiscient[oa]s|setecient[oa]s|ochocient[oa]s|"
    r"novecient[oa]s|mil|miles|mill[oó]n|millones|docena|docenas|two|three|four|five|six|seven|eight|nine|ten|eleven|"
    r"twelve|thirteen|fourteen|fifteen|sixteen|seventeen|eighteen|nineteen|twenty|thirty|forty|fifty|sixty|seventy|"
    r"eighty|ninety|hundred|hundreds|thousand|thousands|million|millions|dozen|dozens)\b")
RE_NUMERO_LETRA = re.compile(NUMEROS_EN_LETRA, re.I)

RE_EMOJI = re.compile("[\U0001F300-\U0001FAFF\u2600-\u27BF\U0001F000-\U0001F2FF\u2B50\u2B55\u231A\u231B\u23E9-\u23FA\uFE0F]")

RE_PALABRA = re.compile(r"[A-Za-zÁÉÍÓÚÜÑáéíóúüñ]+(?:[-'’][A-Za-zÁÉÍÓÚÜÑáéíóúüñ]+)*|\d+(?:[.,]\d+)*")

FUNCION_ES = {"el", "la", "de", "que", "y", "en", "los", "las", "del", "se", "por", "con", "una", "para", "es", "al", "lo", "como", "más", "su"}
FUNCION_EN = {"the", "and", "of", "to", "is", "in", "that", "it", "for", "with", "as", "on", "are", "this", "be", "by", "or", "an", "at", "from"}


# ---------------------------------------------------------------------------
# Utilidades
# ---------------------------------------------------------------------------

def normalizar(s):
    s = unicodedata.normalize("NFKD", s).encode("ascii", "ignore").decode().lower().strip()
    s = re.sub(r"^[\d.)\s-]+", "", s)
    return s.strip()


def tokens(texto):
    return RE_PALABRA.findall(texto)


def contar_palabras(texto):
    return len(tokens(texto))


def limpiar_inline(texto):
    """Quita marcas de Markdown dentro de una línea (misma convención que legibilidad.py)."""
    t = texto
    t = re.sub(r"!\[[^\]]*\]\([^)]*\)", " ", t)
    t = re.sub(r"\[([^\]]+)\]\([^)]*\)", r"\1", t)
    t = re.sub(r"\[([^\]]+)\]\[[^\]]*\]", r"\1", t)
    t = re.sub(r"<https?://[^>]+>", " ", t)
    t = re.sub(r"https?://\S+", " ", t)
    t = re.sub(r"`[^`]*`", " ", t)
    t = re.sub(r"\[\^[^\]]+\]", "", t)
    t = re.sub(r"(\*\*|__)(.*?)\1", r"\2", t)
    t = re.sub(r"(?<!\w)([*_])(?!\s)(.*?)(?<!\s)\1(?!\w)", r"\2", t)
    t = re.sub(r"~~(.*?)~~", r"\1", t)
    t = re.sub(r"<[^>]+>", " ", t)
    t = html_mod.unescape(t)
    t = re.sub(r"\\[a-zA-Z]+\b", " ", t)   # directivas LaTeX sueltas (\landscape)
    t = re.sub(r"[ \t]+", " ", t)
    return t.strip()


def html_a_markdown(texto):
    """Convierte HTML en un Markdown aproximado. Conserva las celdas de tabla como filas '| a | b |'."""
    t = re.sub(r"(?is)<(script|style|svg|noscript|head)\b.*?</\1>", " ", texto)
    t = re.sub(r"(?is)<!--.*?-->", " ", t)
    t = re.sub(r"(?is)<title\b[^>]*>(.*?)</title>", lambda m: "\n# " + re.sub(r"<[^>]+>", " ", m.group(1)).strip() + "\n", t)

    def fila(m):
        celdas = re.findall(r"(?is)<t[hd]\b[^>]*>(.*?)</t[hd]>", m.group(1))
        celdas = [re.sub(r"<[^>]+>", " ", c).strip() for c in celdas]
        return "\n| " + " | ".join(celdas) + " |\n"
    t = re.sub(r"(?is)<tr\b[^>]*>(.*?)</tr>", fila, t)
    t = re.sub(r"(?is)</?(table|thead|tbody|tfoot|caption)\b[^>]*>", "\n", t)
    t = re.sub(r"(?is)<h([1-6])\b[^>]*>(.*?)</h\1>",
               lambda m: "\n" + "#" * int(m.group(1)) + " " + re.sub(r"<[^>]+>", " ", m.group(2)).strip() + "\n", t)
    t = re.sub(r"(?is)<blockquote\b[^>]*>(.*?)</blockquote>",
               lambda m: "\n" + "\n".join("> " + l for l in re.sub(r"<[^>]+>", " ", m.group(1)).strip().splitlines()) + "\n", t)
    t = re.sub(r"(?is)<li\b[^>]*>(.*?)</li>", lambda m: "\n- " + re.sub(r"<[^>]+>", " ", m.group(1)).strip() + "\n", t)
    t = re.sub(r"(?is)<(p|div|section|article|br|hr|ul|ol|header|footer|main|nav|aside|figure|figcaption|dt|dd|option)\b[^>]*>", "\n", t)
    t = re.sub(r"(?is)</(p|div|section|article|ul|ol|header|footer|main|nav|aside|figure|figcaption|dt|dd|option)>", "\n", t)
    t = re.sub(r"<[^>]+>", " ", t)
    t = html_mod.unescape(t)
    return t


RE_CITA = re.compile(r"[«\"“]([^»\"”\n]{1,400}?)[»\"”]")


def quitar_citas(texto):
    """Sustituye el contenido de las citas entre comillas («», "", “”) por espacios. Las citas son palabras de
    otra persona o menciones ("la frase 'es importante destacar' es una muletilla") y no cuentan para las listas."""
    return RE_CITA.sub(lambda m: " " * len(m.group(0)), texto)


def detectar_idioma(texto):
    low = [w.lower() for w in tokens(texto)]
    es = sum(1 for w in low if w in FUNCION_ES)
    en = sum(1 for w in low if w in FUNCION_EN)
    if es == 0 and en == 0:
        return "desconocido"
    if es >= 3 * en:
        return "es"
    if en >= 3 * es:
        return "en"
    return "mixto"


# ---------------------------------------------------------------------------
# Bloques
# ---------------------------------------------------------------------------

def parsear(texto, sin_secciones, solo_seccion=None):
    """Devuelve (bloques, secciones_excluidas). Cada bloque: dict(tipo, texto, seccion, linea).

    tipo: prosa, vineta (varias líneas), vineta1 (una línea), celda, titulo.
    """
    texto = re.sub(r"(?s)<!--.*?-->", " ", texto)
    lineas = texto.replace("\r\n", "\n").replace("\r", "\n").split("\n")
    inicio = 0
    if lineas and lineas[0].strip() == "---":
        for i in range(1, len(lineas)):
            if lineas[i].strip() in ("---", "..."):
                inicio = i + 1
                break
    bloques, excluidas = [], []
    seccion, nivel_sec = "", 0
    excluyendo, nivel_excl, excl_actual = False, 0, None
    en_codigo = False
    parrafo, tipo_parrafo, linea_parrafo = [], "prosa", 0
    solo = normalizar(solo_seccion) if solo_seccion else None
    dentro_solo = (solo is None)

    def cerrar():
        nonlocal parrafo, tipo_parrafo
        if parrafo:
            txt = limpiar_inline("\n".join(parrafo))
            if contar_palabras(txt) > 0:
                t = tipo_parrafo
                if t == "vineta" and len(parrafo) == 1:
                    t = "vineta1"
                bloques.append({"tipo": t, "texto": txt, "seccion": seccion, "linea": linea_parrafo})
        parrafo = []
        tipo_parrafo = "prosa"

    def cerrar_excluida(n_linea):
        nonlocal excluyendo, excl_actual
        if excluyendo and excl_actual:
            excl_actual["linea_fin"] = n_linea
            excluidas.append(excl_actual)
        excluyendo, excl_actual = False, None

    for idx in range(inicio, len(lineas)):
        linea = lineas[idx]
        n_linea = idx + 1
        s = linea.strip()
        if s.startswith("```") or s.startswith("~~~"):
            cerrar()
            en_codigo = not en_codigo
            continue
        if en_codigo:
            continue
        m_tit = re.match(r"^(#{1,6})\s+(.*)$", s)
        if m_tit:
            cerrar()
            nivel = len(m_tit.group(1))
            titulo = limpiar_inline(m_tit.group(2)).strip()
            nt = normalizar(titulo)
            if excluyendo and nivel <= nivel_excl:
                cerrar_excluida(n_linea - 1)
            if solo is not None:
                dentro_solo = solo in nt
            if not excluyendo and any(nt.startswith(p) for p in sin_secciones):
                excluyendo, nivel_excl = True, nivel
                excl_actual = {"titulo": titulo, "linea_ini": n_linea, "linea_fin": None, "palabras": 0}
                continue
            seccion, nivel_sec = titulo, nivel
            if dentro_solo and not excluyendo:
                bloques.append({"tipo": "titulo", "texto": titulo, "seccion": seccion, "linea": n_linea})
            continue
        if excluyendo:
            excl_actual["palabras"] += contar_palabras(limpiar_inline(s))
            continue
        if not dentro_solo:
            continue
        if not s:
            cerrar()
            continue
        if re.match(r"^(\s*[-*_]\s*){3,}$", s) or re.match(r"^\s*[:\-|\s]+$", s):
            cerrar()
            continue
        if s.startswith("|"):
            cerrar()
            celdas = [c.strip() for c in s.strip("|").split("|")]
            for c in celdas:
                ct = limpiar_inline(c)
                if contar_palabras(ct) > 0:
                    bloques.append({"tipo": "celda", "texto": ct, "seccion": seccion, "linea": n_linea})
            continue
        if re.match(r"^!\[", s) or re.match(r"^<[^>]+>$", s):
            cerrar()
            continue
        if s.startswith(">"):
            cerrar()
            continue
        if re.match(r"^\\[a-zA-Z]+$", s):
            cerrar()
            continue
        m_vin = re.match(r"^(\s*)([-*+•]|\d+[.)])\s+(.*)$", linea)
        if m_vin:
            cerrar()
            parrafo = [m_vin.group(3)]
            tipo_parrafo = "vineta"
            linea_parrafo = n_linea
            continue
        if tipo_parrafo == "vineta" and parrafo and (linea.startswith("  ") or linea.startswith("\t")):
            parrafo.append(s)
            continue
        if tipo_parrafo == "vineta":
            cerrar()
        if not parrafo:
            linea_parrafo = n_linea
        parrafo.append(s)
        tipo_parrafo = "prosa"
    cerrar()
    cerrar_excluida(len(lineas))
    return bloques, excluidas


# ---------------------------------------------------------------------------
# Oraciones
# ---------------------------------------------------------------------------

_P = "⁣"  # marca invisible para puntos que no cierran oración

ABREV = {"sr", "sra", "srta", "dr", "dra", "dña", "lic", "ing", "prof", "mtro", "mtra", "av", "avda", "núm", "num",
         "fig", "vol", "cap", "art", "pág", "págs", "pag", "pags", "p", "pp", "ed", "eds", "cf", "cfr", "vs", "etc",
         "ej", "aprox", "máx", "mín", "min", "max", "ss", "km", "kg", "cm", "mm", "hrs", "gral", "inc", "ltda", "cía",
         "ltd", "tel", "ud", "uds", "vd", "vds", "cta", "dpto", "ref", "mr", "mrs", "ms", "jr", "st", "no", "vol", "op",
         "coord", "comp", "trad", "dir", "s", "f", "a", "m"}


def _proteger(t):
    t = re.sub(r"(\d)[.,](\d)", lambda m: m.group(1) + _P + m.group(2), t)
    t = re.sub(r"\bet al\.", "et al" + _P, t)
    t = re.sub(r"\b([A-Za-zÁ-Úá-úñÑ])\.(?=\s*[A-Za-zÁ-Úá-úñÑ]\.)", lambda m: m.group(1) + _P, t)   # U.E., s.f.
    t = re.sub(r"\b([A-ZÁÉÍÓÚÑ])\.(?=\s+[A-ZÁÉÍÓÚÑ])", lambda m: m.group(1) + _P, t)              # inicial de autor: «J. Apellido»

    def abrev(m):
        if m.group(1).lower() in ABREV:
            return m.group(1) + _P
        return m.group(0)
    t = re.sub(r"\b([A-Za-zÁ-Úá-úñÑ]{1,5})\.(?=\s*[\(\[]?[\w\d])", abrev, t)
    t = re.sub(r"\.{3}|…", _P + _P + _P, t)
    return t


def oraciones_de(texto):
    """Divide un bloque en oraciones. Devuelve lista de cadenas con una palabra o más."""
    t = _proteger(texto.replace("\n", " "))
    partes = re.split(r"(?<=[.!?])\s+(?=[¿¡«\"“'‘(\[A-ZÁÉÍÓÚÑ0-9])|(?<=[.!?])$", t)
    out = []
    for p in partes:
        p = p.replace(_P, ".").strip()
        p = p.strip(" \t\"'«»“”‘’()[]")
        if contar_palabras(p) > 0:
            out.append(p)
    return out


def recolectar_oraciones(bloques, incluir_tablas=False, min_palabras=4, min_palabras_vineta1=6):
    """Lista de dict(texto, palabras, seccion, linea, tipo) con las oraciones que se miden.

    Una oración cuenta si tiene 4 palabras o más (convención de las 35 corridas; deja fuera rótulos como
    "Figura 1."). Las viñetas de una línea y las celdas necesitan 6 o más.
    """
    out = []
    for b in bloques:
        if b["tipo"] == "titulo":
            continue
        if b["tipo"] == "celda" and not incluir_tablas:
            continue
        for o in oraciones_de(b["texto"]):
            n = contar_palabras(o)
            if n < min_palabras:
                continue
            if b["tipo"] in ("vineta1", "celda") and n < min_palabras_vineta1:
                continue
            out.append({"texto": o, "palabras": n, "seccion": b["seccion"], "linea": b["linea"], "tipo": b["tipo"]})
    return out


# ---------------------------------------------------------------------------
# Señales
# ---------------------------------------------------------------------------

def buscar_lista(lista, texto_low, bloques):
    """Cuenta cada frase de la lista con borde de palabra. Devuelve dict frase -> {n, ejemplos:[(linea, fragmento)]}.

    Las frases se buscan de la más larga a la más corta y cada coincidencia se tacha del texto, así una frase
    anidada no se cuenta dos veces ("juega un papel fundamental" no suma también "papel fundamental")."""
    hits = {}
    texto_low = texto_low
    for frase in sorted(lista, key=len, reverse=True):
        f = frase.lower()
        if f.startswith("¡"):
            patron = re.escape(f)
        else:
            patron = r"(?<![\wáéíóúüñ])" + re.escape(f) + r"(?![\wáéíóúüñ])"
        n = len(re.findall(patron, texto_low))
        if n:
            texto_low = re.sub(patron, lambda m: "#" * len(m.group(0)), texto_low)
            ejemplos = []
            for b in bloques:
                m = re.search(patron, b["texto"].lower())
                if m:
                    a = max(0, m.start() - 45)
                    z = min(len(b["texto"]), m.end() + 45)
                    ejemplos.append({"linea": b["linea"], "fragmento": "…" + b["texto"][a:z].replace("\n", " ") + "…"})
                    if len(ejemplos) >= 3:
                        break
            hits[frase] = {"n": n, "ejemplos": ejemplos}
    return {k: hits[k] for k in lista if k in hits}


def contar_hits(hits):
    return sum(v["n"] for v in hits.values())


def adjetivos(texto_low, bloques, idioma):
    lista = list(ADJ_PROHIBIDOS_ES) + (list(ADJ_PROHIBIDOS_EN) if idioma in ("en", "mixto") else [])
    # saludos: "buenos días", "buenas tardes", "buenas noches", "buen día", "buenas," no son adjetivos de gusto
    t = re.sub(r"\b(buenas|buenos|buen)(?=\s*(,|tardes|noches|d[ií]as|d[ií]a))", "", texto_low)
    t = re.sub(r"\ba lo mejor\b", "", t)
    return buscar_lista(lista, t, bloques)


def nombres_propios_internos(oraciones):
    """Palabras con mayúscula que aparecen dentro de alguna oración (no al inicio)."""
    nombres = set()
    for o in oraciones:
        toks = re.findall(r"[^\s]+", o["texto"])
        for i, tk in enumerate(toks[1:], 1):
            prev = toks[i - 1]
            w = tk.strip("\"'«»“”‘’()[],.;:¿?¡!")
            if re.match(r"^[A-ZÁÉÍÓÚÑ][a-záéíóúüñ]+", w) and not prev.endswith((":", "¿", "¡")):
                nombres.add(w)
    return nombres


def tiene_dato(o, nombres_internos):
    """Devuelve la razón ('cifra', 'número en letra', 'cita', 'nombre propio', 'unidad') o None."""
    t = o["texto"]
    sin_rem = RE_REMISION.sub(" ", t)
    if re.search(r"[%$€£]", sin_rem):
        return "unidad"
    if re.search(r"\d", sin_rem):
        return "cifra"
    if RE_NUMERO_LETRA.search(t):
        return "número en letra"
    for m in re.finditer(r"[«\"“]([^»\"”]{3,}?)[»\"”]", t):
        if contar_palabras(m.group(1)) >= 3:
            return "cita"
    toks = re.findall(r"[^\s]+", t)
    for i, tk in enumerate(toks):
        w = tk.strip("\"'«»“”‘’()[],.;:¿?¡!")
        if not w or w in ("I", "I'm", "I've", "I'd", "I'll", "AI", "IA"):
            continue
        if re.match(r"^[A-ZÁÉÍÓÚÑ][a-záéíóúüñ]+(?:[-'’][A-Za-záéíóúüñ]+)*$", w) or re.match(r"^[A-ZÁÉÍÓÚÑ]{3,}$", w):
            if i == 0:
                if w in nombres_internos:
                    return "nombre propio (abre la oración)"
                continue
            prev = toks[i - 1]
            if prev.endswith((":", "¿", "¡", ".", "?", "!")):
                continue
            return "nombre propio"
    return None


def aperturas(oraciones, umbral_1, umbral_2):
    def clave(o, n):
        toks = [w.lower().strip("\"'«»“”‘’()[],.;¿?¡!*") for w in re.findall(r"[^\s]+", o["texto"])]
        if not toks:
            return None
        if toks[0].endswith(":") or (n == 2 and len(toks) > 1 and toks[1].endswith(":")):
            return None   # rótulo
        toks = [w.rstrip(":") for w in toks]
        if len(toks) < n:
            return None
        k = " ".join(toks[:n])
        return k if re.search(r"[a-záéíóúüñ]", k) else None

    res = {}
    for n in (1, 2):
        mejor = {"clave": None, "racha": 0, "linea": None, "seccion": None}
        rachas = []
        prev_sec, prev_k, actual = None, None, []
        for o in oraciones:
            k = clave(o, n)
            if k is not None and k == prev_k and o["seccion"] == prev_sec:
                actual.append(o)
            else:
                if len(actual) >= 2:
                    rachas.append(actual)
                actual = [o] if k is not None else []
            prev_k, prev_sec = k, o["seccion"]
        if len(actual) >= 2:
            rachas.append(actual)
        for r in rachas:
            if len(r) > mejor["racha"]:
                mejor = {"clave": clave(r[0], n), "racha": len(r), "linea": r[0]["linea"], "seccion": r[0]["seccion"],
                         "ejemplo": " / ".join(x["texto"][:40] for x in r[:4])}
        totales = {}
        for o in oraciones:
            k = clave(o, n)
            if k is not None:
                totales[k] = totales.get(k, 0) + 1
        umbral_racha = umbral_1 if n == 1 else umbral_2
        res[n] = {"racha_max": mejor, "rachas_ge_umbral": [{"clave": clave(r[0], n), "racha": len(r), "linea": r[0]["linea"]}
                                                           for r in rachas if len(r) >= umbral_racha],
                  "totales_ge4": {k: v for k, v in sorted(totales.items(), key=lambda kv: -kv[1]) if v >= 4}}
    return res


def cadencia(oraciones, minimo=6):
    largos = [o["palabras"] for o in oraciones if o["palabras"] >= minimo]
    if len(largos) < 2:
        return {"n": len(largos), "media": None, "desviacion": None, "cv": None, "maximo": max(largos) if largos else None, "minimo": min(largos) if largos else None}
    media = sum(largos) / len(largos)
    desv = math.sqrt(sum((x - media) ** 2 for x in largos) / (len(largos) - 1))
    return {"n": len(largos), "media": round(media, 1), "desviacion": round(desv, 1), "cv": round(desv / media, 2) if media else None,
            "maximo": max(largos), "minimo": min(largos)}


def rayas(bloques, oraciones, palabras):
    """Rayas (— o –) usadas como inciso dentro de una oración. No cuentan los rangos (10–12), los guiones cortos
    pegados (socio–económico) ni la raya de atribución tras una cita cerrada ("…" — un participante)."""
    texto = "\n".join(b["texto"] for b in bloques)
    total = texto.count("—") + texto.count("–")
    incisos = []
    for o in oraciones:
        t = re.sub(r"\d\s?[—–]\s?\d", " ", o["texto"])   # rangos 10–12, 2024–2025
        t = re.sub(r"(?<=\w)[–](?=\w)", " ", t)          # Mon–Sat, socio–económico (guion corto sin espacios)
        t = re.sub(r"[»\"”’']\s?[—–]", " ", t)           # atribución tras cita
        t = re.sub(r"^\W*\d+\W*[—–]", " ", t)              # "1 — texto": numeración o ancla, no inciso
        n = 0
        for m in re.finditer(r"(?:\w[^\S\n]?[—–]|[—–][^\S\n]?\w)", t):
            n += 1
            if n == 1:
                incisos.append({"linea": o["linea"], "fragmento": o["texto"][max(0, m.start() - 35):m.end() + 35]})
        # una oración con "—inciso—" tiene dos rayas: cuenta un inciso por cada dos rayas (redondeando hacia arriba)
        if n:
            incisos[-1]["rayas"] = n
    n_incisos = sum((e.get("rayas", 1) + 1) // 2 for e in incisos)
    return {"total": total, "incisos": n_incisos, "oraciones_con_inciso": len(incisos),
            "por_mil": round(1000.0 * n_incisos / palabras, 1) if palabras else None, "ejemplos": incisos[:6]}


def etiquetas_texto(lineas_originales):
    n, ejemplos = 0, []
    for i, l in enumerate(lineas_originales, 1):
        s = l.strip()
        if s.startswith(("|", "#", ">")) or "http" in s:
            continue
        m = re.match(r"^(?:[-*+•]\s+|\d+[.)]\s+)?\**([A-ZÁÉÍÓÚÑ][^:\n|]{1,40}?)\**:\s+\S", s)
        if m and not re.search(r"\d{1,2}:\d{2}", s[:50]):
            n += 1
            if len(ejemplos) < 5:
                ejemplos.append({"linea": i, "etiqueta": m.group(1)})
    return {"n": n, "ejemplos": ejemplos}


def triadas(bloques):
    texto = " ".join(b["texto"] for b in bloques if b["tipo"] != "titulo")
    hits = re.findall(r"\b([\wáéíóúüñ]+), ([\wáéíóúüñ]+),? (y|e|o|u|and|or) ([\wáéíóúüñ]+)\b", texto)
    return {"n": len(hits), "ejemplos": [" ".join([h[0] + ",", h[1], h[2], h[3]]) for h in hits[:6]]}


PISTAS_CONTRASTE = [
    r"\bno (?:es|son|se trata de|fue|era) [^.;:\n]{1,60}?[,:;]\s*(?:es|son|sino|se trata de)\b",
    r"\bsino\b", r"\bno solo\b", r"\bno sólo\b", r"\bmás que (?:un|una)\b", r"\ben lugar de\b", r"\ben vez de\b",
    r"\bnot (?:just|only|merely|simply)\b", r"\binstead of\b", r"\brather than\b",
    r"\bit'?s not (?:about )?[^.;\n]{1,60}?[,;:]\s*it'?s\b", r"\bno longer\b", r"\bisn'?t [^.;\n]{1,40}?[,;:]\s*it'?s\b",
]
PISTAS_REVELACION = r"\b(una idea|algo más|otra cosa|una cosa|la clave|lo importante|la respuesta|el secreto|la verdad|lo mejor|la realidad|el resultado|la pregunta|la diferencia|lo esencial|lo interesante|lo curioso|el problema|the key|the answer|the truth|the secret|one thing|the result|the catch|the problem|here'?s the thing|the bottom line)\s*(?:es|is)?\s*:"
PISTAS_METADISCURSO = r"\b(este (?:artículo|documento|texto|ensayo|reporte|informe|video|blog|post|trabajo|glosa|guion|guión|análisis)|en este (?:artículo|documento|texto|ensayo|reporte|informe|video|post|trabajo|análisis)|a continuación|aquí te (?:cuento|explico|muestro|comparto)|in this (?:article|post|guide|document|video|essay|report)|here'?s how|let'?s (?:dive|explore|take a look|get started|begin)|stay tuned|as (?:we|you) (?:will )?see)\b"


def pistas_juez(oraciones):
    contrastes, revelaciones, meta = [], [], []
    for o in oraciones:
        t = o["texto"]
        low = t.lower()
        if any(re.search(p, low) for p in PISTAS_CONTRASTE):
            contrastes.append({"linea": o["linea"], "oracion": t[:160]})
        if re.search(PISTAS_REVELACION, low):
            revelaciones.append({"linea": o["linea"], "oracion": t[:160]})
        if re.search(PISTAS_METADISCURSO, low):
            meta.append({"linea": o["linea"], "oracion": t[:160]})
    return {"contrastes": contrastes, "revelaciones_dos_puntos": revelaciones, "metadiscurso": meta}


# ---------------------------------------------------------------------------
# Análisis completo
# ---------------------------------------------------------------------------

def analizar(texto, ext, args):
    if ext in ("html", "htm") or (ext not in ("md", "markdown") and re.search(r"(?i)<html|<body|<section|<p>", texto)):
        texto = html_a_markdown(texto)
    lineas_originales = texto.replace("\r\n", "\n").split("\n")
    sin_secciones = [] if args.con_fuentes else list(SECCIONES_EXCLUIDAS)
    sin_secciones += [normalizar(s) for s in (args.sin_seccion or [])]
    bloques, excluidas = parsear(texto, sin_secciones, args.seccion)
    texto_total = "\n".join(b["texto"] for b in bloques)
    palabras = contar_palabras(texto_total)
    # Las citas entre comillas (palabras de otra persona o menciones) no cuentan para E12-01, E12-03 y E12-04.
    texto_sin_citas = quitar_citas(texto_total)
    bloques_sc = [dict(b, texto=quitar_citas(b["texto"])) for b in bloques]
    low = texto_sin_citas.lower()
    low_con_citas = texto_total.lower()
    idioma = args.idioma or detectar_idioma(texto_total)
    oraciones = recolectar_oraciones(bloques, incluir_tablas=args.incluir_tablas)
    por_mil = (lambda n: round(1000.0 * n / palabras, 1) if palabras else None)

    # E12-01 muletillas
    mul_es = buscar_lista(MULETILLAS_ES, low, bloques_sc)
    mul_en = buscar_lista(MULETILLAS_EN, low, bloques_sc) if idioma in ("en", "mixto", "desconocido") else {}
    n_mul = contar_hits(mul_es) + contar_hits(mul_en)
    n_mul_en_citas = contar_hits(buscar_lista(MULETILLAS_ES + MULETILLAS_EN, low_con_citas, [])) - n_mul
    # E12-02 conectores
    con_es = buscar_lista(CONECTORES_ES, low, bloques)
    con_en = buscar_lista(CONECTORES_EN, low, bloques)
    n_con = contar_hits(con_es) if idioma == "es" else (contar_hits(con_en) if idioma == "en" else contar_hits(con_es) + contar_hits(con_en))
    # E12-03 adjetivos
    adj = adjetivos(low, bloques_sc, idioma)
    n_adj = contar_hits(adj)
    # E12-04 emoji y exclamaciones
    emojis = {}
    for ch in RE_EMOJI.findall(texto_sin_citas):
        if ch == "\uFE0F":
            continue
        emojis[ch] = emojis.get(ch, 0) + 1
    n_emoji = sum(emojis.values())
    n_emoji_en_citas = len([c for c in RE_EMOJI.findall(texto_total) if c != "\uFE0F"]) - n_emoji
    # una exclamación "¡Hola!" cuenta una vez: se toma el mayor entre signos de apertura y de cierre
    excl_total = max(texto_sin_citas.count("!"), texto_sin_citas.count("¡"))
    excl_citas = max(texto_total.count("!"), texto_total.count("¡")) - excl_total
    excl_ejemplos = []
    for b in bloques_sc:
        if "!" in b["texto"] or "¡" in b["texto"]:
            excl_ejemplos.append({"linea": b["linea"], "fragmento": b["texto"][:120]})
            if len(excl_ejemplos) >= 4:
                break
    # E12-05 rayas
    ray = rayas(bloques, oraciones, palabras)
    # E12-06 aperturas
    ap = aperturas(oraciones, UMBRALES["racha_aperturas_1"], UMBRALES["racha_aperturas_2"])
    falla_racha = ap[1]["racha_max"]["racha"] >= UMBRALES["racha_aperturas_1"] or ap[2]["racha_max"]["racha"] >= UMBRALES["racha_aperturas_2"]
    # E12-07 dato
    nombres = nombres_propios_internos(oraciones)
    con_dato, sin_dato, razones = 0, [], {}
    for o in oraciones:
        r = tiene_dato(o, nombres)
        o["dato"] = r
        if r:
            con_dato += 1
            razones[r] = razones.get(r, 0) + 1
        else:
            sin_dato.append({"linea": o["linea"], "oracion": o["texto"][:140]})
    pct_dato = round(100.0 * con_dato / len(oraciones), 1) if oraciones else None
    # informativas
    cad = cadencia(oraciones)
    etq = etiquetas_texto(lineas_originales)
    tri = triadas(bloques)
    pistas = pistas_juez(oraciones)

    # veredictos
    U = UMBRALES
    v = {}
    v["E12-01_muletillas_0"] = "PASS" if n_mul <= U["muletillas"] else "FAIL"
    if idioma == "en":
        v["E12-02_conectores_densidad"] = "NA (texto en inglés: umbral calibrado solo en español; densidad informativa)"
    elif palabras < U["min_palabras"]:
        v["E12-02_conectores_densidad"] = "NA (menos de %d palabras)" % U["min_palabras"]
    else:
        v["E12-02_conectores_densidad"] = "PASS" if por_mil(n_con) <= U["conectores_por_mil"] else "FAIL"
    v["E12-03_adjetivos_0"] = "PASS" if n_adj == 0 else "REVISAR (%d aparición(es): el juez decide si al lado se dice qué se observa)" % n_adj
    tipo = getattr(args, "tipo", None)
    falla_04 = not (n_emoji == 0 and excl_total == 0)
    if not falla_04:
        v["E12-04_emoji_excl_0"] = "PASS"
    elif tipo in TIPOS_CON_GATE:
        v["E12-04_emoji_excl_0"] = "FAIL (gate G-E12-1: reprueba el artefacto; tipo %s)" % tipo
    elif tipo:
        v["E12-04_emoji_excl_0"] = "FAIL (sin gate en %s: baja la nota, no reprueba)" % tipo
    else:
        v["E12-04_emoji_excl_0"] = "FAIL (aviso: el gate G-E12-1 depende del tipo; aplica solo en reporte-markdown y pdf. Pase --tipo)"
    gate = {"id": "G-E12-1", "pregunta": "E12-04", "tipos_con_gate": list(TIPOS_CON_GATE), "tipo_dado": tipo,
            "aplica": (tipo in TIPOS_CON_GATE) if tipo else None, "falla": falla_04 and (tipo in TIPOS_CON_GATE)}
    if palabras < U["min_palabras"]:
        v["E12-05_rayas_inciso"] = "NA (menos de %d palabras)" % U["min_palabras"]
    else:
        v["E12-05_rayas_inciso"] = "PASS" if ray["por_mil"] <= U["rayas_por_mil"] else "FAIL"
    v["E12-06_aperturas_sin_racha"] = "PASS" if not falla_racha else "FAIL"
    if pct_dato is None:
        v["E12-07_dato_informativo"] = "sin oraciones"
    else:
        v["E12-07_dato_informativo"] = ("%s %% de oraciones con dato; " % pct_dato) + ("por debajo de la alarma de %s %%: el juez revisa sección por sección" % U["dato_pct_alarma"] if pct_dato < U["dato_pct_alarma"] else "el juez aplica la prueba de sustitución por sección")

    return {
        "archivo": args.archivo,
        "version_script": VERSION,
        "fecha_version": FECHA,
        "tipo": tipo,
        "gate_G-E12-1": gate,
        "idioma": idioma,
        "palabras": palabras,
        "oraciones": len(oraciones),
        "secciones_excluidas": excluidas,
        "excluye_citas_y_codigo": True,
        "incluye_tablas_en_oraciones": args.incluir_tablas,
        "umbrales": U,
        "muletillas": {"total": n_mul, "por_mil": por_mil(n_mul), "dentro_de_citas_no_contadas": n_mul_en_citas, "es": mul_es, "en": mul_en},
        "conectores": {"total_segun_idioma": n_con, "por_mil": por_mil(n_con), "es": {"total": contar_hits(con_es), "por_mil": por_mil(contar_hits(con_es)), "detalle": {k: val["n"] for k, val in con_es.items()}},
                       "en": {"total": contar_hits(con_en), "por_mil": por_mil(contar_hits(con_en)), "detalle": {k: val["n"] for k, val in con_en.items()}}},
        "adjetivos_prohibidos": {"total": n_adj, "detalle": adj},
        "emoji": {"total": n_emoji, "dentro_de_citas_no_contados": n_emoji_en_citas, "detalle": emojis},
        "exclamaciones": {"total": excl_total, "dentro_de_citas_textuales": excl_citas, "ejemplos": excl_ejemplos},
        "rayas": ray,
        "aperturas": {"racha_max_1_palabra": ap[1]["racha_max"], "racha_max_2_palabras": ap[2]["racha_max"],
                      "rachas_que_fallan": ap[1]["rachas_ge_umbral"] + ap[2]["rachas_ge_umbral"],
                      "totales_2_palabras_ge4_informativo": ap[2]["totales_ge4"]},
        "dato_concreto": {"con_dato": con_dato, "oraciones": len(oraciones), "pct": pct_dato, "razones": razones,
                          "sin_dato_ejemplos": sin_dato[:12]},
        "cadencia": cad,
        "informativas": {"triadas": tri, "etiqueta_texto": etq, "pistas_para_el_juez": pistas},
        "veredictos": v,
    }


# ---------------------------------------------------------------------------
# Salida
# ---------------------------------------------------------------------------

def formato_texto(r):
    out = []
    out.append("== slop.py v%s · %s · idioma: %s · %d palabras · %d oraciones medidas ==" % (VERSION, r["archivo"], r["idioma"], r["palabras"], r["oraciones"]))
    if r["secciones_excluidas"]:
        for e in r["secciones_excluidas"]:
            out.append("Sección excluida: \"%s\" (l. %s-%s, %d palabras). Motivo: lista de fuentes o sección pedida con --sin-seccion." % (e["titulo"], e["linea_ini"], e["linea_fin"], e["palabras"]))
    else:
        out.append("Secciones excluidas: ninguna (no hay encabezado de fuentes o se pidió --con-fuentes).")
    out.append("Se excluyen siempre: frontmatter, bloques de código, comentarios HTML y bloques de cita (R11). Las citas entre comillas no cuentan para E12-01, E12-03 ni E12-04.")
    out.append("")
    out.append("-- Señales con umbral (E12 v0.1) --")
    v = r["veredictos"]
    out.append("E12-01 Muletillas de IA: %d (umbral 0; %d más dentro de citas entre comillas, que no cuentan) → %s" % (r["muletillas"]["total"], r["muletillas"]["dentro_de_citas_no_contadas"], v["E12-01_muletillas_0"]))
    for lista in ("es", "en"):
        for k, val in r["muletillas"][lista].items():
            ej = val["ejemplos"][0] if val["ejemplos"] else {"linea": "?", "fragmento": ""}
            out.append("   · \"%s\" ×%d  (l. %s) %s" % (k, val["n"], ej["linea"], ej["fragmento"]))
    c = r["conectores"]
    out.append("E12-02 Conectores: %d en el idioma detectado = %s por 1 000 palabras (umbral ≤ %s) → %s" % (c["total_segun_idioma"], c["por_mil"], r["umbrales"]["conectores_por_mil"], v["E12-02_conectores_densidad"]))
    det = c["es"]["detalle"] if r["idioma"] != "en" else c["en"]["detalle"]
    if det:
        out.append("   · " + ", ".join("%s ×%d" % (k, n) for k, n in sorted(det.items(), key=lambda kv: -kv[1])[:12]))
    out.append("E12-03 Adjetivos prohibidos del contrato: %d → %s" % (r["adjetivos_prohibidos"]["total"], v["E12-03_adjetivos_0"]))
    for k, val in r["adjetivos_prohibidos"]["detalle"].items():
        for ej in val["ejemplos"][:2]:
            out.append("   · \"%s\" ×%d (l. %s) %s" % (k, val["n"], ej["linea"], ej["fragmento"]))
    out.append("E12-04 Emoji: %d · Exclamaciones: %d (no cuentan: %d emoji y %d exclamaciones dentro de citas entre comillas) → %s" % (r["emoji"]["total"], r["exclamaciones"]["total"], r["emoji"]["dentro_de_citas_no_contados"], r["exclamaciones"]["dentro_de_citas_textuales"], v["E12-04_emoji_excl_0"]))
    if r["emoji"]["detalle"]:
        out.append("   · emoji: " + ", ".join("%s ×%d" % (k, n) for k, n in r["emoji"]["detalle"].items()))
    for ej in r["exclamaciones"]["ejemplos"]:
        out.append("   · (l. %s) %s" % (ej["linea"], ej["fragmento"]))
    g = r["gate_G-E12-1"]
    if g["tipo_dado"] is None:
        out.append("   Gate G-E12-1: depende del tipo (reprueba solo en reporte-markdown y pdf). No se dio --tipo.")
    else:
        out.append("   Gate G-E12-1: tipo %s → %s" % (g["tipo_dado"], ("aplica y FALLA: el artefacto reprueba" if g["falla"] else ("aplica y pasa" if g["aplica"] else "no aplica en este tipo: E12-04 es pregunta normal"))))
    out.append("E12-05 Rayas de inciso: %d en %d oraciones = %s por 1 000 palabras (rayas en todo el texto: %d; umbral ≤ %s) → %s" % (r["rayas"]["incisos"], r["rayas"]["oraciones_con_inciso"], r["rayas"]["por_mil"], r["rayas"]["total"], r["umbrales"]["rayas_por_mil"], v["E12-05_rayas_inciso"]))
    for ej in r["rayas"]["ejemplos"][:3]:
        out.append("   · (l. %s) …%s…" % (ej["linea"], ej["fragmento"]))
    a1, a2 = r["aperturas"]["racha_max_1_palabra"], r["aperturas"]["racha_max_2_palabras"]
    def _r(a):
        return ("%d (\"%s\", l. %s)" % (a["racha"], a["clave"], a["linea"])) if a["racha"] else "ninguna"
    out.append("E12-06 Aperturas repetidas: racha máxima con 1 palabra: %s (falla con ≥ %d); con 2 palabras: %s (falla con ≥ %d) → %s" % (
        _r(a1), r["umbrales"]["racha_aperturas_1"], _r(a2), r["umbrales"]["racha_aperturas_2"], v["E12-06_aperturas_sin_racha"]))
    tot = r["aperturas"]["totales_2_palabras_ge4_informativo"]
    if tot:
        out.append("   · informativo, claves de 2 palabras que abren ≥ 4 oraciones en total: " + ", ".join("\"%s\" ×%d" % (k, n) for k, n in list(tot.items())[:6]))
    d = r["dato_concreto"]
    out.append("E12-07 Oraciones con dato concreto (informativo para la prueba de sustitución): %s %% (%d de %d) → %s" % (d["pct"], d["con_dato"], d["oraciones"], v["E12-07_dato_informativo"]))
    if d["razones"]:
        out.append("   · por qué cuentan: " + ", ".join("%s %d" % (k, n) for k, n in sorted(d["razones"].items(), key=lambda kv: -kv[1])))
    for ej in d["sin_dato_ejemplos"][:5]:
        out.append("   · sin dato (l. %s): %s" % (ej["linea"], ej["oracion"]))
    out.append("")
    out.append("-- Señales informativas (sin veredicto) --")
    cd = r["cadencia"]
    out.append("Cadencia (oraciones de 6 palabras o más): n %s · media %s · desviación %s · CV %s · máximo %s" % (cd["n"], cd["media"], cd["desviacion"], cd["cv"], cd["maximo"]))
    out.append("Tríadas \"x, y y z\": %d%s" % (r["informativas"]["triadas"]["n"], ("  · " + " | ".join(r["informativas"]["triadas"]["ejemplos"][:3])) if r["informativas"]["triadas"]["n"] else ""))
    out.append("Líneas \"Etiqueta: texto\": %d" % r["informativas"]["etiqueta_texto"]["n"])
    p = r["informativas"]["pistas_para_el_juez"]
    out.append("Pistas para el juez: contrastes %d (E12-09) · revelaciones con dos puntos %d (informativa, sin veredicto) · metadiscurso %d (informativa)" % (len(p["contrastes"]), len(p["revelaciones_dos_puntos"]), len(p["metadiscurso"])))
    for ej in p["contrastes"][:4]:
        out.append("   · contraste (l. %s): %s" % (ej["linea"], ej["oracion"]))
    for ej in p["revelaciones_dos_puntos"][:3]:
        out.append("   · revelación (l. %s): %s" % (ej["linea"], ej["oracion"]))
    for ej in p["metadiscurso"][:3]:
        out.append("   · metadiscurso (l. %s): %s" % (ej["linea"], ej["oracion"]))
    return "\n".join(out)


def main():
    ap = argparse.ArgumentParser(description="Señales de AI slop en un texto (eval E12).")
    ap.add_argument("archivo", help="archivo .md, .txt o .html; '-' para stdin")
    ap.add_argument("--json", action="store_true", help="salida en JSON")
    ap.add_argument("--sin-seccion", action="append", help="excluye además las secciones cuyo título empiece así (repetible)")
    ap.add_argument("--seccion", help="mide solo las secciones cuyo título contiene este texto")
    ap.add_argument("--con-fuentes", action="store_true", help="no excluye la lista de fuentes o referencias")
    ap.add_argument("--incluir-tablas", action="store_true", help="las celdas de tabla entran como oraciones")
    ap.add_argument("--idioma", choices=["es", "en", "mixto"], help="fuerza el idioma (por defecto se detecta)")
    ap.add_argument("--tipo", choices=list(TIPOS), help="tipo de artefacto; decide si el gate G-E12-1 (E12-04) reprueba (solo reporte-markdown y pdf)")
    args = ap.parse_args()
    if args.archivo == "-":
        data, ext = sys.stdin.read(), "txt"
    else:
        with open(args.archivo, "r", encoding="utf-8", errors="replace") as f:
            data = f.read()
        ext = args.archivo.rsplit(".", 1)[-1].lower() if "." in os.path.basename(args.archivo) else "txt"
    r = analizar(data, ext, args)
    if args.json:
        print(json.dumps(r, ensure_ascii=False, indent=1))
    else:
        print(formato_texto(r))


if __name__ == "__main__":
    main()
