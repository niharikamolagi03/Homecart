from rest_framework import generics, status
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from rest_framework.views import APIView
from django.db import transaction
from django.shortcuts import get_object_or_404
from .models import Order, OrderItem, VendorApproval
from .serializers import OrderSerializer, PlaceOrderSerializer, UpdateOrderStatusSerializer, BulkOrderSerializer, VendorApprovalSerializer, VendorApprovalActionSerializer
from apps.cart.models import Cart
from apps.users.models import User


class OrderListView(generics.ListAPIView):
    serializer_class = OrderSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        if getattr(self, 'swagger_fake_view', False):
            return Order.objects.none()
        user = self.request.user
        if user.role == 'CUSTOMER':
            return Order.objects.filter(customer=user).prefetch_related('items__product__vendor_product')
        elif user.role == 'SHOPKEEPER':
            return Order.objects.filter(shopkeeper=user).prefetch_related('items__product__vendor_product')
        elif user.role == 'DELIVERY':
            return Order.objects.filter(assigned_delivery=user).prefetch_related('items__product__vendor_product')
        return Order.objects.all().prefetch_related('items__product__vendor_product')


class PlaceOrderView(generics.GenericAPIView):
    permission_classes = [IsAuthenticated]
    serializer_class = PlaceOrderSerializer

    @transaction.atomic
    def post(self, request):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        cart = get_object_or_404(Cart, user=request.user)
        if not cart.items.exists():
            return Response({'error': 'Cart is empty'}, status=status.HTTP_400_BAD_REQUEST)

        # Group by shopkeeper
        shopkeeper_items: dict = {}
        for item in cart.items.select_related('product__shopkeeper').all():
            sk = item.product.shopkeeper
            shopkeeper_items.setdefault(sk, []).append(item)

        orders = []
        for shopkeeper, items in shopkeeper_items.items():
            total = sum(item.total_price for item in items)
            order = Order.objects.create(
                customer=request.user,
                shopkeeper=shopkeeper,
                total_price=total,
                delivery_address=serializer.validated_data['delivery_address'],
                latitude=serializer.validated_data.get('latitude'),
                longitude=serializer.validated_data.get('longitude'),
            )
            for item in items:
                OrderItem.objects.create(
                    order=order, product=item.product,
                    quantity=item.quantity, price=item.product.selling_price
                )
                item.product.stock = max(0, item.product.stock - item.quantity)
                if item.product.stock == 0:
                    item.product.is_active = False
                item.product.save()

            # Auto-assign an available delivery agent
            delivery_agent = User.objects.filter(
                role='DELIVERY', is_approved=True, is_active=True
            ).first()
            if delivery_agent:
                order.assigned_delivery = delivery_agent
                order.save()

            orders.append(order)

        cart.items.all().delete()
        return Response({
            'message': 'Order placed successfully',
            'orders': OrderSerializer(orders, many=True, context={'request': request}).data
        }, status=status.HTTP_201_CREATED)


class OrderDetailView(generics.RetrieveAPIView):
    serializer_class = OrderSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        if getattr(self, 'swagger_fake_view', False):
            return Order.objects.none()
        user = self.request.user
        if user.role == 'CUSTOMER':
            return Order.objects.filter(customer=user)
        elif user.role == 'DELIVERY':
            return Order.objects.filter(assigned_delivery=user)
        return Order.objects.all()


class UpdateOrderStatusView(generics.GenericAPIView):
    permission_classes = [IsAuthenticated]
    serializer_class = UpdateOrderStatusSerializer

    def patch(self, request, pk):
        order = get_object_or_404(Order, id=pk)
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        order.status = serializer.validated_data['status']
        order.save()
        return Response({'message': 'Status updated', 'status': order.status})


class CancelOrderView(generics.GenericAPIView):
    permission_classes = [IsAuthenticated]

    def delete(self, request, pk):
        order = get_object_or_404(Order, id=pk, customer=request.user)
        if order.status not in ['PENDING', 'ACCEPTED']:
            return Response({'error': 'Cannot cancel at this stage'}, status=status.HTTP_400_BAD_REQUEST)
        order.status = 'CANCELLED'
        order.save()
        for item in order.items.all():
            item.product.stock += item.quantity
            item.product.save()
        return Response({'message': 'Order cancelled'})


class VendorRevenueView(APIView):
    """Returns real revenue for a vendor based on completed orders."""
    permission_classes = [IsAuthenticated]

    def get(self, request):
        from apps.products.models import VendorProduct
        from django.db.models import Sum, F

        # Get all vendor products owned by this user
        vendor_product_ids = VendorProduct.objects.filter(
            vendor=request.user
        ).values_list('id', flat=True)

        # Get order items where the shopkeeper product links back to vendor's products
        # Only count DELIVERED or ACCEPTED orders (confirmed revenue)
        from apps.orders.models import OrderItem
        items = OrderItem.objects.filter(
            product__vendor_product_id__in=vendor_product_ids,
            order__status__in=['DELIVERED', 'ACCEPTED', 'PREPARING', 'OUT_FOR_DELIVERY']
        ).select_related('order', 'product__vendor_product')

        total_revenue = sum(item.price * item.quantity for item in items)
        total_units_sold = sum(item.quantity for item in items)
        total_orders = items.values('order').distinct().count()

        # Per-product breakdown
        product_revenue = {}
        for item in items:
            vp_name = item.product.vendor_product.name
            if vp_name not in product_revenue:
                product_revenue[vp_name] = {'revenue': 0, 'units': 0}
            product_revenue[vp_name]['revenue'] += float(item.price * item.quantity)
            product_revenue[vp_name]['units'] += item.quantity

        return Response({
            'total_revenue': float(total_revenue),
            'total_units_sold': total_units_sold,
            'total_orders': total_orders,
            'product_breakdown': product_revenue,
        })


# New bulk order view
class CreateBulkOrderView(generics.GenericAPIView):
    permission_classes = [IsAuthenticated]
    serializer_class = BulkOrderSerializer

    @transaction.atomic
    def post(self, request):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        items_data = serializer.validated_data['items']

        order = Order.objects.create(customer=request.user, bulk=True, status='PENDING_VENDOR_APPROVAL')
        total = 0
        vendor_set = set()

        for i in items_data:
            from apps.products.models import ShopkeeperProduct
            product = ShopkeeperProduct.objects.select_for_update().get(id=i['product_id'])
            if product.stock < i['quantity']:
                raise serializers.ValidationError(f"Insufficient stock for {product.vendor_product.name}")
            OrderItem.objects.create(
                order=order,
                product=product,
                vendor=product.shopkeeper,  # Assuming shopkeeper is the vendor
                quantity=i['quantity'],
                price=product.selling_price
            )
            product.stock -= i['quantity']
            product.save()
            total += product.selling_price * i['quantity']
            vendor_set.add(product.shopkeeper)

        # Create vendor approvals for each unique vendor
        for vendor in vendor_set:
            VendorApproval.objects.create(order=order, vendor=vendor, status='PENDING')

        order.total_price = total
        order.save()

        return Response({
            'order_id': order.id,
            'total_amount': total,
            'item_count': len(items_data),
            'bulk': order.bulk,
            'status': order.status,
        }, status=status.HTTP_201_CREATED)


# Vendor approval views
class VendorOrderListView(generics.ListAPIView):
    serializer_class = OrderSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        if getattr(self, 'swagger_fake_view', False):
            return Order.objects.none()
        user = self.request.user
        if user.role == 'SHOPKEEPER':
            # Get orders where this vendor has items to approve
            return Order.objects.filter(
                vendor_approvals__vendor=user,
                bulk=True
            ).distinct().prefetch_related('items__product__vendor_product', 'vendor_approvals')
        return Order.objects.none()


class VendorApprovalActionView(generics.GenericAPIView):
    permission_classes = [IsAuthenticated]
    serializer_class = VendorApprovalActionSerializer

    def post(self, request, order_id):
        order = get_object_or_404(Order, id=order_id, bulk=True)
        vendor_approval = get_object_or_404(VendorApproval, order=order, vendor=request.user)

        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        vendor_approval.status = serializer.validated_data['status']
        vendor_approval.notes = serializer.validated_data.get('notes', '')
        vendor_approval.save()

        # Check if all vendors have responded
        all_approvals = order.vendor_approvals.all()
        if all(approval.status != 'PENDING' for approval in all_approvals):
            # All vendors have responded
            if all(approval.status == 'APPROVED' for approval in all_approvals):
                order.status = 'VENDOR_APPROVED'
            else:
                order.status = 'VENDOR_REJECTED'
            order.save()

        return Response({
            'message': f'Order {vendor_approval.status.lower()}',
            'order_status': order.status,
        })
