<?php

namespace App\Exceptions;

use Exception;

/**
 * Expected business-rule failure. Rendered as a JSON client error with a
 * stable machine-readable `code` the frontend can branch on.
 */
class DomainException extends Exception
{
    /**
     * @param  array<string, array<int, string>>  $errors
     */
    public function __construct(
        string $message,
        public readonly string $errorCode = 'domain_error',
        public readonly int $httpStatus = 409,
        public readonly array $errors = [],
    ) {
        parent::__construct($message);
    }

    public static function invalidState(string $message, string $code = 'invalid_order_status'): self
    {
        return new self($message, $code, 409);
    }

    public static function forbidden(string $message, string $code = 'forbidden'): self
    {
        return new self($message, $code, 403);
    }

    /** @param array<string, array<int, string>> $errors */
    public static function invalid(string $message, array $errors = [], string $code = 'invalid_request'): self
    {
        return new self($message, $code, 422, $errors);
    }
}
