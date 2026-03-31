"""
Admin-only endpoint to wipe all marketplace activity data.
Users (all roles) are preserved. Only product/order/billing data is deleted.
"""
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from apps.users.permissions import IsAdmin
from django.db import transaction


class ResetMarketplaceDataView(APIView):
    """
    DELETE /api/admin/reset/
    Clears all marketplace activity — products, orders, cart, billing, requests.
    Users are NOT deleted. Admin-only.
    """
    permission_classes = [IsAuthenticated, IsAdmin]

    @transaction.atomic
    def delete(self, request):
        from apps.orders.models import OrderItem, Order
        from apps.cart.models import CartItem, Cart
        from apps.products.models import (
            ShopkeeperBilling, PurchaseRequest,
            ShopkeeperProduct, ProductUsage,
            VendorProduct, Notification,
        )

        counts = {}

        # Delete in dependency order (children before parents)
        counts['order_items'] = OrderItem.objects.count()
        OrderItem.objects.all().delete()

        counts['orders'] = Order.objects.count()
        Order.objects.all().delete()

        counts['cart_items'] = CartItem.objects.count()
        CartItem.objects.all().delete()

        counts['carts'] = Cart.objects.count()
        Cart.objects.all().delete()

        counts['billings'] = ShopkeeperBilling.objects.count()
        ShopkeeperBilling.objects.all().delete()

        counts['purchase_requests'] = PurchaseRequest.objects.count()
        PurchaseRequest.objects.all().delete()

        counts['shopkeeper_products'] = ShopkeeperProduct.objects.count()
        ShopkeeperProduct.objects.all().delete()

        counts['product_usages'] = ProductUsage.objects.count()
        ProductUsage.objects.all().delete()

        counts['vendor_products'] = VendorProduct.objects.count()
        VendorProduct.objects.all().delete()

        counts['notifications'] = Notification.objects.count()
        Notification.objects.all().delete()

        return Response({
            'message': 'Marketplace data reset successfully. Users preserved.',
            'deleted': counts,
        })
