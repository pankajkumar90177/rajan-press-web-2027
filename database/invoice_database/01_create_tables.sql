
-- =====================================================
-- RAJAN PRESS BILLING SYSTEM
-- Database: rajan_billing
-- Master Table Creation Script
-- =====================================================

BEGIN;

-- 1. CUSTOMERS
CREATE TABLE IF NOT EXISTS customers (
    customer_id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    customer_name VARCHAR(150) NOT NULL,
    mobile_no VARCHAR(15) NOT NULL,
    address TEXT,
    city VARCHAR(100),
    state VARCHAR(100),
    pin_code VARCHAR(10),
    customer_gstin VARCHAR(15),
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- 2. SHOP DETAILS
CREATE TABLE IF NOT EXISTS shop_details (
    shop_id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    shop_name VARCHAR(200) NOT NULL,
    shop_address TEXT,
    phone VARCHAR(15),
    email VARCHAR(254),
    gstin VARCHAR(15),
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- 3. INVOICES
CREATE TABLE IF NOT EXISTS invoices (
    invoice_id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    invoice_no VARCHAR(50) NOT NULL UNIQUE,
    invoice_date DATE NOT NULL DEFAULT CURRENT_DATE,

    customer_id BIGINT NOT NULL
        REFERENCES customers(customer_id),
    shop_id BIGINT REFERENCES shop_details(shop_id),

    payment_mode VARCHAR(30),
    payment_status VARCHAR(20) NOT NULL DEFAULT 'Pending',
    utr_no VARCHAR(100),
    reference_no VARCHAR(100),

    gst_applicable BOOLEAN NOT NULL DEFAULT FALSE,
    shop_details_applicable BOOLEAN NOT NULL DEFAULT TRUE,
    shop_gstin_applicable BOOLEAN NOT NULL DEFAULT FALSE,

    item_total NUMERIC(12,2) NOT NULL DEFAULT 0,
    discount_amount NUMERIC(12,2) NOT NULL DEFAULT 0,
    sub_total NUMERIC(12,2) NOT NULL DEFAULT 0,

    gst_rate NUMERIC(5,2) NOT NULL DEFAULT 0,
    cgst_amount NUMERIC(12,2) NOT NULL DEFAULT 0,
    sgst_amount NUMERIC(12,2) NOT NULL DEFAULT 0,
    grand_total NUMERIC(12,2) NOT NULL DEFAULT 0,

    amount_in_words TEXT,
    notes TEXT,

    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT chk_invoice_amounts CHECK (
        item_total >= 0
        AND discount_amount >= 0
        AND sub_total >= 0
        AND gst_rate >= 0
        AND cgst_amount >= 0
        AND sgst_amount >= 0
        AND grand_total >= 0
    ),

    CONSTRAINT chk_invoice_payment_status CHECK (
        payment_status IN (
            'Pending', 'Paid', 'Partial', 'Failed', 'Refunded'
        )
    )
);

-- 4. INVOICE ITEMS
CREATE TABLE IF NOT EXISTS invoice_items (
    item_id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    invoice_id BIGINT NOT NULL
        REFERENCES invoices(invoice_id) ON DELETE CASCADE,

    description VARCHAR(255) NOT NULL,
    hsn_code VARCHAR(20),
    quantity NUMERIC(12,3) NOT NULL DEFAULT 1,
    rate NUMERIC(12,2) NOT NULL DEFAULT 0,
    discount_amount NUMERIC(12,2) NOT NULL DEFAULT 0,
    amount NUMERIC(12,2) NOT NULL DEFAULT 0,

    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT chk_invoice_item_values CHECK (
        quantity > 0
        AND rate >= 0
        AND discount_amount >= 0
        AND amount >= 0
    )
);

-- 5. PAYMENTS
CREATE TABLE IF NOT EXISTS payments (
    payment_id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    invoice_id BIGINT NOT NULL
        REFERENCES invoices(invoice_id) ON DELETE CASCADE,

    payment_mode VARCHAR(30) NOT NULL,
    payment_amount NUMERIC(12,2) NOT NULL DEFAULT 0,
    payment_status VARCHAR(20) NOT NULL DEFAULT 'Pending',
    utr_no VARCHAR(100),
    payment_date TIMESTAMPTZ,

    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT chk_payment_amount CHECK (payment_amount >= 0),

    CONSTRAINT chk_payment_status CHECK (
        payment_status IN (
            'Pending', 'Paid', 'Partial', 'Failed', 'Refunded'
        )
    )
);

COMMIT;