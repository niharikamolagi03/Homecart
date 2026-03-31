from django.db import models
from apps.users.models import User
from apps.products.models import ShopkeeperProduct


class Order(models.Model):
    class Status(models.TextChoices):
        PENDING = 'PENDING', 'Pending'
        PENDING_VENDOR_APPROVAL = 'PENDING_VENDOR_APPROVAL', 'Pending Vendor Approval'
        VENDOR_APPROVED = 'VENDOR_APPROVED', 'Vendor Approved'
        VENDOR_REJECTED = 'VENDOR_REJECTED', 'Vendor Rejected'
        ACCEPTED = 'ACCEPTED', 'Accepted'
        PREPARING = 'PREPARING', 'Preparing'
        OUT_FOR_DELIVERY = 'OUT_FOR_DELIVERY', 'Out for Delivery'
        DELIVERED = 'DELIVERED', 'Delivered'
        CANCELLED = 'CANCELLED', 'Cancelled'

    class PaymentStatus(models.TextChoices):
        PENDING = 'PENDING', 'Pending'
        PAID = 'PAID', 'Paid'
        REFUNDED = 'REFUNDED', 'Refunded'

    customer = models.ForeignKey(User, on_delete=models.CASCADE, related_name='orders')
    shopkeeper = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, blank=True, related_name='shopkeeper_orders')
    assigned_delivery = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, blank=True, related_name='assigned_orders')
    total_price = models.DecimalField(max_digits=10, decimal_places=2)
    status = models.CharField(max_length=25, choices=Status.choices, default=Status.PENDING)
    payment_status = models.CharField(max_length=20, choices=PaymentStatus.choices, default=PaymentStatus.PENDING)
    delivery_address = models.TextField()
    latitude = models.FloatField(null=True, blank=True)
    longitude = models.FloatField(null=True, blank=True)
    bulk = models.BooleanField(default=False)  # New field for bulk orders
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f"Order #{self.id} by {self.customer.name}"


class VendorApproval(models.Model):
    class Status(models.TextChoices):
        PENDING = 'PENDING', 'Pending'
        APPROVED = 'APPROVED', 'Approved'
        REJECTED = 'REJECTED', 'Rejected'

    order = models.ForeignKey(Order, on_delete=models.CASCADE, related_name='vendor_approvals')
    vendor = models.ForeignKey(User, on_delete=models.CASCADE, related_name='order_approvals')
    status = models.CharField(max_length=20, choices=Status.choices, default=Status.PENDING)
    notes = models.TextField(blank=True, null=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        unique_together = ('order', 'vendor')

    def __str__(self):
        return f"{self.vendor.name} - {self.status} for Order #{self.order.id}"


class OrderItem(models.Model):
    order = models.ForeignKey(Order, on_delete=models.CASCADE, related_name='items')
    product = models.ForeignKey(ShopkeeperProduct, on_delete=models.CASCADE)
    vendor = models.ForeignKey(User, on_delete=models.CASCADE, related_name='vendor_order_items')  # New field for vendor
    quantity = models.PositiveIntegerField()
    price = models.DecimalField(max_digits=10, decimal_places=2)

    @property
    def total_price(self):
        return self.price * self.quantity

    def __str__(self):
        return f"{self.quantity} x {self.product.vendor_product.name}"
