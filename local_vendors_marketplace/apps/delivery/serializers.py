from rest_framework import serializers
from .models import DeliveryAssignment, DeliveryUpdate
from apps.orders.serializers import OrderSerializer
from apps.users.serializers import UserSerializer

class DeliveryUpdateSerializer(serializers.ModelSerializer):
    class Meta:
        model = DeliveryUpdate
        fields = ('id', 'status', 'location', 'timestamp', 'notes')
        read_only_fields = ('id', 'timestamp')

class DeliveryAssignmentSerializer(serializers.ModelSerializer):
    order = OrderSerializer(read_only=True)
    delivery_partner = UserSerializer(read_only=True)
    updates = DeliveryUpdateSerializer(many=True, read_only=True)

    class Meta:
        model = DeliveryAssignment
        fields = ('id', 'order', 'delivery_partner', 'assigned_at', 'delivered_at', 'tracking_updates', 'updates')
        read_only_fields = ('id', 'assigned_at')

class AssignDeliverySerializer(serializers.Serializer):
    order_id = serializers.IntegerField()
    delivery_partner_id = serializers.IntegerField()

class DeliveryStatusUpdateSerializer(serializers.Serializer):
    status = serializers.CharField()
    location = serializers.CharField(required=False, allow_blank=True)
    notes = serializers.CharField(required=False, allow_blank=True)


class DeliveryTrackingSerializer(serializers.Serializer):
    latitude = serializers.FloatField()
    longitude = serializers.FloatField()
    timestamp = serializers.DateTimeField(read_only=True)
    user_id = serializers.IntegerField(read_only=True)
