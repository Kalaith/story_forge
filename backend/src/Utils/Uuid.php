<?php

namespace App\Utils;

class Uuid
{
    /**
     * Generate an RFC 4122 version 4 UUID without external dependencies.
     */
    public static function v4(): string
    {
        $bytes = random_bytes(16);

        // Set version to 4.
        $bytes[6] = chr((ord($bytes[6]) & 0x0f) | 0x40);
        // Set variant to RFC 4122.
        $bytes[8] = chr((ord($bytes[8]) & 0x3f) | 0x80);

        $hex = bin2hex($bytes);

        return sprintf(
            '%s-%s-%s-%s-%s',
            substr($hex, 0, 8),
            substr($hex, 8, 4),
            substr($hex, 12, 4),
            substr($hex, 16, 4),
            substr($hex, 20, 12)
        );
    }
}
