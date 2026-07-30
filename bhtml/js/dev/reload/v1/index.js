(function (window) {

    if (typeof window.pageReload !== 'undefined') {
        throw new Error('window.pageReload is already defined');
    }

    const ignoreAssets = document.currentScript.getAttribute('ignoreAssets');

    let ignoreAssetsArray = null;

    if (ignoreAssets !== null) {
        ignoreAssetsArray = ignoreAssets
            .split('\n')
            .map(s => s.trim())
            .filter(Boolean);
    }

    window.pageReload = {

        fetchResponse: function (callback, url) {

            if (url == null) {
                url = window.location.href;
            }

            const xhr = new XMLHttpRequest();
            xhr.open('GET', url, true);

            xhr.onreadystatechange = function () {

                if (xhr.readyState !== 4) {
                    return;
                }

                if (xhr.status === 200) {
                    callback(xhr.responseText);
                }
            };

            xhr.send();
        },

        shouldIgnoreAsset: function (url) {

            if (ignoreAssetsArray !== null) {

                for (const ignoreAsset of ignoreAssetsArray) {

                    if (url.includes(ignoreAsset)) {
                        return true;
                    }
                }
            }

            return false;
        },

        getAssets: function (html) {

            const parser = new DOMParser();
            const parsedHtml = parser.parseFromString(html, 'text/html');

            const stylesheets = Array.from(
                parsedHtml.querySelectorAll('link[rel="stylesheet"]')
            )
                .map(tag => tag.href)
                .filter(url => !this.shouldIgnoreAsset(url));

            const scripts = Array.from(
                parsedHtml.querySelectorAll('script[src]')
            )
                .map(tag => tag.src)
                .filter(url => !this.shouldIgnoreAsset(url));

            return stylesheets.concat(scripts);
        },

        getFromLocalStorage: function (storageKey) {

            const value = localStorage.getItem(storageKey);

            return value === null
                ? false
                : parseInt(value, 10);
        },

        writeToLocalStorage: function (storageKey, value) {

            localStorage.setItem(storageKey, value);
        },

        reloadPage: function () {

            window.location.reload();
        },

        checkPageForUpdates: function () {

            const $this = this;

            this.fetchResponse(function (response) {

                const pageStorageKey =
                    'pageReload:' + window.location.pathname;

                const oldLength =
                    $this.getFromLocalStorage(pageStorageKey);

                const newLength =
                    response.length;

                if (
                    oldLength !== false &&
                    oldLength !== newLength
                ) {

                    $this.writeToLocalStorage(
                        pageStorageKey,
                        newLength
                    );

                    $this.reloadPage();
                    return;
                }

                if (oldLength === false) {

                    $this.writeToLocalStorage(
                        pageStorageKey,
                        newLength
                    );
                }

                const assets =
                    $this.getAssets(response);

                assets.forEach(function (assetUrl) {
                    $this.checkAssetForUpdates(assetUrl);
                });

            });
        },

        checkAssetForUpdates: function (assetUrl) {

            const $this = this;

            const assetStorageKey =
                'pageReload:' +
                encodeURIComponent(assetUrl);

            this.fetchResponse(function (response) {

                const oldLength =
                    $this.getFromLocalStorage(assetStorageKey);

                const newLength =
                    response.length;

                if (
                    oldLength !== false &&
                    oldLength !== newLength
                ) {

                    $this.writeToLocalStorage(
                        assetStorageKey,
                        newLength
                    );

                    $this.reloadPage();
                    return;
                }

                if (oldLength === false) {

                    $this.writeToLocalStorage(
                        assetStorageKey,
                        newLength
                    );
                }

            }, assetUrl);
        }
    };

    const delay =
        parseInt(
            document.currentScript.getAttribute('delay'),
            10
        ) || 5;

    setInterval(function () {
        window.pageReload.checkPageForUpdates();
    }, delay * 1000);

})(window);