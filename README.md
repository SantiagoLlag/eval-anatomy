# eval-anatomy

**ES** · Visualizador y catálogo de evals de IA. **EN** · A visualizer and catalog of AI evals.

> Status: in construction. The research and the content are done; the app is being built (see `docs/tasks/`).

---

## Español

Una **eval** (evaluación) es una prueba repetible que dice si un sistema de IA hace bien una tarea concreta.
Este proyecto hace tres cosas con cualquier eval:

1. **Anatomía.** Muestra las 16 partes que puede tener una eval (8 obligatorias, el resto según el caso), en 5 grupos: intención, qué se prueba, cómo se juzga, qué se concluye y cómo se cuida. Cada parte trae definición, buenas prácticas, errores comunes y fuentes.
2. **Tu eval.** Toma una eval concreta y la acomoda en esas 16 partes. Marca qué tiene, qué le falta y qué conviene mejorar, con reglas sacadas de la investigación.
3. **Flujo.** Dibuja cómo corre esa eval: de los casos al sistema, del sistema al calificador y del calificador a la decisión.

Lee evals del catálogo, de archivos de promptfoo, Inspect, lm-evaluation-harness, DeepEval, Braintrust, ElevenLabs y OpenAI Evals, o de texto libre.

**El catálogo** es una carpeta de evals que cualquiera puede usar y aportar. Ver [CONTRIBUTING.md](CONTRIBUTING.md) y el formato en [docs/FORMAT.md](docs/FORMAT.md).

**De dónde sale el contenido.** De una investigación con más de 60 fuentes (documentación de Anthropic, OpenAI, Google y Microsoft; artículos como HELM, G-Eval, MT-Bench, BetterBench; guías de practicantes; casos de GitHub, Vercel, Notion, Shopify y otros). Cada fuente fue revisada por un verificador escéptico. Cada regla y cada parte enlazan a sus fuentes.

## English

An **eval** is a repeatable test that tells whether an AI system does a specific task well.
This project does three things with any eval:

1. **Anatomy.** Shows the 16 parts an eval can have (8 required, the rest depending on the case), in 5 groups: intent, what is tested, how it is judged, what is concluded, and how it is maintained. Each part has a definition, best practices, common mistakes and sources.
2. **Your eval.** Maps a concrete eval onto those 16 parts, flags what is present, missing or worth improving, using research-backed rules.
3. **Flow.** Draws how that eval runs: from cases to system, from system to grader, from grader to decision.

It reads evals from the catalog, from promptfoo, Inspect, lm-evaluation-harness, DeepEval, Braintrust, ElevenLabs and OpenAI Evals files, or from free text.

**The catalog** is a folder of evals anyone can use and contribute. See [CONTRIBUTING.md](CONTRIBUTING.md) and the format in [docs/FORMAT.md](docs/FORMAT.md).

**Where the content comes from.** A research pass over 60+ sources (Anthropic, OpenAI, Google and Microsoft docs; papers such as HELM, G-Eval, MT-Bench, BetterBench; practitioner guides; case studies from GitHub, Vercel, Notion, Shopify and others), each checked by a skeptical verifier. Every rule and part links to its sources.

---

## Repository map

| Path | What |
|---|---|
| `content/` | Generated research content (anatomy, taxonomy, rules, tool field maps, sources). Do not edit by hand. |
| `schema/eval.schema.json` | The eval card format. |
| `catalog/` | Evals, one folder each. |
| `research/fixtures/` | The same example eval written in 10 tools' native formats. |
| `docs/` | Architecture, format, work packages, reference code. |

## License

Code: [MIT](LICENSE). Content, catalog and docs: [CC BY 4.0](LICENSE-CONTENT) unless an eval states otherwise.
