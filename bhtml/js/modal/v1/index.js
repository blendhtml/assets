(() => {
    class ModalManager {
        constructor() {
            this.overlay = document.querySelector("[data-modal-overlay]");

            this.modalStack = [];
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
                    if (this.activeModal?.dataset.modalCloseOverlay !== "false") {
                        this.close();
                    }

                    return;
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

            if (!modal) {
                return;
            }

            const type = modal.dataset.modalType;

            if (!this.hidden[type] || !this.visible[type]) {
                console.warn(`Unknown modal type "${type}"`);
                return;
            }

            // Already active.
            if (this.activeModal === modal) {
                return;
            }

            // Already somewhere in the stack.
            const existingIndex = this.modalStack.indexOf(modal);

            if (existingIndex !== -1) {
                this.modalStack.splice(existingIndex, 1);
            }

            this.modalStack.push(modal);

            modal.classList.remove(...this.hidden[type]);
            modal.classList.add(...this.visible[type]);

            // Make the newest modal the top layer.
            modal.style.zIndex = String(50 + this.modalStack.length);

            this.activeModal = modal;

            if (this.overlay) {
                this.overlay.classList.remove("opacity-0", "invisible");
            }

            document.body.classList.add("overflow-hidden");
        }

        close(name = null) {
            const modal = name
                ? document.querySelector(`[data-modal="${name}"]`)
                : this.activeModal;

            if (!modal) return;

            const type = modal.dataset.modalType;

            if (!this.hidden[type] || !this.visible[type]) {
                return;
            }

            // Hide the modal.
            modal.classList.remove(...this.visible[type]);
            modal.classList.add(...this.hidden[type]);

            // Remove it from the stack.
            const index = this.modalStack.indexOf(modal);

            if (index !== -1) {
                this.modalStack.splice(index, 1);
            }

            // The next modal in the stack becomes active.
            this.activeModal =
                this.modalStack[this.modalStack.length - 1] ?? null;

            if (this.activeModal) {
                // Something is still open.
                if (this.overlay) {
                    this.overlay.classList.remove("opacity-0", "invisible");
                }

                document.body.classList.add("overflow-hidden");

                return;
            }

            // Nothing remains open.
            if (this.overlay) {
                this.overlay.classList.add("opacity-0", "invisible");
            }

            document.body.classList.remove("overflow-hidden");
        }

    }

    function init() {
        if (window.__modalManager) return;

        window.__modalManager = new ModalManager();

        const initiallyOpen = window.BLENDHTML_MODAL_V1?.initiallyOpen;

        if (initiallyOpen) {
            window.__modalManager.open(initiallyOpen);
        }
    }

    if (document.readyState === "loading") {
        document.addEventListener("DOMContentLoaded", init);
    } else {
        init();
    }
})();