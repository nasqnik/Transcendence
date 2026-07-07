from rest_framework.throttling import SimpleRateThrottle


class KidAIClassifyThrottle(SimpleRateThrottle):
    """Limit OpenRouter-backed classify calls per kid (create + text edits)."""

    scope = 'ai_classify'

    def get_cache_key(self, request, view):
        user = request.user
        kid_id = getattr(user, 'kid_id', None)
        if kid_id is None:
            return None
        return self.cache_format % {
            'scope': self.scope,
            'ident': str(kid_id),
        }
