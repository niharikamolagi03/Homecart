from rest_framework import serializers
from .models import Vendor
from apps.users.serializers import UserSerializer


class VendorSerializer(serializers.ModelSerializer):
    user = UserSerializer(read_only=True)

    class Meta:
        model = Vendor
        fields = ('id', 'user', 'shop_name', 'description', 'location',
                  'category', 'rating', 'is_verified', 'created_at', 'updated_at')
        read_only_fields = ('id', 'rating', 'is_verified', 'created_at', 'updated_at')

    def create(self, validated_data):
        validated_data['user'] = self.context['request'].user
        return super().create(validated_data)
