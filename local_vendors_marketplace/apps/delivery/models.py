from django.db import models
from apps.users.models import User
from apps.orders.models import Order

class DeliveryAssignment(models.Model):
    order = models.OneToOneField(Order, on_delete=models.CASCADE, related_name='delivery')
    delivery_partner = models.ForeignKey(User, on_delete=models.CASCADE, related_name='deliveries')
    assigned_at = models.DateTimeField(auto_now_add=True)
    delivered_at = models.DateTimeField(null=True, blank=True)
    tracking_updates = models.JSONField(default=list)

    def __str__(self):
        return f"Delivery for Order #{self.order.id} - {self.delivery_partner.name}"

class DeliveryUpdate(models.Model):
    delivery = models.ForeignKey(DeliveryAssignment, on_delete=models.CASCADE, related_name='updates')
    status = models.CharField(max_length=50)
    location = models.CharField(max_length=500, blank=True)
    timestamp = models.DateTimeField(auto_now_add=True)
    notes = models.TextField(blank=True)

    def __str__(self):
        return f"{self.status} at {self.timestamp}"


class DeliveryTracking(models.Model):
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='location_updates')
    latitude = models.FloatField()
    longitude = models.FloatField()
    timestamp = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-timestamp']

    def __str__(self):
        return f"{self.user.name} at ({self.latitude}, {self.longitude})"