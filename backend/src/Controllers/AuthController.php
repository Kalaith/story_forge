<?php

namespace App\Controllers;

use App\Models\User;
use Firebase\JWT\JWT;
use Firebase\JWT\Key;
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
        $this->jwtExpiration = $this->requiredIntEnv('JWT_EXPIRATION');

        if ($this->jwtSecret === '') {
            throw new \RuntimeException('JWT_SECRET must be set in environment variables');
        }

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

        $guestToken = trim((string) ($payload['guest_token'] ?? ''));
        if (!$this->guestTokenMatches($guestToken, $guestUserId)) {
            return $this->error($response, 'Guest token proof is invalid', 400);
        }

        $strategy = (string) ($payload['merge_strategy'] ?? $payload['strategy'] ?? 'merge');
        if (!in_array($strategy, ['keep_account', 'guest_wins', 'merge'], true)) {
            return $this->error($response, 'Invalid guest merge strategy', 400);
        }

        $movedByTable = [];
        $ownership = [
            'stories' => 'created_by',
            'paragraphs' => 'author_id',
            'writing_samples' => 'user_id',
        ];
        foreach ($ownership as $table => $column) {
            $query = Capsule::table($table)->where($column, $guestUserId);
            $movedByTable[$table] = $strategy === 'keep_account'
                ? $query->delete()
                : $query->update([$column => $currentUserId]);
        }

        return $this->success($response, [
            'guest_user_id' => $guestUserId,
            'linked_to_user_id' => $currentUserId,
            'strategy' => $strategy,
            'moved_rows_by_table' => $movedByTable,
            'total_moved_rows' => array_sum($movedByTable),
        ], 'Guest account data linked successfully');
    }

    public function previewGuestLink(Request $request, Response $response): Response
    {
        $user = $request->getAttribute('user');
        $payload = $this->getRequestData($request);
        $currentUserId = trim((string) ($user['id'] ?? ''));
        $guestUserId = trim((string) ($payload['guest_user_id'] ?? ''));
        $guestToken = trim((string) ($payload['guest_token'] ?? ''));

        if ($currentUserId === '' || $guestUserId === '' || !$this->guestTokenMatches($guestToken, $guestUserId)) {
            return $this->error($response, 'Guest token and user identifiers are required', 400);
        }

        $tables = ['stories', 'paragraphs', 'writing_samples'];
        $guestSummary = [];
        $accountSummary = [];
        $columns = ['stories' => 'created_by', 'paragraphs' => 'author_id', 'writing_samples' => 'user_id'];
        foreach ($tables as $table) {
            $column = $columns[$table];
            $guestSummary[$table] = Capsule::table($table)->where($column, $guestUserId)->count();
            $accountSummary[$table] = Capsule::table($table)->where($column, $currentUserId)->count();
        }

        return $this->success($response, [
            'has_guest_data' => array_sum($guestSummary) > 0,
            'has_account_data' => array_sum($accountSummary) > 0,
            'guest_summary' => $guestSummary,
            'account_summary' => $accountSummary,
            'allowed_strategies' => ['keep_account', 'guest_wins', 'merge'],
        ]);
    }

    private function guestTokenMatches(string $token, string $guestUserId): bool
    {
        if ($token === '') {
            return false;
        }

        try {
            $claims = (array) JWT::decode($token, new Key($this->jwtSecret, 'HS256'));
            $claimId = (string) ($claims['user_id'] ?? $claims['sub'] ?? '');
            $isGuest = (bool) ($claims['is_guest'] ?? false) || (($claims['auth_type'] ?? null) === 'guest');
            return $isGuest && hash_equals($guestUserId, $claimId);
        } catch (\Throwable) {
            return false;
        }
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

    private function requiredIntEnv(string $name): int
    {
        $value = trim((string) ($_ENV[$name] ?? ''));
        if ($value === '' || !ctype_digit($value) || (int) $value <= 0) {
            throw new \RuntimeException($name . ' environment variable must be a positive integer');
        }

        return (int) $value;
    }
}
