# Ejemplos de E12

Dos muestras de calibración, copiadas sin cambios. Son ficticias: la cafetería, las cifras y las personas son inventadas.

- `buena-reporte.md`: reporte trimestral de una cafetería, bien hecho. No tiene fallos plantados. Es el ejemplo del ancla 5.
- `mala-reporte.md`: el mismo reporte, con 18 fallos puestos a propósito para varias evals.

Un fallo plantado es un error puesto a propósito. Si E12 corre sobre la muestra mala y no marca FAIL donde le toca, la eval está mal escrita, no la muestra.

## Qué debe detectar E12

La tabla de fallos plantados del conjunto de calibración todavía no tiene filas de E12: sus 18 fallos de esta muestra son de otras evals (títulos, gráficos, jerga, listas, placeholders). Lo que E12 debe marcar aquí son fallos que la muestra ya trae: E12-01 lo cita la propia eval y E12-07 salió en la calibración.

| Pregunta | Qué falla | Dónde |
|---|---|---|
| E12-01 | Muletillas de IA: "el presente documento", "de manera integral", "holística", "potenciar el" | Introducción (l. 5) y "Plan de acción" (l. 30) |
| E12-07 | Secciones sin una sola oración propia del caso (lo decide el juez) | "Contexto de mercado" y "Consideraciones adicionales" |

E12-02 debe pasar: 13,7 conectores por 1 000 palabras, bajo el umbral de 18. El gate G-E12-1 aplica (es `reporte-markdown`) y pasa: la muestra original no tiene emoji ni exclamaciones. En la calibración, esta versión dio 7 de 9 (nota 3).

Los seis fallos de slop plantados (S1 a S6) viven en copias de las muestras malas que no se publican. Dos son de este reporte: S1 añade "¡Vamos por un tercer trimestre histórico! 🚀" al final de "Conclusiones" (E12-04, dispara el gate) y S2 añade cuatro oraciones seguidas que abren con "Este trimestre" (E12-06). Con ellos, el reporte baja a 5 de 9 y el gate lo reprueba.

## Cómo comprobarlo

Desde la carpeta de la eval:

```
python3 -B scripts/slop.py examples/buena-reporte.md --tipo reporte-markdown --json
python3 -B scripts/slop.py examples/mala-reporte.md --tipo reporte-markdown --json
```

Resultado esperado: la buena pasa E12-01 a E12-06 y el gate. La mala falla E12-01 (4 muletillas), deja E12-03 en REVISAR (una aparición de "mejor", que el juez decide) y pasa el gate.
