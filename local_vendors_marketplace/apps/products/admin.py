from django.contrib import admin
from .models import VendorProduct, ShopkeeperProduct, Category, ProductUsage, Notification, PurchaseRequest, Review


@admin.register(Category)
class CategoryAdmin(admin.ModelAdmin):
    list_display = ('name',)


@admin.register(VendorProduct)
class VendorProductAdmin(admin.ModelAdmin):
    list_display = ('name', 'vendor', 'base_price', 'stock', 'category', 'created_at')


@admin.register(ShopkeeperProduct)
class ShopkeeperProductAdmin(admin.ModelAdmin):
    list_display = ('name', 'shopkeeper', 'selling_price', 'stock', 'is_active')


@admin.register(ProductUsage)
class ProductUsageAdmin(admin.ModelAdmin):
    list_display = ('vendor_product', 'shopkeeper', 'created_at')


@admin.register(Notification)
class NotificationAdmin(admin.ModelAdmin):
    list_display = ('user', 'message', 'is_read', 'created_at')


@admin.register(PurchaseRequest)
class PurchaseRequestAdmin(admin.ModelAdmin):
    list_display = ('shopkeeper', 'vendor', 'product', 'quantity', 'status', 'created_at')


@admin.register(Review)
class ReviewAdmin(admin.ModelAdmin):
    list_display = ('customer', 'shopkeeper_product', 'rating', 'verified_purchase', 'is_verified_buyer', 'created_at')
    list_filter = ('rating', 'verified_purchase', 'created_at')
    search_fields = ('customer__name', 'shopkeeper_product__name', 'comment')
    readonly_fields = ('customer', 'order', 'verified_purchase', 'created_at', 'updated_at')
    
    def is_verified_buyer(self, obj):
        """Display a checkmark for verified buyers."""
        return obj.is_verified_buyer
    is_verified_buyer.boolean = True
    is_verified_buyer.short_description = 'Verified Buyer'
