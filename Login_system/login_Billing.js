
/* ============================================================
   RAJAN PRINTING PRESS
   LOGIN / SIGNUP FORM VALIDATION
   File: login_Billing.js
   ============================================================ */

"use strict";

document.addEventListener("DOMContentLoaded", function () {

    const $ = (id) => document.getElementById(id);

    const loginForm = $("loginForm");
    const signupForm = $("signupForm");
    const status = $("formStatus");

    if (!loginForm || !signupForm) {
        console.error("Login or Signup form not found. Check HTML IDs.");
        return;
    }

    /* ========================================================
       1. ERROR MESSAGE HANDLER
       ======================================================== */

    function setError(inputId, errorId, message) {
        const input = $(inputId);
        const error = $(errorId);

        if (input) {
            input.setAttribute(
                "aria-invalid",
                message ? "true" : "false"
            );
        }

        if (error) {
            error.textContent = message || "";
        }

        return message === "";
    }

    function clearStatus() {
        if (status) status.textContent = "";
    }

    /* ========================================================
       2. FIRST NAME VALIDATION
       First letter must be capital.
       Only English alphabets are allowed.
       Numbers and symbols are removed while typing.
       ======================================================== */

    function validateFirstName() {
        const input = $("firstName");
        if (!input) return false;

        const value = input.value;
        let message = "";

        if (!value) {
            message = "Please enter your First Name.";
        } else if (!/^[A-Z][a-zA-Z]*$/.test(value)) {
            message =
                "First Name must start with a capital letter and contain English alphabets only.";
        }

        return setError("firstName", "firstNameError", message);
    }

    const firstNameInput = $("firstName");

    if (firstNameInput) {
        firstNameInput.addEventListener("input", function () {
            let value = this.value.replace(/[^a-zA-Z]/g, "");

            if (value.length > 0) {
                value =
                    value.charAt(0).toUpperCase() +
                    value.slice(1);
            }

            this.value = value.slice(0, 50);

            validateFirstName();
            clearStatus();
        });

        firstNameInput.addEventListener("blur", validateFirstName);
    }

    /* ========================================================
       3. LAST NAME VALIDATION
       Only English alphabets are allowed.
       Numbers and symbols are removed while typing.
       ======================================================== */

    function validateLastName() {
        const input = $("lastName");
        if (!input) return false;

        const value = input.value;
        let message = "";

        if (!value) {
            message = "Please enter your Last Name.";
        } else if (!/^[A-Za-z]+$/.test(value)) {
            message = "Last Name must contain English alphabets only.";
        }

        return setError("lastName", "lastNameError", message);
    }

    const lastNameInput = $("lastName");

    if (lastNameInput) {
        lastNameInput.addEventListener("input", function () {
            this.value = this.value
                .replace(/[^a-zA-Z]/g, "")
                .slice(0, 50);

            validateLastName();
            clearStatus();
        });

        lastNameInput.addEventListener("blur", validateLastName);
    }

    /* ========================================================
       4. USERNAME VALIDATION
       Minimum 3 and maximum 14 characters.
       Must contain uppercase, lowercase and a symbol.
       ======================================================== */

    function validateUsername() {
        const input = $("signupUsername");
        if (!input) return false;

        const value = input.value.trim();
        let message = "";

        if (!value) {
            message = "Please enter a Username.";
        } else if (value.length < 3 || value.length > 14) {
            message = "Username must be 3-14 characters long.";
        } else if (!/[A-Z]/.test(value)) {
            message = "Username must contain at least one uppercase letter.";
        } else if (!/[a-z]/.test(value)) {
            message = "Username must contain at least one lowercase letter.";
        } else if (!/[^A-Za-z0-9]/.test(value)) {
            message = "Username must contain at least one special character.";
        } else if (!/^[A-Za-z0-9@_#!$%&*.+-]+$/.test(value)) {
            message = "Username contains an unsupported character.";
        }

        return setError("signupUsername", "usernameError", message);
    }

    const usernameInput = $("signupUsername");

    if (usernameInput) {
        usernameInput.addEventListener("input", function () {
            this.value = this.value.slice(0, 14);
            validateUsername();
            clearStatus();
        });

        usernameInput.addEventListener("blur", validateUsername);
    }

    /* ========================================================
       5. MOBILE NUMBER VALIDATION
       Exactly 10 digits, starting from 6-9.
       ======================================================== */

    function validateMobile() {
        const input = $("mobile");
        if (!input) return false;

        const value = input.value;
        let message = "";

        if (!value) {
            message = "Please enter your Mobile Number.";
        } else if (!/^[6-9][0-9]{9}$/.test(value)) {
            message = "Enter a valid 10-digit Indian mobile number.";
        }

        return setError("mobile", "mobileError", message);
    }

    const mobileInput = $("mobile");

    if (mobileInput) {
        mobileInput.addEventListener("input", function () {
            this.value = this.value.replace(/\D/g, "").slice(0, 10);
            validateMobile();
            clearStatus();
        });

        mobileInput.addEventListener("blur", validateMobile);
    }

    /* ========================================================
       6. EMAIL VALIDATION
       ======================================================== */

    function validateEmail() {
        const input = $("email");
        if (!input) return false;

        const value = input.value.trim();
        let message = "";

        if (!value) {
            message = "Please enter your Email Address.";
        } else if (!/^[^\s@]+@[^\s@]+\.[A-Za-z]{2,}$/.test(value)) {
            message = "Please enter a valid Email Address.";
        }

        return setError("email", "emailError", message);
    }

    /* ========================================================
       7. PASSWORD VALIDATION
       8-16 characters, uppercase, lowercase, number,
       and special character are required.
       ======================================================== */

    function validatePassword() {
        const input = $("signupPassword");
        if (!input) return false;

        const value = input.value;
        let message = "";

        if (!value) {
            message = "Please enter a Password.";
        } else if (value.length < 8 || value.length > 16) {
            message = "Password must be 8-16 characters long.";
        } else if (!/[A-Z]/.test(value)) {
            message = "Password must contain an uppercase letter.";
        } else if (!/[a-z]/.test(value)) {
            message = "Password must contain a lowercase letter.";
        } else if (!/[0-9]/.test(value)) {
            message = "Password must contain a number.";
        } else if (!/[^A-Za-z0-9]/.test(value)) {
            message = "Password must contain a special character.";
        }

        const valid = setError(
            "signupPassword",
            "passwordError",
            message
        );

        if ($("confirmPassword")?.value) {
            validateConfirmPassword();
        }

        return valid;
    }

    const passwordInput = $("signupPassword");

    if (passwordInput) {
        passwordInput.addEventListener("input", function () {
            validatePassword();
            clearStatus();
        });

        passwordInput.addEventListener("blur", validatePassword);
    }

    /* ========================================================
       8. CONFIRM PASSWORD VALIDATION
       Must exactly match the password.
       ======================================================== */

    function validateConfirmPassword() {
        const password = $("signupPassword");
        const confirm = $("confirmPassword");

        if (!password || !confirm) return false;

        let message = "";

        if (!confirm.value) {
            message = "Please confirm your Password.";
        } else if (password.value !== confirm.value) {
            message = "Passwords do not match.";
        }

        return setError(
            "confirmPassword",
            "confirmPasswordError",
            message
        );
    }

    const confirmInput = $("confirmPassword");

    if (confirmInput) {
        confirmInput.addEventListener("input", function () {
            validateConfirmPassword();
            clearStatus();
        });

        confirmInput.addEventListener("blur", validateConfirmPassword);
    }

    /* ========================================================
       9. LOGIN IDENTITY VALIDATION
       Username, email or mobile number is required.
       ======================================================== */

    function validateLoginIdentity() {
        const input = $("loginIdentity");
        if (!input) return false;

        const message = input.value.trim()
            ? ""
            : "Enter your Username, Email, or Mobile Number.";

        return setError("loginIdentity", "loginIdentityError", message);
    }

    /* ========================================================
       10. LOGIN PASSWORD VALIDATION
       ======================================================== */

    function validateLoginPassword() {
        const input = $("loginPassword");
        if (!input) return false;

        const message = input.value
            ? ""
            : "Please enter your Password.";

        return setError("loginPassword", "loginPasswordError", message);
    }

    ["loginIdentity", "loginPassword"].forEach(function (id) {
        const input = $(id);
        if (!input) return;

        const validator = id === "loginIdentity"
            ? validateLoginIdentity
            : validateLoginPassword;

        input.addEventListener("input", function () {
            validator();
            clearStatus();
        });

        input.addEventListener("blur", validator);
    });

    /* ========================================================
       11. SHOW / HIDE PASSWORD
       ======================================================== */

    document.querySelectorAll("[data-password-target]").forEach(function (button) {
        button.addEventListener("click", function () {
            const input = $(button.dataset.passwordTarget);
            if (!input) return;

            const show = input.type === "password";

            input.type = show ? "text" : "password";
            button.textContent = show ? "◎" : "◉";

            button.setAttribute(
                "aria-label",
                show ? "Hide password" : "Show password"
            );
        });
    });

    /* ========================================================
       12. STAFF / ADMIN DROPDOWN
       ======================================================== */

    const roleDropdown = $("roleDropdown");
    const roleTrigger = $("roleDropdownTrigger");
    const roleMenu = $("roleDropdownMenu");
    const roleInput = $("role");
    const selectedRoleText = $("selectedRoleText");

    function closeRoleMenu() {
        if (!roleMenu || !roleTrigger) return;

        roleMenu.hidden = true;
        roleTrigger.setAttribute("aria-expanded", "false");

        if (roleDropdown) {
            roleDropdown.classList.remove("is-open");
        }
    }

    if (roleTrigger && roleMenu) {
        roleTrigger.addEventListener("click", function () {
            const opening = roleMenu.hidden;

            roleMenu.hidden = !opening;
            roleTrigger.setAttribute("aria-expanded", String(opening));

            if (roleDropdown) {
                roleDropdown.classList.toggle("is-open", opening);
            }
        });

        roleMenu.querySelectorAll(".role-option").forEach(function (option) {
            option.addEventListener("click", function () {
                const value = option.dataset.value;

                if (roleInput) roleInput.value = value;

                if (selectedRoleText) {
                    selectedRoleText.textContent =
                        value === "admin"
                            ? "Admin (approval required)"
                            : "Staff";
                }

                roleMenu.querySelectorAll(".role-option").forEach(function (item) {
                    const selected = item === option;

                    item.classList.toggle("active", selected);
                    item.setAttribute("aria-selected", String(selected));
                });

                closeRoleMenu();
                clearStatus();
            });
        });

        document.addEventListener("click", function (event) {
            if (roleDropdown && !roleDropdown.contains(event.target)) {
                closeRoleMenu();
            }
        });

        document.addEventListener("keydown", function (event) {
            if (event.key === "Escape") closeRoleMenu();
        });
    }

        /* ========================================================
       13. LOGIN FORM SUBMISSION
       Validate the form, then submit it to Django.
       ======================================================== */

    loginForm.addEventListener("submit", function (event) {
        const validIdentity = validateLoginIdentity();
        const validPassword = validateLoginPassword();

        if (!validIdentity || !validPassword) {
            event.preventDefault();

            if (status) {
                status.textContent =
                    "Please correct the highlighted fields.";
            }
            return;
        }

        // Valid form: allow normal POST submission to Django.
        if (status) {
            status.textContent = "Logging in...";
        }
    });


    /* ========================================================
       14. SIGNUP FORM SUBMISSION
       Validate the form, then submit it to Django.
       ======================================================== */

    signupForm.addEventListener("submit", function (event) {
        const validations = [
            validateFirstName(),
            validateLastName(),
            validateUsername(),
            validateMobile(),
            validateEmail(),
            validatePassword(),
            validateConfirmPassword()
        ];

        if (validations.some(function (valid) {
            return !valid;
        })) {
            event.preventDefault();

            if (status) {
                status.textContent =
                    "Please correct the highlighted fields before signing up.";
            }
            return;
        }

        // Valid form: allow normal POST submission to Django.
        // Django will independently validate all submitted data.
        if (status) {
            status.textContent = "Creating your account...";
        }
    });

    /* ========================================================
       15. FORGOT PASSWORD
       ======================================================== */

    const forgotPassword = $("forgotPassword");

    if (forgotPassword) {
        forgotPassword.addEventListener("click", function (event) {
            event.preventDefault();

            if (status) {
                status.textContent =
                    "Password recovery must be connected to Django.";
            }
        });
    }

    /* ========================================================
       16. GOOGLE / OTP BUTTONS
       Backend integration is required for these features.
       ======================================================== */

    document.querySelectorAll(".social-button").forEach(function (button) {
        button.addEventListener("click", function () {
            if (status) {
                status.textContent =
                    "Google Login / OTP Login is not connected to the backend yet.";
            }
        });
    });

    /* ========================================================
       17. LOGIN / SIGNUP SWITCH
       ======================================================== */

    function setMode(mode) {
        const isSignup = mode === "signup";

        loginForm.hidden = isSignup;
        signupForm.hidden = !isSignup;

        if ($("formTitle")) {
            $("formTitle").textContent = isSignup
                ? "Create Account"
                : "Welcome Back";
        }

        if ($("formSubtitle")) {
            $("formSubtitle").textContent = isSignup
                ? "Create your Rajan Printing Press Billing System account"
                : "Login to Rajan Printing Press Billing System";
        }

        if ($("modeSwitchText")) {
            $("modeSwitchText").textContent = isSignup ? "Login" : "Sign Up";
        }

        if ($("switchIcon")) {
            $("switchIcon").textContent = isSignup ? "♟" : "♙+";
        }

        clearStatus();
    }

    const modeSwitch = $("modeSwitch");

    if (modeSwitch) {
        modeSwitch.addEventListener("click", function () {
            setMode(signupForm.hidden ? "signup" : "login");
        });
    }

    /* ========================================================
       18. INITIAL PAGE MODE
       ======================================================== */

    setMode("login");

});
