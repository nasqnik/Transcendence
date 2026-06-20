from django.db import models

# Create your models here.
# Analytics-service has no models of its own.
#
# All data (completion history, XP, category points) is owned by
# task-service and gamification-service. This service reads from them
# via internal API calls and aggregates the results on the fly.
#
# Add a model here only if you need to store something that genuinely
# belongs to analytics — for example, a saved report or a cached
# weekly summary. Until then, storing data here would just be a
# duplicate of data another service already owns.