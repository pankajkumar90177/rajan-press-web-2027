
from django.urls import path
from . import views


urlpatterns = [
    # ==========================================
    # 1. HOME PAGE
    # ==========================================
    path(
        "",
        views.home,
        name="home",
    ),

    # ==========================================
    # 2. INVOICE CREATE PAGE
    # ==========================================
    path(
        "invoice-create/",
        views.invoice_create,
        name="invoice_create",
    ),

    # ==========================================
    # 3. SAVE PUBLIC INVOICE
    # ==========================================
    path(
        "invoice/save-public/",
        views.save_public_invoice,
        name="save_public_invoice",
    ),

    # ==========================================
    # 4. PUBLIC INVOICE VIEW
    # ==========================================
    path(
        "invoice/view/<uuid:token>/",
        views.view_public_invoice,
        name="view_public_invoice",
    ),

    # ==========================================
    # 5. LOGIN BILLING PAGE
    # ==========================================
    path(
        "login_Billing/",
        views.login_Billing,
        name="login_billing",
    ),

    # ==========================================
    # 6. LOGOUT BILLING
    # ==========================================
    path(
        "logout_Billing/",
        views.logout_Billing,
        name="logout_billing",
    ),

    path(
    "superadmin/approve-user/<int:user_id>/",
    views.superadmin_approve_user,
    name="superadmin_approve_user",
),

path(
    "superadmin/approvals/",
    views.superadmin_approvals,
    name="superadmin_approvals",
),

path("superadmin/reject-user/<int:user_id>/", views.superadmin_reject_user, name="superadmin_reject_user"),

path(
    "invoice-list-staff/",
    views.invoice_list_staff,
    name="invoice_list_staff"
),

path(
    "invoice-preview/<int:invoice_id>/",
    views.invoice_preview_fragment,
    name="invoice_preview_fragment"
),

path(
    "invoice/edit/<int:invoice_id>/",
    views.invoice_edit,
    name="invoice_edit",
),
path(
    "invoice/delete/<int:invoice_id>/",
    views.invoice_delete,
    name="invoice_delete",
),
]


