from django.urls import path
from .views import ShopListView, PurchaseView, AvatarView, EquipItemView, UnequipItemView

urlpatterns= [
    path('shop/', ShopListView.as_view(), name='shop-list'),
    path('shop/purchase/', PurchaseView.as_view(), name='shop-purchase'),
    path('avatar/', AvatarView.as_view(), name='kid-avatar'),
    path('avatar/equip/', EquipItemView.as_view(), name='equip-item'),
    path('avatar/unequip/', UnequipItemView.as_view(), name='unequip-item'),
]