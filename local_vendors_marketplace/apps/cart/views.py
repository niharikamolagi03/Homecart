from rest_framework import generics, status
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from django.shortcuts import get_object_or_404
from drf_spectacular.utils import extend_schema
from .models import Cart, CartItem
from .serializers import CartSerializer, AddToCartSerializer, UpdateCartItemSerializer
from apps.products.models import ShopkeeperProduct


class CartView(generics.RetrieveAPIView):
    serializer_class = CartSerializer
    permission_classes = [IsAuthenticated]

    def get_object(self):
        cart, _ = Cart.objects.get_or_create(user=self.request.user)
        return cart

    def get_serializer_context(self):
        ctx = super().get_serializer_context()
        ctx['request'] = self.request
        return ctx


class AddToCartView(generics.GenericAPIView):
    permission_classes = [IsAuthenticated]
    serializer_class = AddToCartSerializer

    def post(self, request):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        product = get_object_or_404(ShopkeeperProduct, id=serializer.validated_data['product_id'], is_active=True)
        if product.stock < serializer.validated_data['quantity']:
            return Response({'error': 'Insufficient stock'}, status=status.HTTP_400_BAD_REQUEST)
        cart, _ = Cart.objects.get_or_create(user=request.user)
        cart_item, created = CartItem.objects.get_or_create(
            cart=cart, product=product,
            defaults={'quantity': serializer.validated_data['quantity']}
        )
        if not created:
            cart_item.quantity += serializer.validated_data['quantity']
            cart_item.save()
        return Response(CartSerializer(cart, context={'request': request}).data)


class UpdateCartItemView(generics.GenericAPIView):
    permission_classes = [IsAuthenticated]
    serializer_class = UpdateCartItemSerializer

    def put(self, request, item_id):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        cart_item = get_object_or_404(CartItem, id=item_id, cart__user=request.user)
        cart_item.quantity = serializer.validated_data['quantity']
        cart_item.save()
        return Response({'message': 'Cart updated'})


class RemoveFromCartView(generics.GenericAPIView):
    permission_classes = [IsAuthenticated]

    @extend_schema(request=None, responses={200: None})
    def delete(self, request, item_id):
        cart_item = get_object_or_404(CartItem, id=item_id, cart__user=request.user)
        cart_item.delete()
        return Response({'message': 'Item removed'})
