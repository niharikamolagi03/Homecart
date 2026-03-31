from rest_framework import viewsets, permissions, filters
from django_filters.rest_framework import DjangoFilterBackend
from .models import Vendor
from .serializers import VendorSerializer
from apps.users.permissions import IsVendor, IsAdmin
from rest_framework.decorators import api_view, permission_classes
from rest_framework.response import Response
from apps.products.models import ShopkeeperProduct

class VendorViewSet(viewsets.ModelViewSet):
    queryset = Vendor.objects.all()
    serializer_class = VendorSerializer
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    filterset_fields = ['category', 'is_verified']
    search_fields = ['shop_name', 'description', 'location']
    ordering_fields = ['rating', 'created_at']

    def get_permissions(self):
        if self.action in ['create', 'update', 'partial_update', 'destroy']:
            return [permissions.IsAuthenticated(), IsVendor()]
        return [permissions.AllowAny()]

    def perform_create(self, serializer):
        serializer.save(user=self.request.user)

    def get_queryset(self):
        if self.request.user.is_authenticated and self.request.user.role == 'ADMIN':
            return Vendor.objects.all()
        return Vendor.objects.filter(is_verified=True)


@api_view(['GET'])
@permission_classes([permissions.IsAuthenticated])
def vendors_with_products(request):
    vendors = Vendor.objects.filter(is_verified=True)
    result = []
    for v in vendors:
        products = ShopkeeperProduct.objects.filter(shopkeeper=v.user, stock__gt=0, is_active=True)
        result.append({
            "id": v.id,
            "name": v.shop_name,
            "products": [{
                "id": p.id,
                "name": p.vendor_product.name,
                "price": float(p.selling_price),
                "stock": p.stock,
            } for p in products]
        })
    return Response(result)