from django.urls import path
from .views import (
    DeliveryAssignmentView, AssignDeliveryView, DeliveryStatusUpdateView,
    UpdateLocationView, GetDeliveryLocationView
)

urlpatterns = [
    path('delivery/assignments/', DeliveryAssignmentView.as_view(), name='delivery-assignments'),
    path('delivery/assign/', AssignDeliveryView.as_view(), name='assign-delivery'),
    path('delivery/update/<int:assignment_id>/', DeliveryStatusUpdateView.as_view(), name='delivery-update'),
    path('delivery/location/update/', UpdateLocationView.as_view(), name='update-location'),
    path('delivery/location/<int:order_id>/', GetDeliveryLocationView.as_view(), name='get-delivery-location'),
]
