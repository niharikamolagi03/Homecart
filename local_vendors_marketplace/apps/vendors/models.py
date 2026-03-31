from django.db import models
from django.core.validators import MinValueValidator, MaxValueValidator
from apps.users.models import User

class Vendor(models.Model):
    class Category(models.TextChoices):
        GROCERY = 'GROCERY', 'Grocery'
        FOOD = 'FOOD', 'Food & Restaurant'
        SERVICES = 'SERVICES', 'Services'
        CLOTHING = 'CLOTHING', 'Clothing'
        ELECTRONICS = 'ELECTRONICS', 'Electronics'
        OTHER = 'OTHER', 'Other'

    user = models.OneToOneField(User, on_delete=models.CASCADE, related_name='vendor_profile')
    shop_name = models.CharField(max_length=255)
    description = models.TextField()
    location = models.CharField(max_length=500)
    category = models.CharField(max_length=20, choices=Category.choices)
    rating = models.DecimalField(max_digits=3, decimal_places=2, default=0.00, validators=[MinValueValidator(0), MaxValueValidator(5)])
    is_verified = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return self.shop_name

    class Meta:
        ordering = ['-rating', '-created_at']