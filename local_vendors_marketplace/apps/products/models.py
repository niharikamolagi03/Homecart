from django.db import models
from apps.users.models import User


class Category(models.Model):
    name = models.CharField(max_length=100, unique=True)
    description = models.TextField(blank=True)

    def __str__(self):
        return self.name

    class Meta:
        verbose_name_plural = 'Categories'


class VendorProduct(models.Model):
    """Products added by Vendors in bulk (wholesale)."""
    vendor = models.ForeignKey(User, on_delete=models.CASCADE, related_name='vendor_products')
    name = models.CharField(max_length=255)
    description = models.TextField()
    base_price = models.DecimalField(max_digits=10, decimal_places=2, help_text='Wholesale price')
    stock = models.PositiveIntegerField(default=0)
    category = models.ForeignKey(Category, on_delete=models.SET_NULL, null=True, blank=True, related_name='vendor_products')
    image = models.ImageField(upload_to='vendor_products/', null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f"{self.name} (by {self.vendor.name})"

    class Meta:
        ordering = ['-created_at']


class ShopkeeperProduct(models.Model):
    """Products resold by Shopkeepers at their own price."""
    shopkeeper = models.ForeignKey(User, on_delete=models.CASCADE, related_name='shopkeeper_products')
    vendor_product = models.ForeignKey(VendorProduct, on_delete=models.CASCADE, related_name='shopkeeper_listings')
    name = models.CharField(max_length=255)
    image = models.ImageField(upload_to='vendor_products/', null=True, blank=True)
    selling_price = models.DecimalField(max_digits=10, decimal_places=2)
    # Snapshot of vendor's base_price at the moment of first activation — static forever
    locked_cost_price = models.DecimalField(max_digits=10, decimal_places=2, null=True, blank=True)
    stock = models.PositiveIntegerField(default=0)
    is_active = models.BooleanField(default=True)
    # Idempotency guard — bill is generated exactly once per inventory batch
    bill_generated = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"{self.name} @ {self.shopkeeper.name}"

    class Meta:
        unique_together = ('shopkeeper', 'vendor_product')
        ordering = ['-created_at']


class ProductUsage(models.Model):
    """Tracks which shopkeepers are using which vendor products."""
    vendor_product = models.ForeignKey(VendorProduct, on_delete=models.CASCADE, related_name='usages')
    shopkeeper = models.ForeignKey(User, on_delete=models.CASCADE, related_name='product_usages')
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        unique_together = ('vendor_product', 'shopkeeper')

    def __str__(self):
        return f"{self.shopkeeper.name} uses {self.vendor_product.name}"


class Notification(models.Model):
    """Real notifications for vendors and shopkeepers."""
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='notifications')
    message = models.TextField()
    is_read = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-created_at']

    def __str__(self):
        return f"Notification for {self.user.name}: {self.message[:50]}"


class PurchaseRequest(models.Model):
    """Shopkeeper requests to stock a vendor product."""
    class Status(models.TextChoices):
        PENDING = 'pending', 'Pending'
        APPROVED = 'approved', 'Approved'
        REJECTED = 'rejected', 'Rejected'

    shopkeeper = models.ForeignKey(User, on_delete=models.CASCADE, related_name='purchase_requests')
    vendor = models.ForeignKey(User, on_delete=models.CASCADE, related_name='received_requests')
    product = models.ForeignKey(VendorProduct, on_delete=models.CASCADE, related_name='purchase_requests')
    quantity = models.PositiveIntegerField(default=1)
    status = models.CharField(max_length=20, choices=Status.choices, default=Status.PENDING)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        unique_together = ('shopkeeper', 'product')
        ordering = ['-created_at']

    def __str__(self):
        return f"{self.shopkeeper.name} → {self.product.name} ({self.status})"


class ShopkeeperBilling(models.Model):
    """Billing record created when vendor approves a purchase request."""
    class Status(models.TextChoices):
        PENDING = 'pending', 'Pending'
        PARTIALLY_PAID = 'partially_paid', 'Partially Paid'
        PAID = 'paid', 'Paid'
        OVERDUE = 'overdue', 'Overdue'

    shopkeeper = models.ForeignKey(User, on_delete=models.CASCADE, related_name='billings')
    vendor = models.ForeignKey(User, on_delete=models.CASCADE, related_name='vendor_billings')
    purchase_request = models.OneToOneField(
        PurchaseRequest, on_delete=models.CASCADE,
        related_name='billing', null=True, blank=True
    )
    product_name = models.CharField(max_length=255)
    quantity = models.PositiveIntegerField()
    cost_price = models.DecimalField(max_digits=10, decimal_places=2)
    total_amount = models.DecimalField(max_digits=12, decimal_places=2)
    amount_paid = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    remaining_amount = models.DecimalField(max_digits=12, decimal_places=2)
    status = models.CharField(max_length=20, choices=Status.choices, default=Status.PENDING)
    due_date = models.DateTimeField()
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-created_at']

    def __str__(self):
        return f"Bill #{self.id} — {self.shopkeeper.name} owes ₹{self.remaining_amount}"

    def apply_payment(self, amount):
        """Apply a payment amount and update status."""
        from decimal import Decimal
        amount = Decimal(str(amount))
        self.amount_paid = min(self.total_amount, self.amount_paid + amount)
        self.remaining_amount = max(Decimal('0'), self.total_amount - self.amount_paid)
        if self.remaining_amount == 0:
            self.status = self.Status.PAID
        else:
            self.status = self.Status.PARTIALLY_PAID
        self.save()

    def refresh_overdue(self):
        """Mark as overdue if due date passed and not fully paid."""
        from django.utils import timezone
        if self.status in (self.Status.PENDING, self.Status.PARTIALLY_PAID) and timezone.now() > self.due_date:
            self.status = self.Status.OVERDUE
            self.save(update_fields=['status'])


class Review(models.Model):
    """Product reviews from verified buyers."""
    
    RATING_CHOICES = [(i, str(i)) for i in range(1, 6)]  # 1-5 stars
    
    customer = models.ForeignKey(User, on_delete=models.CASCADE, related_name='reviews')
    shopkeeper_product = models.ForeignKey(ShopkeeperProduct, on_delete=models.CASCADE, related_name='reviews')
    order = models.ForeignKey('orders.Order', on_delete=models.CASCADE, related_name='reviews')
    rating = models.IntegerField(choices=RATING_CHOICES, help_text='Rating from 1 to 5 stars')
    comment = models.TextField(blank=True, help_text='Review text (optional)')
    verified_purchase = models.BooleanField(default=True, help_text='Marked as verified if order is delivered')
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        # Ensure one review per customer per product (per order)
        unique_together = ('customer', 'shopkeeper_product', 'order')
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['shopkeeper_product', '-created_at']),
            models.Index(fields=['customer', 'shopkeeper_product']),
        ]
    
    def __str__(self):
        return f"Review by {self.customer.name} for {self.shopkeeper_product.name} (★{self.rating})"
    
    @property
    def is_verified_buyer(self):
        """Check if this is a genuine purchase by checking order status."""
        from apps.orders.models import Order
        return self.order.status == Order.Status.DELIVERED
