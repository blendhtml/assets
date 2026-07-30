(() => {
    const button = document.getElementById('unit-backToTop-v1');

    const toggle = () => {
        if (window.scrollY > 1500) {
            button.classList.remove('opacity-0', 'invisible');
        } else {
            button.classList.add('opacity-0', 'invisible');
        }
    };

    button.addEventListener('click', () => {

        const start = window.scrollY;
        const duration = 2000; // 2 seconds

        const startTime = performance.now();

        const animate = (currentTime) => {

            const elapsed = currentTime - startTime;
            const progress = Math.min(elapsed / duration, 1);

            // easeOutCubic
            const eased = 1 - Math.pow(1 - progress, 3);

            window.scrollTo(0, start * (1 - eased));

            if (progress < 1) {
                requestAnimationFrame(animate);
            }

        };

        requestAnimationFrame(animate);

    });

    window.addEventListener('scroll', toggle);

    toggle();

})();