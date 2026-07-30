window.addEventListener('DOMContentLoaded', () => {

    document.querySelectorAll('[data-reveal]').forEach(el => {

        el.style.transition =
            'opacity 2s ease, transform 2s ease';

        new IntersectionObserver(([entry], observer) => {

            if (!entry.isIntersecting) {
                return;
            }

            el.style.opacity = '1';
            el.style.transform = 'translateY(0)';

            observer.disconnect();

        }).observe(el);

    });

});