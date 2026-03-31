from rest_framework import serializers
from .models import Order, OrderItem, VendorApproval
from apps.products.serializers import ShopkeeperProductSerializer
from apps.users.serializers import UserSerializer


class VendorApprovalSerializer(serializers.ModelSerializer):
    vendor_name = serializers.CharField(source='vendor.name', read_only=True)

    class Meta:
        model = VendorApproval
        fields = ('id', 'vendor', 'vendor_name', 'status', 'notes', 'created_at', 'updated_at')
        read_only_fields = ('id', 'created_at', 'updated_at')


class OrderItemSerializer(serializers.ModelSerializer):
    product_details = ShopkeeperProductSerializer(source='product', read_only=True)
    total_price = serializers.DecimalField(max_digits=10, decimal_places=2, read_only=True)

    class Meta:
        model = OrderItem
        fields = ('id', 'product', 'product_details', 'quantity', 'price', 'total_price', 'vendor')


class OrderSerializer(serializers.ModelSerializer):
    items = OrderItemSerializer(many=True, read_only=True)
    vendor_approvals = VendorApprovalSerializer(many=True, read_only=True)
    customer = UserSerializer(read_only=True)
    shopkeeper_name = serializers.CharField(source='shopkeeper.name', read_only=True)
    delivery_name = serializers.CharField(source='assigned_delivery.name', read_only=True)

    class Meta:
        model = Order
        fields = ('id', 'customer', 'shopkeeper_name', 'delivery_name', 'items',
                  'total_price', 'status', 'payment_status',
                  'delivery_address', 'latitude', 'longitude',
                  'assigned_delivery', 'bulk', 'vendor_approvals', 'created_at', 'updated_at')
        read_only_fields = ('id', 'created_at', 'updated_at')


class PlaceOrderSerializer(serializers.Serializer):
    delivery_address = serializers.CharField()
    latitude = serializers.FloatField(required=False, allow_null=True)
    longitude = serializers.FloatField(required=False, allow_null=True)
    payment_method = serializers.ChoiceField(choices=['CASH', 'CARD'], default='CASH')


class UpdateOrderStatusSerializer(serializers.Serializer):
    status = serializers.ChoiceField(choices=Order.Status.choices)


# New serializers for bulk orders
class BulkOrderItemSerializer(serializers.Serializer):
    product_id = serializers.IntegerField()
    quantity = serializers.IntegerField(min_value=1)

    def validate_product_id(self, value):
        from apps.products.models import ShopkeeperProduct
        try:
            product = ShopkeeperProduct.objects.get(id=value)
            if product.stock < self.initial_data.get('quantity', 1):
                raise serializers.ValidationError("Insufficient stock")
        except ShopkeeperProduct.DoesNotExist:
            raise serializers.ValidationError("Product not found")
        return value


class BulkOrderSerializer(serializers.Serializer):
    items = BulkOrderItemSerializer(many=True)

    def validate_items(self, value):
        if len(value) < 1:
            raise serializers.ValidationError("Cart must have at least one item.")
        return value


class VendorApprovalActionSerializer(serializers.Serializer):
    status = serializers.ChoiceField(choices=VendorApproval.Status.choices)
    notes = serializers.CharField(required=False, allow_blank=True)
