<?php

namespace App\Exceptions;

use Exception;

class CheckoutException extends Exception
{
    public function __construct(
        public readonly string $errorCode,
        string $message,
        public readonly array $context = [],
    ) {
        parent::__construct($message);
    }
}
