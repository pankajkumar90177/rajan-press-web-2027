-- RAJAN PRESS BILLING SYSTEM
-- File: 06_shop_details.sql
-- Database: rajan_billing
-- Purpose: Store business/shop details

CREATE TABLE IF NOT EXISTS shop_details (
    shop_id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,

    shop_name VARCHAR(200) NOT NULL,
    shop_address TEXT,
    phone VARCHAR(15),
    email VARCHAR(254),
    gstin VARCHAR(15),

    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);