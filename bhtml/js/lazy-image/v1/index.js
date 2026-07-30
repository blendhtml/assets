const lazyImage = (() => {

    function schedule(callback) {
        if ('requestIdleCallback' in window) {
            requestIdleCallback(callback);
        } else {
            setTimeout(callback, 1000);
        }
    }

    function upgrade(img) {

        if (!img) {
            return;
        }

        if (img.dataset.upgraded || img.dataset.upgrading) {
            return;
        }

        const src = img.dataset.srcLazy;

        if (!src) {
            return;
        }

        img.dataset.upgrading = '1';

        const preloader = new Image();

        preloader.decoding = 'async';

        preloader.onload = () => {

            requestAnimationFrame(() => {

                img.src = src;

                img.dataset.upgraded = '1';

                delete img.dataset.upgrading;
                delete img.dataset.srcLazy;

            });

        };

        preloader.onerror = () => {
            delete img.dataset.upgrading;
        };

        preloader.src = src;
    }

    function init(root = document) {

        //
        // Hero images: load immediately.
        //
        root
            .querySelectorAll('#section-hero img[data-src-lazy]')
            .forEach(upgrade);

        //
        // Everything else: load when browser is idle.
        //
        schedule(() => {

            root
                .querySelectorAll('img[data-src-lazy]')
                .forEach(img => {

                    if (img.dataset.upgraded) {
                        return;
                    }

                    upgrade(img);

                });

        });

    }

    return {
        init,
        upgrade
    };

})();

lazyImage.init();