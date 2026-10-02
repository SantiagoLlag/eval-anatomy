#!/usr/bin/env python3
"""Generate content/*.json from the private research vault.

The vault (Obsidian markdown, Spanish) is the source of truth. This script reads
its structured data files and the source cards ("fichas") they cite, enforces
traceability, and writes the JSON the web app consumes. Never hand-edit
content/*.json: change the vault and re-run.

Traceability invariants (hard fail):
  - every cited ficha id exists as a file in 10-fuentes/ and is not ELIMINADA
  - every rule, relation and tool points to an existing anatomy part
  - every rule's `aplica_si` uses known taxonomy axes and values

Usage:
  python3 scripts/generate_content.py [--vault PATH]
Requires PyYAML. Only the repo owner can run it (the vault is private).
"""
from __future__ import annotations

import argparse
import datetime as dt
import json
import re
import shutil
import sys
from pathlib import Path

import yaml

REPO = Path(__file__).resolve().parent.parent
DEFAULT_VAULT = Path.home() / "Vaults/AI/Evals"
DATA_DIR = "20-digest/C-teoria-de-evals/datos"
SOURCES_DIR = "10-fuentes"
FIXTURES_DIR = "10-fuentes/C-teoria-de-evals/C2-frameworks-y-visores/fixtures"
VALID_STATUS = {"CONFIRMADA", "MATIZADA-corregida"}

errors: list[str] = []


def fail(msg: str) -> None:
    errors.append(msg)


def load_yaml(path: Path):
    with path.open(encoding="utf-8") as f:
        return yaml.safe_load(f)


def read_ficha(path: Path) -> dict:
    text = path.read_text(encoding="utf-8")
    m = re.match(r"^---\n(.*?)\n---", text, re.S)
    if not m:
        fail(f"{path.name}: no frontmatter")
        return {}
    try:
        fm = yaml.safe_load(m.group(1)) or {}
    except yaml.YAMLError:
        # Older cards have unquoted titles with colons: fall back to one "key: value" per line.
        fm = {}
        for line in m.group(1).splitlines():
            kv = re.match(r"^([a-z_]+):\s*(.*)$", line)
            if kv:
                val = kv.group(2).strip().strip('"')
                fm[kv.group(1)] = {"true": True, "false": False}.get(val, val)
    title = re.search(r"^# (.+)$", text, re.M)
    fm["_h1"] = title.group(1).strip() if title else None
    return fm


def index_fichas(vault: Path) -> dict[str, Path]:
    idx: dict[str, Path] = {}
    for p in (vault / SOURCES_DIR).rglob("F-*.md"):
        idx[p.stem] = p
    return idx


def collect_cited(anatomy, taxonomy, rules, tools) -> set[str]:
    cited: set[str] = set()
    for part in anatomy["partes"]:
        cited.update(part.get("fichas", []))
    for axis in taxonomy["ejes"]:
        cited.update(axis.get("fichas", []))
    for c in taxonomy.get("restricciones", []):
        cited.update(c.get("fichas", []))
    for r in rules["reglas"]:
        cited.update(r.get("fichas", []))
    for t in tools["herramientas"]:
        if t.get("ficha"):
            cited.add(t["ficha"])
    cited.update(tools.get("nota_openai", {}).get("fichas", []))
    return cited


def build_sources(cited: set[str], idx: dict[str, Path]) -> dict:
    out = {}
    for fid in sorted(cited):
        path = idx.get(fid)
        if not path:
            fail(f"cited ficha {fid} does not exist in {SOURCES_DIR}/")
            continue
        fm = read_ficha(path)
        status = fm.get("estado")
        if status not in VALID_STATUS:
            fail(f"{fid}: status {status!r} is not citable (need {sorted(VALID_STATUS)})")
        authors = fm.get("autores")
        out[fid] = {
            "id": fid,
            "title": fm.get("titulo") or fm.get("_h1"),
            "authors": authors if isinstance(authors, list) else ([authors] if authors else []),
            "url": fm.get("url"),
            "type": fm.get("tipo"),
            "evidence": fm.get("nivel_evidencia"),
            "status": status,
            "lens": fm.get("lente"),
            "verified": bool(fm.get("url_verificada")),
        }
        if not out[fid]["url"]:
            fail(f"{fid}: missing url")
    return out


def bi(d) -> dict | None:
    """Normalize a {es, en} dict; fail if a language is missing."""
    if d is None:
        return None
    if not isinstance(d, dict) or "es" not in d or "en" not in d:
        fail(f"expected bilingual {{es, en}}, got {d!r:.80}")
        return None
    return {"es": d["es"], "en": d["en"]}


def build_anatomy(a: dict) -> dict:
    part_ids = {p["id"] for p in a["partes"]}
    group_ids = {g["id"] for g in a["grupos"]}
    parts = []
    for p in a["partes"]:
        if p["grupo"] not in group_ids:
            fail(f"part {p['id']}: unknown group {p['grupo']}")
        if p["nivel"] not in {"required", "conditional", "recommended", "optional"}:
            fail(f"part {p['id']}: bad level {p['nivel']}")
        parts.append({
            "id": p["id"],
            "group": p["grupo"],
            "level": p["nivel"],
            "levelNote": bi(p.get("nota_nivel")),
            "condition": bi(p.get("condicion")),
            "name": bi(p["nombre"]),
            "oneLine": bi(p["una_linea"]),
            "explanation": bi(p["explicacion"]),
            "whyItMatters": bi(p["por_que_importa"]),
            "bestPractices": bi(p.get("buenas_practicas")),
            "commonMistakes": bi(p.get("errores_comunes")),
            "example": bi(p.get("ejemplo")),
            "synonyms": p.get("sinonimos", []),
            "sources": p.get("fichas", []),
        })
    relations = []
    for r in a["relaciones"]:
        for end in (r["de"], r["a"]):
            if end not in part_ids:
                fail(f"relation {r['de']}→{r['a']}: unknown part {end}")
        if r["tipo"] not in {"flujo", "control", "define"}:
            fail(f"relation {r['de']}→{r['a']}: bad kind {r['tipo']}")
        relations.append({
            "from": r["de"], "to": r["a"],
            "kind": {"flujo": "flow", "control": "control", "define": "defines"}[r["tipo"]],
            "label": bi(r["etiqueta"]),
        })
    return {
        "version": a["version"],
        "runningExample": bi(a["ejemplo_corriente"]),
        "groups": [{"id": g["id"], "name": bi(g["nombre"]), "question": bi(g["pregunta"])} for g in a["grupos"]],
        "parts": parts,
        "relations": relations,
        "decision": {"name": bi(a["decision"]["nombre"]), "oneLine": bi(a["decision"]["una_linea"])},
    }


def build_taxonomy(t: dict) -> dict:
    axes = []
    for ax in t["ejes"]:
        values = []
        for v in ax["valores"]:
            values.append({
                "id": v["id"],
                "label": {"es": v["es"], "en": v["en"]},
                "definition": bi(v.get("def")),
                "note": bi(v.get("nota")),
            })
        axes.append({
            "id": ax["id"],
            "filter": bool(ax.get("filtro")),
            "multiple": bool(ax.get("multiple")),
            "name": bi(ax["nombre"]),
            "note": bi(ax.get("nota")),
            "values": values,
            "sources": ax.get("fichas", []),
        })
    return {"version": t["version"], "axes": axes, "constraints": t.get("restricciones", [])}


def build_rules(r: dict, part_ids: set[str], taxonomy: dict) -> dict:
    axes = {ax["id"]: {v["id"] for v in ax["values"]} for ax in taxonomy["axes"]}
    out = []
    seen = set()
    for rule in r["reglas"]:
        rid = rule["id"]
        if rid in seen:
            fail(f"duplicate rule id {rid}")
        seen.add(rid)
        if rule["parte"] not in part_ids:
            fail(f"rule {rid}: unknown part {rule['parte']}")
        if rule["severidad"] not in {"error", "warn", "info"}:
            fail(f"rule {rid}: bad severity")
        if rule["deteccion"] not in {"deterministic", "llm-judge", "human", "requires-run"}:
            fail(f"rule {rid}: bad detection mode")
        if not rule.get("fichas"):
            fail(f"rule {rid}: no sources")
        cond = rule.get("aplica_si") or {}
        for key, vals in cond.items():
            if key == "partes":
                for v in vals:
                    if v not in part_ids:
                        fail(f"rule {rid}: aplica_si.partes unknown part {v}")
            elif key == "catalogo":
                continue
            elif key in axes:
                for v in vals:
                    if v not in axes[key]:
                        fail(f"rule {rid}: aplica_si.{key} unknown value {v}")
            else:
                fail(f"rule {rid}: aplica_si unknown key {key}")
        out.append({
            "id": rid,
            "part": rule["parte"],
            "severity": rule["severidad"],
            "detection": rule["deteccion"],
            "check": rule.get("chequeo"),
            "appliesIf": {("parts" if k == "partes" else "catalog" if k == "catalogo" else k): v for k, v in cond.items()},
            "statement": bi(rule["enunciado"]),
            "rationale": bi(rule["razon"]),
            "sources": rule["fichas"],
        })
    return {
        "version": r["version"],
        "note": "Severities are a proposal of the research vault; no source assigns them.",
        "rules": out,
    }


def build_tools(t: dict, part_ids: set[str]) -> dict:
    tools = []
    for tool in t["herramientas"]:
        for key in tool.get("campos", {}):
            if key not in part_ids:
                fail(f"tool {tool['id']}: unknown part {key}")
        tools.append({
            "id": tool["id"],
            "name": tool["nombre"],
            "format": tool["formato"],
            "source": tool.get("ficha"),
            "fixture": tool.get("fixture"),
            "deprecatedOn": tool.get("deprecada"),
            "detection": {"strong": tool["deteccion"]["fuertes"], "weak": tool["deteccion"].get("debiles", [])},
            "fields": tool.get("campos", {}),
            "notes": bi(tool.get("notas")),
        })
    note = t.get("nota_openai")
    return {
        "version": t["version"],
        "openaiNote": {"es": note["es"], "en": note["en"], "sources": note.get("fichas", [])} if note else None,
        "tools": tools,
    }


def write_json(path: Path, data: dict) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(data, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")


def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("--vault", type=Path, default=DEFAULT_VAULT)
    args = ap.parse_args()
    vault: Path = args.vault
    data = vault / DATA_DIR
    if not data.is_dir():
        print(f"vault data not found: {data}", file=sys.stderr)
        return 2

    anatomy_y = load_yaml(data / "anatomia.yaml")
    taxonomy_y = load_yaml(data / "taxonomia.yaml")
    rules_y = load_yaml(data / "reglas.yaml")
    tools_y = load_yaml(data / "herramientas.yaml")

    idx = index_fichas(vault)
    cited = collect_cited(anatomy_y, taxonomy_y, rules_y, tools_y)
    sources = build_sources(cited, idx)

    anatomy = build_anatomy(anatomy_y)
    part_ids = {p["id"] for p in anatomy["parts"]}
    taxonomy = build_taxonomy(taxonomy_y)
    rules = build_rules(rules_y, part_ids, taxonomy)
    tools = build_tools(tools_y, part_ids)

    if errors:
        print(f"{len(errors)} traceability error(s):", file=sys.stderr)
        for e in errors:
            print(f"  - {e}", file=sys.stderr)
        return 1

    generated = {"generated": dt.date.today().isoformat(), "generator": "scripts/generate_content.py — regenerate, never hand-edit"}
    write_json(REPO / "content/anatomy.json", {**generated, **anatomy})
    write_json(REPO / "content/taxonomy.json", {**generated, **taxonomy})
    write_json(REPO / "content/best-practices.json", {**generated, **rules})
    write_json(REPO / "content/tools.json", {**generated, **tools})
    write_json(REPO / "content/sources.json", {**generated, "sources": sources})

    fx_src = vault / FIXTURES_DIR
    fx_dst = REPO / "research/fixtures"
    fx_dst.mkdir(parents=True, exist_ok=True)
    for f in sorted(fx_src.iterdir()):
        if f.is_file():
            shutil.copy2(f, fx_dst / f.name)

    print(f"ok: {len(anatomy['parts'])} parts, {len(anatomy['relations'])} relations, "
          f"{len(taxonomy['axes'])} axes, {len(rules['rules'])} rules, {len(tools['tools'])} tools, "
          f"{len(sources)} sources, fixtures copied")
    return 0


if __name__ == "__main__":
    sys.exit(main())
