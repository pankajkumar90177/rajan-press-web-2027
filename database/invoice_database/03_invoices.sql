
-- =====================================================
-- RAJAN PRESS BILLING SYSTEM
-- File: 03_invoices.sql
-- Database: rajan_billing
-- Purpose: Create and update the invoices table
-- =====================================================

-- 1. CREATE INVOICES TABLE
CREATE TABLE IF NOT EXISTS public.invoices (
    invoice_id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    invoice_no VARCHAR(50) NOT NULL UNIQUE,
    invoice_date DATE NOT NULL DEFAULT CURRENT_DATE,

    customer_id BIGINT NOT NULL
        REFERENCES public.customers(customer_id),

    shop_id BIGINT
        REFERENCES public.shop_details(shop_id),

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
            'Pending',
            'Paid',
            'Partial',
            'Failed',
            'Refunded'
        )
    )
);

-- 2. ADD MISSING COLUMNS TO EXISTING TABLE
ALTER TABLE public.invoices
    ADD COLUMN IF NOT EXISTS payment_status
        VARCHAR(20) NOT NULL DEFAULT 'Pending',
    ADD COLUMN IF NOT EXISTS utr_no VARCHAR(100),
    ADD COLUMN IF NOT EXISTS reference_no VARCHAR(100),
    ADD COLUMN IF NOT EXISTS amount_in_words TEXT,
    ADD COLUMN IF NOT EXISTS notes TEXT,
    ADD COLUMN IF NOT EXISTS updated_at
        TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP;

-- 3. ADD PAYMENT STATUS VALIDATION
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM pg_constraint
        WHERE conname = 'chk_invoice_payment_status'
          AND conrelid = 'public.invoices'::regclass
    ) THEN
        ALTER TABLE public.invoices
        ADD CONSTRAINT chk_invoice_payment_status
        CHECK (
            payment_status IN (
                'Pending',
                'Paid',
                'Partial',
                'Failed',
                'Refunded'
            )
        );
    END IF;
END
$$;

-- =====================================================
-- END OF INVOICES SQL
-- =====================================================
