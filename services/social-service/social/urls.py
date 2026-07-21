from django.urls import path

from .views import (
    FriendListView,
    FriendRequestAcceptView,
    FriendRequestDeclineView,
    FriendRequestListCreateView,
    UnfriendView,
)

urlpatterns = [
    path('friends/requests/', FriendRequestListCreateView.as_view()),
    path(
        'friends/requests/<uuid:request_id>/accept/',
        FriendRequestAcceptView.as_view(),
    ),
    path(
        'friends/requests/<uuid:request_id>/decline/',
        FriendRequestDeclineView.as_view(),
    ),
    path('friends/', FriendListView.as_view()),
    path('friends/<uuid:kid_id>/', UnfriendView.as_view()),
]
