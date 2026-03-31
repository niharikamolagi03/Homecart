from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import (
    CategoryViewSet,
    VendorProductListView, MyVendorProductsView,
    VendorProductCreateView, VendorProductDetailView,
    ShopkeeperProductListView, MyShopkeeperProductsView,
    AddToShopView, ShopkeeperProductDetailView,
    CreatePurchaseRequestView, VendorPurchaseRequestsView,
    ApprovePurchaseRequestView, RejectPurchaseRequestView,
    ShopkeeperPurchaseRequestsView, SetSellingPriceView,
    PendingSetupProductsView,
    NotificationListView, MarkNotificationsReadView,
    ShopkeeperBillingListView, MakePaymentView,
    VendorBillingView, VendorRevenueSummaryView, VendorStockView,
    ProductReviewsView, ProductReviewDetailView, CustomerReviewsView, ProductReviewStatsView,
)

router = DefaultRouter()
router.register(r'categories', CategoryViewSet, basename='category')

urlpatterns = [
    path('', include(router.urls)),
    # Vendor products
    path('vendor-products/', VendorProductListView.as_view()),
    path('vendor-products/mine/', MyVendorProductsView.as_view()),
    path('vendor-products/create/', VendorProductCreateView.as_view()),
    path('vendor-products/<int:pk>/', VendorProductDetailView.as_view()),
    # Shopkeeper products
    path('shopkeeper-products/', ShopkeeperProductListView.as_view()),
    path('shopkeeper-products/mine/', MyShopkeeperProductsView.as_view()),
    path('shopkeeper-products/add/', AddToShopView.as_view()),
    path('shopkeeper-products/<int:pk>/', ShopkeeperProductDetailView.as_view()),
    path('shopkeeper-products/<int:pk>/set-price/', SetSellingPriceView.as_view()),
    # Purchase requests
    path('purchase-requests/', CreatePurchaseRequestView.as_view()),
    path('purchase-requests/mine/', ShopkeeperPurchaseRequestsView.as_view()),
    path('purchase-requests/pending-setup/', PendingSetupProductsView.as_view()),
    path('purchase-requests/vendor/', VendorPurchaseRequestsView.as_view()),
    path('purchase-requests/<int:pk>/approve/', ApprovePurchaseRequestView.as_view()),
    path('purchase-requests/<int:pk>/reject/', RejectPurchaseRequestView.as_view()),
    # Notifications
    path('notifications/', NotificationListView.as_view()),
    path('notifications/read/', MarkNotificationsReadView.as_view()),
    # Billing
    path('billing/', ShopkeeperBillingListView.as_view()),
    path('billing/<int:pk>/pay/', MakePaymentView.as_view()),
    path('billing/vendor/', VendorBillingView.as_view()),
    path('billing/vendor/summary/', VendorRevenueSummaryView.as_view()),
    # Bug 3: real-time stock polling
    path('vendor-products/stock/', VendorStockView.as_view()),
    # Reviews
    path('reviews/', ProductReviewsView.as_view()),
    path('reviews/<int:pk>/', ProductReviewDetailView.as_view()),
    path('reviews/my/', CustomerReviewsView.as_view()),
    path('reviews/<int:shopkeeper_product_id>/stats/', ProductReviewStatsView.as_view()),
]
