---
id: building-orders-and-ecommerce
slug: /building-orders-and-ecommerce
sidebar_position: 26
description: "Step-by-step tutorial: build an orders and e-commerce system in Django."
---

# Building Orders and E-Commerce

## Overview

This tutorial builds a complete e-commerce order system: product catalog, shopping cart (session-based),
order placement, Stripe payment integration, and order management. Each section includes complete
model, view, and template code.

---

## 1. Create the App

```powershell
python manage.py startapp store
```

```python
# settings.py
INSTALLED_APPS += ['store']
```

---

## 2. Models

```python
# store/models.py
from django.db import models
from django.contrib.auth import get_user_model
from django.urls import reverse
from decimal import Decimal

User = get_user_model()


class Category(models.Model):
    name = models.CharField(max_length=200)
    slug = models.SlugField(unique=True)

    class Meta:
        verbose_name_plural = 'categories'

    def __str__(self):
        return self.name


class Product(models.Model):
    category = models.ForeignKey(Category, on_delete=models.CASCADE, related_name='products')
    name = models.CharField(max_length=200)
    slug = models.SlugField(unique=True)
    description = models.TextField(blank=True)
    price = models.DecimalField(max_digits=10, decimal_places=2)
    stock = models.PositiveIntegerField(default=0)
    image = models.ImageField(upload_to='products/%Y/%m/', blank=True)
    is_active = models.BooleanField(default=True, db_index=True)
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return self.name

    def get_absolute_url(self):
        return reverse('store:product_detail', args=[self.slug])

    @property
    def in_stock(self):
        return self.stock > 0


class Order(models.Model):
    PENDING = 'pending'
    PAID = 'paid'
    SHIPPED = 'shipped'
    DELIVERED = 'delivered'
    CANCELLED = 'cancelled'
    STATUS_CHOICES = [
        (PENDING, 'Pending'),
        (PAID, 'Paid'),
        (SHIPPED, 'Shipped'),
        (DELIVERED, 'Delivered'),
        (CANCELLED, 'Cancelled'),
    ]

    user = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, blank=True, related_name='orders')
    email = models.EmailField()
    first_name = models.CharField(max_length=100)
    last_name = models.CharField(max_length=100)
    address = models.TextField()
    city = models.CharField(max_length=100)
    postal_code = models.CharField(max_length=20)
    country = models.CharField(max_length=100)
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default=PENDING, db_index=True)
    stripe_payment_intent = models.CharField(max_length=255, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f'Order #{self.pk}'

    @property
    def total_price(self):
        return sum(item.total_price for item in self.items.all())


class OrderItem(models.Model):
    order = models.ForeignKey(Order, on_delete=models.CASCADE, related_name='items')
    product = models.ForeignKey(Product, on_delete=models.PROTECT, related_name='order_items')
    price = models.DecimalField(max_digits=10, decimal_places=2)  # price at time of purchase
    quantity = models.PositiveIntegerField(default=1)

    def __str__(self):
        return f'{self.quantity}x {self.product.name}'

    @property
    def total_price(self):
        return self.price * self.quantity
```

```powershell
python manage.py makemigrations store && python manage.py migrate
```

---

## 3. Shopping Cart (Session-Based)

```python
# store/cart.py
from decimal import Decimal
from django.conf import settings
from .models import Product

CART_SESSION_KEY = 'cart'


class Cart:
    def __init__(self, request):
        self.session = request.session
        cart = self.session.get(CART_SESSION_KEY)
        if cart is None:
            cart = self.session[CART_SESSION_KEY] = {}
        self.cart = cart

    def add(self, product: Product, quantity: int = 1, override_quantity: bool = False):
        product_id = str(product.pk)
        if product_id not in self.cart:
            self.cart[product_id] = {'quantity': 0, 'price': str(product.price)}
        if override_quantity:
            self.cart[product_id]['quantity'] = quantity
        else:
            self.cart[product_id]['quantity'] += quantity
        self.save()

    def remove(self, product: Product):
        product_id = str(product.pk)
        if product_id in self.cart:
            del self.cart[product_id]
            self.save()

    def save(self):
        self.session.modified = True  # force session to persist

    def __iter__(self):
        product_ids = self.cart.keys()
        products = Product.objects.filter(pk__in=product_ids)
        cart = self.cart.copy()
        for product in products:
            cart[str(product.pk)]['product'] = product
        for item in cart.values():
            item['total_price'] = Decimal(item['price']) * item['quantity']
            yield item

    def __len__(self):
        return sum(item['quantity'] for item in self.cart.values())

    @property
    def total_price(self):
        return sum(Decimal(item['price']) * item['quantity'] for item in self.cart.values())

    def clear(self):
        del self.session[CART_SESSION_KEY]
        self.save()
```

---

## 4. Views

```python
# store/views.py
from django.shortcuts import render, get_object_or_404, redirect
from django.contrib import messages
from .models import Product, Category, Order, OrderItem
from .cart import Cart
from .forms import CartAddForm, OrderForm


def product_list(request):
    category = None
    categories = Category.objects.all()
    products = Product.objects.filter(is_active=True).select_related('category')
    slug = request.GET.get('category')
    if slug:
        category = get_object_or_404(Category, slug=slug)
        products = products.filter(category=category)
    return render(request, 'store/product_list.html', {
        'products': products,
        'categories': categories,
        'selected_category': category,
    })


def cart_add(request, product_id):
    cart = Cart(request)
    product = get_object_or_404(Product, pk=product_id, is_active=True)
    form = CartAddForm(request.POST)
    if form.is_valid():
        cart.add(
            product=product,
            quantity=form.cleaned_data['quantity'],
            override_quantity=form.cleaned_data['override'],
        )
    return redirect('store:cart_detail')


def cart_detail(request):
    cart = Cart(request)
    for item in cart:
        item['update_quantity_form'] = CartAddForm(initial={
            'quantity': item['quantity'], 'override': True
        })
    return render(request, 'store/cart.html', {'cart': cart})


def checkout(request):
    cart = Cart(request)
    if not cart:
        messages.warning(request, 'Your cart is empty.')
        return redirect('store:product_list')

    if request.method == 'POST':
        form = OrderForm(request.POST)
        if form.is_valid():
            order = form.save(commit=False)
            if request.user.is_authenticated:
                order.user = request.user
            order.save()
            for item in cart:
                OrderItem.objects.create(
                    order=order,
                    product=item['product'],
                    price=item['price'],
                    quantity=item['quantity'],
                )
            cart.clear()
            # Redirect to payment
            return redirect('store:order_payment', pk=order.pk)
    else:
        initial = {}
        if request.user.is_authenticated:
            initial = {
                'first_name': request.user.first_name,
                'last_name': request.user.last_name,
                'email': request.user.email,
            }
        form = OrderForm(initial=initial)

    return render(request, 'store/checkout.html', {'cart': cart, 'form': form})
```

---

## 5. Stripe Payment Integration

```powershell
pip install stripe
```

```python
# settings.py
STRIPE_SECRET_KEY = env('STRIPE_SECRET_KEY')
STRIPE_PUBLISHABLE_KEY = env('STRIPE_PUBLISHABLE_KEY')
STRIPE_WEBHOOK_SECRET = env('STRIPE_WEBHOOK_SECRET')
```

```python
# store/views.py (continued)
import stripe
from django.conf import settings
from django.views.decorators.csrf import csrf_exempt
from django.http import HttpResponse

stripe.api_key = settings.STRIPE_SECRET_KEY


def order_payment(request, pk):
    order = get_object_or_404(Order, pk=pk)
    if request.method == 'POST':
        intent = stripe.PaymentIntent.create(
            amount=int(order.total_price * 100),  # cents
            currency='usd',
            metadata={'order_id': order.pk},
        )
        order.stripe_payment_intent = intent.id
        order.save(update_fields=['stripe_payment_intent'])
        return render(request, 'store/payment.html', {
            'order': order,
            'client_secret': intent.client_secret,
            'publishable_key': settings.STRIPE_PUBLISHABLE_KEY,
        })
    return render(request, 'store/order_confirm.html', {'order': order})


@csrf_exempt
def stripe_webhook(request):
    payload = request.body
    sig_header = request.META.get('HTTP_STRIPE_SIGNATURE', '')
    try:
        event = stripe.Webhook.construct_event(
            payload, sig_header, settings.STRIPE_WEBHOOK_SECRET
        )
    except (ValueError, stripe.error.SignatureVerificationError):
        return HttpResponse(status=400)

    if event['type'] == 'payment_intent.succeeded':
        intent = event['data']['object']
        order_id = intent['metadata'].get('order_id')
        if order_id:
            Order.objects.filter(pk=order_id).update(status=Order.PAID)

    return HttpResponse(status=200)
```

---

## 6. URLs

```python
# store/urls.py
from django.urls import path
from . import views

app_name = 'store'

urlpatterns = [
    path('', views.product_list, name='product_list'),
    path('cart/', views.cart_detail, name='cart_detail'),
    path('cart/add/<int:product_id>/', views.cart_add, name='cart_add'),
    path('checkout/', views.checkout, name='checkout'),
    path('order/<int:pk>/payment/', views.order_payment, name='order_payment'),
    path('webhooks/stripe/', views.stripe_webhook, name='stripe_webhook'),
]
```

---

## Quick Reference

| Feature | Implementation |
|---|---|
| Product catalog | `Product` model with `is_active`, `stock` |
| Cart | Session-based `Cart` class, `CART_SESSION_KEY` |
| Add to cart | `cart.add(product, quantity)` |
| Order creation | `Order` + `OrderItem` on checkout submit |
| Stripe payment | `stripe.PaymentIntent.create(amount=cents)` |
| Webhook | `@csrf_exempt` + `stripe.Webhook.construct_event()` |
| Order status update | `Order.objects.filter(pk=id).update(status=Order.PAID)` |
| Decimal prices | Always use `DecimalField`, never `FloatField` |
