from django.urls import path
from .views import (
    OrderListView, PlaceOrderView, OrderDetailView,
    UpdateOrderStatusView, CancelOrderView, VendorRevenueView, CreateBulkOrderView,
    VendorOrderListView, VendorApprovalActionView
)

urlpatterns = [
    path('orders/', OrderListView.as_view(), name='order-list'),
    path('orders/place/', PlaceOrderView.as_view(), name='place-order'),
    path('orders/bulk-create/', CreateBulkOrderView.as_view(), name='bulk-order-create'),
    path('orders/vendor-orders/', VendorOrderListView.as_view(), name='vendor-order-list'),
    path('orders/<int:pk>/vendor-approve/', VendorApprovalActionView.as_view(), name='vendor-approval-action'),
    path('orders/vendor-revenue/', VendorRevenueView.as_view(), name='vendor-revenue'),
    path('orders/<int:pk>/', OrderDetailView.as_view(), name='order-detail'),
    path('orders/<int:pk>/update-status/', UpdateOrderStatusView.as_view(), name='update-order-status'),
    path('orders/<int:pk>/cancel/', CancelOrderView.as_view(), name='cancel-order'),
]
