from django.urls import path

from .views import (
    InternalCoinDeductView,
    InternalCompletionView,
    InternalKidsProgressView,
    KidStatListView,
    KidProfileView,
    KidStatListViewParent,
)
                

urlpatterns = [
    path('internal/completions/', InternalCompletionView.as_view(), name='internal-completions'),
    path('internal/coins/deduct/', InternalCoinDeductView.as_view(), name='internal-coins-deduct'),
    path('internal/kids/progress/', InternalKidsProgressView.as_view(), name='internal-kids-progress'),

    # read endpoints
    path('stats/', KidStatListView.as_view(), name='kid-stat-list'),
    path('profile/', KidProfileView.as_view(), name='kid-profile'),
    path('kids/<uuid:kid_id>/stats/', KidStatListViewParent.as_view(), name='parent-kid-stat-list'),
]
