# Generated migration for Review model

from django.conf import settings
from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):

    dependencies = [
        ('orders', '0001_initial'),
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
        ('products', '0011_billing_nullable_pr'),
    ]

    operations = [
        migrations.CreateModel(
            name='Review',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('rating', models.IntegerField(choices=[(1, '1'), (2, '2'), (3, '3'), (4, '4'), (5, '5')], help_text='Rating from 1 to 5 stars')),
                ('comment', models.TextField(blank=True, help_text='Review text (optional)')),
                ('verified_purchase', models.BooleanField(default=True, help_text='Marked as verified if order is delivered')),
                ('created_at', models.DateTimeField(auto_now_add=True)),
                ('updated_at', models.DateTimeField(auto_now=True)),
                ('customer', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='reviews', to=settings.AUTH_USER_MODEL)),
                ('order', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='reviews', to='orders.order')),
                ('shopkeeper_product', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='reviews', to='products.shopkeeperproduct')),
            ],
            options={
                'ordering': ['-created_at'],
            },
        ),
        migrations.AddConstraint(
            model_name='review',
            constraint=models.UniqueConstraint(fields=('customer', 'shopkeeper_product', 'order'), name='unique_review_per_order'),
        ),
        migrations.AddIndex(
            model_name='review',
            index=models.Index(fields=['shopkeeper_product', '-created_at'], name='products_re_shopke_idx'),
        ),
        migrations.AddIndex(
            model_name='review',
            index=models.Index(fields=['customer', 'shopkeeper_product'], name='products_re_custome_idx'),
        ),
    ]
