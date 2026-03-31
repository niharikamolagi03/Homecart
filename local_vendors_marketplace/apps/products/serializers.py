from rest_framework import serializers
from .models import Category, VendorProduct, ShopkeeperProduct, ProductUsage, Notification, PurchaseRequest, ShopkeeperBilling


class CategorySerializer(serializers.ModelSerializer):
    class Meta:
        model = Category
        fields = ('id', 'name', 'description')


class VendorProductSerializer(serializers.ModelSerializer):
    vendor_name = serializers.CharField(source='vendor.name', read_only=True)
    category_name = serializers.CharField(source='category.name', read_only=True)
    image_url = serializers.SerializerMethodField()
    shopkeeper_count = serializers.SerializerMethodField()

    class Meta:
        model = VendorProduct
        fields = ('id', 'vendor_name', 'name', 'description', 'base_price', 'stock',
                  'category', 'category_name', 'image', 'image_url', 'shopkeeper_count', 'created_at')
        read_only_fields = ('id', 'created_at')

    def get_image_url(self, obj):
        request = self.context.get('request')
        if obj.image:
            if request:
                return request.build_absolute_uri(obj.image.url)
            return f'http://127.0.0.1:8000{obj.image.url}'
        return None

    def get_shopkeeper_count(self, obj):
        return obj.usages.count()


class VendorProductCreateSerializer(serializers.ModelSerializer):
    class Meta:
        model = VendorProduct
        fields = ('id', 'name', 'description', 'base_price', 'stock', 'category', 'image')
        read_only_fields = ('id',)

    def update(self, instance, validated_data):
        # Protect base_price from being overwritten during partial updates
        # unless explicitly included in the request
        if self.partial and 'base_price' not in self.initial_data:
            validated_data.pop('base_price', None)
        return super().update(instance, validated_data)


class ShopkeeperProductSerializer(serializers.ModelSerializer):
    shopkeeper_name = serializers.CharField(source='shopkeeper.name', read_only=True)
    image_url = serializers.SerializerMethodField()
    vendor_product_id = serializers.IntegerField(source='vendor_product.id', read_only=True)
    vendor_name = serializers.CharField(source='vendor_product.vendor.name', read_only=True)
    base_price = serializers.DecimalField(
        source='vendor_product.base_price', max_digits=10, decimal_places=2, read_only=True
    )
    category_name = serializers.CharField(source='vendor_product.category.name', read_only=True)
    description = serializers.CharField(source='vendor_product.description', read_only=True)

    class Meta:
        model = ShopkeeperProduct
        fields = (
            'id', 'shopkeeper_name', 'vendor_product_id', 'vendor_name',
            'name', 'description', 'selling_price', 'stock', 'is_active',
            'image_url', 'base_price', 'category_name', 'created_at'
        )
        read_only_fields = ('id', 'created_at')

    def get_image_url(self, obj):
        request = self.context.get('request')
        if obj.image:
            if request:
                return request.build_absolute_uri(obj.image.url)
            return f'http://127.0.0.1:8000{obj.image.url}'
        return None


class AddToShopSerializer(serializers.Serializer):
    vendor_product_id = serializers.IntegerField()
    selling_price = serializers.DecimalField(max_digits=10, decimal_places=2)
    stock = serializers.IntegerField(min_value=1, default=10)


class NotificationSerializer(serializers.ModelSerializer):
    class Meta:
        model = Notification
        fields = ('id', 'message', 'is_read', 'created_at')


class PurchaseRequestSerializer(serializers.ModelSerializer):
    shopkeeper_name = serializers.CharField(source='shopkeeper.name', read_only=True)
    vendor_name = serializers.CharField(source='vendor.name', read_only=True)
    product_name = serializers.CharField(source='product.name', read_only=True)
    product_id = serializers.IntegerField(source='product.id', read_only=True)
    product_base_price = serializers.DecimalField(source='product.base_price', max_digits=10, decimal_places=2, read_only=True)
    image_url = serializers.SerializerMethodField()

    class Meta:
        model = PurchaseRequest
        fields = ('id', 'shopkeeper_name', 'vendor_name', 'product_name', 'product_id',
                  'product_base_price', 'image_url', 'quantity', 'status', 'created_at')

    def get_image_url(self, obj):
        request = self.context.get('request')
        if obj.product.image:
            if request:
                return request.build_absolute_uri(obj.product.image.url)
            return f'http://127.0.0.1:8000{obj.product.image.url}'
        return None


class ShopkeeperBillingSerializer(serializers.ModelSerializer):
    vendor_name = serializers.CharField(source='vendor.name', read_only=True)
    shopkeeper_name = serializers.CharField(source='shopkeeper.name', read_only=True)
    # activation_date = created_at (bill is created at activation moment)
    activation_date = serializers.DateTimeField(source='created_at', read_only=True)
    # seconds_remaining: positive = time left, negative = overdue by that many seconds
    seconds_remaining = serializers.SerializerMethodField()
    is_overdue = serializers.SerializerMethodField()

    class Meta:
        model = ShopkeeperBilling
        fields = (
            'id', 'shopkeeper_name', 'vendor_name', 'product_name',
            'quantity', 'cost_price', 'total_amount',
            'amount_paid', 'remaining_amount',
            'status', 'due_date', 'activation_date',
            'seconds_remaining', 'is_overdue', 'created_at',
        )

    def get_seconds_remaining(self, obj):
        from django.utils import timezone
        delta = obj.due_date - timezone.now()
        return int(delta.total_seconds())

    def get_is_overdue(self, obj):
        from django.utils import timezone
        return obj.status in ('pending', 'partially_paid') and timezone.now() > obj.due_date
