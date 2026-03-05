<?php

namespace App\Controllers;

use Psr\Http\Message\ResponseInterface;
use Psr\Http\Message\ServerRequestInterface;

abstract class BaseController
{
    protected function json(ResponseInterface $response, mixed $data, int $status = 200): ResponseInterface
    {
        $response->getBody()->write((string) json_encode($data, JSON_PRETTY_PRINT));
        return $response
            ->withHeader('Content-Type', 'application/json')
            ->withStatus($status);
    }

    protected function success(
        ResponseInterface $response,
        mixed $data = null,
        string $message = 'Success',
        int $status = 200
    ): ResponseInterface
    {
        return $this->json($response, [
            'success' => true,
            'message' => $message,
            'data' => $data,
        ], $status);
    }

    protected function error(
        ResponseInterface $response,
        string $message,
        int $status = 400,
        mixed $errors = null
    ): ResponseInterface
    {
        $errorData = [
            'success' => false,
            'message' => $message,
        ];

        if ($errors !== null) {
            $errorData['errors'] = $errors;
        }

        return $this->json($response, $errorData, $status);
    }

    protected function validationError(
        ResponseInterface $response,
        mixed $errors,
        string $message = 'Validation failed'
    ): ResponseInterface
    {
        return $this->error($response, $message, 422, $errors);
    }

    protected function getRequestData(ServerRequestInterface $request): array
    {
        $contentType = $request->getHeaderLine('Content-Type');

        if (strpos($contentType, 'application/json') !== false) {
            $data = json_decode((string) $request->getBody(), true);
            return is_array($data) ? $data : [];
        }

        return $request->getParsedBody() ?: [];
    }

    protected function getUser(ServerRequestInterface $request): ?array
    {
        $user = $request->getAttribute('user');
        if (is_array($user)) {
            return $user;
        }

        return null;
    }

    protected function getUserId(ServerRequestInterface $request): ?string
    {
        $userId = $request->getAttribute('user_id');
        return is_scalar($userId) ? (string) $userId : null;
    }

    protected function validateRequired(array $data, array $required): array
    {
        $errors = [];

        foreach ($required as $field) {
            if (!isset($data[$field]) || empty($data[$field])) {
                $errors[$field] = "The {$field} field is required.";
            }
        }

        return $errors;
    }
}
