(() => {
    class ModalManager {
        constructor() {
            this.overlay = document.querySelector("[data-modal-overlay]");
            this.activeModal = null;

            this.hidden = {
                left: ["-translate-x-full"],
                right: ["translate-x-full"],
                top: ["-translate-y-full"],
                bottom: ["translate-y-full"],
                center: ["opacity-0", "scale-95"]
            };

            this.visible = {
                left: ["translate-x-0"],
                right: ["translate-x-0"],
                top: ["translate-y-0"],
                bottom: ["translate-y-0"],
                center: ["opacity-100", "scale-100"]
            };

            this.bind();
        }

        bind() {
            document.addEventListener("click", (e) => {

                const open = e.target.closest("[data-open-modal]");
                if (open) {
                    this.open(open.dataset.openModal);
                    return;
                }

                if (e.target.closest("[data-close-modal]")) {
                    this.close();
                    return;
                }

                if (this.overlay && e.target === this.overlay) {
                    this.close();
                }

            });

            document.addEventListener("keydown", (e) => {
                if (e.key === "Escape") {
                    this.close();
                }
            });
        }

        open(name) {
            const modal = document.querySelector(`[data-modal="${name}"]`);
            if (!modal) return;

            if (this.activeModal && this.activeModal !== modal) {
                this.close();
            }

            const type = modal.dataset.modalType;
            if (!this.hidden[type] || !this.visible[type]) {
                console.warn(`Unknown modal type "${type}"`);
                return;
            }

            modal.classList.remove(...this.hidden[type]);
            modal.classList.add(...this.visible[type]);

            if (this.overlay) {
                this.overlay.classList.remove("opacity-0", "invisible");
            }

            document.body.classList.add("overflow-hidden");

            this.activeModal = modal;
        }

        close() {
            if (!this.activeModal) return;

            const type = this.activeModal.dataset.modalType;

            this.activeModal.classList.remove(...this.visible[type]);
            this.activeModal.classList.add(...this.hidden[type]);

            if (this.overlay) {
                this.overlay.classList.add("opacity-0", "invisible");
            }

            document.body.classList.remove("overflow-hidden");

            this.activeModal = null;
        }
    }

    function init() {
        if (window.__modalManager) return;
        window.__modalManager = new ModalManager();
    }

    if (document.readyState === "loading") {
        document.addEventListener("DOMContentLoaded", init);
    } else {
        init();
    }
})();