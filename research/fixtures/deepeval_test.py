# Fixture C2 · eval de ejemplo común: "¿El asistente de soporte responde sin inventar políticas?"
# Doc seguida (consultada 2026-10-02; DeepEval v4.2.8):
#   https://deepeval.com/docs/evaluation-test-cases
#   https://deepeval.com/docs/evaluation-datasets
#   https://deepeval.com/docs/metrics-llm-evals
#   https://deepeval.com/docs/evaluation-introduction
# Correr: deepeval test run deepeval_test.py   (la doc pide no usar pytest directo)
# Resultados locales: .deepeval/.latest_run_full.json ; abrir con: deepeval inspect
# El modelo es ilustrativo: cámbialo por el que uses.

import pytest
from deepeval import assert_test
from deepeval.dataset import EvaluationDataset, Golden
from deepeval.metrics import GEval
from deepeval.test_case import LLMTestCase, SingleTurnParams

POLITICA = (
    "1. Devoluciones: hasta 30 días naturales después de la compra, con ticket. "
    "2. El envío de una devolución lo paga el cliente. "
    "3. El reembolso va al mismo medio de pago en 5 a 10 días hábiles. "
    "No existe ninguna otra política."
)

# Casos "dorados": entrada, respuesta esperada y contexto (la política).
dataset = EvaluationDataset(
    goldens=[
        Golden(
            input="Compré unos zapatos hace 20 días y no me quedaron. ¿Puedo devolverlos?",
            expected_output="Sí. Hay 30 días naturales con ticket. El envío de la devolución lo paga el cliente.",
            context=[POLITICA],
        ),
        Golden(
            input="Vi el mismo producto más barato en otra tienda. ¿Me igualan el precio?",
            expected_output="No hay una política de igualación de precios. Ofrece pasar con una persona.",
            context=[POLITICA],
        ),
        Golden(
            input="Ya pasaron 45 días desde la compra. ¿Todavía puedo devolverlo?",
            expected_output="No. El plazo de devolución es de 30 días naturales.",
            context=[POLITICA],
        ),
    ]
)


def asistente_soporte(pregunta: str) -> str:
    """Sistema bajo prueba. Sustituye por la llamada real a tu asistente."""
    raise NotImplementedError("Conecta aquí tu asistente de soporte")


# Convertir cada caso dorado en caso de prueba (con la salida real del sistema).
for golden in dataset.goldens:
    dataset.add_test_case(
        LLMTestCase(
            input=golden.input,
            actual_output=asistente_soporte(golden.input),
            expected_output=golden.expected_output,
            context=golden.context,
        )
    )

# Juez LLM con pasos de evaluación fijos (en vez de criterios libres).
# La política va escrita dentro de los pasos: la doc revisada solo muestra
# INPUT, ACTUAL_OUTPUT y EXPECTED_OUTPUT como evaluation_params de GEval.
no_inventa_politicas = GEval(
    name="No inventa políticas",
    evaluation_steps=[
        "Lista cada política que afirma la 'actual output'.",
        "Marca como falla cualquier política que no esté en esta lista: " + POLITICA,
        "Si el 'input' no está cubierto por esa lista, la respuesta debe decirlo y ofrecer pasar con una persona.",
        "Compara el sentido con la 'expected output'; no castigues diferencias de redacción.",
    ],
    evaluation_params=[
        SingleTurnParams.INPUT,
        SingleTurnParams.ACTUAL_OUTPUT,
        SingleTurnParams.EXPECTED_OUTPUT,
    ],
    threshold=0.8,
    model="gpt-4.1-mini",
)


@pytest.mark.parametrize("test_case", dataset.test_cases)
def test_soporte_sin_politicas_inventadas(test_case: LLMTestCase):
    assert_test(test_case, [no_inventa_politicas])
