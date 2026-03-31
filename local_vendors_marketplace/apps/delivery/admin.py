from django.contrib import admin
from .models import DeliveryAssignment, DeliveryUpdate

class DeliveryUpdateInline(admin.TabularInline):
    model = DeliveryUpdate
    extra = 0

@admin.register(DeliveryAssignment)
class DeliveryAssignmentAdmin(admin.ModelAdmin):
    list_display = ('order', 'delivery_partner', 'assigned_at', 'delivered_at')
    inlines = [DeliveryUpdateInline]