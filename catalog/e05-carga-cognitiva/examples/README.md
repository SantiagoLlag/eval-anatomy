# Ejemplos de E05

Dos muestras de calibración, copiadas sin cambios. Son ficticias: la fundación, las cifras y las personas son inventadas.

- `buena-presentacion.html`: resultados 2025 de una fundación, bien hecha. No tiene fallos plantados.
- `mala-presentacion.html`: el mismo tema, con 19 fallos puestos a propósito para varias evals. Dos son de E05.

Un fallo plantado es un error puesto a propósito. Si E05 corre sobre la muestra mala y no marca FAIL donde le toca, la eval está mal escrita, no la muestra.

## Fallos plantados que E05 debe detectar

| # | Fallo | Dónde | Pregunta |
|---|---|---|---|
| P1 | Diapositiva con 105 palabras y 9 viñetas | Diapositiva 4, "Resultados" (lo mide `conteos.py`) | E05-08; también el gate extra del perfil de presentación (más de 40 palabras o más de 6 viñetas) |
| P2 | Agenda con 10 viñetas | Diapositiva 2 | E05-07 (agenda que hay que retener) y E05-08 (lista de 10 sin subgrupos) |

En las otras muestras malas del conjunto de calibración, que no se incluyen aquí, E05 tiene dos filas más: una lista de 9 ítems en un reporte (E05-08) y una marquesina con adornos sin función en una página web (E05-06; la eval cita esa misma marquesina como FAIL de E05-04).

## Cómo comprobarlo

Desde la carpeta de la eval:

```
python3 -B scripts/conteos.py examples/buena-presentacion.html --max-items 4 --diapositivas --json
python3 -B scripts/conteos.py examples/mala-presentacion.html --max-items 4 --diapositivas --json
```

Resultado esperado: en la buena, `listas.max_items_por_lista` = 3 y `listas.listas_con_mas_de_4_items` vacía. En la mala, 10 y dos listas: "Agenda" (10 ítems) y "Resultados" (9 ítems). E05-07 lo decide el juez.
