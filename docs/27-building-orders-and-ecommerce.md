# Building Orders and E-Commerce

## Data Model

```python
from django.db import models
from django.conf import settings


class Product(models.Model):
  name = models.CharField(max_length=200)
  sku = models.CharField(max_length=100, unique=True)
  price = models.DecimalField(max_digits=10, decimal_places=2)
  stock = models.IntegerField(default=0)
  created_at = models.DateTimeField(auto_now_add=True)


class Order(models.Model):
  STATUS_CHOICES = [
    ('pending', 'Pending'),
    ('paid', 'Paid'),
    ('shipped', 'Shipped'),
    ('delivered', 'Delivered'),
  ]

  customer = models.ForeignKey(
    settings.AUTH_USER_MODEL,
    on_delete=models.CASCADE,
    related_name='orders',
  )
  status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='pending')
  total = models.DecimalField(max_digits=10, decimal_places=2)
  created_at = models.DateTimeField(auto_now_add=True)


class OrderItem(models.Model):
  order = models.ForeignKey(Order, on_delete=models.CASCADE, related_name='items')
  product = models.ForeignKey(Product, on_delete=models.PROTECT)
  quantity = models.IntegerField()
  price = models.DecimalField(max_digits=10, decimal_places=2)
```

## Service Layer

```python
from django.db import transaction


@transaction.atomic
def create_order(user, cart_items):
  order = Order.objects.create(customer=user, total=0)
  total = 0

  for item in cart_items:
    product = Product.objects.select_for_update().get(pk=item['product_id'])
    if product.stock < item['quantity']:
      raise ValueError('Insufficient stock')

    product.stock -= item['quantity']
    product.save(update_fields=['stock'])

    order_item = OrderItem.objects.create(
      order=order,
      product=product,
      quantity=item['quantity'],
      price=product.price,
    )
    total += order_item.price * order_item.quantity

  order.total = total
  order.save(update_fields=['total'])
  return order
```

## Payment Processing

Integrate Stripe or similar:

```python
import stripe


def process_payment(order):
  stripe.api_key = settings.STRIPE_API_KEY

  try:
    charge = stripe.Charge.create(
      amount=int(order.total * 100),  # cents
      currency='usd',
      source='tok_visa',  # from frontend
      metadata={'order_id': order.id},
    )
    order.status = 'paid'
    order.save(update_fields=['status'])
    return charge
  except stripe.error.CardError as e:
    raise ValueError(str(e))
```

## Admin

```python
from django.contrib import admin


@admin.register(Order)
class OrderAdmin(admin.ModelAdmin):
  list_display = ('id', 'customer', 'total', 'status', 'created_at')
  list_filter = ('status', 'created_at')
  search_fields = ('customer__username', 'id')
```
