
document.addEventListener("DOMContentLoaded", function () {
    "use strict";

    // Remove leading zeroes from numeric fields on blur without changing calculations.
    document.querySelectorAll('input[type="number"]').forEach(function (input) {
        input.addEventListener("blur", function () {
            const raw = String(input.value ?? "").trim();
            if (!raw || !Number.isFinite(Number(raw))) return;
            // Preserve meaningful decimal values, but remove unnecessary leading zeros.
            const n = Number(raw);
            input.value = String(n);
            input.dispatchEvent(new Event("input", { bubbles: true }));
        });
    });

    // If ID Card is implemented as a button (rather than an anchor), open the site in a new tab.
    document.querySelectorAll("button, a").forEach(function (control) {
        const label = (control.textContent || "").trim().replace(/\s+/g, " ").toLowerCase();
        if (label === "id card" && control.tagName === "BUTTON") {
            control.addEventListener("click", function (event) {
                event.preventDefault();
                window.open("https://rajanpress.com/", "_blank", "noopener,noreferrer");
            });
        }
    });


    // ========================================================
    // 1. HELPERS
    // ========================================================

    const $ = (id) => document.getElementById(id);

    const value = (id) => {
        const el = $(id);
        return el ? String(el.value ?? "").trim() : "";
    };

    const numberValue = (v) => {
        const n = parseFloat(v);
        return Number.isFinite(n) ? Math.max(0, n) : 0;
    };

    const setText = (id, text) => {
        const el = $(id);
        if (el) el.textContent = text;
    };

    const setVisible = (id, visible) => {
        const el = $(id);
        if (el) {
            el.hidden = !visible;
            el.style.display = visible ? "" : "none";
        }
    };

    function money(n) {
        return "₹ " + numberValue(n).toLocaleString("en-IN", {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2
        });
    }

    function formatDate(v) {
        if (!v) return "";

        const p = v.split("-");
        if (p.length !== 3) return v;

        return new Date(+p[0], +p[1] - 1, +p[2])
            .toLocaleDateString("en-GB", {
                day: "2-digit",
                month: "short",
                year: "numeric"
            });
    }

    // ========================================================
    // 2. DEFAULT SETTINGS AND CURRENT DATE
    // ========================================================

    function applyDefaultSettings() {
        if ($("gstApplicable")) $("gstApplicable").value = "no";
        if ($("shopDetailsApplicable")) {
            $("shopDetailsApplicable").value = "yes";
        }
        if ($("shopGstinApplicable")) {
            $("shopGstinApplicable").value = "no";
        }
    }

    // ========================================================
// SET CURRENT INVOICE DATE
// ========================================================

function setCurrentInvoiceDate() {
    const invoiceDate = document.getElementById("invoiceDate");

    if (!invoiceDate) {
        console.error("Invoice Date input nahi mila.");
        return;
    }

    const today = new Date();
    const year = today.getFullYear();
    const month = String(today.getMonth() + 1).padStart(2, "0");
    const day = String(today.getDate()).padStart(2, "0");

    invoiceDate.value = `${year}-${month}-${day}`;
}

applyDefaultSettings();
setCurrentInvoiceDate();
    // ========================================================
    // 3. AMOUNT IN WORDS
    // ========================================================

    function amountInWords(amount) {
        const ones = [
            "", "One", "Two", "Three", "Four", "Five",
            "Six", "Seven", "Eight", "Nine", "Ten",
            "Eleven", "Twelve", "Thirteen", "Fourteen",
            "Fifteen", "Sixteen", "Seventeen", "Eighteen",
            "Nineteen"
        ];

        const tens = [
            "", "", "Twenty", "Thirty", "Forty",
            "Fifty", "Sixty", "Seventy", "Eighty", "Ninety"
        ];

        function underThousand(n) {
            let result = "";

            if (n >= 100) {
                result += ones[Math.floor(n / 100)] + " Hundred ";
                n %= 100;
            }

            if (n >= 20) {
                result += tens[Math.floor(n / 10)] + " ";
                n %= 10;
            }

            if (n > 0) result += ones[n] + " ";

            return result.trim();
        }

        function indianWords(n) {
            if (n === 0) return "Zero";

            let result = "";

            const crore = Math.floor(n / 10000000);
            n %= 10000000;

            const lakh = Math.floor(n / 100000);
            n %= 100000;

            const thousand = Math.floor(n / 1000);
            n %= 1000;

            if (crore) result += underThousand(crore) + " Crore ";
            if (lakh) result += underThousand(lakh) + " Lakh ";
            if (thousand) result += underThousand(thousand) + " Thousand ";
            if (n) result += underThousand(n);

            return result.trim().replace(/\s+/g, " ");
        }

        const rounded = Math.round(numberValue(amount) * 100) / 100;
        const rupees = Math.floor(rounded);
        const paise = Math.round((rounded - rupees) * 100);

        let result = "Rupees " + indianWords(rupees);

        if (paise > 0) {
            result += " and " + indianWords(paise) + " Paise";
        }

        return result + " Only";
    }

    // ========================================================
    // 4. GST AND SHOP VISIBILITY
    // ========================================================

    function isGSTApplicable() {
        return value("gstApplicable").toLowerCase() === "yes";
    }

    function isShopDetailsApplicable() {
        return value("shopDetailsApplicable").toLowerCase() === "yes";
    }

    function isShopGSTINApplicable() {
        return value("shopGstinApplicable").toLowerCase() === "yes";
    }

    function updateGSTVisibility() {
        const gstOn = isGSTApplicable();
        const shopOn = isShopDetailsApplicable();
        const shopGstOn = isShopGSTINApplicable();
        const showShopGST = shopOn && shopGstOn;

        // Customer GSTIN depends only on GST Applicable.
        setVisible("customerGstinField", gstOn);

        setVisible(
            "previewCustomerGstinRow",
            gstOn && Boolean(value("customerGstin"))
        );

        // Shop details have their own setting.
        setVisible("previewShopDetails", shopOn);

        // Shop GSTIN is independent of Customer GST Applicable.
        setVisible("previewShopGstinRow", showShopGST);

        // GST-specific preview rows only.
        document.querySelectorAll(
            ".gst-line, .gst-preview-total"
        ).forEach(function (el) {
            el.hidden = !showShopGST;
            el.style.display = showShopGST ? "" : "none";
        });

        // GST percentage input.
        const gstRate = $("gstRate");

        if (gstRate) {
            const wrapper =
                gstRate.closest(".gst-rate-field") ||
                gstRate.closest("label");

            const target = wrapper || gstRate;

            target.hidden = !showShopGST;
            target.style.display = showShopGST ? "" : "none";
        }
    }

    // ========================================================
    // 5. GET PRODUCTS
    // ========================================================

    function getProducts() {
        const tbody = $("productRows");
        if (!tbody) return [];

        return Array.from(tbody.querySelectorAll(".product-row")).map(
            function (row, index) {
               

const name = row.querySelector("input.item-name");
const hsn = row.querySelector("input.item-hsn");
const qty = row.querySelector("input.item-qty");
const rate = row.querySelector("input.item-rate");
const discount = row.querySelector("input.item-discount");



                const quantityText = String(qty?.value ?? "").trim();
                const rateText = String(rate?.value ?? "").trim();
                const discountText = String(discount?.value ?? "").trim();
                const quantity = numberValue(quantityText);
                const price = numberValue(rateText);
                const gross = Math.round((quantity * price + Number.EPSILON) * 100) / 100;

                // Item discount applies only to this product row.
                const enteredRowDiscount = numberValue(discountText);
                const rowDiscount = Math.min(enteredRowDiscount, gross);
                const amount = Math.max(0, Math.round((gross - rowDiscount + Number.EPSILON) * 100) / 100);

                // Keep Amount blank on a newly added / incomplete row.
                const amountCell = row.querySelector(".amount");
                if (amountCell) {
                    amountCell.textContent = quantityText !== "" && rateText !== ""
                        ? amount.toFixed(2)
                        : "";
                }

                const serial = row.querySelector(".serial");
                if (serial) serial.textContent = String(index + 1);

                return {
                    name: name?.value?.trim() || "",
hsn: hsn?.value?.trim() || "",
                    quantity,
                    rate: price,
                    discount: rowDiscount,
                    amount,
                    hasQuantityAndRate: quantityText !== "" && rateText !== ""
                };
            }
        );
    }

    // ========================================================
    // 6. PRODUCT PREVIEW
    // ========================================================

    function updateProductPreview(products) {
        const tbody = $("previewProductRows");
        if (!tbody) return;

        tbody.replaceChildren();

        const showHSN = $("hsnToggle")?.checked ?? false;

        products.forEach(function (product, index) {
            const row = document.createElement("tr");

            const cells = [
                index + 1,
                product.name,
                ...(showHSN ? [product.hsn] : []),
                product.quantity > 0 ? product.quantity.toLocaleString("en-IN", {
                    maximumFractionDigits: 2
                }) + " pcs" : "",
                product.hasQuantityAndRate ? product.rate.toFixed(2) : "",
                product.hasQuantityAndRate ? product.amount.toFixed(2) : ""
            ];

            cells.forEach(function (text, cellIndex) {
                const td = document.createElement("td");
                td.textContent = String(text);

                if (cellIndex === 1) td.style.textAlign = "left";

                row.appendChild(td);
            });

            tbody.appendChild(row);
        });

        document.querySelectorAll(".preview-hsn-column").forEach(
            function (el) {
                el.hidden = !showHSN;
            }
        );
    }

    // ========================================================
    // 7. CALCULATE TOTALS
    // ========================================================

    function calculateTotals(products) {
        const roundMoney = (amount) => Math.round((amount + Number.EPSILON) * 100) / 100;

        // Gross item total before either discount.
        const itemTotal = roundMoney(products.reduce(
            (sum, product) => sum + (product.quantity * product.rate),
            0
        ));

        // Discount 1: individual product-row discounts.
        const rowDiscount = roundMoney(products.reduce(
            (sum, product) => sum + product.discount,
            0
        ));

        // Discount 2: overall invoice discount. Kept independent from row discounts.
        const extraDiscountEntered = numberValue(value("discountInput"));
        const extraDiscount = roundMoney(Math.min(
            extraDiscountEntered,
            Math.max(0, itemTotal - rowDiscount)
        ));
        const totalDiscount = roundMoney(rowDiscount + extraDiscount);
        const subtotal = roundMoney(Math.max(0, itemTotal - totalDiscount));

        // GST is controlled by the independent Shop Details settings.
        const showGST = isShopDetailsApplicable() && isShopGSTINApplicable();
        const gstRate = showGST ? numberValue(value("gstRate")) : 0;
        const cgst = roundMoney(subtotal * (gstRate / 2) / 100);
        const sgst = roundMoney(subtotal * (gstRate / 2) / 100);
        const grandTotal = Math.round(subtotal + cgst + sgst);

        if ($("itemTotal")) $("itemTotal").value = itemTotal.toFixed(2);
        if ($("subTotal")) $("subTotal").value = subtotal.toFixed(2);
        if ($("cgstInput")) $("cgstInput").value = cgst.toFixed(2);
        if ($("sgstInput")) $("sgstInput").value = sgst.toFixed(2);

        setText("finalItemTotal", money(itemTotal));
        setText("finalDiscount", "− " + money(totalDiscount));
        setText("finalSubTotal", money(subtotal));
        setText("finalCgst", money(cgst));
        setText("finalSgst", money(sgst));
        setText("grandTotal", money(grandTotal));
        updatePaymentQrCode(grandTotal);
        setText("previewItemTotal", money(itemTotal));
        setText("previewDiscount", money(totalDiscount));
        setText("previewSubTotal", money(subtotal));
        setText("previewCgst", money(cgst));
        setText("previewSgst", money(sgst));
        setText("previewGrandTotal", money(grandTotal));

        const halfRate = gstRate / 2;
        setText("finalCgstLabel", "CGST (" + halfRate + "%)");
        setText("finalSgstLabel", "SGST (" + halfRate + "%)");
        setText("previewCgstLabel", "CGST (" + halfRate + "%)");
        setText("previewSgstLabel", "SGST (" + halfRate + "%)");
        setText("previewAmountWords", amountInWords(grandTotal));

        updateGSTVisibility();

        return {
            itemTotal,
            rowDiscount,
            extraDiscount,
            discount: totalDiscount,
            subtotal,
            cgst,
            sgst,
            grandTotal,
            gstRate,
            gstApplicable: isGSTApplicable(),
            shopGstApplicable: showGST
        };
    }

    // ========================================================
    // 8. CUSTOMER AND INVOICE PREVIEW
    // ========================================================

    function updateCustomerPreview() {
        const addressParts = [
            value("customerAddress"),
            value("customerCity"),
            value("customerState"),
            value("customerPin")
        ].filter(Boolean);

        setText("previewCustomerName", value("customerName"));
        setText("previewCustomerMobile", value("customerMobile"));
        setText("previewCustomerAddress", addressParts.join(", "));
        setText("previewCustomerGstin", value("customerGstin"));

        updateGSTVisibility();
    }

    function updateInvoiceMeta() {
        setText("previewInvoiceNumber", value("invoiceNumber"));
        setText("previewInvoiceDate", formatDate(value("invoiceDate")));
        setText("previewPaymentMode", value("paymentMode"));
    }

    function updateUTRPreview() {
        const utr = value("utrInput");

        setVisible("previewUtrSection", Boolean(utr));
        setText("previewUtr", utr);
    }

    function refreshInvoice() {
        const products = getProducts();

        updateProductPreview(products);
        calculateTotals(products);
        updateCustomerPreview();
        updateInvoiceMeta();
        updateUTRPreview();
    }

    // ========================================================
    // 9. VALIDATION FOR SAVE / PRINT
    // ========================================================

    function validateInvoice() {
        const requiredFields = [
            ["customerName", "Customer Name"],
            ["customerMobile", "Mobile No."],
            ["customerAddress", "Address"],
            ["customerCity", "City"],
            ["customerState", "State"],
            ["customerPin", "PIN Code"],
            ["invoiceNumber", "Invoice No."],
            ["paymentMode", "Payment Mode"]
        ];

        for (const [id, label] of requiredFields) {
            const el = $(id);

            if (!el || !String(el.value).trim()) {
                alert(label + " भरना अनिवार्य है।");

                if (el) {
                    el.focus();
                    el.reportValidity?.();
                }

                return false;
            }
        }

        const mobile = value("customerMobile");

        if (!/^[6-9][0-9]{9}$/.test(mobile)) {
            alert("सही 10 अंकों का Mobile No. भरें।");
            $("customerMobile")?.focus();
            return false;
        }

        if (!/^[0-9]{6}$/.test(value("customerPin"))) {
            alert("PIN Code में ठीक 6 अंक भरें।");
            $("customerPin")?.focus();
            return false;
        }

        if (isGSTApplicable()) {
            const gstin = value("customerGstin").toUpperCase();

            if (!gstin) {
                alert(
                    "GST Applicable = Yes है। Customer GSTIN भरना अनिवार्य है।"
                );
                $("customerGstin")?.focus();
                return false;
            }

            if (
                !/^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z][A-Z0-9]Z[A-Z0-9]$/.test(gstin)
            ) {
                alert("Customer GSTIN का format सही नहीं है।");
                $("customerGstin")?.focus();
                return false;
            }
        }

        const products = getProducts();
        const hasValidProduct = products.some(
            (p) => p.name && p.quantity > 0
        );

        if (!hasValidProduct) {
            alert("कम-से-कम एक Item / Description और Quantity भरें।");
            document.querySelector(".item-name")?.focus();
            return false;
        }

        if (!value("paymentMode")) {
            alert("Payment Mode चुनें।");
            $("paymentMode")?.focus();
            return false;
        }

        return true;
    }

    // ========================================================
    // 10. MOBILE NUMBER — DIGITS ONLY
    // ========================================================

    const mobileInput = $("customerMobile");

    if (mobileInput) {
        mobileInput.setAttribute("inputmode", "numeric");
        mobileInput.setAttribute("maxlength", "10");
        mobileInput.setAttribute("autocomplete", "off");

        mobileInput.addEventListener("input", function () {
            mobileInput.value = mobileInput.value
                .replace(/[^0-9]/g, "")
                .slice(0, 10);

            refreshInvoice();
        });
    }

    // ========================================================
    // 11. UTR AND REFERENCE NUMBER — MAX 12 DIGITS
    // ========================================================

    function addNumbersOnlyValidation(id) {
        const input = $(id);
        if (!input) return;

        input.setAttribute("inputmode", "numeric");
        input.setAttribute("maxlength", "12");
        input.setAttribute("autocomplete", "off");

        input.addEventListener("input", function () {
            input.value = input.value
                .replace(/[^0-9]/g, "")
                .slice(0, 12);

            refreshInvoice();
        });
    }

    addNumbersOnlyValidation("utrInput");
    addNumbersOnlyValidation("referenceNo");
    addNumbersOnlyValidation("refNo");

    // ========================================================
    // 12. ADD AND DELETE PRODUCT ROWS
    // ========================================================

    function addProductRow() {
        const tbody = $("productRows");
        if (!tbody) return;

        const row = document.createElement("tr");
        row.className = "product-row";

        const definitions = [
            { cls: "serial", text: "" },
            {
                cls: "item-name",
                input: true,
                type: "text",
                placeholder: "Item / Description",
                value: ""
            },
            {
                cls: "item-hsn hsn-column",
                input: true,
                type: "text",
                placeholder: "HSN",
                value: ""
            },
            {
                cls: "item-qty",
                input: true,
                type: "number",
                value: "",
                min: "0",
                step: "0.01"
            },
            {
                cls: "item-rate",
                input: true,
                type: "number",
                value: "",
                min: "0",
                step: "0.01"
            },
            {
                cls: "item-discount",
                input: true,
                type: "number",
                value: "",
                min: "0",
                step: "0.01"
            },
            { cls: "amount", text: "" },
            { button: true }
        ];

        definitions.forEach(function (def) {
            const td = document.createElement("td");

            if (def.cls) td.className = def.cls;

            if (def.input) {
                const input = document.createElement("input");

                input.className = def.cls
                    .replace("hsn-column", "")
                    .trim();

                input.type = def.type;
                input.value = def.value ?? "";
                input.placeholder = def.placeholder || "";

                if (def.min !== undefined) input.min = def.min;
                if (def.step !== undefined) input.step = def.step;

                td.appendChild(input);
            } else if (def.button) {
                 const btn = document.createElement("button");

    btn.type = "button";
    btn.className = "delete-btn";
    btn.innerHTML = `
        <svg viewBox="0 0 24 24"
             aria-hidden="true"
             focusable="false">
            <path d="M4 7h16M9 7V4h6v3m-9 0 1 13h10l1-13M10 10v7m4-7v7" />
        </svg>
    `;
    btn.setAttribute("aria-label", "Delete item");
    btn.title = "Delete item";

    td.appendChild(btn);
            } else {
                td.textContent = def.text ?? "";
            }

            row.appendChild(td);
        });

        tbody.appendChild(row);

        const showHSN = $("hsnToggle")?.checked ?? false;

        row.querySelectorAll(".hsn-column").forEach(function (el) {
            el.hidden = !showHSN;
        });

        refreshInvoice();
    }

    const productRows = $("productRows");

    if (productRows) {
        productRows.addEventListener("input", refreshInvoice);
        productRows.addEventListener("change", refreshInvoice);

        productRows.addEventListener("click", function (event) {
            const button = event.target.closest(".delete-btn");
            if (!button) return;

            const row = button.closest(".product-row");

            if (row) {
                row.remove();
                refreshInvoice();
            }
        });
    }

    if ($("addItemBtn")) {
        $("addItemBtn").addEventListener("click", addProductRow);
    }

    // ========================================================
    // 13. HSN TOGGLE (OFF by default)
    // ========================================================

    if ($("hsnToggle")) {
        $("hsnToggle").checked = false;
        document.querySelectorAll(".hsn-column, .preview-hsn-column").forEach(
            function (el) { el.hidden = true; }
        );

        $("hsnToggle").addEventListener("change", function () {
            const show = this.checked;

            document.querySelectorAll(
                ".hsn-column, .preview-hsn-column"
            ).forEach(function (el) {
                el.hidden = !show;
            });

            refreshInvoice();
        });
    }

    // ========================================================
    // 14. LOCAL INVOICE SAVING
    // ========================================================

    const STORAGE_KEY = "rajan_printing_press_saved_invoices";

    function getInvoiceData() {
        const totals = calculateTotals(getProducts());

        return {
            savedAt: new Date().toISOString(),

            invoice: {
                number: value("invoiceNumber"),
                date: value("invoiceDate"),
                paymentMode: value("paymentMode")
            },

            customer: {
                name: value("customerName"),
                mobile: value("customerMobile"),
                address: value("customerAddress"),
                city: value("customerCity"),
                state: value("customerState"),
                pin: value("customerPin"),
                gstApplicable: isGSTApplicable(),
                gstin: isGSTApplicable()
                    ? value("customerGstin").toUpperCase()
                    : ""
            },

            shop: {
                detailsApplicable: isShopDetailsApplicable(),
                gstinApplicable: isShopGSTINApplicable()
            },

            products: getProducts(),

            payment: {
                utr: value("utrInput"),
                referenceNo: value("referenceNo") || value("refNo")
            },

            totals
        };
    }


    // ========================================================
    // DJANGO SERVER SAVE + RIGHT SIDE INVOICE QR
    // ========================================================

    // Django CSRF token प्राप्त करें
    function getCsrfToken() {
        const input = document.querySelector(
            '[name="csrfmiddlewaretoken"]'
        );

        if (input) return input.value;

        const cookie = document.cookie
            .split("; ")
            .find(item => item.startsWith("csrftoken="));

        return cookie
            ? decodeURIComponent(
                cookie.substring("csrftoken=".length)
            )
            : "";
    }

    // Save/update current invoice on Django. Header QR always encodes the public website.
    let currentInvoiceToken = "";

    const RAJAN_WEBSITE_URL = "https://rajanpress.com/";
    const HEADER_QR_ENDPOINT = "https://api.qrserver.com/v1/create-qr-code/?size=220x220&data=";

    function updatePaperHeaderQr() {
        const qr = document.querySelector(".paper-header-qr");
        if (!qr) {
            console.warn('Invoice header QR element ".paper-header-qr" was not found.');
            return false;
        }
        // Cache-buster changes image URL on each requested button click; encoded destination remains the website.
        qr.src = HEADER_QR_ENDPOINT + encodeURIComponent(RAJAN_WEBSITE_URL) + "&v=" + Date.now();
        qr.alt = "Scan to open Rajan Press website";
        qr.dataset.qrDestination = RAJAN_WEBSITE_URL;
        return true;
    }

    // Initial QR destination on page load.
    updatePaperHeaderQr();

    async function saveInvoiceToServer() {
        const invoiceData = getInvoiceData();
        if (currentInvoiceToken) invoiceData.token = currentInvoiceToken;

        try {
            const response = await fetch("/invoice/save-public/", {
                method: "POST",
                credentials: "same-origin",
                headers: {
                    "Content-Type": "application/json",
                    "X-CSRFToken": getCsrfToken()
                },
                body: JSON.stringify(invoiceData)
            });

            const responseText = await response.text();
            let result;
            try {
                result = JSON.parse(responseText);
            } catch (_) {
                throw new Error("Django ne valid JSON response nahi diya (HTTP " + response.status + ").");
            }

            if (!response.ok || !result.success || !result.token || !result.url) {
                throw new Error(result.error || "Invoice server par save nahi hua.");
            }

            currentInvoiceToken = result.token;
updatePaperHeaderQr();
updateInvoicePreviewQr(result.token);

            return { success: true, token: result.token, url: result.url, invoice_number: result.invoice_number };
        } catch (error) {
            console.error("Invoice server save error:", error);
            alert("Invoice server par save nahi hua: " + error.message);
            return null;
        }
    }


    function saveInvoiceLocally() {
        try {
            const invoice = getInvoiceData();

            const saved = JSON.parse(
                localStorage.getItem(STORAGE_KEY) || "[]"
            );

            const existingIndex = saved.findIndex(function (item) {
                return item.invoice &&
                    item.invoice.number === invoice.invoice.number;
            });

            if (existingIndex >= 0) {
                saved[existingIndex] = invoice;
            } else {
                saved.push(invoice);
            }

            localStorage.setItem(STORAGE_KEY, JSON.stringify(saved));
            return true;
        } catch (error) {
            console.error("Invoice save failed:", error);

            alert(
                "Invoice browser storage में save नहीं हो पाया। " +
                "Browser storage की जगह खाली करें या settings जाँचें।"
            );

            return false;
        }
    }

 
 // ========================================================
// PRINT INVOICE — KEEP OTHER FUNCTIONS UNCHANGED
// ========================================================
async function printInvoice() {
    refreshInvoice();
    if (!validateInvoice()) return;
    if (!saveInvoiceLocally()) return;

    const saved = await saveInvoiceToServer();
    if (!saved) return;
    updateInvoicePreviewQr(saved.token);
    updatePaperHeaderQr();
    window.print();
}



    // ========================================================
    // DOWNLOAD PDF - SAVE ON SERVER FIRST
    // ========================================================
async function downloadPDF() {
    refreshInvoice();
    if (!validateInvoice()) return;
    if (!saveInvoiceLocally()) return;

    const saved = await saveInvoiceToServer();
if (!saved) return;

updateInvoicePreviewQr(saved.token);
    updatePaperHeaderQr();
    // Browser print dialog mein Destination = Save as PDF select karein.
    window.print();
}


    // ========================================================
    // PRINT INVOICE BUTTON
    // ========================================================
    const printButton = $("printBtn");

    if (printButton) {
        printButton.addEventListener("click", function (event) {
            event.preventDefault();
            printInvoice();
        });
    }

    // ========================================================
    // DOWNLOAD PDF BUTTON
    // ========================================================
    const pdfButton = $("pdfBtn");

    if (pdfButton) {
        pdfButton.addEventListener("click", function (event) {
            event.preventDefault();
            downloadPDF();
        });
    }


    // ========================================================
    // 17. NEW INVOICE — SAVE AND START ANOTHER
    // ========================================================


    // ========================================================
    // NEW INVOICE - SAVE CURRENT INVOICE ON SERVER FIRST
    // ========================================================
    async function newInvoice() {
        // Recalculate and validate the current invoice before saving.
        refreshInvoice();
        if (!validateInvoice()) return;

        const button = $("newInvoiceBtn") || $("newInvoice");
        if (button && button.dataset.saving === "true") return;

        if (button) {
            button.dataset.saving = "true";
            button.setAttribute("aria-busy", "true");
            button.style.pointerEvents = "none";
        }

        try {
            const serverSaved = await saveInvoiceToServer();
            if (!serverSaved) return;

            updatePaperHeaderQr();
            // SAME TAB: preserve the original New Invoice behavior.
            window.location.reload();
        } finally {
            if (button) {
                button.dataset.saving = "false";
                button.removeAttribute("aria-busy");
                button.style.pointerEvents = "";
            }
        }
    }


    const newInvoiceBtn =
        $("newInvoiceBtn") ||
        $("newInvoice");

    
    // New Invoice button - async function call
    if (newInvoiceBtn) {
        newInvoiceBtn.addEventListener("click", async function (event) {
            event.preventDefault();
            await newInvoice();
        });
    }


    // ========================================================
    // 18. RESET — CLEAR EVERYTHING WITHOUT VALIDATION OR SAVE
    // ========================================================

    function resetInvoiceForm() {
    const invoiceNumber = $("invoiceNumber");
    const currentInvoiceNumber = invoiceNumber ? invoiceNumber.value : "";

    // Customer aur invoice ke user-entry fields clear karein.
    [
        "customerName",
        "customerMobile",
        "customerAddress",
        "customerCity",
        "customerState",
        "customerPin",
        "customerGstin",
        "invoiceDate",
        "paymentMode",
        "discountInput",
        "utrInput",
        "referenceNo",
        "refNo"
    ].forEach(function (id) {
        const field = $(id);
        if (field) field.value = "";
    });

    // Reset ke baad current date set karein
    setCurrentInvoiceDate();

    // Invoice Number bilkul same rahega.
    if (invoiceNumber) {
        invoiceNumber.value = currentInvoiceNumber;
    }

    // Product Table mein sirf ek blank row.
    const tbody = $("productRows");
    if (tbody) {
        tbody.replaceChildren();
    }

    // HSN toggle ka existing behaviour preserve karein.
    if ($("hsnToggle")) {
        $("hsnToggle").checked = false;

        document.querySelectorAll(
            ".hsn-column, .preview-hsn-column"
        ).forEach(function (el) {
            el.hidden = true;
        });
    }

    // Existing calculation aur preview functions ko use karein.
    // Shop Details ke settings/fields ko change nahi karna hai.
    setCurrentInvoiceDate();
refreshInvoice();
const invoiceDate = document.getElementById("invoiceDate");
const previewInvoiceDate = document.getElementById("previewInvoiceDate");

if (invoiceDate && previewInvoiceDate) {
    previewInvoiceDate.textContent = formatDate(invoiceDate.value);
}
    // Purane customer aur invoice totals preview se clear karein.
    [
        "previewCustomerName",
        "previewCustomerMobile",
        "previewCustomerAddress",
        "previewCustomerGstin",
        "previewPaymentMode",
        "previewUtr",
        "previewItemTotal",
        "previewDiscount",
        "previewSubTotal",
        "previewCgst",
        "previewSgst",
        "previewGrandTotal",
        "previewAmountWords",
        "finalItemTotal",
        "finalDiscount",
        "finalSubTotal",
        "finalCgst",
        "finalSgst",
        "grandTotal",
        "itemTotal",
        "subTotal",
        "cgstInput",
        "sgstInput"
    ].forEach(function (id) {
        const el = $(id);
        if (!el) return;

        if ("value" in el) {
            el.value = "";
        } else {
            el.textContent = "";
        }
    });

    // UTR preview ko hide karein.
    setVisible("previewUtrSection", false);

    // Payment QR ko clear karein; Invoice QR aur Shop Preview ko
    // yahan manually change nahi karna hai.
    const paymentQR = $("paymentQrCode");
    if (paymentQR) paymentQR.removeAttribute("src");
}

const resetBtn = $("resetBtn");

if (resetBtn) {
    resetBtn.addEventListener("click", function (event) {
        event.preventDefault();
        event.stopPropagation();
        resetInvoiceForm();
    });
}

    // ========================================================
    // 19. REFRESH ON INPUT CHANGES
    // ========================================================

    [
        "customerName",
        "customerMobile",
        "customerAddress",
        "customerCity",
        "customerState",
        "customerPin",
        "customerGstin",
        "invoiceNumber",
        "invoiceDate",
        "paymentMode",
        "gstApplicable",
        "gstRate",
        "shopDetailsApplicable",
        "shopGstinApplicable",
        "discountInput",
        "utrInput",
        "referenceNo",
        "refNo"
    ].forEach(function (id) {
        const el = $(id);

        if (el) {
            el.addEventListener("input", refreshInvoice);
            el.addEventListener("change", refreshInvoice);
        }
    });

    // Prevent normal form submission from bypassing validation.
    const invoiceForm = $("invoiceForm");

    if (invoiceForm) {
        invoiceForm.addEventListener("submit", function (event) {
            event.preventDefault();
            refreshInvoice();

            if (!validateInvoice()) return;

            saveInvoiceLocally();
        });
    }

    // ========================================================
// 20. INITIAL PAGE LOAD — CLEAR FORM FIELDS
// ========================================================

function initializeInvoicePage() {
    const fieldsToClear = [
        "customerName",
        "customerMobile",
        "customerAddress",
        "customerCity",
        "customerState",
        "customerPin",
        "customerGstin",
        "paymentMode",
        "discountInput",
        "utrInput",
        "referenceNo",
        "refNo"
    ];

    // Clear specified fields on page load.
    fieldsToClear.forEach(function (id) {
        const field = document.getElementById(id);
        if (field) {
            field.value = "";
        }
    });


    // Refresh using existing preview and calculation functions.
    refreshInvoice();
}

// Initialize the invoice page on load.
initializeInvoicePage();

}); // Close DOMContentLoaded callback


// ========================================================
// 21. PAYMENT QR CODE — GENERATE UPI PAYMENT QR
// ========================================================

function updatePaymentQrCode(grandTotal) {
    const qrImage = document.getElementById("paymentQrCode");

    if (!qrImage) return;

    const amount = Number(grandTotal);

    // Clear QR when amount is zero or invalid.
    if (!Number.isFinite(amount) || amount <= 0) {
        qrImage.removeAttribute("src");
        return;
    }

    // Create UPI payment URL.
    const upiUrl = new URL("upi://pay");

    upiUrl.searchParams.set("pa", "8340434513-2@axl");
    upiUrl.searchParams.set(
        "pn",
        "Rajan Printing Press & Enterprises"
    );
    upiUrl.searchParams.set("am", amount.toFixed(2));
    upiUrl.searchParams.set("cu", "INR");

    // Generate payment QR code.
    qrImage.src =
        "https://api.qrserver.com/v1/create-qr-code/?size=220x220&data=" +
        encodeURIComponent(upiUrl.toString());
}

function updateInvoicePreviewQr(invoiceToken) {
    const invoiceQr = document.getElementById("invoicePreviewQr");

    if (!invoiceQr || !invoiceToken) return;

    const invoiceUrl =
        `${window.location.origin}/invoice-preview/${encodeURIComponent(invoiceToken)}/`;

    invoiceQr.src =
        "https://api.qrserver.com/v1/create-qr-code/?size=220x220&data=" +
        encodeURIComponent(invoiceUrl);
}

/*
 * Rajan Printing Press - Numeric Fields Fix
 * Include this script after Invoice_Create.js, or paste it at the end
 * of Invoice_Create.js. Uses event delegation, so dynamically added
 * product rows are covered too.
 */
(function () {
    "use strict";

    // Block mouse-wheel changes on numeric fields without disabling page scrolling.
    document.addEventListener("wheel", function (event) {
        const field = event.target.closest('input[type="number"]');
        if (field && document.activeElement === field) {
            event.preventDefault();
        }
    }, { passive: false });

    // Prevent scientific notation and signs in number inputs.
    document.addEventListener("keydown", function (event) {
        const field = event.target.closest('input[type="number"]');
        if (!field || event.ctrlKey || event.metaKey || event.altKey) return;

        const blockedKeys = ["e", "E", "+", "-"];
        if (blockedKeys.includes(event.key)) {
            event.preventDefault();
        }
    });

    // Sanitize pasted/typed values: digits and at most one decimal point.
    // Integer fields (step="1") are restricted to digits only.
    document.addEventListener("input", function (event) {
        const field = event.target.closest('input[type="number"]');
        if (!field || field.readOnly || field.disabled) return;

        const integerOnly = field.step === "1";
        let value = field.value;

        if (integerOnly) {
            value = value.replace(/[^\d]/g, "");
        } else {
            value = value.replace(/[^\d.]/g, "");
            const firstDot = value.indexOf(".");
            if (firstDot !== -1) {
                value = value.slice(0, firstDot + 1) +
                    value.slice(firstDot + 1).replace(/\./g, "");
            }
        }

        if (field.value !== value) {
            const start = field.selectionStart;
            field.value = value;
            // Number inputs do not consistently support selection ranges;
            // setting the value is sufficient for sanitizing the input.
        }
    });

    // Remove the browser spinner arrows as an extra safeguard.
    const style = document.createElement("style");
    style.textContent = `
        input[type="number"],
        input[type="number"]:hover,
        input[type="number"]:focus {
            -moz-appearance: textfield !important;
            appearance: textfield !important;
        }
        input[type="number"]::-webkit-inner-spin-button,
        input[type="number"]::-webkit-outer-spin-button {
            -webkit-appearance: none !important;
            appearance: none !important;
            margin: 0 !important;
        }
    `;
    document.head.appendChild(style);
})();


/*
 * Rajan Printing Press - Numeric Input Fix
 * Features:
 * 1. Prevent mouse-wheel changes on number fields.
 * 2. Hide number input spinner arrows.
 * 3. Block e/E/+/- in number inputs.
 * 4. Strip leading zeros while typing (e.g. 00025 -> 25).
 * 5. Allow one decimal point for decimal fields.
 *
 * Include this script AFTER Invoice_Create.js in Invoice_Create.html.
 */
(function () {
    "use strict";

    function normalizeNumericValue(field) {
        if (!field || field.readOnly || field.disabled) return;

        const integerOnly = field.step === "1";
        let value = String(field.value ?? "");

        // Only digits and, for decimal fields, one decimal point.
        if (integerOnly) {
            value = value.replace(/\D/g, "");
        } else {
            value = value.replace(/[^\d.]/g, "");
            const dotIndex = value.indexOf(".");
            if (dotIndex !== -1) {
                value = value.slice(0, dotIndex + 1) +
                    value.slice(dotIndex + 1).replace(/\./g, "");
            }
        }

        // Remove leading zeros from the integer part, preserving a single
        // zero before a decimal (e.g. 0.50) and preserving "0." while typing.
        if (value && !value.startsWith(".")) {
            const parts = value.split(".");
            parts[0] = parts[0].replace(/^0+(?=\d)/, "");
            if (parts[0] === "" && parts.length > 1) parts[0] = "0";
            value = parts.join(".");
        } else if (value.startsWith(".")) {
            value = "0" + value;
        }

        if (field.value !== value) {
            field.value = value;
            // Let the existing invoice calculation listeners update totals.
            field.dispatchEvent(new Event("input", { bubbles: true }));
        }
    }

    // Prevent mouse-wheel from changing a focused number field.
    document.addEventListener("wheel", function (event) {
        const field = event.target.closest('input[type="number"]');
        if (field && document.activeElement === field) {
            event.preventDefault();
        }
    }, { passive: false });

    // Block scientific notation and signs in number fields.
    document.addEventListener("keydown", function (event) {
        const field = event.target.closest('input[type="number"]');
        if (!field || event.ctrlKey || event.metaKey || event.altKey) return;

        if (["e", "E", "+", "-"].includes(event.key)) {
            event.preventDefault();
        }
    });

    // Sanitize input and remove leading zeros, including dynamically added rows.
    document.addEventListener("input", function (event) {
        const field = event.target.closest('input[type="number"]');
        if (field) normalizeNumericValue(field);
    });

    // Sanitize pasted values too.
    document.addEventListener("change", function (event) {
        const field = event.target.closest('input[type="number"]');
        if (field) normalizeNumericValue(field);
    });

    // Hide browser spinner arrows.
    const style = document.createElement("style");
    style.textContent = `
        input[type="number"],
        input[type="number"]:hover,
        input[type="number"]:focus {
            -moz-appearance: textfield !important;
            appearance: textfield !important;
        }
        input[type="number"]::-webkit-inner-spin-button,
        input[type="number"]::-webkit-outer-spin-button {
            -webkit-appearance: none !important;
            appearance: none !important;
            margin: 0 !important;
        }
    `;
    document.head.appendChild(style);
})();

/* Rajan Printing Press - Keyboard Navigation v3
 * Add this script AFTER the main invoice JavaScript.
 * Fixes keyboard navigation in Customer Name, Mobile No, Address and other
 * invoice fields, as well as dynamically-added product rows.
 */
(() => {
  'use strict';
  const FIELD_SELECTOR = [
    'input:not([type="hidden"]):not([type="button"]):not([type="submit"]):not([type="reset"]):not([type="image"]):not([disabled]):not([readonly])',
    'select:not([disabled])',
    'textarea:not([disabled]):not([readonly])',
    '[contenteditable="true"]'
  ].join(',');

  function isVisible(el) {
    return el instanceof HTMLElement && el.getClientRects().length > 0 &&
      getComputedStyle(el).visibility !== 'hidden' &&
      !el.closest('[hidden], [aria-hidden="true"]');
  }
  function isField(el) {
    return el instanceof HTMLElement && el.matches(FIELD_SELECTOR) &&
      !el.matches(':disabled,[readonly]') && isVisible(el);
  }
  function allFields() {
    return Array.from(document.querySelectorAll(FIELD_SELECTOR)).filter(isField);
  }
  function rowFields(row) {
    return Array.from(row.querySelectorAll(FIELD_SELECTOR)).filter(isField);
  }
  function focusField(el) {
    if (el && isField(el)) el.focus({ preventScroll: false });
  }
  function isSelectOrNumber(el) {
    return el instanceof HTMLSelectElement ||
      (el instanceof HTMLInputElement && ['number','date','time','checkbox','radio'].includes(el.type));
  }
  function caretAtStart(el) {
    try { return typeof el.selectionStart === 'number' && el.selectionStart === 0; }
    catch (_) { return false; }
  }
  function caretAtEnd(el) {
    try { return typeof el.selectionEnd === 'number' && el.selectionEnd === el.value.length; }
    catch (_) { return false; }
  }

  document.addEventListener('keydown', function (e) {
    const current = e.target instanceof HTMLElement ? e.target.closest(FIELD_SELECTOR) : null;
    if (!current || !isField(current) || e.ctrlKey || e.metaKey || e.altKey) return;

    const fields = allFields();
    const index = fields.indexOf(current);
    if (index < 0) return;

    const table = current.closest('.product-table');
    const row = table ? current.closest('tbody tr') : null;

    // Keep normal Tab navigation for the whole form, but explicitly skip row action buttons.
    // At the last editable cell of a product row, go to the next row's first editable cell.
    if (e.key === 'Tab' && table && row) {
      const rows = Array.from(table.querySelectorAll('tbody tr')).filter(r => rowFields(r).length);
      const rf = rowFields(row);
      const ri = rows.indexOf(row);
      if (!e.shiftKey && current === rf[rf.length - 1] && rows[ri + 1]) {
        e.preventDefault(); focusField(rowFields(rows[ri + 1])[0]); return;
      }
      if (e.shiftKey && current === rf[0] && rows[ri - 1]) {
        const prev = rowFields(rows[ri - 1]);
        e.preventDefault(); focusField(prev[prev.length - 1]); return;
      }
      return;
    }

    if (e.key === 'Tab') return; // browser's standard form order elsewhere
    if ((e.key === 'ArrowUp' || e.key === 'ArrowDown') && current instanceof HTMLTextAreaElement) return;

    let target = null;
    if (table && row) {
      const rows = Array.from(table.querySelectorAll('tbody tr')).filter(r => rowFields(r).length);
      const ri = rows.indexOf(row);
      const rf = rowFields(row);
      const ci = rf.indexOf(current);
      if (e.key === 'ArrowUp' || e.key === 'ArrowDown') {
        const nextRow = rows[ri + (e.key === 'ArrowUp' ? -1 : 1)];
        if (nextRow) {
          const nf = rowFields(nextRow);
          target = nf[Math.min(Math.max(ci, 0), nf.length - 1)] || null;
        }
      } else if (e.key === 'ArrowLeft' || e.key === 'ArrowRight') {
        const move = isSelectOrNumber(current) ||
          (e.key === 'ArrowLeft' && caretAtStart(current)) ||
          (e.key === 'ArrowRight' && caretAtEnd(current));
        if (move) target = rf[ci + (e.key === 'ArrowLeft' ? -1 : 1)] || fields[index + (e.key === 'ArrowLeft' ? -1 : 1)] || null;
      }
    } else {
      // Customer Name -> Mobile No -> Address and all other non-table fields.
      if (e.key === 'ArrowUp') target = fields[index - 1] || null;
      if (e.key === 'ArrowDown') target = fields[index + 1] || null;
      if (e.key === 'ArrowLeft' || e.key === 'ArrowRight') {
        const move = isSelectOrNumber(current) ||
          (e.key === 'ArrowLeft' && caretAtStart(current)) ||
          (e.key === 'ArrowRight' && caretAtEnd(current));
        if (move) target = fields[index + (e.key === 'ArrowLeft' ? -1 : 1)] || null;
      }
    }
    if (target && target !== current) { e.preventDefault(); focusField(target); }
  }, true);
})();



function loadInvoiceForEdit() {
    const dataElement = document.getElementById("edit-invoice-data");

    // Normal New Invoice mode: kuch change nahi karna
    if (!dataElement) return;

    let data;

    try {
        data = JSON.parse(dataElement.textContent);
    } catch (error) {
        console.error("Invoice data load nahi hua:", error);
        alert("Invoice ka saved data load nahi ho paya.");
        return;
    }

    // Purane invoice ka token rakhein
    if (window.EDIT_INVOICE_TOKEN) {
        currentInvoiceToken = window.EDIT_INVOICE_TOKEN;
    }

    function setField(id, fieldValue) {
        const element = document.getElementById(id);
        if (!element || fieldValue === undefined || fieldValue === null) return;

        if (element.type === "checkbox") {
            element.checked = Boolean(fieldValue);
        } else {
            element.value = String(fieldValue);
        }
    }

    // Invoice details
    setField("invoiceNumber", data.invoice?.number);
    setField("invoiceDate", data.invoice?.date);
    setField("paymentMode", data.invoice?.paymentMode);

    // Customer details
    setField("customerName", data.customer?.name);
    setField("customerMobile", data.customer?.mobile);
    setField("customerAddress", data.customer?.address);
    setField("customerCity", data.customer?.city);
    setField("customerState", data.customer?.state);
    setField("customerPin", data.customer?.pin);
    setField("customerGstin", data.customer?.gstin);

    // GST and shop settings
    setField("gstApplicable", data.customer?.gstApplicable ? "yes" : "no");
    setField("shopDetailsApplicable", data.shop?.detailsApplicable ? "yes" : "no");
    setField("shopGstinApplicable", data.shop?.gstinApplicable ? "yes" : "no");

    // Payment details
    setField("utrInput", data.payment?.utr);
    setField("referenceNo", data.payment?.referenceNo);
    setField("refNo", data.payment?.referenceNo);

    // Restore product rows
    const tbody = document.getElementById("productRows");

    if (tbody) {
        tbody.innerHTML = "";

        (Array.isArray(data.products) ? data.products : []).forEach(function (product) {
            addProductRow();

            const row = tbody.lastElementChild;
            if (!row) return;

            const name = row.querySelector(".item-name");
            const hsn = row.querySelector(".item-hsn");
            const qty = row.querySelector(".item-qty");
            const rate = row.querySelector(".item-rate");
            const discount = row.querySelector(".item-discount");

            if (name) name.value = product.name ?? "";
            if (hsn) hsn.value = product.hsn ?? "";
            if (qty) qty.value = product.quantity ?? "";
            if (rate) rate.value = product.rate ?? "";
            if (discount) discount.value = product.discount ?? "";
        });
    }

    // Refresh totals and invoice preview
    if (typeof refreshInvoice === "function") {
        refreshInvoice();
    }

    // Show or hide GSTIN fields according to the restored settings
    [
        "gstApplicable",
        "shopDetailsApplicable",
        "shopGstinApplicable"
    ].forEach(function (id) {
        const element = document.getElementById(id);

        if (element) {
            element.dispatchEvent(new Event("change", { bubbles: true }));
        }
    });
}

loadInvoiceForEdit();
