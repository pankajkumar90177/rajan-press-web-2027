
-- =====================================================
-- RAJAN PRESS BILLING SYSTEM
-- File: 05_payments.sql
-- Database: rajan_billing
-- Purpose: Store invoice payment details
-- =====================================================

CREATE TABLE IF NOT EXISTS payments (
    payment_id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,

    invoice_id BIGINT NOT NULL
        REFERENCES invoices(invoice_id)
        ON DELETE CASCADE,

    payment_mode VARCHAR(30) NOT NULL,

    payment_amount NUMERIC(12,2) NOT NULL DEFAULT 0,

    payment_status VARCHAR(20) NOT NULL DEFAULT 'Pending',

    utr_no VARCHAR(100),

    payment_date TIMESTAMPTZ,

    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT chk_payment_amount
        CHECK (payment_amount >= 0),

    CONSTRAINT chk_payment_status
        CHECK (
            payment_status IN (
                'Pending',
                'Paid',
                'Partial',
                'Failed',
                'Refunded'
            )
        )
);
