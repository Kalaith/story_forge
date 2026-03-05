<?php

namespace App\Controllers;

use App\Models\User;
use Firebase\JWT\JWT;
use Psr\Http\Message\ResponseInterface as Response;
use Psr\Http\Message\ServerRequestInterface as Request;

class AuthController extends BaseController
{
    private string $jwtSecret;
    private int $jwtExpiration;

    public function __construct()
    {
        $this->jwtSecret = trim($_ENV['JWT_SECRET'] ?? '');
        $this->jwtExpiration = (int) ($_ENV['JWT_EXPIRATION'] ?? 86400);

        if ($this->jwtSecret === '') {
            throw new \RuntimeException('JWT_SECRET must be set in environment variables');
        }

        if ($this->jwtExpiration <= 0) {
            $this->jwtExpiration = 86400;
        }
    }

    public function login(Request $request, Response $response): Response
    {
        $data = $this->getRequestData($request);

        $identifier = trim((string) ($data['identifier'] ?? $data['email'] ?? $data['username'] ?? ''));
        $password = (string) ($data['password'] ?? '');

        if ($identifier === '' || $password === '') {
            return $this->error($response, 'Identifier and password are required', 422);
        }

        $user = filter_var($identifier, FILTER_VALIDATE_EMAIL)
            ? User::where('email', $identifier)->first()
            : User::where('username', $identifier)->first();

        if (!$user || !$user->password_hash || !password_verify($password, $user->password_hash)) {
            return $this->error($response, 'Invalid credentials', 401);
        }

        $token = $this->createToken($user);

        return $this->success($response, [
            'token' => $token,
            'user' => $this->serializeUser($user),
            'expires_in' => $this->jwtExpiration,
            'token_type' => 'Bearer',
        ], 'Login successful');
    }

    public function register(Request $request, Response $response): Response
    {
        $data = $this->getRequestData($request);

        $requiredErrors = $this->validateRequired($data, ['email', 'username', 'password']);
        if (!empty($requiredErrors)) {
            return $this->validationError($response, $requiredErrors);
        }

        $email = trim((string) $data['email']);
        $username = trim((string) $data['username']);
        $password = (string) $data['password'];
        $displayName = trim((string) ($data['display_name'] ?? $username));

        if (!filter_var($email, FILTER_VALIDATE_EMAIL)) {
            return $this->error($response, 'Invalid email address', 422);
        }
        if (strlen($password) < 8) {
            return $this->error($response, 'Password must be at least 8 characters', 422);
        }

        if (User::where('email', $email)->exists()) {
            return $this->error($response, 'Email is already registered', 409);
        }
        if (User::where('username', $username)->exists()) {
            return $this->error($response, 'Username is already taken', 409);
        }

        $user = User::create([
            'webhatch_id' => 'local:' . bin2hex(random_bytes(12)),
            'email' => $email,
            'display_name' => $displayName,
            'username' => $username,
            'role' => 'user',
            'is_verified' => true,
            'password_hash' => password_hash($password, PASSWORD_DEFAULT),
            'created_at' => date('Y-m-d H:i:s'),
            'updated_at' => date('Y-m-d H:i:s'),
        ]);

        $token = $this->createToken($user);

        return $this->success($response, [
            'token' => $token,
            'user' => $this->serializeUser($user),
            'expires_in' => $this->jwtExpiration,
            'token_type' => 'Bearer',
        ], 'Registration successful', 201);
    }

    public function currentUser(Request $request, Response $response): Response
    {
        $user = $request->getAttribute('user');
        if (!$user) {
            return $this->error($response, 'User not authenticated', 401);
        }

        return $this->success($response, $user);
    }

    private function createToken(User $user): string
    {
        $now = time();
        $payload = [
            'sub' => (string) $user->id,
            'email' => (string) $user->email,
            'role' => (string) $user->role,
            'iat' => $now,
            'exp' => $now + $this->jwtExpiration,
        ];

        return JWT::encode($payload, $this->jwtSecret, 'HS256');
    }

    private function serializeUser(User $user): array
    {
        return [
            'id' => (string) $user->id,
            'email' => (string) $user->email,
            'display_name' => (string) $user->display_name,
            'username' => (string) $user->username,
            'role' => (string) $user->role,
            'is_verified' => (bool) $user->is_verified,
            'created_at' => (string) $user->created_at,
            'updated_at' => (string) $user->updated_at,
        ];
    }
}
