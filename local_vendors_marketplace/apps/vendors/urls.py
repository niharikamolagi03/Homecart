from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import VendorViewSet, vendors_with_products

router = DefaultRouter()
router.register(r'vendors', VendorViewSet, basename='vendor')

urlpatterns = [
    path('', include(router.urls)),
    path('with-products/', vendors_with_products, name='vendors-with-products'),
]
