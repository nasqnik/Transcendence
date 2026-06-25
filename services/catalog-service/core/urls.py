from django.urls import include, path
from drf_spectacular.views import SpectacularAPIView, SpectacularSwaggerView

urlpatterns = [
    path('api/catalog/schema/', SpectacularAPIView.as_view(), name='catalog-schema'),
    path('api/catalog/docs/', SpectacularSwaggerView.as_view(), name='catalog-schema'),
    path('api/catalog/', include('common.urls')),
    path('api/catalog/', include('catalog.urls')),
]
