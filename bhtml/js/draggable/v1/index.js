(() => {
    const init = () => {
        document.querySelectorAll('[data-bhtml-draggable]').forEach((widget) => {
            let dragging = false;
            let offsetX = 0;
            let offsetY = 0;

            widget.addEventListener('pointerdown', (event) => {
                dragging = true;

                const rect = widget.getBoundingClientRect();

                offsetX = event.clientX - rect.left;
                offsetY = event.clientY - rect.top;

                widget.setPointerCapture(event.pointerId);
            });

            widget.addEventListener('pointermove', (event) => {
                if (!dragging) return;

                const maxX = window.innerWidth - widget.offsetWidth;
                const maxY = window.innerHeight - widget.offsetHeight;

                const x = Math.max(
                    0,
                    Math.min(event.clientX - offsetX, maxX)
                );

                const y = Math.max(
                    0,
                    Math.min(event.clientY - offsetY, maxY)
                );

                widget.style.left = `${x}px`;
                widget.style.top = `${y}px`;
            });

            widget.addEventListener('pointerup', () => {
                dragging = false;
            });
        });
    };

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
})();