# Contributing / Cómo aportar

## Add an eval / Agregar una eval

1. Create `catalog/<id>/eval.md` following [docs/FORMAT.md](docs/FORMAT.md). `id` = folder name, lowercase with dashes.
   Crea `catalog/<id>/eval.md` con el formato de [docs/FORMAT.md](docs/FORMAT.md). `id` = nombre de la carpeta, en minúsculas con guiones.
2. Fill as many anatomy parts as you honestly can. Missing parts are fine; invented ones are not.
   Llena todas las partes que puedas con honestidad. Que falten partes está bien; inventarlas no.
3. Declare a license (CC-BY-4.0 recommended) and do not include personal data.
   Declara una licencia (se recomienda CC-BY-4.0) y no incluyas datos personales.
4. Run `npm run validate:catalog` and open a pull request. CI validates the card and posts the linter review.
   Corre `npm run validate:catalog` y abre un pull request. La CI valida la ficha y comenta la revisión.

Tip: paste your existing eval (promptfoo, Inspect, DeepEval, plain text…) into the site's **Inspect** page and use **Save as eval.md**.
Consejo: pega tu eval (promptfoo, Inspect, DeepEval, texto…) en la página **Inspect** del sitio y usa **Guardar como eval.md**.

## Report a content error / Reportar un error de contenido

`content/*.json` is generated from a verified research vault. Open an issue with the source that contradicts it; do not edit the JSON.
`content/*.json` se genera desde una investigación verificada. Abre un issue con la fuente que lo contradice; no edites el JSON.

## Code / Código

Read `CLAUDE.md` and `docs/ARCHITECTURE.md`. One PR per change; `npm run lint && npm test && npm run validate:catalog && npm run build` must pass.
