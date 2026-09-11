from rest_framework import generics, status
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from rest_framework.views import APIView
from django.db import transaction
from django.db.models import Count, Q
from django.shortcuts import get_object_or_404
from .models import Order, OrderItem, VendorApproval, CustomerBulkRequest
from .serializers import (
    OrderSerializer, PlaceOrderSerializer, UpdateOrderStatusSerializer,
    BulkOrderSerializer, VendorApprovalSerializer, VendorApprovalActionSerializer,
    CustomerBulkRequestSerializer,
)
from apps.cart.models import Cart
from apps.users.models import User
from apps.products.models import Notification
from apps.delivery.models import DeliveryAssignment


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
            payment_label = 'Cash on Delivery' if serializer.validated_data.get('payment_method', 'CASH') == 'CASH' else 'UPI'
            order = Order.objects.create(
                customer=request.user,
                shopkeeper=shopkeeper,
                total_price=total,
                delivery_address=serializer.validated_data['delivery_address'],
                latitude=serializer.validated_data.get('latitude'),
                longitude=serializer.validated_data.get('longitude'),
                payment_method=serializer.validated_data.get('payment_method', 'CASH'),
            )
            for item in items:
                OrderItem.objects.create(
                    order=order, product=item.product,
                    vendor=item.product.vendor_product.vendor,
                    quantity=item.quantity, price=item.product.selling_price
                )
                item.product.stock = max(0, item.product.stock - item.quantity)
                if item.product.stock == 0:
                    item.product.is_active = False
                item.product.save()

            # Auto-assign an available delivery agent
            # Assign fairly instead of always selecting the first delivery account.
            delivery_agent = User.objects.filter(
                role='DELIVERY', is_approved=True, is_active=True
            ).annotate(
                active_delivery_count=Count(
                    'assigned_orders',
                    filter=Q(assigned_orders__status__in=[
                        'PENDING', 'ACCEPTED', 'PREPARING', 'OUT_FOR_DELIVERY'
                    ])
                )
            ).order_by('active_delivery_count', 'id').first()
            if delivery_agent:
                order.assigned_delivery = delivery_agent
                order.save()

                # Keep the assignment model in sync with the order so that
                # live location updates can be resolved for the customer.
                DeliveryAssignment.objects.get_or_create(
                    order=order, defaults={'delivery_partner': delivery_agent}
                )

                # Notify delivery agent of the new assignment
                Notification.objects.create(
                    user=delivery_agent,
                    message=(
                        f"🚚 New delivery assigned: Order #{order.id} from {request.user.name}. "
                        f"Address: {order.delivery_address}. "
                        f"Total: ₹{order.total_price} | {payment_label}."
                    )
                )

            # Notify shopkeeper of new order
            Notification.objects.create(
                user=shopkeeper,
                message=(
                    f"🛒 New order #{order.id} from {request.user.name}. "
                    f"Total: ₹{order.total_price} | Payment: {payment_label}"
                )
            )

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
        user = request.user
        new_status = request.data.get('status', '')

        # Role-based ownership check — only the relevant party can update
        if user.role == 'DELIVERY':
            if order.assigned_delivery != user:
                return Response(
                    {'error': 'You are not assigned to this order.'},
                    status=status.HTTP_403_FORBIDDEN
                )
        elif user.role == 'SHOPKEEPER':
            if order.shopkeeper != user:
                return Response(
                    {'error': 'This order does not belong to your shop.'},
                    status=status.HTTP_403_FORBIDDEN
                )
        elif user.role == 'CUSTOMER':
            # Customers use the cancel endpoint, not this one
            return Response(
                {'error': 'Customers cannot update order status directly.'},
                status=status.HTTP_403_FORBIDDEN
            )
        elif user.role not in ('ADMIN',):
            return Response(
                {'error': 'You do not have permission to update order status.'},
                status=status.HTTP_403_FORBIDDEN
            )

        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        order.status = serializer.validated_data['status']
        order.save()
        if user.role == 'DELIVERY':
            Notification.objects.create(
                user=order.customer,
                message=f"🚚 Order #{order.id} is now {order.get_status_display()}."
            )
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


# ── Customer Bulk Request Views ───────────────────────────────────────────────

class CustomerBulkRequestCreateView(generics.GenericAPIView):
    """Customer submits a bulk order request directly to a vendor."""
    permission_classes = [IsAuthenticated]
    serializer_class = CustomerBulkRequestSerializer

    def post(self, request):
        vendor_id = request.data.get('vendor_id')
        product_name = request.data.get('product_name', '').strip()
        quantity = request.data.get('quantity')
        notes = request.data.get('notes', '').strip()

        if not vendor_id:
            return Response({'error': 'vendor_id is required.'}, status=status.HTTP_400_BAD_REQUEST)
        if not product_name:
            return Response({'error': 'product_name is required.'}, status=status.HTTP_400_BAD_REQUEST)
        try:
            quantity = int(quantity)
            if quantity < 1:
                raise ValueError
        except (TypeError, ValueError):
            return Response({'error': 'quantity must be a positive integer.'}, status=status.HTTP_400_BAD_REQUEST)

        vendor = get_object_or_404(User, id=vendor_id, role='VENDOR')

        bulk_req = CustomerBulkRequest.objects.create(
            customer=request.user,
            vendor=vendor,
            product_name=product_name,
            quantity=quantity,
            notes=notes,
        )

        # Notify vendor
        from apps.products.models import Notification
        Notification.objects.create(
            user=vendor,
            message=(
                f"📦 Bulk request from {request.user.name}: "
                f"'{product_name}' × {quantity}. "
                f"{('Notes: ' + notes) if notes else ''}"
            )
        )

        return Response(CustomerBulkRequestSerializer(bulk_req).data, status=status.HTTP_201_CREATED)


class CustomerBulkRequestListView(generics.ListAPIView):
    """Customer sees their own bulk requests."""
    serializer_class = CustomerBulkRequestSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        return CustomerBulkRequest.objects.filter(customer=self.request.user)


class VendorBulkRequestListView(generics.ListAPIView):
    """Vendor sees bulk requests addressed to them."""
    serializer_class = CustomerBulkRequestSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        return CustomerBulkRequest.objects.filter(vendor=self.request.user)


class VendorBulkRequestRespondView(APIView):
    """Vendor accepts or rejects a customer bulk request."""
    permission_classes = [IsAuthenticated]

    def patch(self, request, pk):
        bulk_req = get_object_or_404(CustomerBulkRequest, id=pk, vendor=request.user)
        new_status = request.data.get('status')
        vendor_response = request.data.get('vendor_response', '').strip()

        if new_status not in ('ACCEPTED', 'REJECTED'):
            return Response({'error': "status must be 'ACCEPTED' or 'REJECTED'."}, status=status.HTTP_400_BAD_REQUEST)

        bulk_req.status = new_status
        bulk_req.vendor_response = vendor_response
        bulk_req.save()

        # Notify customer
        from apps.products.models import Notification
        action = '✅ accepted' if new_status == 'ACCEPTED' else '❌ rejected'
        Notification.objects.create(
            user=bulk_req.customer,
            message=(
                f"Your bulk request for '{bulk_req.product_name}' (×{bulk_req.quantity}) "
                f"was {action} by {request.user.name}."
                f"{(' Response: ' + vendor_response) if vendor_response else ''}"
            )
        )

        return Response(CustomerBulkRequestSerializer(bulk_req).data)
