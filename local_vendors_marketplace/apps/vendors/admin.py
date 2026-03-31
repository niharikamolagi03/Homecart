from django.contrib import admin
from .models import Vendor

@admin.register(Vendor)
class VendorAdmin(admin.ModelAdmin):
    list_display = ('shop_name', 'user', 'category', 'rating', 'is_verified', 'created_at')
    list_filter = ('category', 'is_verified')
    search_fields = ('shop_name', 'user__email', 'location')
    readonly_fields = ('rating',)