// =====================================
// Tahouri Entitlement Store
// Version 1.1
// =====================================

(function () {
    "use strict";

    const KEY = "Tahouri_Signed_Entitlement_v1";

    function readAll() {
        try {
            const raw = localStorage.getItem(KEY);
            if (!raw) return [];

            const data = JSON.parse(raw);

            // Backward compatibility: version 1.0 stored one envelope.
            if (Array.isArray(data)) return data;
            if (data && typeof data === "object") return [data];

            return [];
        } catch (error) {
            console.error("EntitlementStore: Read failed.", error);
            return [];
        }
    }

    function read() {
        const all = readAll();
        return all.length ? all[0] : null;
    }

    function write(entitlement) {
        try {
            if (!entitlement || typeof entitlement !== "object") return false;

            const all = readAll();
            const licenseId =
                entitlement.claims &&
                entitlement.claims.licenseId;

            const index = licenseId
                ? all.findIndex(item =>
                    item &&
                    item.claims &&
                    item.claims.licenseId === licenseId
                )
                : -1;

            if (index >= 0) {
                all[index] = entitlement;
            } else {
                all.push(entitlement);
            }

            localStorage.setItem(KEY, JSON.stringify(all));
            return true;
        } catch (error) {
            console.error("EntitlementStore: Write failed.", error);
            return false;
        }
    }

    function writeAll(entitlements) {
        try {
            if (!Array.isArray(entitlements)) return false;
            localStorage.setItem(KEY, JSON.stringify(entitlements));
            return true;
        } catch (error) {
            console.error("EntitlementStore: WriteAll failed.", error);
            return false;
        }
    }

    function clear() {
        try {
            localStorage.removeItem(KEY);
            return true;
        } catch (error) {
            console.error("EntitlementStore: Clear failed.", error);
            return false;
        }
    }

    window.TahouriEntitlementStore = {
        read,
        readAll,
        write,
        writeAll,
        clear,
        key: KEY
    };

    console.log("Tahouri Entitlement Store v1.1 Ready");
})();