<?php

namespace BlendHtml\Assets;

use BlendHtml\Core\Context;

class AssetVendor
{
    private static ?array $assets = null;

    public static function embed(
        string  $asset,
        ?string $version = null
    ): string
    {
        $assets = self::assets();

        if (!isset($assets[$asset])) {
            throw new \RuntimeException(
                sprintf('Asset "%s" not found.', $asset)
            );
        }

        if ($version === null) {
            $version = $assets[$asset]['defaultVersion'];
        }

        if (!isset($assets[$asset]['versions'][$version])) {
            throw new \RuntimeException(
                sprintf(
                    'Version "%s" not found for asset "%s".',
                    $version,
                    $asset
                )
            );
        }

        $config = $assets[$asset]['versions'][$version];

        $cacheVersion = date('Ymd');

        $html = [];

        foreach ($config['css'] ?? [] as $css) {
            if (Context::devMode() === false) {
                $minCss = preg_replace('~\.css$~', '.min.css', $css);
                if (file_exists(dirname(__DIR__, 2) . '/assets/' . $minCss)) {
                    $css = $minCss;
                }
            }

            $html[] =
                '<link rel="stylesheet" href="/proxy?src='
                . $css
                . '&v='
                . $cacheVersion
                . '">';
        }

        foreach ($config['js'] ?? [] as $js) {
            if (Context::devMode() === false) {
                $minJs = preg_replace('~\.js$~', '.min.js', $js);
                if (file_exists(dirname(__DIR__, 2) . '/assets/' . $minJs)) {
                    $js = $minJs;
                }
            }

            $html[] =
                '<script src="/proxy?src='
                . $js
                . '&v='
                . $cacheVersion
                . '"></script>';
        }

        foreach ($config['extra'] ?? [] as $extra) {
            $html[] = $extra;
        }

        return implode("\n", $html);
    }

    private static function assets(): array
    {
        if (self::$assets !== null) {
            return self::$assets;
        }

        return self::$assets = json_decode(
            file_get_contents(__DIR__ . '/assets.json'),
            true,
            512,
            JSON_THROW_ON_ERROR
        );
    }
}