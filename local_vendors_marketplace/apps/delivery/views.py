from rest_framework import generics, status
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from rest_framework.views import APIView
from django.shortcuts import get_object_or_404
from django.utils import timezone
from drf_spectacular.utils import extend_schema
from .models import DeliveryAssignment, DeliveryUpdate, DeliveryTracking
from .serializers import (
    DeliveryAssignmentSerializer, AssignDeliverySerializer,
    DeliveryStatusUpdateSerializer, DeliveryUpdateSerializer,
    DeliveryTrackingSerializer
)
from apps.orders.models import Order
from apps.users.models import User
from apps.users.permissions import IsAdmin, IsDeliveryPartner


class DeliveryAssignmentView(generics.ListAPIView):
    serializer_class = DeliveryAssignmentSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        if getattr(self, 'swagger_fake_view', False):
            return DeliveryAssignment.objects.none()
        user = self.request.user
        if user.role == 'DELIVERY':
            return DeliveryAssignment.objects.filter(delivery_partner=user)
        elif user.role == 'ADMIN':
            return DeliveryAssignment.objects.all()
        return DeliveryAssignment.objects.none()


class AssignDeliveryView(generics.GenericAPIView):
    permission_classes = [IsAuthenticated, IsAdmin]
    serializer_class = AssignDeliverySerializer

    def post(self, request):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        order = get_object_or_404(Order, id=serializer.validated_data['order_id'])
        delivery_partner = get_object_or_404(
            User, id=serializer.validated_data['delivery_partner_id'], role='DELIVERY'
        )
        if order.status != 'ACCEPTED':
            return Response(
                {'error': 'Order must be accepted before assigning delivery'},
                status=status.HTTP_400_BAD_REQUEST
            )
        assignment, created = DeliveryAssignment.objects.get_or_create(
            order=order, defaults={'delivery_partner': delivery_partner}
        )
        if not created:
            return Response(
                {'error': 'Delivery already assigned to this order'},
                status=status.HTTP_400_BAD_REQUEST
            )
        order.status = 'OUT_FOR_DELIVERY'
        order.save()
        return Response(DeliveryAssignmentSerializer(assignment).data, status=status.HTTP_201_CREATED)


class DeliveryStatusUpdateView(generics.GenericAPIView):
    permission_classes = [IsAuthenticated, IsDeliveryPartner]
    serializer_class = DeliveryStatusUpdateSerializer

    def post(self, request, assignment_id):
        assignment = get_object_or_404(
            DeliveryAssignment, id=assignment_id, delivery_partner=request.user
        )
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        update = DeliveryUpdate.objects.create(
            delivery=assignment,
            status=serializer.validated_data['status'],
            location=serializer.validated_data.get('location', ''),
            notes=serializer.validated_data.get('notes', '')
        )
        assignment.tracking_updates.append({
            'status': update.status,
            'location': update.location,
            'timestamp': update.timestamp.isoformat(),
            'notes': update.notes
        })
        assignment.save()
        if update.status.lower() == 'delivered':
            assignment.delivered_at = timezone.now()
            assignment.save()
            assignment.order.status = 'DELIVERED'
            assignment.order.save()
        return Response(DeliveryUpdateSerializer(update).data, status=status.HTTP_201_CREATED)


class UpdateLocationView(APIView):
    """Delivery agent posts their live location."""
    permission_classes = [IsAuthenticated, IsDeliveryPartner]

    def post(self, request):
        serializer = DeliveryTrackingSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        # Update or create single tracking record per user
        tracking, _ = DeliveryTracking.objects.update_or_create(
            user=request.user,
            defaults={
                'latitude': serializer.validated_data['latitude'],
                'longitude': serializer.validated_data['longitude'],
            }
        )
        return Response(DeliveryTrackingSerializer(tracking).data)


class GetDeliveryLocationView(APIView):
    """Customer polls delivery agent location for their active order."""
    permission_classes = [IsAuthenticated]

    def get(self, request, order_id):
        order = get_object_or_404(Order, id=order_id, customer=request.user)
        assignment = get_object_or_404(DeliveryAssignment, order=order)
        tracking = DeliveryTracking.objects.filter(
            user=assignment.delivery_partner
        ).first()
        if not tracking:
            return Response({'error': 'Location not available yet'}, status=status.HTTP_404_NOT_FOUND)
        return Response(DeliveryTrackingSerializer(tracking).data)
