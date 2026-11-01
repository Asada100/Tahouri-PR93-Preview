// =====================================
// Tahouri Edu Platform
// Toast Manager
// Version 1.0
// =====================================

const ToastManager = {

    containerId: "tahouri-toast-container",

    ensureContainer: function () {

        let container =
            document.getElementById(this.containerId);

        if (container) {
            return container;
        }

        container = document.createElement("div");
        container.id = this.containerId;
        container.className = "tahouri-toast-container";
        container.setAttribute("aria-live", "polite");
        container.setAttribute("aria-atomic", "true");

        document.body.appendChild(container);

        return container;

    },

    show: function (message, options) {

        const settings = options || {};
        const container = this.ensureContainer();
        const toast = document.createElement("div");

        toast.className =
            "tahouri-toast " +
            (settings.type ? "tahouri-toast-" + settings.type : "");

        toast.textContent = message || "";
        toast.setAttribute("role", "status");

        container.appendChild(toast);

        const duration =
            Number.isFinite(settings.duration)
                ? settings.duration
                : 3000;

        window.setTimeout(function () {

            toast.classList.add("is-hiding");

            window.setTimeout(function () {

                if (toast.parentNode) {
                    toast.parentNode.removeChild(toast);
                }

            }, 250);

        }, Math.max(500, duration));

        return toast;

    },

    success: function (message, options) {
        return this.show(message, Object.assign({}, options, { type: "success" }));
    },

    error: function (message, options) {
        return this.show(message, Object.assign({}, options, { type: "error" }));
    },

    info: function (message, options) {
        return this.show(message, Object.assign({}, options, { type: "info" }));
    }

};

window.ToastManager = ToastManager;

console.log("Toast Manager v1.0 Ready");
