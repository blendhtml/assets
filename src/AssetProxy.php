<?php

namespace Blendhtml\Assets;

final class AssetProxy
{
    public static function serve(string $src): never
    {
        $root = realpath(
            dirname(__DIR__, 2) . '/assets'
        );

        $file = realpath(
            $root . '/' . ltrim($src, '/')
        );

        if (
            $root === false
            || $file === false
            || !str_starts_with($file, $root)
            || !is_file($file)
        ) {
            http_response_code(404);
            exit('Not found');
        }

        $mime = match (
        strtolower(pathinfo($file, PATHINFO_EXTENSION))
        ) {
            'css' => 'text/css',
            'js' => 'application/javascript',
            'json' => 'application/json',
            'svg' => 'image/svg+xml',
            'png' => 'image/png',
            'jpg',
            'jpeg' => 'image/jpeg',
            'webp' => 'image/webp',
            'woff' => 'font/woff',
            'woff2' => 'font/woff2',
            'ttf' => 'font/ttf',
            default => mime_content_type($file)
                ?: 'application/octet-stream',
        };

        header('Content-Type: ' . $mime);
        header('Cache-Control: public, max-age=31536000, immutable');
        header('Content-Length: ' . filesize($file));

        readfile($file);

        exit;
    }
}