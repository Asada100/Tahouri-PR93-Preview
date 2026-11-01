"use strict";

const PROVIDER = String(process.env.TAHOURI_PAYMENT_PROVIDER || "manual").trim().toLowerCase();

const PROVIDER_CONFIG = {
    zarinpal: {
        required: ["TAHOURI_PAYMENT_MERCHANT_ID", "TAHOURI_PAYMENT_CALLBACK_URL"]
    },
    idpay: {
        required: ["TAHOURI_PAYMENT_API_KEY", "TAHOURI_PAYMENT_CALLBACK_URL"]
    }
};

function assertProductionProviderConfiguration() {
    if (process.env.NODE_ENV !== "production") return;

    if (PROVIDER === "manual") {
        throw new Error("Manual payment verification is disabled in production.");
    }

    const config = PROVIDER_CONFIG[PROVIDER];
    if (!config) {
        throw new Error("Unsupported production payment provider: " + PROVIDER);
    }

    for (const name of config.required) {
        if (!process.env[name]) {
            throw new Error(name + " is required for payment provider " + PROVIDER);
        }
    }
}

function createPaymentRequest({ payment }) {
    if (PROVIDER === "manual") {
        if (process.env.NODE_ENV === "production") {
            throw new Error("Manual payment is disabled in production.");
        }
        return {
            provider: "manual",
            paymentId: payment.payment_id,
            status: "pending"
        };
    }

    throw new Error(
        "Payment gateway request adapter is not implemented for: " + PROVIDER
    );
}

async function verifyServerSide({ payment, authority }) {
    if (PROVIDER === "manual") {
        if (process.env.NODE_ENV === "production") {
            throw new Error("Manual payment verification is disabled in production.");
        }
        return Boolean(authority);
    }

    throw new Error(
        "Server-side payment verification adapter is not implemented for: " + PROVIDER
    );
}

assertProductionProviderConfiguration();

module.exports = {
    PROVIDER,
    createPaymentRequest,
    verifyServerSide
};
