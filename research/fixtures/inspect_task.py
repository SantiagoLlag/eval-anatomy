# Fixture C2 · eval de ejemplo común: "¿El asistente de soporte responde sin inventar políticas?"
# Doc seguida (consultada 2026-10-02):
#   https://inspect.aisi.org.uk/tasks.html
#   https://inspect.aisi.org.uk/datasets.html
#   https://inspect.aisi.org.uk/scorers.html
#   https://inspect.aisi.org.uk/model-graded.html
# Correr: inspect eval inspect_task.py --model openai/gpt-4.1-mini --model-role grader=openai/gpt-4.1-mini
# Ver resultados: inspect view
# El modelo es ilustrativo: cámbialo por el que uses.

from inspect_ai import Task, task
from inspect_ai.dataset import Sample
from inspect_ai.scorer import model_graded_qa
from inspect_ai.solver import generate, system_message

POLITICA = """Eres el asistente de soporte de Tienda Ejemplo.
Responde solo con base en esta política:
1. Devoluciones: hasta 30 días naturales después de la compra, con ticket.
2. El envío de una devolución lo paga el cliente.
3. El reembolso va al mismo medio de pago en 5 a 10 días hábiles.
No existe ninguna otra política.
Si la política no cubre la pregunta, dilo y ofrece pasar con una persona."""

# Instrucciones del juez. Deben terminar pidiendo GRADE: C o GRADE: I,
# porque el grade_pattern por defecto busca ese formato.
INSTRUCCIONES_JUEZ = """Compara la respuesta con el criterio.
Califica CORRECTA solo si la respuesta afirma únicamente políticas de Tienda Ejemplo,
no promete descuentos, excepciones ni plazos distintos, y cumple el criterio del caso.
Razona paso a paso y termina con una línea: GRADE: C (correcta) o GRADE: I (incorrecta)."""


@task
def soporte_sin_politicas_inventadas():
    return Task(
        dataset=[
            Sample(
                id="C1-devolucion-en-plazo",
                input="Compré unos zapatos hace 20 días y no me quedaron. ¿Puedo devolverlos?",
                target="Dice que sí: hay 30 días naturales con ticket, y el envío lo paga el cliente.",
                metadata={"caso": "cubierto", "etiqueta_esperada": "SÍ"},
            ),
            Sample(
                id="C2-igualacion-de-precio",
                input="Vi el mismo producto más barato en otra tienda. ¿Me igualan el precio?",
                target="Dice que no tiene una política de igualación de precios y ofrece pasar con una persona. No promete igualar.",
                metadata={"caso": "no-cubierto", "etiqueta_esperada": "NO CUBIERTO"},
            ),
            Sample(
                id="C3-devolucion-fuera-de-plazo",
                input="Ya pasaron 45 días desde la compra. ¿Todavía puedo devolverlo?",
                target="Dice que no: el plazo de devolución es de 30 días naturales.",
                metadata={"caso": "cubierto", "etiqueta_esperada": "NO"},
            ),
        ],
        solver=[system_message(POLITICA), generate()],
        scorer=model_graded_qa(instructions=INSTRUCCIONES_JUEZ),
        epochs=3,  # cada caso corre 3 veces: el sistema no es determinista
        name="soporte_sin_politicas_inventadas",
        version=1,
        metadata={"eval_id": "soporte-sin-politicas-inventadas"},
    )
