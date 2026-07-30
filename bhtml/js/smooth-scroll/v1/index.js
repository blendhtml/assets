window.addEventListener('DOMContentLoaded', () => {

    document.querySelectorAll('a[href^="#"]').forEach(link => {

        link.addEventListener('click', e => {

            e.preventDefault();

            const target = document.querySelector(
                link.getAttribute('href')
            );

            if (!target) return;

            const start = window.pageYOffset;

            const end = target.offsetTop;

            const distance = end - start;

            const duration = 2000;

            let startTime = null;

            function animate(currentTime) {

                if (!startTime) {
                    startTime = currentTime;
                }

                const timeElapsed = currentTime - startTime;

                const progress = Math.min(
                    timeElapsed / duration,
                    1
                );

                const ease =
                    progress < 0.5
                        ? 4 * progress * progress * progress
                        : 1 - Math.pow(-2 * progress + 2, 3) / 2;

                window.scrollTo(
                    0,
                    start + distance * ease
                );

                if (timeElapsed < duration) {
                    requestAnimationFrame(animate);
                }

            }

            requestAnimationFrame(animate);

        });

    });

});
