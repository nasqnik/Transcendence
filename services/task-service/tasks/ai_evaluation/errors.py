class AIError(Exception):
    code = 'ai_error'

    def __init__(self, message, *, code=None):
        super().__init__(message)
        self.message = message
        if code is not None:
            self.code = code


class AIServiceUnavailable(AIError):
    code = 'service_unavailable'


class AIRateLimited(AIError):
    code = 'rate_limited'


class AIAuthenticationError(AIError):
    code = 'authentication_failed'


class AIInvalidResponse(AIError):
    code = 'invalid_response'


class AIContentBlocked(AIError):
    """Task text failed content moderation (auto-block / warning)."""

    code = 'content_blocked'
