from django.contrib import admin
from .models import Order, OrderItem, VendorApproval


class OrderItemInline(admin.TabularInline):
    model = OrderItem
    extra = 0


class VendorApprovalInline(admin.TabularInline):
    model = VendorApproval
    extra = 0
    readonly_fields = ('vendor', 'status', 'notes', 'created_at', 'updated_at')


@admin.register(Order)
class OrderAdmin(admin.ModelAdmin):
    list_display = ('id', 'customer', 'shopkeeper', 'total_price', 'status', 'payment_status', 'bulk', 'created_at')
    list_filter = ('status', 'payment_status', 'bulk', 'created_at')
    search_fields = ('customer__email', 'shopkeeper__name')
    inlines = [OrderItemInline, VendorApprovalInline]


@admin.register(VendorApproval)
class VendorApprovalAdmin(admin.ModelAdmin):
    list_display = ('order', 'vendor', 'status', 'created_at', 'updated_at')
    list_filter = ('status', 'created_at')
    search_fields = ('order__id', 'vendor__name')
    readonly_fields = ('order', 'vendor', 'created_at')
