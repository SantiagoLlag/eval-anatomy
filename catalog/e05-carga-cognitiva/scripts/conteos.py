#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
conteos.py — Conteos de estructura de un artefacto (.md, .html o .txt).

Uso:
    python3 conteos.py reporte.md              # texto
    python3 conteos.py pagina.html --json      # JSON
    python3 conteos.py presentacion.html --ignorar-siglas "ONG,IVA"   # siglas que no hace falta definir

Qué cuenta:
    - Listas: cuántas hay, ítems de cada una y el máximo por lista (umbral de aviso: > 6 ítems).
    - Palabras por sección: una fila por encabezado (## o <h2>), con su nivel.
    - Palabras y viñetas por diapositiva, si el archivo es una presentación: en Markdown, cada línea "---" separa
      diapositivas (hacen falta al menos 2); en HTML, cada <section> es una diapositiva si el archivo lo declara con
      <meta name="tipo" content="presentacion">, <body class="presentacion"> o <section class="diapositiva">.
      Con --diapositivas se fuerza. Umbral de aviso: > 40 palabras o > 6 viñetas (perfil de presentación).
    - Párrafos de más de 6 líneas. Una línea es un renglón de hasta 80 caracteres (convención del contrato de claridad).
      Se toma el mayor entre los renglones del archivo y los renglones estimados (caracteres / 80).
    - Niveles de encabezado usados (h1…h6) y si hay saltos de nivel (de h1 a h3 sin h2).
    - Siglas en mayúsculas sin definir: una sigla se considera definida si en algún lugar aparece "SIGLA (",
      "SIGLA:" o "(SIGLA)" justo después de su expansión. Se ignoran PASS, FAIL, NA, UNKNOWN, OK y números romanos.
    - Oraciones de más de 30 palabras (oración = termina en . ? ! o fin de párrafo), con su texto.
    - Placeholders (texto de relleno): "lorem ipsum", "TODO", "TBD", "XXX", "[pendiente]", "???".

Convenciones compartidas con legibilidad.py: se excluyen frontmatter, bloques de código, tablas y bloques de cita (regla R11
del contrato de claridad); las viñetas de una línea no cuentan como oraciones ni párrafos, pero sí como ítems de lista.
Solo usa la biblioteca estándar de Python 3.
"""

import argparse
import html
import json
import math
import re
import sys
import unicodedata

VERSION = "1.0"

RE_PALABRA = re.compile(r"[A-Za-zÁÉÍÓÚÜÑáéíóúüñ]+(?:[-'’][A-Za-zÁÉÍÓÚÜÑáéíóúüñ]+)*|\d+(?:[.,]\d+)*|[%$€£]")
SIGLAS_IGNORADAS = {"PASS", "FAIL", "NA", "UNKNOWN", "OK", "ID", "URL", "HTML", "CSS", "PDF", "JSON", "MD", "TODO", "TBD", "XXX", "AAAA", "MM", "DD"}
RE_ROMANO = re.compile(r"^M{0,3}(CM|CD|D?C{0,3})(XC|XL|L?X{0,3})(IX|IV|V?I{0,3})$")
RE_PLACEHOLDER = re.compile(r"[Ll]orem [Ii]psum|\bTODO\b|\bTBD\b|\bXXX\b|\[[Pp]endiente\]|\?\?\?|\[[Ii]nsertar[^\]]*\]|\[[Cc]ompletar[^\]]*\]|\[[Pp]or definir\]")


def palabras(texto):
    return RE_PALABRA.findall(texto)


def limpiar_inline(t):
    t = re.sub(r"!\[[^\]]*\]\([^)]*\)", " ", t)
    t = re.sub(r"\[([^\]]+)\]\([^)]*\)", r"\1", t)
    t = re.sub(r"`[^`]*`", " ", t)
    t = re.sub(r"(\*\*|__)(.*?)\1", r"\2", t)
    t = re.sub(r"(?<!\w)([*_])(?!\s)(.*?)(?<!\s)\1(?!\w)", r"\2", t)
    t = re.sub(r"<[^>]+>", " ", t)
    t = html.unescape(t)
    return re.sub(r"[ \t]+", " ", t).strip()


# ---------------------------------------------------------------------------
# HTML → pseudo-Markdown (para reutilizar el mismo analizador)
# ---------------------------------------------------------------------------

def es_presentacion_html(data):
    """Un HTML se trata como presentación si lo declara: <meta name="tipo" content="presentacion">,
    <body class="presentacion"> o secciones con class slide/diapositiva."""
    return bool(re.search(r'(?is)<meta[^>]+name="tipo"[^>]+content="presentaci[oó]n"', data)
                or re.search(r'(?is)<body[^>]+class="[^"]*presentaci[oó]n', data)
                or re.search(r'(?is)<section[^>]+class="[^"]*(slide|diapositiva)', data))


def html_a_markdown(data, secciones_como_diapositivas=False):
    t = re.sub(r"(?is)<(script|style|svg|noscript)\b.*?</\1>", " ", data)
    t = re.sub(r"(?is)<!--.*?-->", " ", t)
    t = re.sub(r"(?is)<h([1-6])[^>]*>(.*?)</h\1>", lambda m: "\n" + "#" * int(m.group(1)) + " " + re.sub(r"<[^>]+>", " ", m.group(2)).strip() + "\n", t)
    if secciones_como_diapositivas:
        t = re.sub(r"(?is)<section\b[^>]*>", "\n---\n", t)
    else:
        t = re.sub(r"(?is)<section\b[^>]*>", "\n\n", t)
    t = re.sub(r"(?is)</section>", "\n\n", t)
    t = re.sub(r"(?is)<table\b.*?</table>", lambda m: "\n" + "\n".join("| " + re.sub(r"<[^>]+>", " ", r).strip() + " |" for r in re.findall(r"(?is)<tr\b[^>]*>(.*?)</tr>", m.group(0))) + "\n", t)
    t = re.sub(r"(?is)<blockquote\b[^>]*>(.*?)</blockquote>",
               lambda m: "\n" + "\n".join("> " + l for l in re.sub(r"<[^>]+>", " ", m.group(1)).strip().splitlines()) + "\n", t)
    t = re.sub(r"(?is)<(ul|ol)\b[^>]*>", "\n\n", t)
    t = re.sub(r"(?is)</(ul|ol)>", "\n\n", t)
    t = re.sub(r"(?is)<li\b[^>]*>(.*?)</li>", lambda m: "\n- " + re.sub(r"<[^>]+>", " ", m.group(1)).strip() + "\n", t)
    t = re.sub(r"(?is)<(p|div|article|br|hr|header|footer|main|nav|aside|figure|figcaption|dt|dd)\b[^>]*>", "\n\n", t)
    t = re.sub(r"(?is)</(p|div|article|header|footer|main|nav|aside|figure|figcaption|dt|dd)>", "\n\n", t)
    t = re.sub(r"<[^>]+>", " ", t)
    t = html.unescape(t)
    t = re.sub(r"[ \t]+", " ", t)
    t = re.sub(r"\n[ \t]+", "\n", t)
    return t


# ---------------------------------------------------------------------------
# Análisis de Markdown
# ---------------------------------------------------------------------------

def analizar(texto, es_html=False, ancho=80, max_oracion=30, max_items=6, max_palabras_diapo=40, ignorar_siglas=(), diapositivas_forzadas=False):
    es_presentacion = diapositivas_forzadas
    if es_html:
        es_presentacion = diapositivas_forzadas or es_presentacion_html(texto)
        texto = html_a_markdown(texto, secciones_como_diapositivas=es_presentacion)
    lineas = texto.replace("\r\n", "\n").replace("\r", "\n").split("\n")
    if lineas and lineas[0].strip() == "---":
        for i in range(1, len(lineas)):
            if lineas[i].strip() in ("---", "..."):
                lineas = lineas[i + 1:]
                break

    encabezados = []          # (nivel, titulo, indice_seccion)
    secciones = []            # dict: titulo, nivel, palabras
    listas = []               # dict: seccion, items, primer_item
    diapositivas = []         # dict: n, titulo, palabras, vinetas
    parrafos_largos = []
    oraciones_largas = []
    placeholders = []
    texto_para_siglas = []
    todas_oraciones = []

    seccion_actual = {"titulo": "(inicio)", "nivel": 0, "palabras": 0}
    secciones.append(seccion_actual)
    diapo_actual = None
    lista_actual = None
    parrafo = []
    tipo = "prosa"
    en_codigo = False
    en_tabla = False
    n_diapo = 0

    def cerrar_parrafo():
        nonlocal parrafo, tipo
        if not parrafo:
            return
        txt = limpiar_inline("\n".join(parrafo)) if tipo != "vineta" else limpiar_inline(" ".join(parrafo))
        n_pal = len(palabras(txt))
        if tipo == "prosa" or (tipo == "vineta" and len(parrafo) > 1):
            renglones = len(parrafo)
            estimadas = math.ceil(len(" ".join(parrafo)) / ancho) if txt else 0
            n_lineas = max(renglones, estimadas)
            if n_lineas > 6:
                parrafos_largos.append({"seccion": seccion_actual["titulo"], "lineas": n_lineas, "renglones_en_archivo": renglones,
                                        "renglones_estimados_%d_car" % ancho: estimadas, "palabras": n_pal, "inicio": " ".join(txt.split()[:12]) + "…"})
            for orc in dividir_oraciones(txt):
                n = len(palabras(orc))
                todas_oraciones.append(n)
                if n > max_oracion:
                    oraciones_largas.append({"seccion": seccion_actual["titulo"], "palabras": n, "texto": orc})
        parrafo = []
        tipo = "prosa"

    def cerrar_lista():
        nonlocal lista_actual
        if lista_actual and lista_actual["items"] > 0:
            listas.append(lista_actual)
        lista_actual = None

    def sumar_palabras(txt):
        n = len(palabras(txt))
        seccion_actual["palabras"] += n
        if diapo_actual is not None:
            diapo_actual["palabras"] += n
        return n

    for linea in lineas:
        s = linea.strip()
        if s.startswith("```") or s.startswith("~~~"):
            cerrar_parrafo(); cerrar_lista()
            en_codigo = not en_codigo
            continue
        if en_codigo:
            continue
        if RE_PLACEHOLDER.search(re.sub(r"`[^`]*`", " ", s)):   # lo que va en código no cuenta
            placeholders.append({"seccion": seccion_actual["titulo"], "texto": s[:120]})
        if not s:
            cerrar_parrafo()
            en_tabla = False
            continue
        m_h = re.match(r"^(#{1,6})\s+(.*)$", s)
        if m_h:
            cerrar_parrafo(); cerrar_lista()
            nivel = len(m_h.group(1))
            titulo = limpiar_inline(m_h.group(2))
            encabezados.append({"nivel": nivel, "titulo": titulo})
            seccion_actual = {"titulo": titulo, "nivel": nivel, "palabras": 0}
            secciones.append(seccion_actual)
            texto_para_siglas.append(titulo)
            if diapo_actual is not None and diapo_actual["titulo"] is None:
                diapo_actual["titulo"] = titulo
            continue
        if re.match(r"^(\s*[-*_]\s*){3,}$", s):
            cerrar_parrafo(); cerrar_lista()
            n_diapo += 1
            diapo_actual = {"n": n_diapo, "titulo": None, "palabras": 0, "vinetas": 0}
            diapositivas.append(diapo_actual)
            continue
        if re.match(r"^\|", s):
            cerrar_parrafo(); cerrar_lista()
            en_tabla = True
            texto_para_siglas.append(limpiar_inline(s))
            continue
        if en_tabla:
            continue
        if s.startswith(">"):
            cerrar_parrafo(); cerrar_lista()
            continue
        if re.match(r"^!\[", s) or re.match(r"^<[^>]+>$", s):
            cerrar_parrafo()
            continue
        m_v = re.match(r"^(\s*)([-*+]|\d+[.)])\s+(.*)$", linea)
        if m_v:
            cerrar_parrafo()
            sangria = len(m_v.group(1).replace("\t", "    "))
            if lista_actual is None:
                lista_actual = {"seccion": seccion_actual["titulo"], "items": 0, "subitems": 0, "primer_item": limpiar_inline(m_v.group(3))[:60]}
            if sangria >= 2:
                lista_actual["subitems"] += 1
            else:
                lista_actual["items"] += 1
            if diapo_actual is not None:
                diapo_actual["vinetas"] += 1
            parrafo = [m_v.group(3)]
            tipo = "vineta"
            sumar_palabras(limpiar_inline(m_v.group(3)))
            texto_para_siglas.append(limpiar_inline(m_v.group(3)))
            continue
        if tipo == "vineta" and parrafo and (linea.startswith("  ") or linea.startswith("\t")):
            parrafo.append(s)
            sumar_palabras(limpiar_inline(s))
            texto_para_siglas.append(limpiar_inline(s))
            continue
        if tipo == "vineta":
            cerrar_parrafo()
        cerrar_lista()
        parrafo.append(s)
        tipo = "prosa"
        sumar_palabras(limpiar_inline(s))
        texto_para_siglas.append(limpiar_inline(s))
    cerrar_parrafo(); cerrar_lista()

    # Niveles de encabezado
    niveles = sorted({e["nivel"] for e in encabezados})
    saltos = []
    for a, b in zip(encabezados, encabezados[1:]):
        if b["nivel"] > a["nivel"] + 1:
            saltos.append({"de": "h%d %s" % (a["nivel"], a["titulo"][:40]), "a": "h%d %s" % (b["nivel"], b["titulo"][:40])})

    # Siglas
    corpus = "\n".join(texto_para_siglas)
    siglas = {}
    for m in re.finditer(r"(?<![\w-])([A-ZÁÉÍÓÚÑ][A-ZÁÉÍÓÚÑ0-9]{1,7})(?![\w-])(?!\.[a-z]{2,4}\b)", corpus):
        s_ = m.group(1)
        if s_ in SIGLAS_IGNORADAS or s_ in ignorar_siglas or RE_ROMANO.match(s_) or s_.isdigit():
            continue
        if len(re.sub(r"[^A-ZÁÉÍÓÚÑ]", "", s_)) < 2:
            continue  # códigos como R1, E00, G5 no son siglas
        if len(s_) >= 7 or re.search(r"(?<![\w-])%s(?![\w-])" % re.escape(s_.capitalize()), corpus) or re.search(r"(?<![\w-])%s(?![\w-])" % re.escape(s_.lower()), corpus):
            continue  # palabra gritada en mayúsculas (GRACIAS, PLAN), no una sigla
        siglas.setdefault(s_, 0)
        siglas[s_] += 1
    definidas, sin_definir = [], []
    for s_, n in sorted(siglas.items()):
        patron_def = re.compile(r"%s\s*[(:]|\(%s\)" % (re.escape(s_), re.escape(s_)))
        if patron_def.search(corpus):
            definidas.append(s_)
        else:
            sin_definir.append({"sigla": s_, "apariciones": n})

    secciones_out = [dict(s) for s in secciones if not (s["titulo"] == "(inicio)" and s["palabras"] == 0)]
    total_palabras = sum(s["palabras"] for s in secciones)
    if not es_html and not diapositivas_forzadas and len(diapositivas) < 2:
        diapositivas = []   # un solo "---" en Markdown es una regla horizontal, no una presentación
    return {
        "palabras_total": total_palabras,
        "tratado_como_presentacion": bool(diapositivas),
        "encabezados": {"niveles_usados": ["h%d" % n for n in niveles], "cantidad": len(encabezados), "saltos_de_nivel": saltos,
                        "mas_de_3_niveles": len(niveles) > 3},
        "secciones": secciones_out,
        "listas": {"cantidad": len(listas), "max_items_por_lista": max((l["items"] for l in listas), default=0),
                   "listas_con_mas_de_%d_items" % max_items: [l for l in listas if l["items"] > max_items], "detalle": listas},
        "diapositivas": {"cantidad": len(diapositivas), "max_palabras": max((d["palabras"] for d in diapositivas), default=0),
                         "max_vinetas": max((d["vinetas"] for d in diapositivas), default=0),
                         "con_mas_de_%d_palabras" % max_palabras_diapo: [d for d in diapositivas if d["palabras"] > max_palabras_diapo],
                         "con_mas_de_6_vinetas": [d for d in diapositivas if d["vinetas"] > 6], "detalle": diapositivas},
        "parrafos_mayores_de_6_lineas": {"cantidad": len(parrafos_largos), "detalle": parrafos_largos},
        "oraciones": {"cantidad": len(todas_oraciones),
                      "promedio_palabras": round(sum(todas_oraciones) / len(todas_oraciones), 2) if todas_oraciones else None,
                      "mayores_de_%d" % max_oracion: len(oraciones_largas), "detalle": sorted(oraciones_largas, key=lambda d: -d["palabras"])},
        "siglas": {"sin_definir": sin_definir, "definidas": definidas},
        "placeholders": placeholders,
    }


ABREV = {"sr", "sra", "dr", "dra", "etc", "ej", "núm", "pág", "fig", "av", "ud", "uds", "aprox", "vs", "lic", "ing"}
_P = "⁣"


def dividir_oraciones(txt):
    t = re.sub(r"(\d)[.,](\d)", lambda m: m.group(1) + _P + m.group(2), txt)
    t = re.sub(r"\b([A-Za-zÁ-Úá-ú])\.(?=[A-Za-zÁ-Úá-ú]\.)", lambda m: m.group(1) + _P, t)
    t = re.sub(r"\b([A-Za-zÁ-Úá-úñÑ]{1,5})\.(?=\s+\S)", lambda m: m.group(1) + _P if m.group(1).lower() in ABREV else m.group(0), t)
    t = re.sub(r"\.{3}|…", _P + _P, t)
    trozos = re.split(r"[.?!¿¡]+", t)
    return [tr.replace(_P, ".").strip(" \t\n\"'«»“”‘’()[]—–-") for tr in trozos if palabras(tr)]


def formato_texto(r, archivo):
    o = ["== conteos.py · %s ==" % archivo, "Palabras (sin tablas, código ni citas): %d" % r["palabras_total"]]
    e = r["encabezados"]
    o.append("Encabezados: %d · niveles usados: %s%s" % (e["cantidad"], ", ".join(e["niveles_usados"]) or "ninguno", "  (AVISO: más de 3 niveles)" if e["mas_de_3_niveles"] else ""))
    for s in e["saltos_de_nivel"]:
        o.append("   - salto de nivel: %s → %s" % (s["de"], s["a"]))
    o.append("Palabras por sección:")
    for s in r["secciones"]:
        o.append("   %s%-50s %5d" % ("  " * max(s["nivel"] - 1, 0), s["titulo"][:50], s["palabras"]))
    L = r["listas"]
    k = [k for k in L if k.startswith("listas_con_mas_de_")][0]
    o.append("Listas: %d · máximo de ítems por lista: %d · con más de %s ítems: %d" % (L["cantidad"], L["max_items_por_lista"], k.rsplit("_", 2)[-2], len(L[k])))
    for l in L[k]:
        o.append("   - %d ítems en \"%s\" (empieza: %s)" % (l["items"], l["seccion"], l["primer_item"]))
    D = r["diapositivas"]
    if D["cantidad"]:
        kd = [k for k in D if k.startswith("con_mas_de_") and k.endswith("_palabras")][0]
        o.append("Diapositivas: %d · máximo de palabras: %d · máximo de viñetas: %d" % (D["cantidad"], D["max_palabras"], D["max_vinetas"]))
        for d in D["detalle"]:
            marca = ""
            if d in D[kd]:
                marca += "  (> %s palabras)" % kd.split("_")[3]
            if d in D["con_mas_de_6_vinetas"]:
                marca += "  (> 6 viñetas)"
            o.append("   %2d. %-45s %4d palabras %3d viñetas%s" % (d["n"], (d["titulo"] or "(sin título)")[:45], d["palabras"], d["vinetas"], marca))
    else:
        o.append("Diapositivas: ninguna (el archivo no se trata como presentación; usa --diapositivas para forzarlo)")
    P = r["parrafos_mayores_de_6_lineas"]
    o.append("Párrafos de más de 6 líneas: %d" % P["cantidad"])
    for p in P["detalle"]:
        o.append("   - %d líneas, %d palabras, en \"%s\": %s" % (p["lineas"], p["palabras"], p["seccion"], p["inicio"]))
    O = r["oraciones"]
    ko = [k for k in O if k.startswith("mayores_de_")][0]
    o.append("Oraciones: %d · promedio %s palabras · de más de %s palabras: %d" % (O["cantidad"], O["promedio_palabras"], ko.rsplit("_", 1)[-1], O[ko]))
    for x in O["detalle"][:10]:
        o.append("   - (%d) %s" % (x["palabras"], x["texto"][:150] + ("…" if len(x["texto"]) > 150 else "")))
    S = r["siglas"]
    o.append("Siglas sin definir: %d%s" % (len(S["sin_definir"]), ("  → " + ", ".join("%s (%d)" % (s["sigla"], s["apariciones"]) for s in S["sin_definir"])) if S["sin_definir"] else ""))
    if S["definidas"]:
        o.append("Siglas definidas: %s" % ", ".join(S["definidas"]))
    o.append("Placeholders (texto de relleno): %d" % len(r["placeholders"]))
    for p in r["placeholders"]:
        o.append("   - en \"%s\": %s" % (p["seccion"], p["texto"]))
    return "\n".join(o)


def main():
    ap = argparse.ArgumentParser(description="Conteos de estructura: listas, secciones, diapositivas, párrafos, siglas, oraciones.")
    ap.add_argument("archivo", help="archivo .md, .html o .txt")
    ap.add_argument("--json", action="store_true")
    ap.add_argument("--ancho", type=int, default=80, help="caracteres por línea para estimar líneas (80)")
    ap.add_argument("--max-oracion", type=int, default=30)
    ap.add_argument("--max-items", type=int, default=6, help="umbral de ítems por lista (6)")
    ap.add_argument("--max-palabras-diapo", type=int, default=40, help="umbral de palabras por diapositiva (40)")
    ap.add_argument("--ignorar-siglas", default="", help="siglas separadas por coma que no requieren definición")
    ap.add_argument("--diapositivas", action="store_true", help="trata cada <section> (HTML) o cada --- (Markdown) como diapositiva aunque el archivo no lo declare")
    args = ap.parse_args()
    with open(args.archivo, "r", encoding="utf-8", errors="replace") as f:
        data = f.read()
    ext = args.archivo.rsplit(".", 1)[-1].lower()
    es_html = ext in ("html", "htm") or (ext not in ("md", "markdown") and bool(re.search(r"(?i)<html|<body|<section", data)))
    ignorar = {s.strip().upper() for s in args.ignorar_siglas.split(",") if s.strip()}
    r = analizar(data, es_html, args.ancho, args.max_oracion, args.max_items, args.max_palabras_diapo, ignorar, args.diapositivas)
    r["archivo"] = args.archivo
    r["version_script"] = VERSION
    if args.json:
        print(json.dumps(r, ensure_ascii=False, indent=2))
    else:
        print(formato_texto(r, args.archivo))


if __name__ == "__main__":
    main()
