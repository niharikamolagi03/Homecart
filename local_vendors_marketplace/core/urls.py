from django.urls import path, include
from django.contrib import admin
from django.conf import settings
from django.conf.urls.static import static
from apps.products.reset_views import ResetMarketplaceDataView

urlpatterns = [
    path('admin/', admin.site.urls),

    # APIs
    path('api/', include('apps.users.urls')),
    path('api/', include('apps.products.urls')),
    path('api/', include('apps.vendors.urls')),
    path('api/', include('apps.cart.urls')),
    path('api/', include('apps.orders.urls')),
    path('api/', include('apps.delivery.urls')),

    # Admin-only marketplace reset
    path('api/admin/reset/', ResetMarketplaceDataView.as_view(), name='reset-marketplace'),
] + static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)
