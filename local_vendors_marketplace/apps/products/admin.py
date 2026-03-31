from django.contrib import admin
from .models import VendorProduct, ShopkeeperProduct, Category, ProductUsage, Notification, PurchaseRequest


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
