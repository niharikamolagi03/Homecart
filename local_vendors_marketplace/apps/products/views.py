from rest_framework import viewsets, generics, permissions, filters, status
from rest_framework.response import Response
from rest_framework.views import APIView
from django.shortcuts import get_object_or_404
from django.db.models import Avg, Count, Q
from django_filters.rest_framework import DjangoFilterBackend
from .models import Category, VendorProduct, ShopkeeperProduct, ProductUsage, Review
from .serializers import (
    CategorySerializer, VendorProductSerializer, VendorProductCreateSerializer,
    ShopkeeperProductSerializer, AddToShopSerializer, ReviewListSerializer, 
    ReviewCreateSerializer, ReviewDetailSerializer
)


class CategoryViewSet(viewsets.ModelViewSet):
    queryset = Category.objects.all()
    serializer_class = CategorySerializer

    def get_permissions(self):
        if self.action in ['create', 'update', 'partial_update', 'destroy']:
            return [permissions.IsAuthenticated()]
        return [permissions.AllowAny()]


# ── VENDOR PRODUCT VIEWS ──────────────────────────────────────────────────────

class VendorProductListView(generics.ListAPIView):
    """All vendor products — shopkeepers browse these."""
    serializer_class = VendorProductSerializer
    permission_classes = [permissions.IsAuthenticated]
    filter_backends = [filters.SearchFilter, DjangoFilterBackend]
    filterset_fields = ['category']
    search_fields = ['name', 'description']

    def get_queryset(self):
        if getattr(self, 'swagger_fake_view', False):
            return VendorProduct.objects.none()
        return VendorProduct.objects.select_related('vendor', 'category').all()

    def get_serializer_context(self):
        return {**super().get_serializer_context(), 'request': self.request}


class MyVendorProductsView(generics.ListAPIView):
    """Vendor sees only their own products."""
    serializer_class = VendorProductSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        if getattr(self, 'swagger_fake_view', False):
            return VendorProduct.objects.none()
        return VendorProduct.objects.filter(
            vendor=self.request.user
        ).select_related('category').prefetch_related('usages')

    def get_serializer_context(self):
        return {**super().get_serializer_context(), 'request': self.request}


class VendorProductCreateView(generics.CreateAPIView):
    serializer_class = VendorProductCreateSerializer
    permission_classes = [permissions.IsAuthenticated]

    def perform_create(self, serializer):
        serializer.save(vendor=self.request.user)

    def create(self, request, *args, **kwargs):
        print(f"[VendorProduct] Creating product for user: {request.user.email}")
        response = super().create(request, *args, **kwargs)
        # Return full data with image_url
        try:
            product = VendorProduct.objects.get(id=response.data['id'])
            full_data = VendorProductSerializer(product, context={'request': request}).data
            print(f"[VendorProduct] Created: {full_data['name']}, image_url: {full_data['image_url']}")
            return Response(full_data, status=status.HTTP_201_CREATED)
        except Exception as e:
            print(f"[VendorProduct] Error fetching created product: {e}")
            return response


class VendorProductDetailView(generics.RetrieveUpdateDestroyAPIView):
    permission_classes = [permissions.IsAuthenticated]

    def get_serializer_class(self):
        if self.request.method in ('PUT', 'PATCH'):
            return VendorProductCreateSerializer
        return VendorProductSerializer

    def get_queryset(self):
        return VendorProduct.objects.filter(vendor=self.request.user)

    def get_serializer_context(self):
        return {**super().get_serializer_context(), 'request': self.request}


# ── SHOPKEEPER PRODUCT VIEWS ──────────────────────────────────────────────────

class ShopkeeperProductListView(generics.ListAPIView):
    """Public — customers browse shopkeeper products."""
    serializer_class = ShopkeeperProductSerializer
    permission_classes = [permissions.AllowAny]
    filter_backends = [filters.SearchFilter]
    search_fields = ['name']

    def get_queryset(self):
        if getattr(self, 'swagger_fake_view', False):
            return ShopkeeperProduct.objects.none()
        qs = ShopkeeperProduct.objects.filter(
            is_active=True, stock__gt=0
        ).select_related('shopkeeper', 'vendor_product__vendor', 'vendor_product__category')
        print(f"[ShopkeeperProducts] Returning {qs.count()} products to customer")
        return qs

    def get_serializer_context(self):
        return {**super().get_serializer_context(), 'request': self.request}


class MyShopkeeperProductsView(generics.ListAPIView):
    """Shopkeeper sees their own listings."""
    serializer_class = ShopkeeperProductSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        if getattr(self, 'swagger_fake_view', False):
            return ShopkeeperProduct.objects.none()
        return ShopkeeperProduct.objects.filter(
            shopkeeper=self.request.user
        ).select_related('vendor_product__vendor', 'vendor_product__category')

    def get_serializer_context(self):
        return {**super().get_serializer_context(), 'request': self.request}


class AddToShopView(APIView):
    """Shopkeeper adds a vendor product to their shop."""
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request):
        print(f"[AddToShop] Request data: {request.data}")
        print(f"[AddToShop] User: {request.user.email} (role: {request.user.role})")

        serializer = AddToShopSerializer(data=request.data)
        if not serializer.is_valid():
            print(f"[AddToShop] Validation errors: {serializer.errors}")
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

        vp_id = serializer.validated_data['vendor_product_id']
        selling_price = serializer.validated_data['selling_price']
        stock = serializer.validated_data['stock']

        try:
            vp = VendorProduct.objects.get(id=vp_id)
        except VendorProduct.DoesNotExist:
            print(f"[AddToShop] VendorProduct {vp_id} not found")
            return Response({'error': f'Vendor product {vp_id} not found'}, status=status.HTTP_404_NOT_FOUND)

        if float(selling_price) <= float(vp.base_price):
            return Response(
                {'error': f'Selling price ₹{selling_price} must be higher than wholesale price ₹{vp.base_price}'},
                status=status.HTTP_400_BAD_REQUEST
            )

        # Create or update ShopkeeperProduct — copy name and image from vendor product
        sp, created = ShopkeeperProduct.objects.update_or_create(
            shopkeeper=request.user,
            vendor_product=vp,
            defaults={
                'name': vp.name,
                'image': vp.image,
                'selling_price': selling_price,
                'stock': stock,
                'is_active': True,
            }
        )

        # Track product usage for vendor notification
        ProductUsage.objects.get_or_create(vendor_product=vp, shopkeeper=request.user)

        action = 'created' if created else 'updated'
        print(f"[AddToShop] ShopkeeperProduct {action}: id={sp.id}, name={sp.name}, price={sp.selling_price}")

        return Response(
            ShopkeeperProductSerializer(sp, context={'request': request}).data,
            status=status.HTTP_201_CREATED if created else status.HTTP_200_OK
        )


class ShopkeeperProductDetailView(generics.RetrieveUpdateDestroyAPIView):
    permission_classes = [permissions.IsAuthenticated]
    serializer_class = ShopkeeperProductSerializer

    def get_queryset(self):
        return ShopkeeperProduct.objects.filter(shopkeeper=self.request.user)

    def get_serializer_context(self):
        return {**super().get_serializer_context(), 'request': self.request}


# ── PURCHASE REQUEST VIEWS ────────────────────────────────────────────────────

from .models import Notification, PurchaseRequest, ShopkeeperBilling
from .serializers import PurchaseRequestSerializer, NotificationSerializer, ShopkeeperBillingSerializer


class CreatePurchaseRequestView(APIView):
    """Shopkeeper sends a purchase request to vendor."""
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request):
        product_id = request.data.get('product_id')
        quantity = request.data.get('quantity', 1)

        vp = get_object_or_404(VendorProduct, id=product_id)

        # Prevent duplicate pending requests
        if PurchaseRequest.objects.filter(
            shopkeeper=request.user, product=vp, status='pending'
        ).exists():
            return Response({'error': 'You already have a pending request for this product.'}, status=400)

        pr = PurchaseRequest.objects.create(
            shopkeeper=request.user,
            vendor=vp.vendor,
            product=vp,
            quantity=quantity,
        )

        # Notify vendor
        Notification.objects.create(
            user=vp.vendor,
            message=f"New purchase request from {request.user.name} for '{vp.name}' (qty: {quantity})"
        )

        return Response(PurchaseRequestSerializer(pr).data, status=201)


class VendorPurchaseRequestsView(generics.ListAPIView):
    """Vendor sees all pending requests for their products."""
    serializer_class = PurchaseRequestSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        if getattr(self, 'swagger_fake_view', False):
            return PurchaseRequest.objects.none()
        return PurchaseRequest.objects.filter(
            vendor=self.request.user
        ).select_related('shopkeeper', 'product__category')


class ApprovePurchaseRequestView(APIView):
    """Vendor approves a purchase request → creates ShopkeeperProduct + billing
    and deducts stock from VendorProduct immediately."""
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request, pk):
        from django.utils import timezone
        from datetime import timedelta

        pr = get_object_or_404(PurchaseRequest, id=pk, vendor=request.user)

        if pr.status != 'pending':
            return Response({'error': f'Request is already {pr.status}.'}, status=400)

        # BUG 3 FIX: check sufficient stock before approving
        if pr.product.stock < pr.quantity:
            return Response(
                {'error': f'Insufficient stock. Available: {pr.product.stock}, Requested: {pr.quantity}.'},
                status=400
            )

        pr.status = 'approved'
        pr.save()

        # BUG 3 FIX: deduct stock from vendor product immediately on approval
        pr.product.stock -= pr.quantity
        pr.product.save(update_fields=['stock'])

        # Create ShopkeeperProduct — inactive until shopkeeper sets price + stock
        sp, _ = ShopkeeperProduct.objects.get_or_create(
            shopkeeper=pr.shopkeeper,
            vendor_product=pr.product,
            defaults={
                'name': pr.product.name,
                'image': pr.product.image,
                'selling_price': 0,
                'stock': 0,
                'is_active': False,
            }
        )

        # Track usage
        ProductUsage.objects.get_or_create(vendor_product=pr.product, shopkeeper=pr.shopkeeper)

        # BUG 2 FIX: due_date = approval time + 7 days (consistent everywhere)
        total_amount = pr.product.base_price * pr.quantity
        due_date = timezone.now() + timedelta(days=7)
        ShopkeeperBilling.objects.get_or_create(
            purchase_request=pr,
            defaults={
                'shopkeeper': pr.shopkeeper,
                'vendor': pr.vendor,
                'product_name': pr.product.name,
                'quantity': pr.quantity,
                'cost_price': pr.product.base_price,
                'total_amount': total_amount,
                'amount_paid': 0,
                'remaining_amount': total_amount,
                'due_date': due_date,
            }
        )

        # Notify shopkeeper
        Notification.objects.create(
            user=pr.shopkeeper,
            message=f"✅ Your request for '{pr.product.name}' was approved! Set your selling price to activate it."
        )

        return Response({
            'message': 'Request approved.',
            'shopkeeper_product_id': sp.id,
            'stock_remaining': pr.product.stock,
        })


class RejectPurchaseRequestView(APIView):
    """Vendor rejects a purchase request."""
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request, pk):
        pr = get_object_or_404(PurchaseRequest, id=pk, vendor=request.user)

        if pr.status != 'pending':
            return Response({'error': f'Request is already {pr.status}.'}, status=400)

        pr.status = 'rejected'
        pr.save()

        # Notify shopkeeper
        Notification.objects.create(
            user=pr.shopkeeper,
            message=f"Your request for '{pr.product.name}' was rejected by the vendor."
        )

        return Response({'message': 'Request rejected.'})


class SetSellingPriceView(APIView):
    """
    Shopkeeper activates a product by setting selling_price + stock_quantity.

    Trigger logic (runs exactly ONCE per inventory batch):
    ─────────────────────────────────────────────────────
    1. Activate ShopkeeperProduct (selling_price, stock, is_active=True)
    2. Lock cost_price snapshot from vendor's base_price at this moment
    3. If bill_generated is False:
       a. Calculate total_amount = locked_cost_price × stock_quantity
       b. Create or update ShopkeeperBilling with status=PENDING, due_date=now+30d
       c. Set bill_generated = True  ← idempotency guard
    4. If bill_generated is True (shopkeeper edits price again):
       - Only update selling_price / stock on ShopkeeperProduct
       - Do NOT touch billing at all
    """
    permission_classes = [permissions.IsAuthenticated]

    BILL_DUE_DAYS = 7  # 7 days — consistent with ApprovePurchaseRequestView

    def patch(self, request, pk):
        from django.utils import timezone
        from datetime import timedelta
        from decimal import Decimal

        sp = get_object_or_404(ShopkeeperProduct, id=pk, shopkeeper=request.user)
        selling_price = request.data.get('selling_price')
        stock_quantity = request.data.get('stock_quantity') or request.data.get('stock')

        # ── Validation ────────────────────────────────────────────────────────
        if not selling_price:
            return Response({'error': 'selling_price is required.'}, status=400)
        if not stock_quantity or int(stock_quantity) < 1:
            return Response({'error': 'stock_quantity must be at least 1.'}, status=400)

        cost_price = sp.vendor_product.base_price  # live price for validation
        if float(selling_price) <= float(cost_price):
            return Response(
                {'error': f'Selling price must be higher than wholesale price ₹{cost_price}.'},
                status=400
            )

        qty = int(stock_quantity)

        # ── Step 1 & 2: Activate product, lock cost_price snapshot ───────────
        first_activation = not sp.bill_generated
        if first_activation:
            # Lock the base_price at this exact moment — static forever
            sp.locked_cost_price = cost_price

        sp.selling_price = selling_price
        sp.stock = qty
        sp.is_active = True

        # ── Step 3: Generate bill exactly once ────────────────────────────────
        if first_activation:
            locked_price = sp.locked_cost_price
            total_amount = Decimal(str(locked_price)) * qty
            due_date = timezone.now() + timedelta(days=self.BILL_DUE_DAYS)

            # Find the approved PurchaseRequest for this shopkeeper + product
            pr = PurchaseRequest.objects.filter(
                shopkeeper=request.user,
                product=sp.vendor_product,
                status='approved',
            ).first()

            if pr:
                # get_or_create ensures no duplicate even on race conditions
                bill, created = ShopkeeperBilling.objects.get_or_create(
                    purchase_request=pr,
                    defaults={
                        'shopkeeper': request.user,
                        'vendor': sp.vendor_product.vendor,
                        'product_name': sp.vendor_product.name,
                        'quantity': qty,
                        'cost_price': locked_price,   # hard-coded snapshot
                        'total_amount': total_amount,
                        'amount_paid': Decimal('0'),
                        'remaining_amount': total_amount,
                        'status': ShopkeeperBilling.Status.PENDING,
                        'due_date': due_date,
                    }
                )
                if not created:
                    # Bill already existed (approval created a placeholder) — update with real qty
                    bill.quantity = qty
                    bill.cost_price = locked_price
                    bill.total_amount = total_amount
                    bill.remaining_amount = total_amount - bill.amount_paid
                    bill.status = ShopkeeperBilling.Status.PENDING
                    bill.due_date = due_date
                    bill.save()
            else:
                # No purchase request (direct add path) — create standalone bill
                ShopkeeperBilling.objects.create(
                    shopkeeper=request.user,
                    vendor=sp.vendor_product.vendor,
                    purchase_request=None,  # handled below
                    product_name=sp.vendor_product.name,
                    quantity=qty,
                    cost_price=locked_price,
                    total_amount=total_amount,
                    amount_paid=Decimal('0'),
                    remaining_amount=total_amount,
                    status=ShopkeeperBilling.Status.PENDING,
                    due_date=due_date,
                )

            # Mark flag — bill will NOT be regenerated on future price edits
            sp.bill_generated = True

            # Notify vendor
            Notification.objects.create(
                user=sp.vendor_product.vendor,
                message=(
                    f"🧾 {request.user.name} activated '{sp.vendor_product.name}' "
                    f"(qty: {qty}, bill: ₹{total_amount}). Due in {self.BILL_DUE_DAYS} days."
                )
            )

        sp.save()
        return Response(ShopkeeperProductSerializer(sp, context={'request': request}).data)


class ShopkeeperPurchaseRequestsView(generics.ListAPIView):
    """Shopkeeper sees their own requests."""
    serializer_class = PurchaseRequestSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        if getattr(self, 'swagger_fake_view', False):
            return PurchaseRequest.objects.none()
        return PurchaseRequest.objects.filter(
            shopkeeper=self.request.user
        ).select_related('product__category', 'vendor')


class PendingSetupProductsView(generics.ListAPIView):
    """Shopkeeper sees approved products that still need price + stock setup."""
    serializer_class = ShopkeeperProductSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        if getattr(self, 'swagger_fake_view', False):
            return ShopkeeperProduct.objects.none()
        return ShopkeeperProduct.objects.filter(
            shopkeeper=self.request.user,
            is_active=False,
            selling_price=0,
        ).select_related('vendor_product__vendor', 'vendor_product__category')

    def get_serializer_context(self):
        return {**super().get_serializer_context(), 'request': self.request}


# ── NOTIFICATION VIEWS ────────────────────────────────────────────────────────

class NotificationListView(generics.ListAPIView):
    """Get all notifications for the current user."""
    serializer_class = NotificationSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        if getattr(self, 'swagger_fake_view', False):
            return Notification.objects.none()
        return Notification.objects.filter(user=self.request.user)


class MarkNotificationsReadView(APIView):
    """Mark all notifications as read."""
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request):
        Notification.objects.filter(user=request.user, is_read=False).update(is_read=True)
        return Response({'message': 'All notifications marked as read.'})


# ── BILLING VIEWS ─────────────────────────────────────────────────────────────

def _auto_mark_overdue(qs):
    """Bulk-mark overdue bills before returning queryset."""
    from django.utils import timezone
    qs.filter(
        status__in=['pending', 'partially_paid'],
        due_date__lt=timezone.now()
    ).update(status='overdue')


class ShopkeeperBillingListView(generics.ListAPIView):
    """Shopkeeper sees their billing records (unpaid first)."""
    serializer_class = ShopkeeperBillingSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        if getattr(self, 'swagger_fake_view', False):
            return ShopkeeperBilling.objects.none()
        qs = ShopkeeperBilling.objects.filter(shopkeeper=self.request.user)
        _auto_mark_overdue(qs)
        return qs.select_related('vendor', 'shopkeeper').order_by('status', 'due_date')


class MakePaymentView(APIView):
    """Shopkeeper makes a full or partial payment on a bill."""
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request, pk):
        from decimal import Decimal, InvalidOperation
        bill = get_object_or_404(ShopkeeperBilling, id=pk, shopkeeper=request.user)

        if bill.status == 'paid':
            return Response({'error': 'This bill is already fully paid.'}, status=400)

        payment_str = request.data.get('amount')
        if not payment_str:
            return Response({'error': 'amount is required.'}, status=400)

        try:
            payment = Decimal(str(payment_str))
        except InvalidOperation:
            return Response({'error': 'Invalid amount.'}, status=400)

        if payment <= 0:
            return Response({'error': 'Amount must be greater than 0.'}, status=400)
        if payment > bill.remaining_amount:
            return Response({'error': f'Amount exceeds remaining balance ₹{bill.remaining_amount}.'}, status=400)

        bill.apply_payment(payment)

        action = 'fully paid' if bill.status == 'paid' else f'partial payment of ₹{payment}'
        Notification.objects.create(
            user=bill.vendor,
            message=f"💰 {request.user.name} made a {action} for '{bill.product_name}'. Remaining: ₹{bill.remaining_amount}"
        )
        return Response(ShopkeeperBillingSerializer(bill).data)


class VendorBillingView(generics.ListAPIView):
    """Vendor sees all billing records for their products (pending payments)."""
    serializer_class = ShopkeeperBillingSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        if getattr(self, 'swagger_fake_view', False):
            return ShopkeeperBilling.objects.none()
        qs = ShopkeeperBilling.objects.filter(vendor=self.request.user)
        _auto_mark_overdue(qs)
        return qs.select_related('vendor', 'shopkeeper').order_by('status', 'due_date')


class VendorRevenueSummaryView(APIView):
    """Vendor revenue split: earned (paid) vs pending (unpaid/partial)."""
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        from decimal import Decimal
        bills = ShopkeeperBilling.objects.filter(vendor=request.user)
        _auto_mark_overdue(bills)

        earned = sum(b.amount_paid for b in bills)
        pending = sum(b.remaining_amount for b in bills.exclude(status='paid'))
        overdue = sum(b.remaining_amount for b in bills.filter(status='overdue'))

        return Response({
            'earned_revenue': float(earned),
            'pending_revenue': float(pending),
            'overdue_revenue': float(overdue),
            'total_billed': float(sum(b.total_amount for b in bills)),
        })


class VendorStockView(APIView):
    """BUG 3 FIX: Real-time stock levels for all vendor products.
    Frontend polls this every 10s to keep stock counts live."""
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        products = VendorProduct.objects.filter(
            vendor=request.user
        ).values('id', 'name', 'stock')
        return Response(list(products))


# ── REVIEW VIEWS ──────────────────────────────────────────────────────────────

class ProductReviewsView(generics.ListCreateAPIView):
    """
    List all reviews for a product (public - no auth required).
    Create a new review (authenticated customers who received the product).
    """
    permission_classes = [permissions.AllowAny]
    filter_backends = [DjangoFilterBackend, filters.OrderingFilter]
    filterset_fields = ['shopkeeper_product']
    ordering = ['-created_at']

    def get_queryset(self):
        """Return all reviews for public viewing."""
        if getattr(self, 'swagger_fake_view', False):
            return Review.objects.none()
        return Review.objects.select_related(
            'customer', 'shopkeeper_product', 'order'
        ).all()

    def get_serializer_class(self):
        """Use different serializers for list vs create."""
        if self.request.method == 'POST':
            return ReviewCreateSerializer
        return ReviewListSerializer

    def get_permissions(self):
        """Allow creation only for authenticated users."""
        if self.request.method == 'POST':
            return [permissions.IsAuthenticated()]
        return [permissions.AllowAny()]

    def perform_create(self, serializer):
        """Create the review."""
        serializer.save()

    def create(self, request, *args, **kwargs):
        """Override to provide more helpful error messages."""
        return super().create(request, *args, **kwargs)


class ProductReviewDetailView(generics.RetrieveUpdateDestroyAPIView):
    """
    View, update, or delete an individual review.
    Only the review author can update or delete their review.
    """
    queryset = Review.objects.select_related('customer', 'shopkeeper_product', 'order')
    serializer_class = ReviewDetailSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        """Restrict to reviews by the current user (for edit/delete)."""
        if self.request.method == 'GET':
            # Allow viewing any review
            return Review.objects.select_related('customer', 'shopkeeper_product', 'order')
        # Only allow users to edit/delete their own reviews
        return Review.objects.filter(customer=self.request.user)

    def perform_update(self, serializer):
        """Ensure only the author can update."""
        if serializer.instance.customer != self.request.user:
            raise permissions.PermissionDenied("You can only edit your own reviews.")
        serializer.save()

    def perform_destroy(self, instance):
        """Ensure only the author can delete."""
        if instance.customer != self.request.user:
            raise permissions.PermissionDenied("You can only delete your own reviews.")
        instance.delete()


class CustomerReviewsView(generics.ListAPIView):
    """List all reviews submitted by the authenticated customer."""
    serializer_class = ReviewListSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        """Return only reviews by the current customer."""
        if getattr(self, 'swagger_fake_view', False):
            return Review.objects.none()
        return Review.objects.filter(
            customer=self.request.user
        ).select_related('shopkeeper_product', 'order').order_by('-created_at')


class ProductReviewStatsView(APIView):
    """Get review statistics for a product (average rating, total reviews, etc)."""
    permission_classes = [permissions.AllowAny]

    def get(self, request, shopkeeper_product_id):
        """Return review statistics for a product."""
        stats = Review.objects.filter(
            shopkeeper_product_id=shopkeeper_product_id
        ).aggregate(
            average_rating=Avg('rating'),
            total_reviews=Count('id'),
            five_star=Count('id', filter=Q(rating=5)),
            four_star=Count('id', filter=Q(rating=4)),
            three_star=Count('id', filter=Q(rating=3)),
            two_star=Count('id', filter=Q(rating=2)),
            one_star=Count('id', filter=Q(rating=1)),
            verified_reviews=Count('id', filter=Q(verified_purchase=True)),
        )
        
        return Response({
            'shopkeeper_product_id': shopkeeper_product_id,
            'average_rating': stats['average_rating'],
            'total_reviews': stats['total_reviews'],
            'verified_reviews': stats['verified_reviews'],
            'rating_distribution': {
                '5': stats['five_star'],
                '4': stats['four_star'],
                '3': stats['three_star'],
                '2': stats['two_star'],
                '1': stats['one_star'],
            }
        })
