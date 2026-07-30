const pos = document.currentScript.getAttribute('pos');

window.addEventListener('load', function() {
    if (!pos) return;

    // Is it an integer?
    const scrollPosition = Number(pos);

    if (!Number.isNaN(scrollPosition) && /^-?\d+$/.test(pos.trim())) {
        if (scrollPosition < 0) {
            // Negative values = offset from bottom
            const scrollFromBottom =
                document.body.scrollHeight -
                window.innerHeight +
                scrollPosition;

            window.scrollTo(0, scrollFromBottom);
        } else {
            // Positive values = offset from top
            window.scrollTo(0, scrollPosition);
        }
    } else {
        // Treat as element ID
        const el = document.getElementById(pos);

        if (el) {
            el.scrollIntoView({
                behavior: 'auto',
                block: 'start'
            });
        }
    }
});