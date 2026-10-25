
# UUID generate karne ke liye Python ka uuid module
import uuid

# Django database models
from django.db import models

# validate_email
from django.core.validators import validate_email

# =========================================================
# 1. PUBLIC INVOICE MODEL
# Public invoice ko unique link se access karne ke liye
# =========================================================
class PublicInvoice(models.Model):

    # Har public invoice ke liye unique UUID token
    token = models.UUIDField(
        default=uuid.uuid4,
        unique=True,
        editable=False
    )

    # Invoice ka unique number
    invoice_number = models.CharField(
        max_length=100,
        unique=True
    )

    # Invoice ki complete information JSON format mein
    invoice_data = models.JSONField(default=dict)

    # Record create hone ka samay
    created_at = models.DateTimeField(auto_now_add=True)

    # Record update hone ka samay
    updated_at = models.DateTimeField(auto_now=True)

    # Object ko string mein dikhane ke liye invoice number
    def __str__(self):
        return self.invoice_number

    class Meta:
        # PostgreSQL table ka naam
        db_table = "backend_publicinvoice"


# =========================================================
# 2. CUSTOMER MODEL
# Customer ki details store/read karne ke liye
# =========================================================
class Customer(models.Model):

    # Customer ki primary key
    customer_id = models.BigAutoField(primary_key=True)

    # Customer ka naam
    customer_name = models.CharField(max_length=150)

    # Customer ka mobile number
    mobile_no = models.CharField(max_length=15)

    # Customer ka address (optional)
    address = models.TextField(blank=True, null=True)

    # Customer ka city (optional)
    city = models.CharField(max_length=100, blank=True, null=True)

    # Customer ka state (optional)
    state = models.CharField(max_length=100, blank=True, null=True)

    # Customer ka PIN code (optional)
    pin_code = models.CharField(max_length=10, blank=True, null=True)

    # Customer ka GSTIN (optional)
    customer_gstin = models.CharField(
        max_length=15, blank=True, null=True
    )

    # Customer record create hone ka samay
    created_at = models.DateTimeField()

    class Meta:
        # Django is table ko create/alter nahi karega
        managed = False

        # Existing PostgreSQL table
        db_table = "customers"


# =========================================================
# 3. SHOP DETAILS MODEL
# Printing press ki shop details ke liye
# =========================================================
class ShopDetails(models.Model):

    # Shop ki primary key
    shop_id = models.BigAutoField(primary_key=True)

    # Shop ka naam
    shop_name = models.CharField(max_length=200)

    # Shop ka address (optional)
    shop_address = models.TextField(blank=True, null=True)

    # Shop ka phone number (optional)
    phone = models.CharField(max_length=15, blank=True, null=True)

    # Shop ka email (optional)
    email = models.CharField(max_length=254, blank=True, null=True)

    # Shop ka GSTIN (optional)
    gstin = models.CharField(max_length=15, blank=True, null=True)

    # Shop record create hone ka samay
    created_at = models.DateTimeField()

    class Meta:
        # Existing table ko Django manage nahi karega
        managed = False

        # PostgreSQL table ka naam
        db_table = "shop_details"


# =========================================================
# 4. INVOICE MODEL
# Invoice ki main details store karne ke liye
# =========================================================
class Invoice(models.Model):

    # Invoice ki primary key
    invoice_id = models.BigAutoField(primary_key=True)

    # Invoice number
    invoice_no = models.CharField(max_length=50)

    # Invoice ki date
    invoice_date = models.DateField()

    # Invoice kis customer ka hai
    customer = models.ForeignKey(
        Customer,
        db_column="customer_id",
        on_delete=models.PROTECT,
        db_constraint=False
    )

    # Invoice kis shop se sambandhit hai
    shop = models.ForeignKey(
        ShopDetails,
        db_column="shop_id",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        db_constraint=False
    )

    # Payment ka mode (optional)
    payment_mode = models.CharField(
        max_length=30, blank=True, null=True
    )

    # Payment ki current status
    payment_status = models.CharField(
        max_length=20, default="Pending"
    )

    # UTR number (optional)
    utr_no = models.CharField(
        max_length=100, blank=True, null=True
    )

    # Reference number (optional)
    reference_no = models.CharField(
        max_length=100, blank=True, null=True
    )

    # GST applicable hai ya nahi
    gst_applicable = models.BooleanField(default=False)

    # Shop details invoice par dikhani hain ya nahi
    shop_details_applicable = models.BooleanField(default=True)

    # Shop GSTIN dikhana hai ya nahi
    shop_gstin_applicable = models.BooleanField(default=False)

    # Items ka total amount
    item_total = models.DecimalField(
        max_digits=12, decimal_places=2, default=0
    )

    # Total discount
    discount_amount = models.DecimalField(
        max_digits=12, decimal_places=2, default=0
    )

    # Discount ke baad subtotal
    sub_total = models.DecimalField(
        max_digits=12, decimal_places=2, default=0
    )

    # GST percentage
    gst_rate = models.DecimalField(
        max_digits=5, decimal_places=2, default=0
    )

    # CGST amount
    cgst_amount = models.DecimalField(
        max_digits=12, decimal_places=2, default=0
    )

    # SGST amount
    sgst_amount = models.DecimalField(
        max_digits=12, decimal_places=2, default=0
    )

    # Invoice ka final amount
    grand_total = models.DecimalField(
        max_digits=12, decimal_places=2, default=0
    )

    # Amount words mein
    amount_in_words = models.TextField(blank=True, null=True)

    # Additional notes
    notes = models.TextField(blank=True, null=True)

    # Invoice create aur update hone ka samay
    created_at = models.DateTimeField()
    updated_at = models.DateTimeField()

    class Meta:
        # Existing invoices table ko Django manage nahi karega
        managed = False

        # PostgreSQL table ka naam
        db_table = "invoices"


# =========================================================
# 5. INVOICE ITEM MODEL
# Invoice ke individual products/services ke liye
# =========================================================
class InvoiceItem(models.Model):

    # Item ki primary key
    item_id = models.BigAutoField(primary_key=True)

    # Yeh item kis invoice se juda hai
    invoice = models.ForeignKey(
        Invoice,
        db_column="invoice_id",
        on_delete=models.CASCADE,
        db_constraint=False
    )

    # Product ya service ka description
    description = models.CharField(max_length=255)

    # HSN code (optional)
    hsn_code = models.CharField(
        max_length=20, blank=True, null=True
    )

    # Item ki quantity
    quantity = models.DecimalField(
        max_digits=12, decimal_places=3, default=1
    )

    # Ek unit ka rate
    rate = models.DecimalField(
        max_digits=12, decimal_places=2, default=0
    )

    # Item par discount
    discount_amount = models.DecimalField(
        max_digits=12, decimal_places=2, default=0
    )

    # Item ka final amount
    amount = models.DecimalField(
        max_digits=12, decimal_places=2, default=0
    )

    # Item record create hone ka samay
    created_at = models.DateTimeField()

    class Meta:
        # Existing table ko Django manage nahi karega
        managed = False

        # PostgreSQL table ka naam
        db_table = "invoice_items"


# =========================================================
# 6. PAYMENT MODEL
# Invoice ke payment records ke liye
# =========================================================
class Payment(models.Model):

    # Payment ki primary key
    payment_id = models.BigAutoField(primary_key=True)

    # Payment kis invoice se sambandhit hai
    invoice = models.ForeignKey(
        Invoice,
        db_column="invoice_id",
        on_delete=models.CASCADE,
        db_constraint=False
    )

    # Payment mode
    payment_mode = models.CharField(max_length=30)

    # Payment amount
    payment_amount = models.DecimalField(
        max_digits=12, decimal_places=2, default=0
    )

    # Payment status
    payment_status = models.CharField(
        max_length=20, default="Pending"
    )

    # UTR number (optional)
    utr_no = models.CharField(
        max_length=100, blank=True, null=True
    )

    # Payment hone ki date/time (optional)
    payment_date = models.DateTimeField(
        blank=True, null=True
    )

    # Payment record create hone ka samay
    created_at = models.DateTimeField()

    class Meta:
        # Existing payments table ko Django manage nahi karega
        managed = False

        # PostgreSQL table ka naam
        db_table = "payments"


# =========================================================
# 7. LOGIN DATABASE MODEL
# Staff, Admin aur Superadmin accounts ke liye
# =========================================================
class LoginDatabase(models.Model):

    # Har account ki primary key
    id = models.BigAutoField(primary_key=True)

    # User ka first name
    first_name = models.CharField(max_length=50)

    # User ka last name
    last_name = models.CharField(max_length=50)

    # Login username (unique)
    username = models.CharField(max_length=14, unique=True)

    # Mobile number (unique)
    mobile = models.CharField(max_length=10, unique=True)

    # Email address (unique)
    email = models.CharField(max_length=254, unique=True)

    # Django-compatible password hash
    # Plain-text password yahan store nahi karna hai
    password = models.CharField(max_length=128)

    # Account ka role: staff, admin ya superadmin
    role = models.CharField(max_length=20, default="staff")

    # Employee ID (optional aur unique)
    employee_id = models.CharField(
        max_length=50, unique=True, null=True, blank=True
    )

    # Profile photo ka file path (optional)
    profile_photo = models.CharField(
        max_length=255, null=True, blank=True
    )

    # Account active hai ya nahi
    is_active = models.BooleanField(default=True)

    # Account approve hua hai ya nahi
    is_approved = models.BooleanField(default=False)

    # Approve karne wale account ki ID
    approved_by = models.BigIntegerField(null=True, blank=True)

    # Approval ki date/time
    approved_at = models.DateTimeField(null=True, blank=True)

    # Account reject hone ka reason
    rejection_reason = models.TextField(null=True, blank=True)

    # Failed login attempts ki count
    failed_login_attempts = models.IntegerField(default=0)

    # Account kab tak temporarily locked hai
    locked_until = models.DateTimeField(null=True, blank=True)

    # Last successful login ka time
    last_login_at = models.DateTimeField(null=True, blank=True)

    # Password last time kab change hua
    password_changed_at = models.DateTimeField()

    # Account create hone ka samay
    created_at = models.DateTimeField()

    # Account update hone ka samay
    updated_at = models.DateTimeField()

    class Meta:
        # SQL se bani existing table ko Django create/alter nahi karega
        managed = False

        # PostgreSQL table ka exact naam
        db_table = "login_database"

    # Account ko string mein username se dikhana
    def __str__(self):
        return self.username
