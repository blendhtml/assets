# BlendHTML Visit Metrics V1

A lightweight, dependency-free browser analytics library for tracking visitor activity.

The library supports:

- visitor identity
- cookie consent
- Global Privacy Control
- configured click tracking
- configured scroll-to-element tracking
- page activity / time tracking
- heartbeat events
- tab visibility changes
- page closing
- event queueing
- retry handling
- `sendBeacon()` lifecycle delivery
- offline handling
- configurable API endpoints
- configurable payload limits
- element metadata on click and scroll events

The library is designed to fail safely: analytics failures must never break the host application.

---

# Installation

Load the library on the page:

```html
<script src="/path/to/visit-metrics.js"></script>
```

The library exposes:

```js
window.visitMetrics
```

and automatically initializes itself.

You normally do not need to call:

```js
visitMetrics.init();
```

manually.

---

# Configuration

Configuration is supplied through:

```js
window.BLENDHTML_VISIT_METRICS_V1
```

The current configuration structure is:

```js
window.BLENDHTML_VISIT_METRICS_V1 = {
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

    track: {
        time: {
            enabled: true,
            heartbeatDelay: 15000
        },

        scrollTo: {
            section: 'Scrolled to section',
            footer: 'Scrolled to footer'
        },

        click: {
            'footer a': 'Footer link clicked',
            'a': 'Link clicked',
            'button': 'Button clicked',
            '[data-open-modal]': 'Modal opened'
        }
    }
};
```

All configuration properties are optional.

---

# Configuration Structure

Tracking configuration is grouped under:

```js
track
```

with three supported sections:

```js
track: {
    time: {},
    scrollTo: {},
    click: {}
}
```

The complete public configuration shape is:

```js
window.BLENDHTML_VISIT_METRICS_V1 = {
    debug: true,

    track: {
        time: {
            enabled: true,
            heartbeatDelay: 15000
        },

        scrollTo: {
            '#section-wisepro': 'Scrolled to Wisepro demo card',
            '#section-tastyineesti': 'Scrolled to TastyInEesti demo card'
        },

        click: {
            '#section-wisepro__title': 'Wisepro demo card title clicked',
            '#section-tastyineesti__title': 'TastyInEesti demo card title clicked'
        }
    }
};
```

The old configuration structure is not supported.

Do not use:

```js
window.VISIT_METRICS_V1_CONFIG
```

or:

```js
{
    timeTracking: {},
    scrolledToTracking: [],
        clicks: {}
}
```

Use only:

```js
window.BLENDHTML_VISIT_METRICS_V1
```

with:

```js
track.time
track.scrollTo
track.click
```

---

# Complete Configuration Example

```js
window.BLENDHTML_VISIT_METRICS_V1 = {
    apiBase: '/blendhtml/api/visit-metrics/v1/',

    cookieAge: 31536000,

    credentials: 'same-origin',

    secureCookies: undefined,

    debug: true,

    respectGlobalPrivacyControl: true,

    requestTimeout: 8000,

    maxQueueSize: 50,

    maxBeaconBytes: 60000,

    maxPayloadBytes: 8192,

    track: {
        time: {
            enabled: true,
            heartbeatDelay: 15000
        },

        scrollTo: {
            section: 'Scrolled to section',
            footer: 'Scrolled to footer',
            '#section-wisepro': 'Scrolled to Wisepro demo card',
            '#section-tastyineesti': 'Scrolled to TastyInEesti demo card'
        },

        click: {
            'footer a': 'Footer link clicked',
            'a': 'Link clicked',
            'button': 'Button clicked',
            '[data-open-modal]': 'Modal opened',
            '#section-wisepro__title': 'Wisepro demo card title clicked',
            '#section-tastyineesti__title': 'TastyInEesti demo card title clicked'
        }
    }
};
```

---

# Configuration Reference

## `apiBase`

Default:

```js
'/blendhtml/api/visit-metrics/v1/'
```

Defines the base URL used by the analytics API.

Example:

```js
window.BLENDHTML_VISIT_METRICS_V1 = {
    apiBase: '/my-api/visit-metrics/v1/'
};
```

The library normalizes the URL and ensures the pathname ends with `/`.

The URL must use either:

```text
http:
```

or:

```text
https:
```

URLs containing credentials, query strings, or hashes are rejected.

When the current page is HTTPS, insecure cross-origin HTTP analytics endpoints are rejected.

---

## `cookieAge`

Default:

```js
31536000
```

Cookie lifetime in seconds.

The value is normalized between:

```text
0
```

and:

```text
34560000
```

where:

```text
34560000 = 400 days
```

---

## `credentials`

Default:

```js
'same-origin'
```

Controls the `credentials` option used by `fetch()`.

Supported values:

```text
same-origin
include
omit
```

Example:

```js
window.BLENDHTML_VISIT_METRICS_V1 = {
    credentials: 'include'
};
```

---

## `secureCookies`

Default:

```js
undefined
```

When `undefined`, the library determines whether cookies should use the `Secure` attribute from the current page protocol.

HTTPS pages automatically use:

```text
Secure
```

You can explicitly configure it:

```js
secureCookies: true
```

or:

```js
secureCookies: false
```

---

## `debug`

Default:

```js
false
```

Enables diagnostic logging.

Example:

```js
window.BLENDHTML_VISIT_METRICS_V1 = {
    debug: true
};
```

Debug output uses:

```js
console.debug('[visitMetrics]', ...);
```

Production deployments should normally use:

```js
debug: false
```

---

## `respectGlobalPrivacyControl`

Default:

```js
true
```

When enabled, the library respects:

```js
navigator.globalPrivacyControl
```

If:

```js
navigator.globalPrivacyControl === true
```

the library treats consent as denied.

---

## `requestTimeout`

Default:

```js
8000
```

Request timeout in milliseconds.

Allowed range:

```text
1000–60000
```

---

## `maxQueueSize`

Default:

```js
50
```

Maximum number of analytics events held in the client-side queue.

Allowed range:

```text
1–250
```

When the queue is full, the oldest event is removed before adding a new event.

---

## `maxBeaconBytes`

Default:

```js
60000
```

Maximum payload size allowed for `sendBeacon()`.

Allowed range:

```text
1024–64000 bytes
```

---

## `maxPayloadBytes`

Default:

```js
8192
```

Maximum payload size for normal analytics requests.

Allowed range:

```text
512–32768 bytes
```

---

# Time Tracking

Time tracking is configured under:

```js
track.time
```

Example:

```js
track: {
    time: {
        enabled: true,
            heartbeatDelay: 15000
    }
}
```

Time tracking is enabled by default.

---

# `track.time.enabled`

Default:

```js
true
```

Controls whether the time tracker is initialized.

Disable time tracking:

```js
track: {
    time: {
        enabled: false
    }
}
```

When enabled, the library initializes the time tracker and registers page lifecycle listeners.

---

# `track.time.heartbeatDelay`

Default:

```js
15000
```

The interval between heartbeat events, in milliseconds.

Example:

```js
track: {
    time: {
        enabled: true,
            heartbeatDelay: 30000
    }
}
```

The value is normalized to:

```text
1000–300000 ms
```

---

# Heartbeat Tracking

Heartbeats are sent through:

```text
POST /blendhtml/api/visit-metrics/v1/track/heartbeat
```

A heartbeat payload contains:

```json
{
  "event": "heartbeat",
  "event_id": "...",
  "ts": "..."
}
```

The library sends an immediate heartbeat when:

- the page initializes with consent already granted
- consent is granted
- the periodic heartbeat interval fires while the page is visible
- the browser comes back online

---

# Time Tracking Events

The time tracker sends events through:

```text
track/heartbeat
```

The event value identifies the type of time event.

Possible events include:

```text
heartbeat
hidden
tabClosed
```

A heartbeat:

```json
{
  "event": "heartbeat",
  "event_id": "...",
  "ts": "..."
}
```

A visibility event:

```json
{
  "event": "hidden",
  "seconds": 42,
  "event_id": "...",
  "ts": "..."
}
```

A page-close event:

```json
{
  "event": "tabClosed",
  "seconds": 42,
  "event_id": "...",
  "ts": "..."
}
```

---

# Time Measurement

The tracker maintains active time while the document is visible.

It uses:

```js
performance.now()
```

when available.

It falls back to:

```js
Date.now()
```

when necessary.

When the page becomes hidden, the accumulated time is converted to seconds and sent.

---

# Page Visibility

The library listens for:

```text
visibilitychange
```

When:

```js
document.visibilityState === 'hidden'
```

the tracker sends:

```text
hidden
```

and stops the current active-time interval.

When:

```js
document.visibilityState === 'visible'
```

the tracker resumes timing.

---

# Page Close

The library listens for:

```text
pagehide
```

and:

```text
beforeunload
```

and sends:

```text
tabClosed
```

when appropriate.

Lifecycle-sensitive requests use `sendBeacon()` when available.

---

# Online Events

The library listens for:

```text
online
```

When the browser becomes online again, the library:

1. schedules an analytics queue flush
2. sends a heartbeat from the time tracker when consent is available

---

# Track Click

The click-tracking feature is exposed through the analytics path:

```text
track/click
```

The corresponding API endpoint is:

```text
POST /blendhtml/api/visit-metrics/v1/track/click
```

## Configure `track.click`

Click tracking is configured under:

```js
window.BLENDHTML_VISIT_METRICS_V1 = {
    track: {
        click: {
            'button': 'Button clicked',
            'nav a': 'Navigation link clicked',
            'footer a': 'Footer link clicked',
            'a[href]': 'Link clicked',
            '[data-open-modal]': 'Modal opened',
            '[data-track-click]': null
        }
    }
};
```

The library's built-in click configuration is:

```js
{
    'button': 'Button clicked',
    'nav a': 'Navigation link clicked',
    'footer a': 'Footer link clicked',
    'a[href]': 'Link clicked',
    '[data-open-modal]': 'Modal opened',
    '[data-track-click]': null
}
```

User configuration is merged with these defaults.

### How a click becomes a `track/click` event

When consent has been granted, the library installs one delegated `click` listener on `document`.

For each click:

1. It finds the closest element matching each configured selector.
2. Rules are evaluated in configuration order.
3. The first matching rule wins.
4. The configured reference becomes the event `ref`.
5. If the configured reference is `null`, the library reads `data-track-click` from the matched element.
6. Element metadata is collected.
7. The event is queued for:

```text
track/click
```

The queued payload has this shape:

```json
{
    "ref": "Button clicked",
    "meta": {
        "tag": "BUTTON",
        "id": "signup",
        "class": "btn",
        "text": "Sign up",
        "type": "button"
    },
    "event_id": "abc123",
    "ts": "2026-08-14T10:00:00.000Z"
}
```

The `event_id` and `ts` values are generated by the library when the event is queued.

### Direct click API

You can record a click programmatically with:

```js
visitMetrics.tracking.logClick(
    'Signup button clicked'
);
```

You can also provide element metadata:

```js
visitMetrics.tracking.logClick(
    'Signup button clicked',
    {
        tag: 'BUTTON',
        id: 'signup',
        text: 'Sign up'
    }
);
```

The method queues:

```text
track/click
```

and returns:

```text
true
```

when the event is accepted into the queue.

It returns:

```text
false
```

when the event cannot be queued, including when consent has not been granted.

### `data-track-click`

A click rule can use `null` as its configured reference:

```js
track: {
    click: {
        '[data-track-click]': null
    }
}
```

Then the actual reference is read from:

```html
<button data-track-click="Signup button clicked">
    Sign up
</button>
```

This produces:

```json
{
    "ref": "Signup button clicked"
}
```

If `data-track-click` is missing or empty, that rule does not generate an event.

### Click rule ordering

Rules are evaluated from top to bottom.

The first matching selector wins.

Put specific selectors before generic selectors:

```js
track: {
    click: {
        'footer a': 'Footer link clicked',
        'a[href]': 'Link clicked'
    }
}
```

Do not put the generic rule first:

```js
track: {
    click: {
        'a[href]': 'Link clicked',
        'footer a': 'Footer link clicked'
    }
}
```

With the second configuration, a footer link matches `a[href]` first and is recorded as `Link clicked`.

### Dynamic elements

Click tracking uses event delegation on `document`, so elements added after initialization are automatically eligible if they match a configured selector.

Example:

```js
document.body.insertAdjacentHTML(
    'beforeend',
    '<button class="signup-button">Sign up</button>'
);
```

Configuration:

```js
track: {
    click: {
        '.signup-button': 'Signup button clicked'
    }
}
```

No analytics reinitialization is required.

### Consent requirement

Click events are only accepted when:

```js
visitMetrics.isConsentGiven() === true
```

Without granted consent:

```js
visitMetrics.tracking.logClick('Signup clicked');
```

returns:

```text
false
```

and no `track/click` request is sent.

### Transport

Queued click events normally use:

```js
fetch()
```

for delivery.

The queue retries temporary failures using backoff.

During page lifecycle shutdown, queued analytics can be delivered with:

```js
navigator.sendBeacon()
```

with a `fetch(..., { keepalive: true })` fallback.

### Payload sanitization

For `track/click`, the library accepts:

```text
ref
meta
event_id
ts
```

The payload is sanitized before transmission.

Element metadata can include:

```text
tag
id
class
text
href
target
rel
type
name
role
ariaLabel
data-*
```

The payload is rejected if it exceeds the configured:

```js
maxPayloadBytes
```

limit.

---

# Click Tracking

Click tracking is configured as a **selector-to-reference map**.

Example:

```js
track: {
    click: {
        'footer a': 'Footer link clicked',
            'a': 'Link clicked',
            'button': 'Button clicked',
            '[data-open-modal]': 'Modal opened'
    }
}
```

The default configuration includes universal link and button tracking plus footer and modal-specific events.

---

# Click Rule Ordering

Click rules are evaluated in configuration order.

The first matching rule wins.

The click handler stops after the first matching selector.

Therefore, more specific selectors should be placed before generic selectors.

Good:

```js
click: {
    'footer a': 'Footer link clicked',
        'a': 'Link clicked'
}
```

Bad:

```js
click: {
    'a': 'Link clicked',
        'footer a': 'Footer link clicked'
}
```

With the second configuration, a footer link matches `a` first and is recorded as:

```text
Link clicked
```

rather than:

```text
Footer link clicked
```

---

# Click Configuration

Each click entry has this form:

```js
click: {
    '<CSS selector>': '<analytics reference>'
}
```

Example:

```js
track: {
    click: {
        '#pricing-title': 'Pricing title clicked',
            '.signup-button': 'Signup button clicked'
    }
}
```

When an element matching:

```css
#pricing-title
```

is clicked, the library records:

```text
Pricing title clicked
```

as the analytics reference.

---

# Click Tracking Uses Event Delegation

The library installs one delegated click handler on:

```js
document
```

It does not install an individual listener on every configured element.

The handler uses:

```js
element.closest(selector)
```

to determine whether the clicked element matches a configured selector.

This means nested elements can trigger the configured selector.

Example:

```html
<a class="signup">
    <span>
        Sign up
    </span>
</a>
```

Configuration:

```js
track: {
    click: {
        '.signup': 'Signup clicked'
    }
}
```

Clicking the `<span>` can resolve to the `.signup` ancestor.

---

# Dynamic Click Elements

Because click tracking uses document-level event delegation, dynamically created elements can be tracked as long as they match a configured selector.

Example:

```js
document.querySelector('#app').innerHTML = `
    <button class="signup-button">
        Sign up
    </button>
`;
```

Configuration:

```js
track: {
    click: {
        '.signup-button': 'Signup button clicked'
    }
}
```

No analytics reinitialization is required.

---

# Click References From `data-analytics-click`

A configured click selector can use:

```js
null
```

as its reference.

Example:

```js
track: {
    click: {
        '#pricing-link': null
    }
}
```

In this case the library reads:

```html
data-analytics-click
```

from the matched element.

Example:

```html
<a
        id="pricing-link"
        data-analytics-click="Pricing link clicked"
        href="/pricing"
>
    Pricing
</a>
```

The resulting reference is:

```text
Pricing link clicked
```

If the attribute is missing or empty, the click is ignored.

`null` therefore does **not** mean "track automatically". It means "derive the reference from `data-analytics-click`".

---

# Multiple Click Rules

Multiple click selectors can be configured:

```js
track: {
    click: {
        '#hero-button': 'Hero button clicked',
            '#pricing-button': 'Pricing button clicked',
            '.signup-link': 'Signup link clicked'
    }
}
```

The library supports up to:

```text
100
```

configured click entries.

---

# Click Selector Limits

Each click selector must:

- be a string
- be non-empty
- be no longer than 512 characters
- contain no control characters

---

# Click Reference Limits

Click references are normalized to a maximum of:

```text
512 characters
```

References can originate from:

```js
click: {
    '.button': 'Button clicked'
}
```

or from:

```html
data-analytics-click="Button clicked"
```

when the configured reference is `null`.

---

# Click Element Metadata

Click events can include metadata about the matched element.

The library can collect:

```text
tag
id
class
text
href
target
rel
type
name
role
ariaLabel
data-*
```

Example click payload:

```json
{
  "ref": "Signup button clicked",
  "meta": {
    "tag": "BUTTON",
    "id": "signup",
    "class": "btn btn-primary",
    "text": "Sign up",
    "type": "button"
  },
  "event_id": "abc123",
  "ts": "2026-08-14T10:00:00.000Z"
}
```

Text and attribute values are normalized and length-limited.

---

# Click API Endpoint

Click events are sent to:

```text
POST /blendhtml/api/visit-metrics/v1/track/click
```

Example payload:

```json
{
  "ref": "Signup button clicked",
  "meta": {
    "tag": "BUTTON",
    "id": "signup"
  },
  "event_id": "abc123",
  "ts": "2026-08-14T10:00:00.000Z"
}
```

---

# Click Consent Requirement

Click events are only queued when:

```js
visitMetrics.isConsentGiven() === true
```

If consent is not granted, the click is ignored.

When consent is denied, click tracking is deactivated.

---

# Scroll Tracking

Scroll tracking is configured under:

```js
track.scrollTo
```

It uses a selector-to-reference map.

Example:

```js
track: {
    scrollTo: {
        section: 'Scrolled to section',
            footer: 'Scrolled to footer'
    }
}
```

---

# Scroll Tracking Matches All Elements

A scroll selector matches **all elements** matching the selector.

For example:

```js
scrollTo: {
    section: 'Scrolled to section'
}
```

with:

```html
<section id="one"></section>
<section id="two"></section>
<section id="three"></section>
```

creates independent trackers for all three sections.

Each section can therefore generate its own event:

```text
Scrolled to section
Scrolled to section
Scrolled to section
```

The event reference is the same, while the attached `meta` identifies the individual element.

This behavior is intentional.

The implementation uses:

```js
document.querySelectorAll(selector)
```

rather than:

```js
document.querySelector(selector)
```

---

# Scroll Tracking Is One-Time Per Element

Each matching element is tracked at most once per tracker registration.

For example:

```js
scrollTo: {
    section: 'Scrolled to section'
}
```

with five matching sections can generate up to five events.

It does not repeatedly generate events when the visitor scrolls back and forth across the same section.

---

# Default Section Tracking

The default configuration contains:

```js
track: {
    scrollTo: {
        section: 'Scrolled to section',
            footer: 'Scrolled to footer'
    }
}
```

Therefore sections and the footer are tracked by default.

---

# Scroll Configuration Is Merged

User-provided `track.scrollTo` entries are merged with the defaults.

For example:

```js
window.BLENDHTML_VISIT_METRICS_V1 = {
    track: {
        scrollTo: {
            '#pricing': 'Pricing section viewed'
        }
    }
};
```

The resolved configuration contains the default entries plus:

```js
{
    '#pricing': 'Pricing section viewed'
}
```

If the same selector is provided by the user, the configured value overrides the default value.

---

# Scroll Entry Format

Each entry uses:

```js
scrollTo: {
    '<CSS selector>': '<analytics reference>'
}
```

Example:

```js
scrollTo: {
    '#features': 'Features section viewed',
        '#pricing': 'Pricing section viewed'
}
```

---

# Scroll Selector Limits

Scroll selectors are limited to:

```text
512 characters
```

The total number of configured scroll entries is limited to:

```text
100
```

The 100-entry limit applies to configured selectors, not to the number of DOM elements matched by each selector.

---

# Scroll References

References are normalized to strings.

A reference can originate from:

```js
scrollTo: {
    '#pricing': 'Pricing section viewed'
}
```

The normalized reference is then used as the `ref` value in the analytics request.

---

# Scroll Detection

The preferred mechanism is:

```js
IntersectionObserver
```

with:

```js
threshold: 0.1
```

If `IntersectionObserver` is unavailable or fails, the library falls back to:

```text
scroll
resize
getBoundingClientRect()
requestAnimationFrame()
```

visibility checking.

---

# Scroll Element Metadata

Each tracked scroll element can include metadata in the event payload.

The metadata can contain:

```text
tag
id
class
text
role
ariaLabel
data-*
```

Example:

```html
<section
        id="pricing"
        class="section pricing"
        data-plan="pro"
>
    Pricing
</section>
```

can produce:

```json
{
  "ref": "Scrolled to section",
  "meta": {
    "tag": "SECTION",
    "id": "pricing",
    "class": "section pricing",
    "text": "Pricing",
    "attributes": {
      "data-plan": "pro"
    }
  }
}
```

---

# Scroll Activation

Configured scroll trackers are registered after document readiness.

The library calls:

```js
visitMetrics.trackScrolledTo(selector, ref)
```

for every configured `track.scrollTo` entry.

Each selector is then resolved against all currently matching elements.

---

# Dynamic Scroll Elements

Scroll tracking resolves matching elements when the tracker is activated.

It does not continuously search the DOM for newly added elements.

If an element does not exist when the tracker is activated, register it after the element exists:

```js
visitMetrics.trackScrolledTo(
    '#dynamic-section',
    'Dynamic section viewed'
);
```

This also means that dynamically added elements do not automatically join an already active selector tracker unless the tracker is explicitly activated again.

---

# Scroll API Endpoint

Scroll events are sent to:

```text
POST /blendhtml/api/visit-metrics/v1/track/scroll
```

Example payload:

```json
{
  "ref": "Pricing section viewed",
  "meta": {
    "tag": "SECTION",
    "id": "pricing"
  },
  "event_id": "abc124",
  "ts": "2026-08-14T10:00:10.000Z"
}
```

---

# Consent

The library supports three consent states:

```text
unknown
granted
denied
```

Consent is stored in:

```text
blendhtml_cookies_accepted
```

The stored values are:

```text
1 = granted
0 = denied
```

---

# Visitor Cookie

The visitor identity cookie is:

```text
blendhtml_visitor_token
```

The consent cookie is:

```text
blendhtml_cookies_accepted
```

Both use:

```text
Path=/
SameSite=Lax
```

and the configured cookie lifetime.

`Secure` is added when configured or when the page is HTTPS.

---

# Checking Consent

Use:

```js
visitMetrics.isConsentGiven()
```

Possible results:

```js
true
```

```js
false
```

or:

```js
null
```

Meaning:

```text
true  = consent granted
false = consent denied
null  = consent unknown
```

---

# Granting Consent

```js
await visitMetrics.setConsent(true);
```

When consent is granted, the library:

1. stores the consent cookie
2. ensures a visitor token exists
3. activates scroll tracking
4. activates click tracking
5. starts time tracking when enabled
6. sends an immediate heartbeat
7. schedules an analytics queue flush
8. notifies consent listeners
9. synchronizes consent with the API

---

# Denying Consent

```js
await visitMetrics.setConsent(false);
```

When consent is denied, the library:

1. stores the denied consent state
2. clears the analytics queue
3. resets the time tracker
4. deactivates scroll tracking
5. deactivates click tracking
6. notifies consent listeners
7. synchronizes consent with the API

---

# Consent Synchronization Endpoint

Consent is synchronized through:

```text
POST /blendhtml/api/visit-metrics/v1/gdpr/consent
```

Granted:

```json
{
  "bool": true
}
```

Denied:

```json
{
  "bool": false
}
```

---

# Global Privacy Control

The default is:

```js
respectGlobalPrivacyControl: true
```

When enabled and:

```js
navigator.globalPrivacyControl === true
```

the library treats consent as denied.

Analytics events are therefore not sent while the privacy signal is active.

---

# Visitor Identity

The visitor token is stored in:

```text
blendhtml_visitor_token
```

A token is created when consent is granted and no existing visitor token is available.

---

# Visitor Token Generation

The preferred method is:

```js
crypto.randomUUID()
```

If that is unavailable, the library uses:

```js
crypto.getRandomValues()
```

If cryptographic APIs are unavailable, it falls back to a timestamp/random-value token.

---

# Analytics Event Metadata

Queued analytics events receive:

```json
{
  "event_id": "...",
  "ts": "..."
}
```

Example:

```json
{
  "ref": "Pricing section viewed",
  "event_id": "m0abc123-1-xyz123",
  "ts": "2026-08-14T10:00:00.000Z"
}
```

`event_id` is generated client-side.

`ts` is generated client-side as an ISO timestamp.

---

# API Endpoints

The current analytics endpoints are:

```text
POST /blendhtml/api/visit-metrics/v1/track/click
POST /blendhtml/api/visit-metrics/v1/track/scroll
POST /blendhtml/api/visit-metrics/v1/track/heartbeat
POST /blendhtml/api/visit-metrics/v1/gdpr/consent
```

---

# Analytics Endpoint Protection

The analytics endpoints are:

```text
track/click
track/scroll
track/heartbeat
```

These require consent.

If:

```js
visitMetrics.isConsentGiven() !== true
```

the library refuses to send them.

The consent endpoint:

```text
gdpr/consent
```

is used to synchronize consent and is not treated as an analytics event endpoint.

---

# Click Payload

Example:

```json
{
  "ref": "Signup button clicked",
  "meta": {
    "tag": "BUTTON",
    "id": "signup"
  },
  "event_id": "abc123",
  "ts": "2026-08-14T10:00:00.000Z"
}
```

Endpoint:

```text
POST /blendhtml/api/visit-metrics/v1/track/click
```

---

# Scroll Payload

Example:

```json
{
  "ref": "Pricing section viewed",
  "meta": {
    "tag": "SECTION",
    "id": "pricing"
  },
  "event_id": "abc124",
  "ts": "2026-08-14T10:00:10.000Z"
}
```

Endpoint:

```text
POST /blendhtml/api/visit-metrics/v1/track/scroll
```

---

# Heartbeat Payload

Example:

```json
{
  "event": "heartbeat",
  "event_id": "abc125",
  "ts": "2026-08-14T10:00:15.000Z"
}
```

Endpoint:

```text
POST /blendhtml/api/visit-metrics/v1/track/heartbeat
```

---

# Time Event Payload

Example:

```json
{
  "event": "hidden",
  "seconds": 42,
  "event_id": "abc126",
  "ts": "2026-08-14T10:00:42.000Z"
}
```

The endpoint remains:

```text
POST /blendhtml/api/visit-metrics/v1/track/heartbeat
```

---

# Page Close Payload

Example:

```json
{
  "event": "tabClosed",
  "seconds": 12,
  "event_id": "abc127",
  "ts": "2026-08-14T10:00:54.000Z"
}
```

The endpoint remains:

```text
POST /blendhtml/api/visit-metrics/v1/track/heartbeat
```

---

# Consent Payload

Granted:

```json
{
  "bool": true
}
```

Denied:

```json
{
  "bool": false
}
```

Endpoint:

```text
POST /blendhtml/api/visit-metrics/v1/gdpr/consent
```

---

# HTTP Requests

Normal API requests use:

```js
fetch()
```

with:

```text
POST
Content-Type: application/json
Accept: application/json
```

The configured:

```js
credentials
```

value is passed to `fetch()`.

---

# Request Timeout

Normal requests use the configured:

```js
requestTimeout
```

defaulting to:

```text
8000 ms
```

When available, `AbortController` is used to cancel timed-out requests.

---

# Retries

Direct `post()` requests use one retry.

Queued analytics events use the queue's own retry/backoff mechanism.

Queue backoff starts at:

```text
1000 ms
```

and can increase up to:

```text
30000 ms
```

---

# Offline Handling

When:

```js
navigator.onLine === false
```

network requests are treated as temporarily unavailable.

Queued events remain in the queue.

When the browser fires:

```text
online
```

the library schedules another queue flush.

---

# Event Queue

Analytics events are placed in an internal queue before transmission.

The default maximum queue size is:

```text
50
```

When the queue reaches the configured maximum, the oldest event is discarded.

---

# Queue Flush

The queue is flushed asynchronously.

The library sends events in order.

When a request succeeds, the event is removed from the queue.

When a request fails temporarily, the event remains queued and another flush is scheduled using exponential backoff.

Permanent client errors are removed from the queue.

---

# Page Lifecycle Delivery

The library uses:

```js
navigator.sendBeacon()
```

for lifecycle-sensitive analytics delivery.

This is especially important for events generated during:

```text
pagehide
beforeunload
```

If `sendBeacon()` is unavailable or fails, the library falls back to:

```js
fetch(..., {
    keepalive: true
})
```

---

# Payload Limits

Normal request payloads are limited by:

```js
maxPayloadBytes
```

with a default of:

```text
8192 bytes
```

Beacon payloads are limited by:

```js
maxBeaconBytes
```

with a default of:

```text
60000 bytes
```

Oversized payloads are rejected.

---

# Public API

The global API is:

```js
window.visitMetrics
```

---

## `init()`

```js
visitMetrics.init();
```

Initializes the library.

The library calls this automatically after creating:

```js
window.visitMetrics
```

Calling `init()` again while already initialized returns:

```text
false
```

---

## `destroy()`

```js
visitMetrics.destroy();
```

Destroys the active analytics state.

It:

- clears the analytics queue
- stops the time tracker
- deactivates scroll trackers
- removes click tracking
- removes registered event listeners
- clears consent listeners

---

## `isConsentGiven()`

```js
visitMetrics.isConsentGiven();
```

Returns:

```text
true
false
null
```

---

## `setConsent()`

Grant:

```js
await visitMetrics.setConsent(true);
```

Deny:

```js
await visitMetrics.setConsent(false);
```

---

## `onConsentChange()`

Register a listener:

```js
const unsubscribe = visitMetrics.onConsentChange(consent => {
    console.log('Consent:', consent);
});
```

Remove it:

```js
unsubscribe();
```

---

## `post()`

The public HTTP helper is:

```js
visitMetrics.post(path, payload);
```

Example:

```js
await visitMetrics.post(
    'track/click',
    {
        ref: 'Signup clicked'
    }
);
```

Analytics paths require consent.

---

## `sendBeacon()`

The public beacon helper is:

```js
visitMetrics.sendBeacon(path, payload);
```

Example:

```js
visitMetrics.sendBeacon(
    'track/heartbeat',
    {
        event: 'heartbeat'
    }
);
```

Analytics paths require consent.

---

# Tracking API

The library exposes:

```js
visitMetrics.tracking
```

with:

```js
visitMetrics.tracking.logClick(ref)
```

and:

```js
visitMetrics.tracking.logScrolledTo(ref)
```

---

# `tracking.logClick()`

Example:

```js
visitMetrics.tracking.logClick(
    'Signup button clicked'
);
```

This queues:

```text
track/click
```

with:

```json
{
  "ref": "Signup button clicked"
}
```

The method returns:

```text
true
```

when the event was accepted into the queue.

It returns:

```text
false
```

when the event cannot be queued.

---

# `tracking.logScrolledTo()`

Example:

```js
visitMetrics.tracking.logScrolledTo(
    'Pricing section viewed'
);
```

This queues:

```text
track/scroll
```

with:

```json
{
  "ref": "Pricing section viewed"
}
```

---

# `trackScrolledTo()`

Register a scroll tracker:

```js
visitMetrics.trackScrolledTo(
    '#pricing',
    'Pricing section viewed'
);
```

The selector is used to locate **all matching elements**.

The reference is used as the analytics `ref`.

Each matching element is tracked independently and at most once.

---

# Duplicate Scroll Registration

A scroll tracker is identified by:

```text
selector + ref
```

Registering the same combination more than once does not create another tracker.

---

# Scroll Tracker Limit

The library allows a maximum of:

```text
100
```

registered scroll trackers.

This is a limit on configured selector/ref registrations, not on the number of matching DOM elements.

---

# Initialization Sequence

The library performs approximately the following sequence:

```text
1. Create visitMetrics
2. Expose window.visitMetrics
3. Initialize configuration
4. Register page lifecycle handlers
5. Initialize time tracking when enabled
6. Wait for document readiness
7. Register configured scroll trackers
8. Resolve all matching scroll elements
9. Activate tracking when consent is granted
```

---

# Configuration Resolution

Configuration is resolved by:

```js
visitMetrics.resolveConfig()
```

The runtime configuration is read only from:

```js
window.BLENDHTML_VISIT_METRICS_V1
```

The resolved configuration contains:

```js
{
    apiBase,
        cookieAge,
        credentials,
        secureCookies,
        debug,
        respectGlobalPrivacyControl,
        requestTimeout,
        maxQueueSize,
        maxBeaconBytes,
        maxPayloadBytes,

        track: {
        time,
            scrollTo,
            click
    }
}
```

---

# Default Configuration

The current defaults are:

```js
{
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

        track: {
        time: {
            enabled: true,
                heartbeatDelay: 15000
        },

        scrollTo: {
            section: 'Scrolled to section',
                footer: 'Scrolled to footer'
        },

        click: {
            'footer a': 'Footer link clicked',
                'a': 'Link clicked',
                'button': 'Button clicked',
                '[data-open-modal]': 'Modal opened'
        }
    }
}
```

---

# Default Merging Behavior

`track.scrollTo` is merged with the default configuration.

Therefore:

```js
window.BLENDHTML_VISIT_METRICS_V1 = {
    track: {
        scrollTo: {
            '#pricing': 'Pricing viewed'
        }
    }
};
```

does not remove the default:

```js
section: 'Scrolled to section'
footer: 'Scrolled to footer'
```

The resulting scroll configuration contains the defaults plus:

```js
{
    '#pricing': 'Pricing viewed'
}
```

If the same selector is provided by the user, the configured value overrides the default value.

`track.click` is also merged with its default configuration.

For example:

```js
window.BLENDHTML_VISIT_METRICS_V1 = {
    track: {
        click: {
            '#pricing': 'Pricing clicked'
        }
    }
};
```

adds the custom rule to the default click rules.

---

# Selector Normalization

Selectors are trimmed and validated.

A selector is rejected when it:

- is not a string
- is empty
- exceeds 512 characters
- contains control characters

The browser's selector APIs are responsible for determining whether the selector itself is syntactically valid.

---

# Reference Normalization

References may be:

```text
string
number
boolean
```

They are converted to strings.

Empty references are rejected.

Control characters are rejected.

References are truncated to the configured maximum length.

---

# Path Validation

Analytics paths are normalized and validated.

The supported analytics paths are:

```text
track/click
track/scroll
track/heartbeat
```

The consent path is:

```text
gdpr/consent
```

Paths containing:

```text
:
?
#
\
..
```

or invalid path segments are rejected.

---

# Host Application Safety

Analytics errors are caught internally.

The library is designed so that failures in:

- cookies
- configuration
- network requests
- event listeners
- timers
- observers
- callbacks
- analytics transport

do not break the host application.

The final initialization wrapper also protects the host application from initialization errors.

---

# Cookie Consent UI

The library contains a small integration with elements using:

```html
data-cookie-consent
```

Accepted values are:

```html
data-cookie-consent="accept"
```

and:

```html
data-cookie-consent="reject"
```

Example:

```html
<button data-cookie-consent="accept">
    Accept
</button>

<button data-cookie-consent="reject">
    Reject
</button>
```

When clicked, the integration calls:

```js
window.visitMetrics.setConsent(true);
```

for:

```text
accept
```

and:

```js
window.visitMetrics.setConsent(false);
```

for:

```text
reject
```

If available, it also calls:

```js
window.__modalManager?.close?.();
```

after the consent action.

---

# Example Consent UI

```html
<div id="cookie-modal">
    <button data-cookie-consent="accept">
        Accept analytics
    </button>

    <button data-cookie-consent="reject">
        Reject analytics
    </button>
</div>
```

No framework is required for this behavior.

---

# Plain HTML Example

```html
<script>
    window.BLENDHTML_VISIT_METRICS_V1 = {
        debug: true,

        track: {
            time: {
                enabled: true,
                heartbeatDelay: 15000
            },

            scrollTo: {
                section: 'Scrolled to section',
                footer: 'Scrolled to footer',
                '#features': 'Features viewed'
            },

            click: {
                'footer a': 'Footer link clicked',
                'a': 'Link clicked',
                'button': 'Button clicked',
                '[data-open-modal]': 'Modal opened',
                '#signup': 'Signup clicked',
                '#pricing': 'Pricing clicked'
            }
        }
    };
</script>

<script src="/path/to/visit-metrics.js"></script>

<a id="signup" href="/signup">
    Sign up
</a>

<a id="pricing" href="/pricing">
    Pricing
</a>

<section id="features">
    Features
</section>

<section id="more-features">
    More features
</section>

<footer>
    Footer
</footer>
```

Both sections can independently generate:

```text
Scrolled to section
```

and the footer can generate:

```text
Scrolled to footer
```

---

# Dynamic Click Example

```html
<script>
    window.BLENDHTML_VISIT_METRICS_V1 = {
        track: {
            click: {
                '.dynamic-link': 'Dynamic link clicked'
            }
        }
    };
</script>

<script src="/path/to/visit-metrics.js"></script>

<script>
    setTimeout(() => {
        document.body.insertAdjacentHTML(
                'beforeend',
                '<a class="dynamic-link" href="/dynamic">Dynamic link</a>'
        );
    }, 1000);
</script>
```

The delegated click handler can detect the dynamically inserted link.

---

# Dynamic Scroll Example

```js
const section = document.createElement('section');

section.id = 'dynamic-section';

section.textContent = 'Dynamic section';

document.body.appendChild(section);

visitMetrics.trackScrolledTo(
    '#dynamic-section',
    'Dynamic section viewed'
);
```

---

# Recommended Production Configuration

```js
window.BLENDHTML_VISIT_METRICS_V1 = {
    debug: false,

    respectGlobalPrivacyControl: true,

    track: {
        time: {
            enabled: true,
            heartbeatDelay: 15000
        },

        scrollTo: {
            section: 'Scrolled to section',
            footer: 'Scrolled to footer',
            '#pricing': 'Pricing viewed',
            '#features': 'Features viewed'
        },

        click: {
            'footer a': 'Footer link clicked',
            'a': 'Link clicked',
            'button': 'Button clicked',
            '[data-open-modal]': 'Modal opened',
            '#signup': 'Signup clicked',
            '#pricing-link': 'Pricing link clicked'
        }
    }
};
```

---

# Minimal Configuration

A minimal configuration can be:

```js
window.BLENDHTML_VISIT_METRICS_V1 = {
    track: {
        click: {
            '#signup': 'Signup clicked'
        }
    }
};
```

The defaults remain active.

That means:

- time tracking remains enabled
- the default heartbeat delay remains `15000`
- all matching `section` elements are tracked
- the default `footer` tracker remains enabled
- the default click rules remain active
- the configured click rule is added

---

# No Configuration

The library can also be loaded without configuration:

```html
<script src="/path/to/visit-metrics.js"></script>
```

The built-in defaults are then used:

```js
{
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

        track: {
        time: {
            enabled: true,
                heartbeatDelay: 15000
        },

        scrollTo: {
            section: 'Scrolled to section',
                footer: 'Scrolled to footer'
        },

        click: {
            'footer a': 'Footer link clicked',
                'a': 'Link clicked',
                'button': 'Button clicked',
                '[data-open-modal]': 'Modal opened'
        }
    }
}
```

---

# Alpine.js

No Alpine.js-specific integration is required.

For example:

```html
<script>
    window.BLENDHTML_VISIT_METRICS_V1 = {
        track: {
            click: {
                '[data-action="signup"]': 'Signup clicked'
            }
        }
    };
</script>

<script src="/path/to/visit-metrics.js"></script>

<div x-data>
    <button data-action="signup">
        Sign up
    </button>
</div>
```

The click handler is delegated at the document level.

Alpine.js may therefore create or remove matching click elements without requiring analytics reinitialization.

For scroll tracking, newly inserted matching elements must be registered after they exist.

---

# API Backend Contract

The backend should accept JSON `POST` requests.

Example:

```http
POST /blendhtml/api/visit-metrics/v1/track/click
Content-Type: application/json
Accept: application/json

{
    "ref": "Signup clicked",
    "meta": {
        "tag": "BUTTON",
        "id": "signup"
    },
    "event_id": "abc123",
    "ts": "2026-08-14T10:00:00.000Z"
}
```

The backend should return an HTTP success status for successful processing.

The JavaScript considers:

```js
response.ok === true
```

to be a successful request.

---

# Backend Endpoint Responsibilities

## `track/click`

Receives configured click events.

Example:

```json
{
  "ref": "Signup clicked",
  "meta": {
    "tag": "BUTTON",
    "id": "signup"
  },
  "event_id": "abc123",
  "ts": "2026-08-14T10:00:00.000Z"
}
```

---

## `track/scroll`

Receives configured scroll events.

Example:

```json
{
  "ref": "Pricing viewed",
  "meta": {
    "tag": "SECTION",
    "id": "pricing"
  },
  "event_id": "abc124",
  "ts": "2026-08-14T10:00:10.000Z"
}
```

---

## `track/heartbeat`

Receives:

```text
heartbeat
hidden
tabClosed
```

Example heartbeat:

```json
{
  "event": "heartbeat",
  "event_id": "abc125",
  "ts": "2026-08-14T10:00:15.000Z"
}
```

Example hidden event:

```json
{
  "event": "hidden",
  "seconds": 42,
  "event_id": "abc126",
  "ts": "2026-08-14T10:00:42.000Z"
}
```

Example close event:

```json
{
  "event": "tabClosed",
  "seconds": 12,
  "event_id": "abc127",
  "ts": "2026-08-14T10:00:54.000Z"
}
```

---

## `gdpr/consent`

Receives:

```json
{
  "bool": true
}
```

or:

```json
{
  "bool": false
}
```

---

# Important Endpoint Distinction

The current frontend does not use separate endpoints for:

```text
time
tabSwitched
tabClosed
```

All time-tracking events are sent through:

```text
track/heartbeat
```

The event itself identifies the type:

```json
{
  "event": "heartbeat"
}
```

or:

```json
{
  "event": "hidden",
  "seconds": 42
}
```

or:

```json
{
  "event": "tabClosed",
  "seconds": 12
}
```

---

# Analytics Storage

The JavaScript library does not define or require a particular server-side storage implementation.

The backend is responsible for storing received events.

The browser only depends on the API contract.

---

# Production Checklist

Before deploying:

- [ ] Deploy `visit-metrics.js`.
- [ ] Define `window.BLENDHTML_VISIT_METRICS_V1` before loading the script when custom configuration is required.
- [ ] Confirm `apiBase`.
- [ ] Confirm the click endpoint.
- [ ] Confirm the scroll endpoint.
- [ ] Confirm the heartbeat endpoint.
- [ ] Confirm the GDPR consent endpoint.
- [ ] Confirm JSON POST handling.
- [ ] Confirm CORS/credentials behavior if using a different origin.
- [ ] Test consent granting.
- [ ] Test consent denial.
- [ ] Test Global Privacy Control.
- [ ] Test visitor token creation.
- [ ] Test configured click selectors.
- [ ] Test click rule ordering.
- [ ] Test `data-analytics-click`.
- [ ] Test dynamically created click elements.
- [ ] Test scroll selectors with multiple matching elements.
- [ ] Test that each matching scroll element is tracked only once.
- [ ] Test default section tracking.
- [ ] Test default footer tracking.
- [ ] Test custom scroll entries alongside the defaults.
- [ ] Test element metadata on click and scroll events.
- [ ] Test time tracking.
- [ ] Test heartbeat events.
- [ ] Test hidden/tab visibility events.
- [ ] Test page-close events.
- [ ] Test offline behavior.
- [ ] Test queue retry behavior.
- [ ] Test `sendBeacon()`.
- [ ] Test API failures.
- [ ] Test request timeouts.
- [ ] Set `debug: false` in production.

---

# Summary

The current configuration API is:

```js
window.BLENDHTML_VISIT_METRICS_V1 = {
    debug: true,

    track: {
        time: {
            enabled: true,
            heartbeatDelay: 15000
        },

        scrollTo: {
            section: 'Scrolled to section',
            footer: 'Scrolled to footer'
        },

        click: {
            'footer a': 'Footer link clicked',
            'a': 'Link clicked',
            'button': 'Button clicked',
            '[data-open-modal]': 'Modal opened'
        }
    }
};
```

The important rules are:

1. Only `BLENDHTML_VISIT_METRICS_V1` is supported.
2. Tracking configuration lives under `track`.
3. Time tracking lives under `track.time`.
4. Scroll tracking lives under `track.scrollTo`.
5. Click tracking lives under `track.click`.
6. `track.click` is a selector-to-reference map.
7. Click rules are evaluated in configuration order; the first matching rule wins.
8. More specific click selectors should be placed before generic selectors.
9. `click.enabled` is not a supported configuration property.
10. A click reference can be `null` to read `data-analytics-click` from the matched element.
11. A `null` click reference does not itself create a tracking event; a valid `data-analytics-click` value is required.
12. Click tracking uses document-level event delegation.
13. Dynamically created click elements can be tracked without reinitialization.
14. Scroll tracking uses selector-to-reference mappings.
15. Every configured scroll selector tracks all matching DOM elements.
16. Each matching scroll element is tracked at most once per tracker registration.
17. Scroll tracking uses `IntersectionObserver` with a scroll/resize fallback.
18. The default scroll configuration tracks `section` and `footer`.
19. Custom `track.scrollTo` entries are merged with the defaults.
20. Click and scroll events can include sanitized element metadata.
21. Time tracking uses `track/heartbeat`.
22. `heartbeat`, `hidden`, and `tabClosed` are event types sent through the heartbeat endpoint.
23. Analytics events require consent.
24. Global Privacy Control is respected by default.
25. Visitor identity uses the `blendhtml_visitor_token` cookie.
26. Consent uses the `blendhtml_cookies_accepted` cookie.
27. The library queues analytics events and retries temporary failures.
28. Lifecycle-sensitive events use `sendBeacon()` with a `fetch(..., { keepalive: true })` fallback.
29. Analytics failures must not break the host application.