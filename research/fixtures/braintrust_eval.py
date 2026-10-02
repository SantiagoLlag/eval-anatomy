# Fixture C2 · eval de ejemplo común: "¿El asistente de soporte responde sin inventar políticas?"
# Doc seguida (consultada 2026-10-02):
#   https://www.braintrust.dev/docs/evaluate
#   https://www.braintrust.dev/docs/evaluate/run-in-code
#   https://www.braintrust.dev/docs/evaluate/llm-as-a-judge
#   https://www.braintrust.dev/docs/evaluate/write-scorers
# Correr: bt eval braintrust_eval.py
# Cada corrida crea un "experiment" inmutable que se compara en la interfaz web.
# El modelo es ilustrativo: cámbialo por el que uses.

from autoevals import LLMClassifier
from braintrust import Eval

POLITICA = (
    "1. Devoluciones: hasta 30 días naturales después de la compra, con ticket. "
    "2. El envío de una devolución lo paga el cliente. "
    "3. El reembolso va al mismo medio de pago en 5 a 10 días hábiles. "
    "No existe ninguna otra política."
)

CASOS = [
    {
        "input": "Compré unos zapatos hace 20 días y no me quedaron. ¿Puedo devolverlos?",
        "expected": "Sí. Hay 30 días naturales con ticket. El envío de la devolución lo paga el cliente.",
        "metadata": {"caso": "cubierto"},
    },
    {
        "input": "Vi el mismo producto más barato en otra tienda. ¿Me igualan el precio?",
        "expected": "No hay una política de igualación de precios. Ofrece pasar con una persona.",
        "metadata": {"caso": "no-cubierto"},
    },
    {
        "input": "Ya pasaron 45 días desde la compra. ¿Todavía puedo devolverlo?",
        "expected": "No. El plazo de devolución es de 30 días naturales.",
        "metadata": {"caso": "cubierto"},
    },
]


def asistente_soporte(input):
    """Sistema bajo prueba (la "task"). Sustituye por la llamada real a tu asistente."""
    raise NotImplementedError("Conecta aquí tu asistente de soporte")


no_inventa_politicas = LLMClassifier(
    name="No inventa políticas",
    prompt_template=(
        "Política vigente de Tienda Ejemplo: " + POLITICA + "\n\n"
        "Pregunta: {{input}}\n"
        "Respuesta del asistente: {{output}}\n"
        "Respuesta de referencia: {{expected}}\n\n"
        "¿La respuesta afirma solo políticas de la lista y, si la pregunta no está cubierta, "
        "lo dice y ofrece pasar con una persona?\n"
        'Responde solo "cumple" o "inventa".'
    ),
    choice_scores={"cumple": 1, "inventa": 0},
    use_cot=True,
    model="gpt-4.1-mini",
)

Eval(
    "Soporte Tienda Ejemplo",
    experiment_name="soporte-v1",
    data=CASOS,
    task=asistente_soporte,
    scores=[no_inventa_politicas],
    metadata={"eval_id": "soporte-sin-politicas-inventadas", "prompt_version": "v1"},
    trial_count=3,  # cada caso corre 3 veces: el sistema no es determinista
)
