<?php

namespace App\Controllers;

use App\Models\User;
use Firebase\JWT\JWT;
use Illuminate\Database\Capsule\Manager as Capsule;
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

    public function createGuestSession(Request $request, Response $response): Response
    {
        $now = time();
        $guestId = 'guest_' . bin2hex(random_bytes(16));
        $guestTag = substr(str_replace('-', '', $guestId), 0, 8);
        $username = 'guest_' . $guestTag;

        $payload = [
            'sub' => $guestId,
            'user_id' => $guestId,
            'email' => '',
            'username' => $username,
            'display_name' => 'Guest Writer',
            'role' => 'guest',
            'auth_type' => 'guest',
            'is_guest' => true,
            'iat' => $now,
            'nbf' => $now - 5,
            'exp' => $now + (60 * 60 * 24 * 365),
            'jti' => bin2hex(random_bytes(16)),
        ];

        $token = JWT::encode($payload, $this->jwtSecret, 'HS256');

        return $this->success($response, [
            'token' => $token,
            'user' => [
                'id' => $guestId,
                'email' => '',
                'display_name' => 'Guest Writer',
                'username' => $username,
                'role' => 'guest',
                'is_verified' => false,
                'is_guest' => true,
                'auth_type' => 'guest',
            ],
        ], 'Guest session created', 201);
    }

    public function linkGuestAccount(Request $request, Response $response): Response
    {
        $user = $request->getAttribute('user');
        if (!is_array($user) || empty($user['id'])) {
            return $this->error($response, 'Authentication required', 401);
        }

        $currentUserId = trim((string) ($user['id'] ?? ''));
        $currentRole = trim((string) ($user['role'] ?? 'user'));
        $isCurrentGuest = (bool) ($user['is_guest'] ?? false)
            || $currentRole === 'guest'
            || str_starts_with($currentUserId, 'guest_');

        if ($currentRole === 'admin') {
            return $this->error($response, 'Guest and admin accounts cannot be linked', 403);
        }

        if ($isCurrentGuest) {
            return $this->error($response, 'Guest destination is not allowed', 400);
        }

        $payload = $this->getRequestData($request);
        $guestUserId = trim((string) ($payload['guest_user_id'] ?? ''));
        if ($guestUserId === '' || !str_starts_with($guestUserId, 'guest_')) {
            return $this->error($response, 'Invalid guest_user_id', 400);
        }

        if ($guestUserId === $currentUserId) {
            return $this->error($response, 'Invalid transfer request', 400);
        }

        $movedByTable = [
            'stories' => Capsule::table('stories')
                ->where('created_by', $guestUserId)
                ->update(['created_by' => $currentUserId]),
            'paragraphs' => Capsule::table('paragraphs')
                ->where('author_id', $guestUserId)
                ->update(['author_id' => $currentUserId]),
            'writing_samples' => Capsule::table('writing_samples')
                ->where('user_id', $guestUserId)
                ->update(['user_id' => $currentUserId]),
        ];

        return $this->success($response, [
            'guest_user_id' => $guestUserId,
            'linked_to_user_id' => $currentUserId,
            'moved_rows_by_table' => $movedByTable,
            'total_moved_rows' => array_sum($movedByTable),
        ], 'Guest account data linked successfully');
    }

    private function createToken(User $user): string
    {
        $now = time();
        $payload = [
            'sub' => (string) $user->id,
            'user_id' => (string) $user->id,
            'email' => (string) $user->email,
            'username' => (string) $user->username,
            'display_name' => (string) $user->display_name,
            'role' => (string) $user->role,
            'auth_type' => 'frontpage',
            'is_guest' => false,
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
            'is_guest' => false,
            'auth_type' => 'frontpage',
            'created_at' => (string) $user->created_at,
            'updated_at' => (string) $user->updated_at,
        ];
    }
}
