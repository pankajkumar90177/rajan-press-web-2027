-- RAJAN PRESS BILLING SYSTEM
-- File: 04_invoice_items.sql
-- Database: rajan_billing
-- Purpose: Store invoice product and service details

CREATE TABLE IF NOT EXISTS invoice_items (
    item_id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,

    invoice_id BIGINT NOT NULL
        REFERENCES invoices(invoice_id)
        ON DELETE CASCADE,

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