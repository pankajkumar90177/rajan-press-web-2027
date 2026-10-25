from django.db import models
from django.shortcuts import redirect
import json
import uuid
import logging
from decimal import Decimal, InvalidOperation
from datetime import date

from django.shortcuts import render, get_object_or_404
from django.http import JsonResponse
from django.views.decorators.http import require_POST, require_GET
from django.views.decorators.csrf import csrf_protect
from django.db import DatabaseError, IntegrityError, transaction
from django.db.models import Q, Sum
from django.core.paginator import Paginator
from django.utils import timezone
from django.utils.dateparse import parse_date
from django.contrib.auth.hashers import make_password, check_password
from django.utils.crypto import get_random_string
from django.views.decorators.http import require_http_methods

from .models import (
    PublicInvoice,
    Customer,
    ShopDetails,
    Invoice,
    InvoiceItem,
    Payment,
    LoginDatabase,
)

logger = logging.getLogger(__name__)


# ==================================================
# COMMON HELPERS
# ==================================================
def as_dict(value):
    return value if isinstance(value, dict) else {}


def as_list(value):
    return value if isinstance(value, list) else []


def get_value(data, *keys, default=""):
    for key in keys:
        value = data.get(key)
        if value is not None:
            return value
    return default


def as_text(value, default=""):
    if value is None:
        return default
    return str(value).strip()


def as_decimal(value, default="0"):
    if value in (None, ""):
        value = default
    try:
        result = Decimal(str(value))
        if not result.is_finite():
            raise ValueError("Invalid number")
        return result
    except (InvalidOperation, ValueError, TypeError):
        raise ValueError(f"Invalid numeric value: {value}")


def as_bool(value, default=False):
    if value is None or value == "":
        return default
    if isinstance(value, bool):
        return value
    return str(value).strip().lower() in ("yes", "true", "1", "on")


# ==================================================
# 1. HOME PAGE
# ==================================================
def home(request):
    return render(request, "index.html")


# ==================================================
# NEXT INVOICE NUMBER
# Reads numbers from both invoice tables and returns
# the next available RP number.
# ==================================================
def get_next_invoice_number():
    used_numbers = set()

    for value in PublicInvoice.objects.values_list("invoice_number", flat=True):
        value = as_text(value)
        if value.startswith("RP") and value[2:].isdigit():
            used_numbers.add(int(value[2:]))

    for value in Invoice.objects.values_list("invoice_no", flat=True):
        value = as_text(value)
        if value.startswith("RP") and value[2:].isdigit():
            used_numbers.add(int(value[2:]))

    number = max(used_numbers, default=0) + 1
    candidate = f"RP{number:02d}"

    # Skip any number already present in either table.
    while (
        PublicInvoice.objects.filter(invoice_number=candidate).exists()
        or Invoice.objects.filter(invoice_no=candidate).exists()
    ):
        number += 1
        candidate = f"RP{number:02d}"

    return candidate


# ==================================================
# 2. INVOICE CREATE PAGE
# ==================================================
def invoice_create(request):
    if not request.session.get("login_user_id"):
        return redirect("login_billing")

    return render(
        request,
        "Invoice_Create.html",
        {"next_invoice_number": get_next_invoice_number()},
    )

    # ==========================================
# ==================================================
# STAFF INVOICE LIST
# Shows invoices from the Invoice model and supports basic filters.
# ==================================================
from datetime import timedelta


def invoice_list_staff(request):
    if not request.session.get("login_user_id"):
        return redirect("login_billing")

    # PostgreSQL se invoice aur customer records
    invoices = Invoice.objects.select_related("customer").all()

    # Search fields
    invoice_no = request.GET.get("invoice_no", "").strip()
    customer_name = request.GET.get("customer", "").strip()
    mobile = request.GET.get("mobile", "").strip()
    from_date_text = request.GET.get("from_date", "").strip()
    to_date_text = request.GET.get("to_date", "").strip()
    status = request.GET.get("status", "").strip().lower()

    if invoice_no:
        invoices = invoices.filter(invoice_no__icontains=invoice_no)

    if customer_name:
        invoices = invoices.filter(
            customer__customer_name__icontains=customer_name
        )

    if mobile:
        invoices = invoices.filter(
            customer__mobile_no__icontains=mobile
        )

    from_date = parse_date(from_date_text) if from_date_text else None
    to_date = parse_date(to_date_text) if to_date_text else None

    if from_date:
        invoices = invoices.filter(invoice_date__gte=from_date)

    if to_date:
        invoices = invoices.filter(invoice_date__lte=to_date)

    # Overdue: Pending/Partial invoice, date 30 days se purani
    overdue_date = timezone.localdate() - timedelta(days=30)
    overdue_filter = Q(
        payment_status__in=["Pending", "Partial"],
        invoice_date__lt=overdue_date,
    )

    if status == "overdue":
        invoices = invoices.filter(overdue_filter)
    elif status in {"paid", "pending", "partial", "failed", "refunded"}:
        invoices = invoices.filter(payment_status__iexact=status)
    elif status:
        status = ""

    invoices = invoices.order_by("-invoice_date", "-invoice_id")

    # Filtered invoices ke totals
    total_invoices = invoices.count()

    total_amount = (
        invoices.aggregate(total=Sum("grand_total"))["total"]
        or Decimal("0.00")
    )

    # Payment table mein sirf Paid status wali entries received amount hain
    paid_amount = (
        Payment.objects.filter(
            invoice__in=invoices,
            payment_status__iexact="Paid",
        ).aggregate(total=Sum("payment_amount"))["total"]
        or Decimal("0.00")
    )

    pending_amount = max(
        total_amount - paid_amount,
        Decimal("0.00"),
    )

    overdue_invoices = invoices.filter(overdue_filter).count()

           # Pagination
    per_page_text = request.GET.get("per_page", "10")
    per_page = int(per_page_text) if per_page_text.isdigit() else 10

    if per_page not in (10, 20, 50):
        per_page = 10

    paginator = Paginator(invoices, per_page)
    page_obj = paginator.get_page(request.GET.get("page"))

    query_params = request.GET.copy()
    query_params.pop("page", None)
    query_params.pop("per_page", None)

    context = {
        "invoices": page_obj.object_list,
        "page_obj": page_obj,
        "paginator": paginator,
        "per_page": per_page,
        "total_invoices": total_invoices,
        "total_amount": total_amount,
        "paid_amount": paid_amount,
        "pending_amount": pending_amount,
        "overdue_invoices": overdue_invoices,
        "overdue_count": overdue_invoices,
        "invoice_no_filter": invoice_no,
        "customer_filter": customer_name,
        "mobile_filter": mobile,
        "from_date_filter": from_date_text,
        "to_date_filter": to_date_text,
        "status_filter": status,
        "query_string": query_params.urlencode(),
    }

    return render(request, "invoice_list_staff.html", context)


# ==================================================
# 3. SAVE / UPDATE INVOICE
# Saves normalized tables and the QR/public invoice.
# Existing invoices are updated by token first, then by
# the existing invoice number where appropriate.
# ==================================================
@require_POST
@csrf_protect
def save_public_invoice(request):
    try:
        data = json.loads(request.body.decode("utf-8"))

        if not isinstance(data, dict):
            return JsonResponse(
                {"success": False, "error": "Invalid invoice data."},
                status=400,
            )

        invoice_info = as_dict(data.get("invoice"))
        customer_info = as_dict(data.get("customer"))
        shop_info = as_dict(data.get("shop"))
        payment_info = as_dict(data.get("payment"))
        totals = as_dict(data.get("totals"))
        products = as_list(data.get("products"))

        invoice_number = as_text(
            get_value(invoice_info, "number", "invoiceNumber")
        )
        if not invoice_number:
            return JsonResponse(
                {"success": False, "error": "Invoice number required."},
                status=400,
            )

        customer_name = as_text(
            get_value(customer_info, "name", "customerName")
        )
        mobile_no = as_text(
            get_value(customer_info, "mobile", "mobileNo", "customerMobile")
        )
        if not customer_name or not mobile_no:
            return JsonResponse(
                {
                    "success": False,
                    "error": "Customer name and mobile number are required.",
                },
                status=400,
            )

        invoice_date_value = get_value(
            invoice_info,
            "date",
            "invoiceDate",
            default=date.today().isoformat(),
        )
        invoice_date = parse_date(str(invoice_date_value))
        if not invoice_date:
            return JsonResponse(
                {"success": False, "error": "Invalid invoice date."},
                status=400,
            )

        invoice_token = None
        token_value = data.get("token")
        if token_value:
            try:
                invoice_token = uuid.UUID(str(token_value))
            except (ValueError, TypeError, AttributeError):
                return JsonResponse(
                    {"success": False, "error": "Invalid invoice token."},
                    status=400,
                )

            # NOTE:
            # This endpoint is called by the Invoice Create form when saving
            # the current invoice. The QR destination itself remains read-only
            # because view_public_invoice only renders invoice_public.html.
            # Do not apply the public-view read-only restriction to this save
            # endpoint, otherwise the same form cannot save/update its invoice.

        now = timezone.now()

        # Totals
        item_total = as_decimal(get_value(totals, "itemTotal", "item_total"))
        discount_amount = as_decimal(
            get_value(totals, "discount", "discountAmount", "discountTotal")
        )
        sub_total = as_decimal(get_value(totals, "subTotal", "subtotal"))
        gst_rate = as_decimal(get_value(totals, "gstRate", "gst_rate"))
        cgst_amount = as_decimal(get_value(totals, "cgst", "cgstAmount"))
        sgst_amount = as_decimal(get_value(totals, "sgst", "sgstAmount"))
        grand_total = as_decimal(
            get_value(totals, "grandTotal", "grand_total")
        )

        gst_applicable = as_bool(
            get_value(invoice_info, "gstApplicable", default=False)
        )
        shop_details_applicable = as_bool(
            get_value(shop_info, "detailsApplicable", default=True),
            default=True,
        )
        shop_gstin_applicable = as_bool(
            get_value(shop_info, "gstinApplicable", default=False)
        )

        payment_mode = as_text(
            get_value(
                payment_info,
                "mode",
                "paymentMode",
                default=get_value(invoice_info, "paymentMode"),
            ),
            default="Cash",
        ) or "Cash"

        payment_status = as_text(
            get_value(
                payment_info,
                "status",
                "paymentStatus",
                default="Pending",
            ),
            default="Pending",
        ).title()

        allowed_statuses = {"Pending", "Paid", "Partial", "Failed", "Refunded"}
        if payment_status not in allowed_statuses:
            return JsonResponse(
                {"success": False, "error": "Invalid payment status."},
                status=400,
            )

        utr_no = as_text(
            get_value(
                payment_info,
                "utr",
                "utrNo",
                "referenceNo",
                default=get_value(invoice_info, "utrNo"),
            )
        )
        reference_no = as_text(
            get_value(invoice_info, "referenceNo", "reference_no")
        )
        amount_in_words = as_text(
            get_value(
                totals,
                "amountInWords",
                "amount_in_words",
                default=get_value(invoice_info, "amountInWords"),
            )
        )
        notes = as_text(get_value(invoice_info, "notes"))

        with transaction.atomic():
            # Find public invoice by token for an update.
            saved_invoice = None
            old_invoice_number = None

            if invoice_token:
                saved_invoice = (
                    PublicInvoice.objects.select_for_update()
                    .filter(token=invoice_token)
                    .first()
                )
                if saved_invoice is None:
                    return JsonResponse(
                        {
                            "success": False,
                            "error": (
                                "Invoice token nahi mila. Naya invoice "
                                "banane ke liye token hata kar save karein."
                            ),
                        },
                        status=404,
                    )

                old_invoice_number = saved_invoice.invoice_number

                if (
                    PublicInvoice.objects.filter(invoice_number=invoice_number)
                    .exclude(pk=saved_invoice.pk)
                    .exists()
                ):
                    return JsonResponse(
                        {
                            "success": False,
                            "error": "This invoice number is already in use.",
                        },
                        status=409,
                    )
            else:
                if PublicInvoice.objects.filter(
                    invoice_number=invoice_number
                ).exists():
                    return JsonResponse(
                        {
                            "success": False,
                            "error": (
                                "Invoice number already exists. Existing invoice "
                                "ko update karne ke liye uska token bhejein."
                            ),
                        },
                        status=409,
                    )

            # 1. CUSTOMER
            customer_defaults = {
                "customer_name": customer_name,
                "address": as_text(
                    get_value(customer_info, "address", "customerAddress")
                ) or None,
                "city": as_text(
                    get_value(customer_info, "city", "customerCity")
                ) or None,
                "state": as_text(
                    get_value(customer_info, "state", "customerState")
                ) or None,
                "pin_code": as_text(
                    get_value(customer_info, "pin", "pinCode", "customerPin")
                ) or None,
                "customer_gstin": (
                    as_text(
                        get_value(customer_info, "gstin", "customerGstin")
                    ) or None
                    if gst_applicable
                    else None
                ),
            }

            customer = (
                Customer.objects.select_for_update()
                .filter(mobile_no=mobile_no)
                .order_by("customer_id")
                .first()
            )
            if customer:
                for field, value in customer_defaults.items():
                    setattr(customer, field, value)
                customer.save()
            else:
                customer = Customer.objects.create(
                    mobile_no=mobile_no,
                    created_at=now,
                    **customer_defaults,
                )

            # 2. SHOP DETAILS
            shop = None
            if shop_details_applicable:
                shop_name = as_text(
                    get_value(
                        shop_info,
                        "name",
                        "shopName",
                        default="Rajan Printing Press & Enterprises",
                    )
                ) or "Rajan Printing Press & Enterprises"

                shop = (
                    ShopDetails.objects.select_for_update()
                    .filter(shop_name=shop_name)
                    .order_by("shop_id")
                    .first()
                )

                shop_defaults = {
                    "shop_address": as_text(
                        get_value(shop_info, "address", "shopAddress")
                    ) or None,
                    "phone": as_text(
                        get_value(shop_info, "phone", "mobile")
                    ) or None,
                    "email": as_text(get_value(shop_info, "email")) or None,
                    "gstin": (
                        as_text(
                            get_value(shop_info, "gstin", "shopGstin")
                        ) or None
                        if gst_applicable and shop_gstin_applicable
                        else None
                    ),
                }

                if shop:
                    for field, value in shop_defaults.items():
                        setattr(shop, field, value)
                    shop.save()
                else:
                    shop = ShopDetails.objects.create(
                        shop_name=shop_name,
                        created_at=now,
                        **shop_defaults,
                    )

            # 3. INVOICE: update the same invoice if its public token is known.
            invoice_defaults = {
                "invoice_date": invoice_date,
                "customer": customer,
                "shop": shop,
                "payment_mode": payment_mode,
                "payment_status": payment_status,
                "utr_no": utr_no or None,
                "reference_no": reference_no or None,
                "gst_applicable": gst_applicable,
                "shop_details_applicable": shop_details_applicable,
                "shop_gstin_applicable": (
                    gst_applicable
                    and shop_details_applicable
                    and shop_gstin_applicable
                ),
                "item_total": item_total,
                "discount_amount": discount_amount,
                "sub_total": sub_total,
                "gst_rate": gst_rate if gst_applicable else Decimal("0"),
                "cgst_amount": cgst_amount if gst_applicable else Decimal("0"),
                "sgst_amount": sgst_amount if gst_applicable else Decimal("0"),
                "grand_total": grand_total,
                "amount_in_words": amount_in_words or None,
                "notes": notes or None,
                "updated_at": now,
            }

            invoice = None
            if saved_invoice:
                # If invoice number was edited, find the old normalized row first.
                invoice = (
                    Invoice.objects.select_for_update()
                    .filter(invoice_no=old_invoice_number)
                    .first()
                )

            if invoice is None:
                invoice = (
                    Invoice.objects.select_for_update()
                    .filter(invoice_no=invoice_number)
                    .first()
                )

            if invoice:
                # Prevent silently overwriting a different invoice row.
                if (
                    invoice.invoice_no != invoice_number
                    and Invoice.objects.filter(invoice_no=invoice_number)
                    .exclude(pk=invoice.pk)
                    .exists()
                ):
                    return JsonResponse(
                        {
                            "success": False,
                            "error": "Invoice number already exists in invoices table.",
                        },
                        status=409,
                    )

                invoice.invoice_no = invoice_number
                for field, value in invoice_defaults.items():
                    setattr(invoice, field, value)
                invoice.save()

                InvoiceItem.objects.filter(invoice=invoice).delete()
                Payment.objects.filter(invoice=invoice).delete()
            else:
                if Invoice.objects.filter(invoice_no=invoice_number).exists():
                    return JsonResponse(
                        {
                            "success": False,
                            "error": "Invoice number already exists in invoices table.",
                        },
                        status=409,
                    )

                invoice = Invoice.objects.create(
                    invoice_no=invoice_number,
                    created_at=now,
                    **invoice_defaults,
                )

            # 4. INVOICE ITEMS
            valid_item_count = 0
            for product in products:
                if not isinstance(product, dict):
                    continue

                description = as_text(
                    get_value(product, "description", "name", "itemName")
                )
                if not description:
                    continue

                quantity = as_decimal(
                    get_value(product, "qty", "quantity", default="1")
                )
                rate = as_decimal(
                    get_value(product, "rate", "price", default="0")
                )
                item_discount = as_decimal(
                    get_value(
                        product, "discount", "discountAmount", default="0"
                    )
                )
                amount = as_decimal(
                    get_value(
                        product,
                        "amount",
                        "total",
                        default=(quantity * rate - item_discount),
                    )
                )

                if quantity <= 0 or rate < 0 or item_discount < 0 or amount < 0:
                    raise ValueError("Product quantity/amount cannot be negative.")

                InvoiceItem.objects.create(
                    invoice=invoice,
                    description=description,
                    hsn_code=as_text(
                        get_value(product, "hsn", "hsnCode", "hsn_code")
                    ) or None,
                    quantity=quantity,
                    rate=rate,
                    discount_amount=item_discount,
                    amount=amount,
                    created_at=now,
                )
                valid_item_count += 1

            if not valid_item_count:
                # Raise so transaction.atomic rolls back all invoice changes.
                raise ValueError("Kam se kam ek valid product/item zaroor add karein.")

            # 5. PAYMENT: replace old payment on update, create one current record.
            Payment.objects.create(
                invoice=invoice,
                payment_mode=payment_mode,
                payment_amount=grand_total,
                payment_status=payment_status,
                utr_no=utr_no or None,
                payment_date=now if payment_status == "Paid" else None,
                created_at=now,
            )

            # 6. PUBLIC INVOICE JSON / QR LINK
            public_data = dict(data)
            public_data.pop("token", None)

            if saved_invoice:
                saved_invoice.invoice_number = invoice_number
                saved_invoice.invoice_data = public_data
                saved_invoice.save(
                    update_fields=["invoice_number", "invoice_data", "updated_at"]
                )
                status_code = 200
            else:
                saved_invoice = PublicInvoice.objects.create(
                    invoice_number=invoice_number,
                    invoice_data=public_data,
                )
                status_code = 201

        public_url = request.build_absolute_uri(
            f"/invoice/view/{saved_invoice.token}/"
        )
        return JsonResponse(
            {
                "success": True,
                "message": "Invoice saved successfully.",
                "url": public_url,
                "token": str(saved_invoice.token),
                "invoice_number": saved_invoice.invoice_number,
            },
            status=status_code,
        )

    except (json.JSONDecodeError, UnicodeDecodeError):
        return JsonResponse(
            {"success": False, "error": "Invalid JSON data."},
            status=400,
        )
    except (TypeError, ValueError, InvalidOperation):
        return JsonResponse(
            {
                "success": False,
                "error": (
                    "Invoice data mein invalid value hai. "
                    "Date, amount, quantity aur product details check karein."
                ),
            },
            status=400,
        )
    except IntegrityError:
        logger.exception("Invoice save failed because of a database constraint.")
        return JsonResponse(
            {
                "success": False,
                "error": (
                    "Invoice save nahi hua: database mein duplicate number "
                    "ya constraint conflict hai."
                ),
            },
            status=409,
        )
    except DatabaseError:
        logger.exception("Database error while saving invoice.")
        return JsonResponse(
            {
                "success": False,
                "error": "Invoice database mein save nahi hua. Terminal log check karein.",
            },
            status=500,
        )


# ==================================================
# 4. VIEW PUBLIC INVOICE
# QR scan karne par saved invoice dikhayega
# ==================================================
@require_GET
def view_public_invoice(request, token):
    """Read-only public invoice page for QR scans; never accepts edits."""
    invoice = get_object_or_404(PublicInvoice, token=token)
    invoice_data = invoice.invoice_data or {}

    if not isinstance(invoice_data, dict):
        invoice_data = {}

    return render(
        request,
        "invoice_public.html",
        {
            "invoice": invoice,
            "invoice_data": invoice_data,
            "invoice_info": invoice_data.get("invoice", {}),
            "customer": invoice_data.get("customer", {}),
            "shop": invoice_data.get("shop", {}),
            "products": invoice_data.get("products", []),
            "payment": invoice_data.get("payment", {}),
            "totals": invoice_data.get("totals", {}),
        },
    )


# ==================================================
# LOGIN SYSTEM
# Signup and Login using PostgreSQL login_database
# ==================================================

def login_Billing(request):
    from django.core.validators import validate_email
    from django.core.exceptions import ValidationError
    from django.db import IntegrityError
    from django.contrib.auth.hashers import make_password, check_password

    # Show login page for GET requests
    if request.method == "GET":
        return render(request, "login_Billing.html")

    if request.method != "POST":
        return render(
            request,
            "login_Billing.html",
            {"status_message": "Invalid request method."},
            status=405,
        )

    # Determine which form was submitted by its fields
    is_signup = "first_name" in request.POST

    # ---------------- SIGNUP ----------------
    if is_signup:
        first_name = request.POST.get("first_name", "").strip()
        last_name = request.POST.get("last_name", "").strip()
        username = request.POST.get("username", "").strip()
        mobile = request.POST.get("mobile", "").strip()
        email = request.POST.get("email", "").strip().lower()
        password = request.POST.get("password", "")
        confirm_password = request.POST.get("confirm_password", "")
        requested_role = request.POST.get("role", "staff").strip().lower()

        # Never allow public signup to create a Superadmin.
        if requested_role not in ("staff", "admin"):
            return render(
                request,
                "login_Billing.html",
                {"status_message": "Invalid account type."},
                status=400,
            )

        # Validate required fields.
        if not all([
            first_name, last_name, username,
            mobile, email, password, confirm_password
        ]):
            return render(
                request,
                "login_Billing.html",
                {"status_message": "Please fill in all required fields."},
                status=400,
            )

        if len(username) < 3 or len(username) > 14:
            return render(
                request,
                "login_Billing.html",
                {"status_message": "Username must be 3 to 14 characters."},
                status=400,
            )

        if not mobile.isdigit() or len(mobile) != 10:
            return render(
                request,
                "login_Billing.html",
                {"status_message": "Enter a valid 10-digit mobile number."},
                status=400,
            )

        try:
            validate_email(email)
        except ValidationError:
            return render(
                request,
                "login_Billing.html",
                {"status_message": "Enter a valid email address."},
                status=400,
            )

        if len(password) < 8 or len(password) > 16:
            return render(
                request,
                "login_Billing.html",
                {"status_message": "Password must be 8 to 16 characters."},
                status=400,
            )

        if password != confirm_password:
            return render(
                request,
                "login_Billing.html",
                {"status_message": "Passwords do not match."},
                status=400,
            )

        # Check for duplicate account identifiers.
        if LoginDatabase.objects.filter(username__iexact=username).exists():
            return render(
                request,
                "login_Billing.html",
                {"status_message": "Username already exists."},
                status=400,
            )

        if LoginDatabase.objects.filter(mobile=mobile).exists():
            return render(
                request,
                "login_Billing.html",
                {"status_message": "Mobile number already registered."},
                status=400,
            )

        if LoginDatabase.objects.filter(email__iexact=email).exists():
            return render(
                request,
                "login_Billing.html",
                {"status_message": "Email already registered."},
                status=400,
            )

        # Store the password as a Django hash.
        # Admin accounts require approval; staff accounts also
        # remain unapproved until the configured approval process.
        try:
            LoginDatabase.objects.create(
                first_name=first_name,
                last_name=last_name,
                username=username,
                mobile=mobile,
                email=email,
                password=make_password(password),
                role=requested_role,
                is_active=True,
                is_approved=False,
                password_changed_at=timezone.now(),
                created_at=timezone.now(),
                updated_at=timezone.now(),
            )
        except IntegrityError:
            return render(
                request,
                "login_Billing.html",
                {"status_message": "Account details already exist. Please check them."},
                status=400,
            )

        return render(
            request,
            "login_Billing.html",
            {
                "status_message": (
                    "Signup successful. Your account is waiting for approval."
                )
            },
        )

    # ---------------- LOGIN ----------------
    identity = request.POST.get("username", "").strip()
    password = request.POST.get("password", "")

    if not identity or not password:
        return render(
            request,
            "login_Billing.html",
            {"status_message": "Enter your username/email/mobile and password."},
            status=400,
        )

    user = LoginDatabase.objects.filter(
        models.Q(username__iexact=identity)
        | models.Q(email__iexact=identity)
        | models.Q(mobile=identity)
    ).first()

    if not user or not check_password(password, user.password):
        return render(
            request,
            "login_Billing.html",
            {"status_message": "Invalid login details."},
            status=400,
        )

    if not user.is_active:
        return render(
            request,
            "login_Billing.html",
            {"status_message": "Your account is inactive. Contact the administrator."},
            status=403,
        )

    if not user.is_approved:
        return render(
            request,
            "login_Billing.html",
            {"status_message": "Your account is awaiting approval."},
            status=403,
        )

    # Create a fresh session only after successful authentication.
    request.session.cycle_key()
    request.session["login_user_id"] = user.id
    request.session["login_username"] = user.username
    request.session["login_role"] = user.role

    user.last_login_at = timezone.now()
    user.failed_login_attempts = 0
    user.locked_until = None
    user.save(update_fields=[
        "last_login_at",
        "failed_login_attempts",
        "locked_until",
    ])

    return redirect("invoice_create")


# ==========================================
# LOGOUT SYSTEM
# ==========================================
def logout_Billing(request):
    request.session.flush()
    return redirect("login_billing")

# ==========================================
# SUPERADMIN APPROVAL SYSTEM
# ==========================================

from django.views.decorators.http import require_POST
from django.http import JsonResponse


@require_POST
def superadmin_approve_user(request, user_id):
    # Check logged-in session
    admin_id = request.session.get("login_user_id")
    admin_role = request.session.get("login_role")

    if not admin_id or admin_role != "superadmin":
        return JsonResponse(
            {"success": False, "message": "Superadmin access required."},
            status=403,
        )

    # Verify that the logged-in account is an active Superadmin
    admin = LoginDatabase.objects.filter(
        id=admin_id,
        role="superadmin",
        is_active=True,
        is_approved=True,
    ).first()

    if not admin:
        request.session.flush()
        return JsonResponse(
            {"success": False, "message": "Superadmin session is invalid."},
            status=403,
        )

    # Only approve pending Staff or Admin accounts
    user = LoginDatabase.objects.filter(
        id=user_id,
        role__in=["staff", "admin"],
        is_approved=False,
    ).first()

    if not user:
        return JsonResponse(
            {"success": False, "message": "Pending account not found."},
            status=404,
        )

    user.is_approved = True
    user.approved_by = admin.id
    user.approved_at = timezone.now()
    user.updated_at = timezone.now()
    user.save(
        update_fields=[
            "is_approved",
            "approved_by",
            "approved_at",
            "updated_at",
        ]
    )

    return JsonResponse(
        {"success": True, "message": "Account approved successfully."}
    )

# ==========================================
# SUPERADMIN PENDING USERS PAGE
# ==========================================
def superadmin_approvals(request):
    admin_id = request.session.get("login_user_id")
    admin_role = request.session.get("login_role")

    if not admin_id or admin_role != "superadmin":
        return redirect("login_billing")

    # Verify the session against the current database account.
    admin = LoginDatabase.objects.filter(
        id=admin_id,
        role="superadmin",
        is_active=True,
        is_approved=True,
    ).first()

    if not admin:
        request.session.flush()
        return redirect("login_billing")

    pending_users = LoginDatabase.objects.filter(
        role__in=["staff", "admin"],
        is_active=True,
        is_approved=False,
    ).order_by("created_at", "id")

    return render(
        request,
        "superadmin_approvals.html",
        {"pending_users": pending_users},
    )



# ==========================================
# SUPERADMIN REJECT USER
# ==========================================
from django.views.decorators.http import require_POST
from django.http import HttpResponseForbidden
from django.shortcuts import redirect
from django.utils import timezone



@require_POST
def superadmin_reject_user(request, user_id):
    admin_id = request.session.get("login_user_id")
    admin_role = request.session.get("login_role")

    if not admin_id or admin_role != "superadmin":
        request.session.flush()
        return HttpResponseForbidden("Superadmin access required.")

    admin = LoginDatabase.objects.filter(
        id=admin_id,
        role="superadmin",
        is_active=True,
        is_approved=True,
    ).first()

    if not admin:
        request.session.flush()
        return HttpResponseForbidden("Invalid Superadmin session.")

    user = LoginDatabase.objects.filter(
        id=user_id,
        role__in=["staff", "admin"],
        is_approved=False,
    ).first()

    if not user:
        return redirect("superadmin_approvals")

    user.is_active = False
    user.is_approved = False
    user.rejection_reason = "Rejected by Superadmin"
    user.updated_at = timezone.now()
    user.save(update_fields=[
        "is_active",
        "is_approved",
        "rejection_reason",
        "updated_at",
    ])

    return redirect("superadmin_approvals")


# ==========================================
# INVOICE PREVIEW — VIEW / PRINT / PDF
# ==========================================
def invoice_preview_fragment(request, invoice_id):
    # Login check
    if not request.session.get("login_user_id"):
        return redirect("login_billing")

    # Database se selected invoice aur related details
    invoice = get_object_or_404(
        Invoice.objects.select_related("customer", "shop"),
        invoice_id=invoice_id,
    )

    # Selected invoice ke products/items
    items = InvoiceItem.objects.filter(
        invoice=invoice
    ).order_by("item_id")

    # Invoice preview ko HTML fragment ke roop mein return karein
    return render(
        request,
        "invoice_preview_fragment.html",
        {
            "invoice": invoice,
            "items": items,
        },
    )



# ==========================================
# INVOICE EDIT — TEMPORARY SAFE PLACEHOLDER
# ==========================================

def invoice_edit(request, invoice_id):
    if not request.session.get("login_user_id"):
        return redirect("login_billing")

    invoice = get_object_or_404(
        Invoice.objects.select_related("customer"),
        invoice_id=invoice_id,
    )

    public_invoice = PublicInvoice.objects.filter(
        invoice_number=invoice.invoice_no
    ).first()

    edit_invoice_data = {}

    if public_invoice and isinstance(public_invoice.invoice_data, dict):
        edit_invoice_data = public_invoice.invoice_data

    return render(
        request,
        "Invoice_Create.html",
        {
            "invoice": invoice,
            "edit_mode": True,
            "edit_invoice_data": edit_invoice_data,
            "edit_invoice_token": (
                str(public_invoice.token)
                if public_invoice
                else ""
            ),
        },
    )




# ==========================================
# INVOICE DELETE — TEMPORARY SAFE PLACEHOLDER
# ==========================================

@require_POST
@csrf_protect
def invoice_delete(request, invoice_id):
    # Step 1: Login check
    if not request.session.get("login_user_id"):
        return redirect("login_billing")

    try:
        # Step 2: Delete related records safely
        with transaction.atomic():

            invoice = get_object_or_404(
                Invoice.objects.select_for_update(),
                invoice_id=invoice_id,
            )

            # Step 3: Delete invoice items
            InvoiceItem.objects.filter(
                invoice_id=invoice_id
            ).delete()

            # Step 4: Delete payment records
            Payment.objects.filter(
                invoice_id=invoice_id
            ).delete()

            # Step 5: Delete matching public invoice record
            PublicInvoice.objects.filter(
                invoice_number=invoice.invoice_no
            ).delete()

            # Step 6: Delete the main invoice
            invoice.delete()

        # Step 7: Return to Invoice List
        return redirect("invoice_list_staff")

    except Exception:
        logger.exception(
            "Invoice delete failed: %s",
            invoice_id,
        )

        return JsonResponse(
            {
                "success": False,
                "message": (
                    "Invoice delete nahi ho paya. "
                    "Terminal mein error check karein."
                ),
            },
            status=500,
        )
