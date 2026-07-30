document.addEventListener('DOMContentLoaded', () => {

    const background =
        document.querySelector(
            '[data-parallax-background]'
        );

    const floating =
        [
            ...document.querySelectorAll(
                '[data-parallax]'
            )
        ];

    if (!background && !floating.length) {
        return;
    }

    floating.forEach((element) => {

        element._parallaxOrigin =
            element.offsetTop;
    });

    let targetScroll =
        window.scrollY;

    let currentScroll =
        window.scrollY;

    window.addEventListener(
        'scroll',
        () => {

            targetScroll =
                window.scrollY;
        },
        {
            passive: true
        }
    );

    window.addEventListener(
        'resize',
        () => {

            floating.forEach((element) => {

                element._parallaxOrigin =
                    element.offsetTop;
            });
        },
        {
            passive: true
        }
    );

    const animate = () => {

        currentScroll +=
            (
                targetScroll
                - currentScroll
            )
            * 0.08;

        if (
            Math.abs(
                targetScroll
                - currentScroll
            ) < 0.01
        ) {

            currentScroll =
                targetScroll;
        }

        if (background) {

            background.style.transform =
                `translate3d(
                    0,
                    ${currentScroll * 0.15}px,
                    0
                )`;
        }

        floating.forEach((element) => {

            const speed =
                parseFloat(
                    element.dataset.parallaxSpeed
                    || '0.1'
                );

            const offset =
                currentScroll
                - element._parallaxOrigin;

            element.style.transform =
                `translate3d(
                    0,
                    ${offset * speed}px,
                    0
                )`;
        });

        requestAnimationFrame(
            animate
        );
    };

    animate();
});