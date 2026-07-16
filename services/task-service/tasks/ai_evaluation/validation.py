from .ai_evaluation import MAXIMUM_SCORE, MINIMUM_SCORE
from .apply import CATEGORIES
from .errors import AIInvalidResponse


def validate_classification(parsed):
    if not isinstance(parsed, dict):
        raise AIInvalidResponse('Classification must be a JSON object.')

    for category in CATEGORIES:
        score = parsed.get(category, 0)
        try:
            score = int(score)
        except (TypeError, ValueError) as exc:
            raise AIInvalidResponse(f'Invalid score for {category}.') from exc
        if not MINIMUM_SCORE <= score <= MAXIMUM_SCORE:
            raise AIInvalidResponse(
                f'Score for {category} must be between '
                f'{MINIMUM_SCORE} and {MAXIMUM_SCORE}.'
            )

    summary = parsed.get('summary', '')
    if not isinstance(summary, str) or not summary.strip():
        raise AIInvalidResponse('Missing or empty summary.')

    return parsed
