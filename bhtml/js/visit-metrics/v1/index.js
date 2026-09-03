const visitMetrics = (() => {
    'use strict';

    const CONFIG_GLOBAL = 'BLENDHTML_VISIT_METRICS_V1';

    const hasOwn = Object.prototype.hasOwnProperty;
    const CONSENT_UNKNOWN = 'unknown';
    const CONSENT_GRANTED = 'granted';
    const CONSENT_DENIED = 'denied';

    const DEFAULTS = Object.freeze({
        apiBase: '/blendhtml/api/visit-metrics/v1/',
        cookieAge: 31536000,
        credentials: 'same-origin',
        secureCookies: undefined,
        debug: false,
        respectGlobalPrivacyControl: true,
        requestTimeout: 8000,
        maxQueueSize: 50,
        maxBeaconBytes: 60000,
        maxPayloadBytes: 8192,

        track: Object.freeze({
            time: Object.freeze({
                enabled: true,
                heartbeatDelay: 15000
            }),

            scrollTo: Object.freeze({
                'section': 'Section viewed',
                'footer': 'Scrolled to footer'
            }),

            click: Object.freeze({
                'button': 'Button clicked',

                'nav a': 'Navigation link clicked',
                'footer a': 'Footer link clicked',
                'a[href]': 'Link clicked',

                '[data-open-modal]': 'Modal opened',
                '[data-track-click]': null,
            })
        })
    });

    const noop = () => {
    };

    const api = {
        _config: {},
        _configResolved: false,
        _configValid: false,
        _initialized: false,
        _destroyed: false,
        _consentListeners: new Set(),
        _eventQueue: [],
        _flushInProgress: false,
        _flushTimer: null,
        _queueBackoffMs: 1000,
        _activeQueueAbort: null,
        _listeners: [],
        _scrollTrackers: new Map(),
        _eventCounter: 0,
        _clickDelegationHandler: null,

        resolveConfig() {
            try {
                const runtimeConfig = this._readRuntimeConfig();
                const debug = this._toBoolean(runtimeConfig.debug, DEFAULTS.debug);

                const apiBase = this._normalizeApiBase(
                    runtimeConfig.apiBase,
                    DEFAULTS.apiBase,
                    debug
                );

                const cookieAge = this._normalizeInteger(
                    runtimeConfig.cookieAge,
                    DEFAULTS.cookieAge,
                    0,
                    400 * 24 * 60 * 60
                );

                const credentials = this._normalizeCredentials(
                    runtimeConfig.credentials,
                    DEFAULTS.credentials
                );

                const secureCookies = typeof runtimeConfig.secureCookies === 'boolean'
                    ? runtimeConfig.secureCookies
                    : undefined;

                const requestTimeout = this._normalizeInteger(
                    runtimeConfig.requestTimeout,
                    DEFAULTS.requestTimeout,
                    1000,
                    60000
                );

                const maxQueueSize = this._normalizeInteger(
                    runtimeConfig.maxQueueSize,
                    DEFAULTS.maxQueueSize,
                    1,
                    250
                );

                const maxBeaconBytes = this._normalizeInteger(
                    runtimeConfig.maxBeaconBytes,
                    DEFAULTS.maxBeaconBytes,
                    1024,
                    64000
                );

                const maxPayloadBytes = this._normalizeInteger(
                    runtimeConfig.maxPayloadBytes,
                    DEFAULTS.maxPayloadBytes,
                    512,
                    32768
                );

                const trackConfig = (
                    runtimeConfig.track &&
                    typeof runtimeConfig.track === 'object' &&
                    !Array.isArray(runtimeConfig.track)
                )
                    ? runtimeConfig.track
                    : {};

                const timeConfig = (
                    trackConfig.time &&
                    typeof trackConfig.time === 'object' &&
                    !Array.isArray(trackConfig.time)
                )
                    ? trackConfig.time
                    : {};

                const heartbeatDelay = this._normalizeInteger(
                    timeConfig.heartbeatDelay,
                    DEFAULTS.track.time.heartbeatDelay,
                    1000,
                    300000
                );

                const time = {
                    enabled: this._toBoolean(
                        timeConfig.enabled,
                        DEFAULTS.track.time.enabled
                    ),
                    heartbeatDelay
                };

                let scrollTo;

                if (this._isObject(trackConfig['!scrollTo'])) {
                    scrollTo = trackConfig['!scrollTo'];
                } else {
                    scrollTo = {
                        ...DEFAULTS.track.scrollTo,
                        ...(this._isObject(trackConfig.scrollTo)
                            ? trackConfig.scrollTo
                            : {})
                    };
                }

                scrollTo = this._normalizeScrollTo(scrollTo);

                let click;

                if (this._isObject(trackConfig['!click'])) {
                    click = trackConfig['!click'];
                } else {
                    click = {
                        ...DEFAULTS.track.click,
                        ...(this._isObject(trackConfig.click)
                            ? trackConfig.click
                            : {})
                    };
                }

                click = this._normalizeClicks(click);

                this._config = {
                    apiBase,
                    cookieAge,
                    credentials,
                    secureCookies,
                    debug,

                    respectGlobalPrivacyControl: this._toBoolean(
                        runtimeConfig.respectGlobalPrivacyControl,
                        DEFAULTS.respectGlobalPrivacyControl
                    ),

                    requestTimeout,
                    maxQueueSize,
                    maxBeaconBytes,
                    maxPayloadBytes,

                    track: {
                        time,
                        scrollTo,
                        click
                    }
                };

                this._configValid = Boolean(apiBase);
                this._configResolved = true;

                if (!this._configValid) {
                    this._debug(
                        'Analytics disabled: missing or invalid required configuration'
                    );
                }

                return this._config;
            } catch (error) {
                this._config = {
                    ...DEFAULTS,

                    track: {
                        time: {
                            ...DEFAULTS.track.time
                        },
                        scrollTo: {},
                        click: {}
                    },

                    debug: false
                };

                this._configValid = false;
                this._configResolved = true;

                this._debug(
                    'Analytics disabled due to configuration failure',
                    error
                );

                return this._config;
            }
        },

        _readRuntimeConfig() {
            if (typeof window === 'undefined') {
                return {};
            }

            if (
                window[CONFIG_GLOBAL] &&
                typeof window[CONFIG_GLOBAL] === 'object' &&
                !Array.isArray(window[CONFIG_GLOBAL])
            ) {
                return window[CONFIG_GLOBAL];
            }

            return {};
        },

        _ensureConfig() {
            if (!this._configResolved) {
                this.resolveConfig();
            }
        },

        _cookieLabel: {
            cookiesAccepted: 'blendhtml_cookies_accepted',
            visitorToken: 'blendhtml_visitor_token'
        },

        _collectElementMeta(element) {
            if (
                !element ||
                element.nodeType !== 1 ||
                typeof element.getAttribute !== 'function'
            ) {
                return undefined;
            }

            const meta = {};

            const add = (key, value, maxLength = 256) => {
                if (value === null || typeof value === 'undefined') {
                    return;
                }

                const normalized = String(value)
                    .replace(/\s+/g, ' ')
                    .trim();

                if (!normalized) {
                    return;
                }

                if (normalized.length > maxLength) {
                    meta[key] = normalized
                        .slice(0, maxLength - 1)
                        .replace(/\s+\S*$/, '')
                        .trim() + '…';
                } else {
                    meta[key] = normalized;
                }
            };

            add('tag', element.tagName, 32);
            add('id', element.id, 256);

            if (typeof element.className === 'string') {
                add('class', element.className, 512);
            }

            add(
                'text',
                typeof element.textContent === 'string'
                    ? element.textContent
                    : '',
                256
            );

            const tagName = String(element.tagName || '').toUpperCase();

            if (tagName === 'A') {
                add('href', element.getAttribute('href'), 2048);
                add('target', element.getAttribute('target'), 64);
                add('rel', element.getAttribute('rel'), 256);
            }

            if (
                tagName === 'BUTTON' ||
                tagName === 'INPUT' ||
                tagName === 'SELECT' ||
                tagName === 'TEXTAREA'
            ) {
                add('type', element.getAttribute('type'), 64);
                add('name', element.getAttribute('name'), 256);
            }

            add('role', element.getAttribute('role'), 128);
            add('ariaLabel', element.getAttribute('aria-label'), 256);

            const attributes = {};

            for (const attribute of Array.from(element.attributes || [])) {
                const name = attribute.name;

                if (!name.startsWith('data-')) {
                    continue;
                }

                const value = String(attribute.value || '')
                    .replace(/\s+/g, ' ')
                    .trim();

                if (!value) {
                    continue;
                }

                attributes[name] = value.slice(0, 256);

                if (Object.keys(attributes).length >= 50) {
                    break;
                }
            }

            if (Object.keys(attributes).length > 0) {
                meta.attributes = attributes;
            }

            return Object.keys(meta).length > 0
                ? meta
                : undefined;
        },

        _debug(...args) {
            try {
                if (
                    this._config?.debug &&
                    typeof console !== 'undefined' &&
                    typeof console.debug === 'function'
                ) {
                    console.debug('[visitMetrics]', ...args);
                }
            } catch {
                /* silent */
            }
        },

        _toBoolean(value, fallback) {
            return typeof value === 'boolean' ? value : fallback;
        },

        _normalizeInteger(value, fallback, min, max) {
            const number = Number(value);

            if (!Number.isFinite(number)) {
                return fallback;
            }

            return Math.min(max, Math.max(min, Math.floor(number)));
        },

        _normalizeCredentials(value, fallback) {
            return value === 'include' || value === 'omit' || value === 'same-origin'
                ? value
                : fallback;
        },

        _isObject(value) {
            return value &&
                typeof value === 'object' &&
                !Array.isArray(value);
        },

        _normalizeApiBase(value, fallback, debug) {
            const raw = typeof value === 'string' ? value.trim() : fallback;

            if (!raw || /[\u0000-\u001F\u007F]/.test(raw)) {
                return this._normalizeApiBase(fallback, fallback, debug);
            }

            try {
                const hasWindowLocation = typeof window !== 'undefined' && window.location;
                const pageOrigin = hasWindowLocation ? window.location.origin : 'https://example.invalid';
                const pageProtocol = hasWindowLocation ? window.location.protocol : 'https:';
                const url = new URL(raw, pageOrigin + '/');

                if (url.protocol !== 'http:' && url.protocol !== 'https:') {
                    return raw === fallback ? '' : this._normalizeApiBase(fallback, fallback, debug);
                }

                if (url.username || url.password || url.hash || url.search) {
                    return raw === fallback ? '' : this._normalizeApiBase(fallback, fallback, debug);
                }

                if (
                    hasWindowLocation &&
                    pageProtocol === 'https:' &&
                    url.protocol === 'http:' &&
                    url.origin !== pageOrigin
                ) {
                    if (
                        debug &&
                        typeof console !== 'undefined' &&
                        typeof console.warn === 'function'
                    ) {
                        console.warn('[visitMetrics] Refusing insecure cross-origin analytics endpoint on HTTPS page');
                    }

                    return raw === fallback ? '' : this._normalizeApiBase(fallback, fallback, debug);
                }

                url.pathname = url.pathname.endsWith('/') ? url.pathname : `${url.pathname}/`;

                const isExplicitAbsolute = /^[A-Za-z][A-Za-z0-9+.-]*:/.test(raw);

                if (!isExplicitAbsolute && hasWindowLocation && url.origin === pageOrigin) {
                    return url.pathname;
                }

                return url.href;
            } catch {
                return raw === fallback ? '' : this._normalizeApiBase(fallback, fallback, debug);
            }
        },

        _normalizeScrollTo(value) {
            const source = typeof value === 'undefined'
                ? DEFAULTS.track.scrollTo
                : value;

            const normalized = {};

            if (
                !source ||
                typeof source !== 'object' ||
                Array.isArray(source)
            ) {
                return normalized;
            }

            let count = 0;

            for (const [selectorRaw, refRaw] of Object.entries(source)) {
                if (count >= 100) {
                    break;
                }

                const selector = this._normalizeSelector(selectorRaw);

                if (!selector) {
                    continue;
                }

                const ref = this._normalizeRef(refRaw) || selector;

                normalized[selector] = ref;
                count += 1;
            }

            return normalized;
        },

        _normalizeClicks(value) {
            const source = typeof value === 'undefined'
                ? DEFAULTS.track.click
                : value;

            if (!source || typeof source !== 'object' || Array.isArray(source)) {
                return {};
            }

            const normalized = {};
            let count = 0;

            for (const [selector, ref] of Object.entries(source)) {
                if (count >= 100) {
                    break;
                }

                const normalizedSelector = this._normalizeSelector(selector);

                if (!normalizedSelector) {
                    continue;
                }

                // null means: read ref from data-track-click on matched element.
                if (ref === null) {
                    normalized[normalizedSelector] = null;
                    count += 1;
                    continue;
                }

                const normalizedRef = this._normalizeRef(ref);

                if (!normalizedRef) {
                    continue;
                }

                normalized[normalizedSelector] = normalizedRef;
                count += 1;
            }

            return normalized;
        },

        _normalizeSelector(value) {
            if (typeof value !== 'string') {
                return '';
            }

            const selector = value.trim();

            if (!selector || selector.length > 512 || /[\u0000-\u001F\u007F]/.test(selector)) {
                return '';
            }

            return selector;
        },

        _normalizeRef(value, maxLength = 512) {
            if (value === null || typeof value === 'undefined') {
                return '';
            }

            if (typeof value !== 'string' && typeof value !== 'number' && typeof value !== 'boolean') {
                return '';
            }

            const ref = String(value).trim();

            if (!ref || /[\u0000-\u001F\u007F]/.test(ref)) {
                return '';
            }

            return ref.slice(0, maxLength);
        },

        _escapeRegExp(value) {
            return String(value).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        },

        _useSecureCookies() {
            this._ensureConfig();

            if (typeof this._config.secureCookies === 'boolean') {
                return this._config.secureCookies;
            }

            return typeof window !== 'undefined' && window.location?.protocol === 'https:';
        },

        _cookieAttributes(maxAge = this._config.cookieAge) {
            const age = this._normalizeInteger(
                maxAge,
                this._config.cookieAge || DEFAULTS.cookieAge,
                0,
                400 * 24 * 60 * 60
            );

            const attributes = [
                'Path=/',
                'SameSite=Lax',
                `Max-Age=${age}`
            ];

            if (this._useSecureCookies()) {
                attributes.push('Secure');
            }

            return attributes.join('; ');
        },

        _isSafeCookieName(name) {
            return typeof name === 'string' &&
                name.length > 0 &&
                name.length <= 180 &&
                /^[A-Za-z0-9_.-]+$/.test(name);
        },

        _setCookie(name, value, maxAge = this._config.cookieAge) {
            this._ensureConfig();

            if (typeof document === 'undefined' || !this._isSafeCookieName(name)) {
                return false;
            }

            try {
                document.cookie = `${name}=${encodeURIComponent(String(value))}; ${this._cookieAttributes(maxAge)}`;
                return true;
            } catch (error) {
                this._debug('Cookie write failed', error);
                return false;
            }
        },

        _deleteCookie(name) {
            this._ensureConfig();

            if (typeof document === 'undefined' || !this._isSafeCookieName(name)) {
                return false;
            }

            const attributes = [
                'Path=/',
                'SameSite=Lax',
                'Expires=Thu, 01 Jan 1970 00:00:00 GMT',
                'Max-Age=0'
            ];

            if (this._useSecureCookies()) {
                attributes.push('Secure');
            }

            try {
                document.cookie = `${name}=; ${attributes.join('; ')}`;
                return true;
            } catch (error) {
                this._debug('Cookie deletion failed', error);
                return false;
            }
        },

        getCookie(name) {
            if (typeof document === 'undefined' || !this._isSafeCookieName(name)) {
                return undefined;
            }

            try {
                const matches = document.cookie.match(
                    new RegExp(`(?:^|;\\s*)${this._escapeRegExp(name)}=([^;]*)`)
                );

                if (!matches) {
                    return undefined;
                }

                try {
                    return decodeURIComponent(matches[1]);
                } catch {
                    return matches[1];
                }
            } catch {
                return undefined;
            }
        },

        _createVisitorToken() {
            try {
                const cryptoObject = typeof crypto !== 'undefined'
                    ? crypto
                    : (typeof window !== 'undefined' ? window.crypto : undefined);

                if (cryptoObject && typeof cryptoObject.randomUUID === 'function') {
                    return cryptoObject.randomUUID();
                }

                if (cryptoObject && typeof cryptoObject.getRandomValues === 'function') {
                    const bytes = new Uint8Array(16);
                    cryptoObject.getRandomValues(bytes);
                    bytes[6] = (bytes[6] & 0x0f) | 0x40;
                    bytes[8] = (bytes[8] & 0x3f) | 0x80;

                    const hex = Array.from(bytes, byte => byte.toString(16).padStart(2, '0')).join('');

                    return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
                }
            } catch {
                /* fall through */
            }

            return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 18)}`;
        },

        _ensureVisitorToken() {
            this._ensureConfig();

            if (!this._configValid) {
                return false;
            }

            if (!this.getCookie(this._cookieLabel.visitorToken)) {
                return this._setCookie(
                    this._cookieLabel.visitorToken,
                    this._createVisitorToken(),
                    this._config.cookieAge
                );
            }

            return true;
        },

        _privacySignalDenied() {
            this._ensureConfig();

            try {
                return Boolean(
                    this._config.respectGlobalPrivacyControl &&
                    typeof navigator !== 'undefined' &&
                    navigator.globalPrivacyControl === true
                );
            } catch {
                return false;
            }
        },

        _getConsentState() {
            this._ensureConfig();

            if (!this._configValid) {
                return CONSENT_UNKNOWN;
            }

            if (this._privacySignalDenied()) {
                return CONSENT_DENIED;
            }

            const cookiesAccepted = this.getCookie(this._cookieLabel.cookiesAccepted);

            if (cookiesAccepted === '1') {
                return CONSENT_GRANTED;
            }

            if (cookiesAccepted === '0') {
                return CONSENT_DENIED;
            }

            if (typeof cookiesAccepted !== 'undefined') {
                this._deleteCookie(this._cookieLabel.cookiesAccepted);
            }

            return CONSENT_UNKNOWN;
        },

        isConsentGiven() {
            const value = this.getCookie(this._cookieLabel.cookiesAccepted);

            if (value === '1') {
                return true;
            }

            if (value === '0') {
                return false;
            }

            return null;
        },

        async setConsent(consent) {
            if (typeof consent !== 'boolean') {
                return false;
            }

            this._ensureConfig();

            if (!this._configValid) {
                return false;
            }

            this._setCookie(
                this._cookieLabel.cookiesAccepted,
                consent ? '1' : '0',
                this._config.cookieAge
            );

            if (consent) {
                this._ensureVisitorToken();

                this._activateScrollTrackers();
                this._activateClickTrackers();

                if (this._config.track.time?.enabled !== false) {
                    this.timeTracker.start();

                    // Required: send heartbeat immediately when cookie consent is granted.
                    this.timeTracker.send('heartbeat');
                }

                this._scheduleFlush(0);
            } else {
                this._clearAnalyticsQueue();
                this.timeTracker.reset();
                this._deactivateScrollTrackers();
                this._deactivateClickTrackers();
            }

            this._notifyConsentChange(consent);

            try {
                await this.post('gdpr/consent', {
                    bool: consent
                });
            } catch (error) {
                this._debug('Failed to synchronize GDPR consent', error);
            }

            return true;
        },

        onConsentChange(callback) {
            if (typeof callback !== 'function') {
                return noop;
            }

            this._consentListeners.add(callback);

            return () => {
                this._consentListeners.delete(callback);
            };
        },

        _notifyConsentChange(consent) {
            for (const callback of Array.from(this._consentListeners)) {
                try {
                    callback(consent);
                } catch (error) {
                    this._debug('Consent listener failed', error);
                }
            }

            try {
                if (
                    typeof window !== 'undefined' &&
                    typeof CustomEvent === 'function'
                ) {
                    window.dispatchEvent(
                        new CustomEvent('visitMetricsConsentChange', {
                            detail: {consent}
                        })
                    );
                }
            } catch (error) {
                this._debug('Consent event dispatch failed', error);
            }
        },

        _normalizePath(path) {
            const normalized = String(path ?? '').trim().replace(/^\/+/, '');

            if (
                !normalized ||
                normalized.length > 200 ||
                /[\u0000-\u001F\u007F]/.test(normalized) ||
                /[:?#\\]/.test(normalized) ||
                normalized.split('/').some(segment => !segment || segment === '.' || segment === '..')
            ) {
                return '';
            }

            if (!/^[A-Za-z0-9_./-]+$/.test(normalized)) {
                return '';
            }

            return normalized;
        },

        _isAnalyticsPath(path) {
            const normalized = this._normalizePath(path);

            return normalized === 'track/click' ||
                normalized === 'track/scroll' ||
                normalized === 'track/heartbeat';
        },

        _buildUrl(path) {
            this._ensureConfig();

            if (!this._configValid) {
                return '';
            }

            const normalizedPath = this._normalizePath(path);

            if (!normalizedPath) {
                return '';
            }

            return `${this._config.apiBase}${normalizedPath}`;
        },

        _buildPayload(payload = {}, path = '') {
            this._ensureConfig();

            return this._sanitizePayload(payload, path);
        },

        _sanitizePayload(payload, path = '') {
            const normalizedPath = this._normalizePath(path);
            const source = payload && typeof payload === 'object' && !this._isDomLike(payload)
                ? payload
                : {};

            const out = {};

            if (
                normalizedPath === 'track/click' ||
                normalizedPath === 'track/scroll'
            ) {
                const ref = this._normalizeRef(source.ref);

                if (ref) {
                    out.ref = ref;
                }

                const meta = this._normalizeElementMeta(source.meta);

                if (meta) {
                    out.meta = meta;
                }

                this._copyEventMetadata(source, out);

                return out;
            }

            if (normalizedPath === 'track/heartbeat') {
                const event = this._normalizeRef(source.event, 64);

                if (event) {
                    out.event = event;
                }

                const seconds = Number(source.seconds);

                if (Number.isFinite(seconds) && seconds > 0) {
                    out.seconds = Math.min(86400, Math.round(seconds));
                }

                this._copyEventMetadata(source, out);
                return out;
            }

            if (normalizedPath === 'gdpr/consent') {
                out.bool = source.bool === true;
                return out;
            }

            let copied = 0;

            for (const key of Object.keys(source)) {
                if (copied >= 20) {
                    break;
                }

                if (!/^[A-Za-z0-9_.-]{1,64}$/.test(key)) {
                    continue;
                }

                const value = source[key];

                if (typeof value === 'string') {
                    out[key] = value.slice(0, 1024);
                    copied += 1;
                } else if (typeof value === 'number' && Number.isFinite(value)) {
                    out[key] = value;
                    copied += 1;
                } else if (typeof value === 'boolean') {
                    out[key] = value;
                    copied += 1;
                } else if (value === null) {
                    out[key] = null;
                    copied += 1;
                }
            }

            return out;
        },

        _normalizeElementMeta(value) {
            if (
                !value ||
                typeof value !== 'object' ||
                Array.isArray(value) ||
                this._isDomLike(value)
            ) {
                return undefined;
            }

            const out = {};

            const copyString = (key, maxLength) => {
                const value = this._normalizeRef(
                    source[key],
                    maxLength
                );

                if (value) {
                    out[key] = value;
                }
            };

            const source = value;

            copyString('tag', 32);
            copyString('id', 256);
            copyString('class', 512);
            copyString('text', 256);
            copyString('href', 2048);
            copyString('target', 64);
            copyString('rel', 256);
            copyString('type', 64);
            copyString('name', 256);
            copyString('role', 128);
            copyString('ariaLabel', 256);

            if (
                source.attributes &&
                typeof source.attributes === 'object' &&
                !Array.isArray(source.attributes) &&
                !this._isDomLike(source.attributes)
            ) {
                const attributes = {};
                let count = 0;

                for (const [name, rawValue] of Object.entries(
                    source.attributes
                )) {
                    if (count >= 50) {
                        break;
                    }

                    if (
                        typeof name !== 'string' ||
                        !/^data-[A-Za-z0-9_.:-]+$/.test(name)
                    ) {
                        continue;
                    }

                    const attributeValue = this._normalizeRef(
                        rawValue,
                        256
                    );

                    if (!attributeValue) {
                        continue;
                    }

                    attributes[name] = attributeValue;
                    count += 1;
                }

                if (Object.keys(attributes).length > 0) {
                    out.attributes = attributes;
                }
            }

            return Object.keys(out).length > 0
                ? out
                : undefined;
        },

        _copyEventMetadata(source, out) {
            const eventId = this._normalizeRef(source.event_id || source.eventId, 128);
            const timestamp = this._normalizeRef(source.ts || source.timestamp, 64);

            if (eventId) {
                out.event_id = eventId;
            }

            if (timestamp) {
                out.ts = timestamp;
            }
        },

        _isDomLike(value) {
            return Boolean(
                value &&
                typeof value === 'object' &&
                (
                    typeof value.nodeType === 'number' ||
                    typeof value.nodeName === 'string' ||
                    (typeof window !== 'undefined' && value === window)
                )
            );
        },

        _safeStringify(value) {
            try {
                return JSON.stringify(value);
            } catch {
                return '';
            }
        },

        _byteLength(value) {
            try {
                if (typeof TextEncoder === 'function') {
                    return new TextEncoder().encode(value).length;
                }
            } catch {
                /* fall through */
            }

            return String(value).length;
        },

        _makeEventMetadata() {
            this._eventCounter = (this._eventCounter + 1) % Number.MAX_SAFE_INTEGER;

            return {
                event_id: `${Date.now().toString(36)}-${this._eventCounter.toString(36)}-${Math.random().toString(36).slice(2, 10)}`,
                ts: new Date().toISOString()
            };
        },

        _safePromise(promise) {
            promise.catch(noop);
            return promise;
        },

        post(path, payload = {}) {
            this._ensureConfig();

            const promise = (async () => {
                if (!this._configValid) {
                    throw new Error('Analytics is not configured');
                }

                const normalizedPath = this._normalizePath(path);

                if (!normalizedPath) {
                    throw new Error('Invalid analytics path');
                }

                if (this._isAnalyticsPath(normalizedPath) && this.isConsentGiven() !== true) {
                    throw new Error('Analytics consent has not been granted');
                }

                const result = await this._postInternal(normalizedPath, payload, {
                    timeout: this._config.requestTimeout,
                    retries: 1
                });

                if (!result.ok) {
                    throw new Error(`POST ${normalizedPath} failed${result.status ? ` (${result.status})` : ''}`);
                }

                return result.data;
            })();

            return this._safePromise(promise);
        },

        async _postInternal(path, payload = {}, options = {}) {
            this._ensureConfig();

            const url = this._buildUrl(path);

            if (!url || typeof fetch !== 'function') {
                return {ok: false, status: 0, data: null, permanent: false};
            }

            const body = this._safeStringify(this._buildPayload(payload, path));

            if (!body || this._byteLength(body) > this._config.maxPayloadBytes) {
                return {ok: false, status: 0, data: null, permanent: true};
            }

            const retries = this._normalizeInteger(options.retries, 0, 0, 2);
            let attempt = 0;
            let lastResult = {ok: false, status: 0, data: null, permanent: false};

            while (attempt <= retries) {
                if (options.requireConsent && this.isConsentGiven() !== true) {
                    return {ok: false, status: 0, data: null, permanent: true};
                }

                lastResult = await this._fetchJson(url, body, {
                    timeout: options.timeout || this._config.requestTimeout,
                    keepalive: Boolean(options.keepalive),
                    onController: options.onController
                });

                if (lastResult.ok || lastResult.permanent) {
                    return lastResult;
                }

                attempt += 1;

                if (attempt <= retries) {
                    await this._delay(250 * attempt);
                }
            }

            return lastResult;
        },

        _delay(ms) {
            return new Promise(resolve => {
                try {
                    setTimeout(resolve, ms);
                } catch {
                    resolve();
                }
            });
        },

        async _fetchJson(url, body, options = {}) {
            let timeoutId = null;
            let controller = null;

            const headers = {
                'Content-Type': 'application/json',
                Accept: 'application/json'
            };

            try {
                if (typeof navigator !== 'undefined' && navigator.onLine === false) {
                    return {ok: false, status: 0, data: null, permanent: false};
                }

                if (typeof AbortController === 'function') {
                    controller = new AbortController();

                    if (typeof options.onController === 'function') {
                        options.onController(controller);
                    }

                    timeoutId = setTimeout(() => {
                        try {
                            controller.abort();
                        } catch {
                            /* silent */
                        }
                    }, this._normalizeInteger(options.timeout, this._config.requestTimeout, 1000, 60000));
                }

                const response = await fetch(url, {
                    method: 'POST',
                    credentials: this._config.credentials,
                    keepalive: Boolean(options.keepalive),
                    headers,
                    body,
                    signal: controller ? controller.signal : undefined
                });

                if (timeoutId !== null) {
                    clearTimeout(timeoutId);
                }

                if (!response.ok) {
                    return {
                        ok: false,
                        status: response.status,
                        data: null,
                        permanent: response.status >= 400 &&
                            response.status < 500 &&
                            response.status !== 408 &&
                            response.status !== 429
                    };
                }

                let data = null;

                try {
                    data = await response.json();
                } catch {
                    data = null;
                }

                return {
                    ok: true,
                    status: response.status,
                    data,
                    permanent: false
                };
            } catch (error) {
                if (timeoutId !== null) {
                    clearTimeout(timeoutId);
                }

                this._debug('Network request failed', error);

                return {
                    ok: false,
                    status: 0,
                    data: null,
                    permanent: false
                };
            }
        },

        sendBeacon(path, payload = {}) {
            this._ensureConfig();

            if (!this._configValid) {
                return false;
            }

            const normalizedPath = this._normalizePath(path);

            if (!normalizedPath) {
                return false;
            }

            if (this._isAnalyticsPath(normalizedPath) && this.isConsentGiven() !== true) {
                return false;
            }

            const url = this._buildUrl(normalizedPath);

            if (!url) {
                return false;
            }

            const body = this._safeStringify(this._buildPayload(payload, normalizedPath));

            if (!body || this._byteLength(body) > this._config.maxBeaconBytes) {
                return false;
            }

            if (typeof navigator !== 'undefined' && typeof navigator.sendBeacon === 'function') {
                try {
                    const beaconBody = typeof Blob === 'function'
                        ? new Blob([body], {type: 'application/json'})
                        : body;

                    if (navigator.sendBeacon(url, beaconBody)) {
                        return true;
                    }
                } catch (error) {
                    this._debug('Beacon attempt failed', error);
                }
            }

            if (typeof fetch === 'function') {
                try {
                    fetch(url, {
                        method: 'POST',
                        credentials: this._config.credentials,
                        keepalive: true,
                        headers: {
                            'Content-Type': 'application/json',
                            Accept: 'application/json'
                        },
                        body
                    }).catch(error => {
                        this._debug('Beacon fallback failed', error);
                    });

                    return true;
                } catch (error) {
                    this._debug('Beacon fallback scheduling failed', error);
                }
            }

            return false;
        },

        _enqueueAnalyticsEvent(path, payload = {}) {
            this._ensureConfig();

            const normalizedPath = this._normalizePath(path);

            if (!this._configValid || !normalizedPath || !this._isAnalyticsPath(normalizedPath)) {
                return false;
            }

            if (this.isConsentGiven() !== true) {
                return false;
            }

            const eventPayload = {
                ...payload,
                ...this._makeEventMetadata()
            };

            const body = this._safeStringify(this._buildPayload(eventPayload, normalizedPath));

            if (!body || this._byteLength(body) > this._config.maxPayloadBytes) {
                return false;
            }

            if (this._eventQueue.length >= this._config.maxQueueSize) {
                this._eventQueue.shift();
            }

            this._eventQueue.push({
                path: normalizedPath,
                payload: eventPayload
            });

            this._scheduleFlush(0);
            return true;
        },

        _scheduleFlush(delay = 0) {
            if (this._flushTimer !== null || this._destroyed) {
                return;
            }

            if (typeof window === 'undefined') {
                return;
            }

            try {
                this._flushTimer = window.setTimeout(() => {
                    this._flushTimer = null;

                    this._flushQueue().catch(error => {
                        this._debug('Queue flush failed', error);
                    });
                }, Math.max(0, delay));
            } catch {
                this._flushTimer = null;
            }
        },

        async _flushQueue() {
            if (
                this._flushInProgress ||
                this._eventQueue.length === 0 ||
                this.isConsentGiven() !== true
            ) {
                return;
            }

            this._flushInProgress = true;

            try {
                while (this._eventQueue.length > 0 && this.isConsentGiven() === true) {
                    const item = this._eventQueue[0];

                    const result = await this._postInternal(item.path, item.payload, {
                        timeout: this._config.requestTimeout,
                        retries: 0,
                        requireConsent: true,
                        onController: controller => {
                            this._activeQueueAbort = controller;
                        }
                    });

                    this._activeQueueAbort = null;

                    if (result.ok || result.permanent) {
                        this._eventQueue.shift();
                        this._queueBackoffMs = 1000;
                        continue;
                    }

                    this._queueBackoffMs = Math.min(this._queueBackoffMs * 2, 30000);
                    this._scheduleFlush(this._queueBackoffMs);
                    break;
                }
            } finally {
                this._activeQueueAbort = null;
                this._flushInProgress = false;
            }
        },

        _flushQueueWithBeacon() {
            if (this._eventQueue.length === 0 || this.isConsentGiven() !== true) {
                return;
            }

            const remaining = [];

            for (const item of this._eventQueue) {
                if (this.isConsentGiven() !== true) {
                    remaining.push(item);
                    continue;
                }

                const queued = this.sendBeacon(item.path, item.payload);

                if (!queued) {
                    remaining.push(item);
                }
            }

            this._eventQueue = remaining.slice(0, this._config.maxQueueSize);
        },

        _clearAnalyticsQueue() {
            this._eventQueue = [];
            this._queueBackoffMs = 1000;

            if (this._flushTimer !== null && typeof window !== 'undefined') {
                try {
                    window.clearTimeout(this._flushTimer);
                } catch {
                    /* silent */
                }

                this._flushTimer = null;
            }

            if (this._activeQueueAbort) {
                try {
                    this._activeQueueAbort.abort();
                } catch {
                    /* silent */
                }

                this._activeQueueAbort = null;
            }
        },

        tracking: {
            logClick(ref, meta = undefined) {
                try {
                    const normalizedRef = api._normalizeRef(ref);

                    if (
                        !normalizedRef ||
                        api.isConsentGiven() !== true
                    ) {
                        return false;
                    }

                    const payload = {
                        ref: normalizedRef
                    };

                    if (meta) {
                        payload.meta = meta;
                    }

                    return api._enqueueAnalyticsEvent(
                        'track/click',
                        payload
                    );
                } catch (error) {
                    api._debug(
                        'Click tracking failed',
                        error
                    );

                    return false;
                }
            },

            logScrolledTo(ref, meta = undefined) {
                try {
                    const normalizedRef = api._normalizeRef(ref);

                    if (
                        !normalizedRef ||
                        api.isConsentGiven() !== true
                    ) {
                        return false;
                    }

                    const payload = {
                        ref: normalizedRef
                    };

                    if (meta) {
                        payload.meta = meta;
                    }

                    return api._enqueueAnalyticsEvent(
                        'track/scroll',
                        payload
                    );
                } catch (error) {
                    api._debug(
                        'Scroll tracking failed',
                        error
                    );

                    return false;
                }
            },
        },

        timeTracker: {
            startTime: null,
            totalTime: 0,
            finalized: false,
            initialized: false,
            intervalId: null,

            now() {
                try {
                    return typeof performance !== 'undefined' &&
                    typeof performance.now === 'function'
                        ? performance.now()
                        : Date.now();
                } catch {
                    return Date.now();
                }
            },

            _isVisible() {
                if (typeof document === 'undefined') {
                    return false;
                }

                return !document.visibilityState ||
                    document.visibilityState === 'visible';
            },

            start() {
                try {
                    if (!this.canSend() || !this._isVisible() || this.finalized) {
                        return false;
                    }

                    if (this.startTime === null) {
                        this.startTime = this.now();
                    }

                    return true;
                } catch (error) {
                    api._debug('Time tracker start failed', error);
                    return false;
                }
            },

            stop() {
                try {
                    if (this.startTime !== null) {
                        const elapsed = Math.max(0, this.now() - this.startTime);

                        if (Number.isFinite(elapsed)) {
                            this.totalTime += elapsed;
                        }

                        this.startTime = null;

                        return true;
                    }
                } catch (error) {
                    api._debug('Time tracker stop failed', error);
                    this.startTime = null;
                }

                return false;
            },

            reset() {
                this.startTime = null;
                this.totalTime = 0;
                this.finalized = false;

                return true;
            },

            canSend() {
                return api.isConsentGiven() === true;
            },

            send(event = 'manual') {
                try {
                    const normalizedEvent = api._normalizeRef(event, 64) || 'manual';

                    if (this.finalized || !this.canSend()) {
                        return false;
                    }

                    if (normalizedEvent === 'heartbeat') {
                        return api.sendBeacon('track/heartbeat', {
                            event: 'heartbeat',
                            ...api._makeEventMetadata()
                        });
                    }

                    this.stop();

                    const seconds = Math.round(Math.max(0, this.totalTime) / 1000);

                    if (normalizedEvent === 'tabClosed') {
                        this.finalized = true;
                    }

                    if (seconds <= 0) {
                        this.totalTime = 0;
                        return false;
                    }

                    const queued = api.sendBeacon('track/heartbeat', {
                        seconds,
                        event: normalizedEvent,
                        ...api._makeEventMetadata()
                    });

                    if (queued) {
                        this.totalTime = 0;
                    }

                    return queued;
                } catch (error) {
                    api._debug('Time tracker send failed', error);
                    return false;
                }
            },

            init() {
                if (this.initialized) {
                    return false;
                }

                this.initialized = true;
                this.finalized = false;
                this.startTime = null;
                this.totalTime = 0;

                if (typeof window !== 'undefined') {
                    api._addListener(window, 'pagehide', () => {
                        this.send('tabClosed');
                    });

                    api._addListener(window, 'beforeunload', () => {
                        this.send('tabClosed');
                    });

                    api._addListener(window, 'online', () => {
                        if (this.canSend()) {
                            this.send('heartbeat');
                        }
                    });

                    if (typeof document !== 'undefined') {
                        api._addListener(document, 'visibilitychange', () => {
                            if (document.visibilityState === 'hidden') {
                                this.send('hidden');
                                return;
                            }

                            if (document.visibilityState === 'visible') {
                                this.start();
                            }
                        });
                    }

                    this.intervalId = window.setInterval(() => {
                        if (this.canSend() && this._isVisible()) {
                            this.send('heartbeat');
                        }
                    }, api._config.track.time.heartbeatDelay);
                }

                return true;
            },

            destroy() {
                if (this.intervalId !== null && typeof window !== 'undefined') {
                    try {
                        window.clearInterval(this.intervalId);
                    } catch {
                        /* silent */
                    }
                }

                this.intervalId = null;
                this.initialized = false;
                this.reset();

                return true;
            }
        },

        trackScrolledTo(selector, ref = null) {
            try {
                const normalizedSelector = this._normalizeSelector(selector);
                const normalizedRef = this._normalizeRef(ref ?? selector);
                if (!normalizedSelector || !normalizedRef || typeof document === 'undefined') {
                    return false;
                }
                const key = `${normalizedSelector}::${normalizedRef}`;
                if (this._scrollTrackers.has(key)) {
                    return true;
                }
                if (this._scrollTrackers.size >= 100) {
                    return false;
                }
                const tracker = {selector: normalizedSelector, ref: normalizedRef, elements: new Map(),};
                this._scrollTrackers.set(key, tracker);
                if (this.isConsentGiven() === true) {
                    this._activateScrollTracker(tracker);
                }
                return true;
            } catch (error) {
                this._debug('Scroll tracker registration failed', error);
                return false;
            }
        },


        _activateScrollTrackers() {
            for (const tracker of this._scrollTrackers.values()) {
                this._activateScrollTracker(tracker);
            }
        },

        _activateScrollTracker(tracker) {
            if (!tracker || this.isConsentGiven() !== true || typeof document === 'undefined') {
                return;
            }
            let elements;
            try {
                elements = document.querySelectorAll(tracker.selector);
            } catch (error) {
                this._debug('Invalid selector for scroll tracking', tracker.selector, error);
                return;
            }
            if (!elements.length) {
                return;
            }
            for (const element of Array.from(elements)) {
                if (tracker.elements.has(element)) {
                    continue;
                }
                const state = {tracked: false, observer: null, cleanup: null,};
                tracker.elements.set(element, state);
                const markTracked = () => {
                    if (state.tracked || this.isConsentGiven() !== true) {
                        return;
                    }
                    state.tracked = true;
                    const meta = this._collectElementMeta(element);
                    this.tracking.logScrolledTo(tracker.ref, meta);
                    this._disconnectScrollElement(state);
                };
                if (typeof IntersectionObserver === 'function') {
                    try {
                        state.observer = new IntersectionObserver(entries => {
                            const entry = entries && entries[0];
                            if (entry && entry.isIntersecting) {
                                markTracked();
                            }
                        }, {root: null, threshold: 0.1});
                        state.observer.observe(element);
                        continue;
                    } catch (error) {
                        this._debug('IntersectionObserver setup failed', error);
                    }
                }
                if (typeof window === 'undefined') {
                    continue;
                }
                let ticking = false;
                const checkVisibility = () => {
                    if (state.tracked || this.isConsentGiven() !== true) {
                        this._disconnectScrollElement(state);
                        return;
                    }
                    if (ticking) {
                        return;
                    }
                    ticking = true;
                    const run = () => {
                        ticking = false;
                        try {
                            const rect = element.getBoundingClientRect();
                            const viewportHeight = window.innerHeight || document.documentElement.clientHeight;
                            if (rect.top < viewportHeight && rect.bottom > 0) {
                                markTracked();
                            }
                        } catch (error) {
                            this._debug('Scroll visibility check failed', error);
                            this._disconnectScrollElement(state);
                        }
                    };
                    if (typeof window.requestAnimationFrame === 'function') {
                        window.requestAnimationFrame(run);
                    } else {
                        setTimeout(run, 0);
                    }
                };
                const cleanup = () => {
                    try {
                        window.removeEventListener('scroll', checkVisibility, false);
                        window.removeEventListener('resize', checkVisibility, false);
                    } catch { /* silent */
                    }
                };
                state.cleanup = cleanup;
                try {
                    window.addEventListener('scroll', checkVisibility, {passive: true});
                    window.addEventListener('resize', checkVisibility, false);
                    checkVisibility();
                } catch (error) {
                    this._debug('Fallback scroll tracking setup failed', error);
                    cleanup();
                    state.cleanup = null;
                }
            }
        },

        _disconnectScrollElement(state) {
            if (!state) {
                return;
            }
            if (state.observer) {
                try {
                    state.observer.disconnect();
                } catch { /* silent */
                }
                state.observer = null;
            }
            if (state.cleanup) {
                try {
                    state.cleanup();
                } catch { /* silent */
                }
                state.cleanup = null;
            }
        },

        _deactivateScrollTrackers() {
            for (const tracker of this._scrollTrackers.values()) {
                if (!tracker.elements) {
                    continue;
                }
                for (const state of tracker.elements.values()) {
                    if (!state.tracked) {
                        this._disconnectScrollElement(state);
                    }
                }
            }
        },

        _activateClickTrackers() {
            if (
                typeof document === 'undefined' ||
                this.isConsentGiven() !== true
            ) {
                return;
            }

            const clicks = this._config.track.click || {};
            const entries = Object.entries(clicks);

            if (entries.length === 0) {
                return;
            }

            if (this._clickDelegationHandler) {
                return;
            }

            const handler = event => {
                if (this.isConsentGiven() !== true) {
                    return;
                }

                const target = event?.target;

                if (!target) {
                    return;
                }

                const element = target.nodeType === 1
                    ? target
                    : target.parentElement;

                if (!element || typeof element.closest !== 'function') {
                    return;
                }

                for (const [selector, configuredRef] of entries) {
                    let matchedElement;

                    try {
                        matchedElement = element.closest(selector);
                    } catch (error) {
                        this._debug('Invalid click selector', selector, error);
                        continue;
                    }

                    if (!matchedElement) {
                        continue;
                    }

                    let ref = configuredRef;

                    if (ref === null) {
                        ref = matchedElement.getAttribute('data-track-click');
                    }

                    const normalizedRef = this._normalizeRef(ref);

                    if (!normalizedRef) {
                        continue;
                    }

                    const meta = this._collectElementMeta(
                        matchedElement
                    );

                    this.tracking.logClick(
                        normalizedRef,
                        meta
                    );

                    break;
                }
            };

            this._clickDelegationHandler = handler;

            document.addEventListener('click', handler, false);
        },

        _deactivateClickTrackers() {
            if (
                typeof document !== 'undefined' &&
                this._clickDelegationHandler
            ) {
                try {
                    document.removeEventListener(
                        'click',
                        this._clickDelegationHandler,
                        false
                    );
                } catch {
                    /* silent */
                }
            }

            this._clickDelegationHandler = null;
        },

        _onDocumentReady(callback) {
            if (typeof document === 'undefined' || typeof callback !== 'function') {
                return;
            }

            const safeCallback = () => {
                try {
                    callback();
                } catch (error) {
                    this._debug('Document-ready callback failed', error);
                }
            };

            if (document.readyState === 'loading') {
                this._addListener(document, 'DOMContentLoaded', safeCallback, {
                    once: true
                });
                return;
            }

            this._defer(safeCallback);
        },

        _defer(callback) {
            try {
                if (typeof queueMicrotask === 'function') {
                    queueMicrotask(callback);
                } else if (typeof Promise === 'function') {
                    Promise.resolve().then(callback).catch(noop);
                } else {
                    setTimeout(callback, 0);
                }
            } catch {
                try {
                    setTimeout(callback, 0);
                } catch {
                    /* silent */
                }
            }
        },

        _addListener(target, type, handler, options) {
            if (!target || typeof target.addEventListener !== 'function') {
                return false;
            }

            try {
                target.addEventListener(type, handler, options);
                this._listeners.push({
                    target,
                    type,
                    handler,
                    options
                });

                return true;
            } catch (error) {
                this._debug('Event listener setup failed', error);
                return false;
            }
        },

        init() {
            if (this._initialized) {
                return false;
            }

            this._initialized = true;
            this._destroyed = false;
            this.resolveConfig();

            if (!this._configValid) {
                return false;
            }

            if (typeof window !== 'undefined') {
                this._addListener(window, 'pagehide', () => {
                    this._flushQueueWithBeacon();
                });

                this._addListener(window, 'online', () => {
                    this._scheduleFlush(0);
                });
            }

            if (this._config.track.time?.enabled !== false) {
                this.timeTracker.init();

                if (this.isConsentGiven() === true) {
                    this._ensureVisitorToken();
                    this.timeTracker.start();

                    // Required: send heartbeat immediately on each page load
                    // when consent has already been granted.
                    this.timeTracker.send('heartbeat');
                }
            }

            this._onDocumentReady(() => {
                const scrollTo = this._config.track.scrollTo || {};

                for (const [selector, ref] of Object.entries(scrollTo)) {
                    this.trackScrolledTo(selector, ref);
                }

                if (this.isConsentGiven() === true) {
                    this._activateScrollTrackers();
                    this._activateClickTrackers();
                }
            });

            return true;
        },

        destroy() {
            this._destroyed = true;
            this._initialized = false;
            this._clearAnalyticsQueue();
            this.timeTracker.destroy();
            this._deactivateScrollTrackers();
            this._deactivateClickTrackers();

            for (const listener of this._listeners.splice(0)) {
                try {
                    listener.target.removeEventListener(
                        listener.type,
                        listener.handler,
                        listener.options
                    );
                } catch {
                    /* silent */
                }
            }

            this._consentListeners.clear();

            return true;
        }
    };

    return api;
})();

try {
    if (typeof window !== 'undefined') {
        window.visitMetrics = visitMetrics;
    }

    visitMetrics.init();
} catch {
    /* Analytics must never break the host application. */
}

try {
    if (typeof document !== 'undefined') {
        document.addEventListener('click', async event => {
            const button = event.target?.closest?.('[data-cookie-consent]');

            if (!button) {
                return;
            }

            while (
                !window.visitMetrics ||
                typeof window.visitMetrics.setConsent !== 'function'
                ) {
                await new Promise(resolve => setTimeout(resolve, 50));
            }

            const consent = button.dataset.cookieConsent;

            if (consent === 'accept') {
                window.visitMetrics.setConsent(true);
                window.__modalManager?.close?.();
                return;
            }

            if (consent === 'reject') {
                window.visitMetrics.setConsent(false);
                window.__modalManager?.close?.();
            }
        });
    }
} catch {
    /* Consent UI handler must never break the host application. */
}