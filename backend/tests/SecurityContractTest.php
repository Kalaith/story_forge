<?php

declare(strict_types=1);

namespace Tests;

use PHPUnit\Framework\TestCase;

final class SecurityContractTest extends TestCase
{
    public function testEntryPointUsesSafeUnexpectedErrorMessage(): void
    {
        $source = file_get_contents(dirname(__DIR__) . '/public/index.php');
        self::assertIsString($source);
        self::assertStringNotContainsString("'message' => $exception->getMessage()", $source);
        self::assertStringContainsString('An unexpected server error occurred.', $source);
    }
}
