<?php

namespace App\Middleware;

use App\Models\User;
use Firebase\JWT\BeforeValidException;
use Firebase\JWT\ExpiredException;
use Firebase\JWT\JWT;
use Firebase\JWT\Key;
use Firebase\JWT\SignatureInvalidException;
use Psr\Http\Message\ResponseInterface as Response;
use Psr\Http\Message\ServerRequestInterface as Request;
use Psr\Http\Server\MiddlewareInterface;
use Psr\Http\Server\RequestHandlerInterface;

class JwtAuthMiddleware implements MiddlewareInterface
{
    private string $jwtSecret;

    public function __construct()
    {
        $this->jwtSecret = trim($_ENV['JWT_SECRET'] ?? '');

        if ($this->jwtSecret === '') {
            throw new \RuntimeException('JWT_SECRET must be set in environment variables');
        }
    }

    public function process(Request $request, RequestHandlerInterface $handler): Response
    {
        $authHeader = $request->getHeaderLine('Authorization');
        if (!$authHeader || !str_starts_with($authHeader, 'Bearer ')) {
            return $this->createUnauthorizedResponse('Authorization header missing or invalid');
        }

        $token = trim(substr($authHeader, 7));
        if ($token === '') {
            return $this->createUnauthorizedResponse('Bearer token is missing');
        }

        $claims = null;
        try {
            $claims = JWT::decode($token, new Key($this->jwtSecret, 'HS256'));
        } catch (ExpiredException $e) {
            return $this->createUnauthorizedResponse('Token has expired');
        } catch (SignatureInvalidException $e) {
            return $this->createUnauthorizedResponse('Token signature is invalid');
        } catch (BeforeValidException $e) {
            return $this->createUnauthorizedResponse('Token is not valid yet');
        } catch (\Throwable $e) {
            error_log('JWT Middleware Error: ' . $e->getMessage());
            $isDebug = filter_var($_ENV['APP_DEBUG'] ?? 'false', FILTER_VALIDATE_BOOLEAN);
            $message = 'Token validation failed';
            if ($isDebug) {
                $message .= ': ' . $e->getMessage();
            }
            return $this->createUnauthorizedResponse($message);
        }

        $resolvedUserData = null;
        $resolvedUserId = null;

        try {
            $user = $this->resolveUserFromClaims($claims);
            if ($user) {
                $resolvedUserData = $user->toArray();
                $resolvedUserId = (string) $user->id;
            }
        } catch (\Throwable $dbError) {
            error_log('JWT user resolution error: ' . $dbError->getMessage());
        }

        if (!$resolvedUserData || !$resolvedUserId) {
            $fallbackUser = $this->buildUserFromClaims($claims);
            if (!$fallbackUser || empty($fallbackUser['id'])) {
                return $this->createUnauthorizedResponse('User not found for token');
            }

            $resolvedUserData = $fallbackUser;
            $resolvedUserId = (string) $fallbackUser['id'];
        }

        unset($resolvedUserData['password_hash'], $resolvedUserData['webhatch_id']);

        $request = $request
            ->withAttribute('jwt_claims', $claims)
            ->withAttribute('user', $resolvedUserData)
            ->withAttribute('user_id', $resolvedUserId);

        // Let downstream exceptions propagate to global error middleware instead
        // of being mislabeled as token validation failures.
        return $handler->handle($request);
    }

    private function buildUserFromClaims(object $claims): ?array
    {
        $subject = $this->extractClaimString($claims, 'sub');
        $frontpageUserId = $this->extractClaimString($claims, 'user_id');
        $email = $this->extractClaimString($claims, 'email') ?? '';
        $username = $this->extractClaimString($claims, 'username') ?? ($email ? explode('@', $email)[0] : 'user');
        $displayName = $this->extractClaimString($claims, 'display_name') ?? $username;
        $authType = $this->extractClaimString($claims, 'auth_type') ?? 'frontpage';
        $isGuest = $this->extractClaimBool($claims, 'is_guest') || $authType === 'guest';
        $role = $this->normalizeRole($this->extractClaimString($claims, 'role'), $isGuest);
        $id = $frontpageUserId ?: $subject;

        if (!$id) {
            return null;
        }

        return [
            'id' => (string) $id,
            'email' => $email,
            'display_name' => $displayName,
            'username' => $username,
            'role' => $role,
            'is_verified' => !$isGuest,
            'is_guest' => $isGuest,
            'auth_type' => $isGuest ? 'guest' : 'frontpage',
        ];
    }

    private function resolveUserFromClaims(object $claims): ?User
    {
        $subject = $this->extractClaimString($claims, 'sub');
        $frontpageUserId = $this->extractClaimString($claims, 'user_id');
        $email = $this->extractClaimString($claims, 'email');
        $authType = $this->extractClaimString($claims, 'auth_type') ?? 'frontpage';
        $isGuest = $this->extractClaimBool($claims, 'is_guest') || $authType === 'guest';
        $role = $this->normalizeRole($this->extractClaimString($claims, 'role'), $isGuest);
        $displayName =
            $this->extractClaimString($claims, 'display_name')
            ?? $this->extractClaimString($claims, 'username')
            ?? ($email ? explode('@', $email)[0] : 'User');

        if ($isGuest) {
            return null;
        }

        $candidateAuthIds = [];
        if ($subject) {
            $candidateAuthIds[] = 'identity-sub:' . $subject;
        }
        if ($frontpageUserId) {
            $candidateAuthIds[] = 'identity-frontpage:' . $frontpageUserId;
        }

        $user = null;

        // Legacy support if token subject is already our local UUID.
        if ($subject) {
            $user = User::find($subject);
        }

        if (!$user) {
            foreach ($candidateAuthIds as $authId) {
                $user = User::where('webhatch_id', $authId)->first();
                if ($user) {
                    break;
                }
            }
        }

        if (!$user && $email) {
            $user = User::where('email', $email)->first();
        }

        if (!$user) {
            if (!$email) {
                return null;
            }

            $username = $this->createUniqueUsername($this->extractClaimString($claims, 'username'), $email);
            $authId = $candidateAuthIds[0] ?? ('frontpage-email:' . sha1(strtolower($email)));

            $user = User::create([
                'webhatch_id' => $authId,
                'email' => $email,
                'display_name' => $displayName ?: $username,
                'username' => $username,
                'role' => $role,
                'is_verified' => true,
                'created_at' => date('Y-m-d H:i:s'),
                'updated_at' => date('Y-m-d H:i:s'),
            ]);

            return $user;
        }

        $updates = [];
        if ($email && $user->email !== $email) {
            $updates['email'] = $email;
        }
        if ($displayName && $user->display_name !== $displayName) {
            $updates['display_name'] = $displayName;
        }
        if ($role && $user->role !== $role) {
            $updates['role'] = $role;
        }
        if (!empty($updates)) {
            $updates['updated_at'] = date('Y-m-d H:i:s');
            $user->update($updates);
        }

        return $user;
    }

    private function createUniqueUsername(?string $preferred, string $email): string
    {
        $base = trim((string) ($preferred ?: explode('@', $email)[0]));
        $base = preg_replace('/[^a-zA-Z0-9_]/', '_', $base) ?? 'user';
        $base = trim($base, '_');
        if ($base === '') {
            $base = 'user';
        }
        $base = substr($base, 0, 40);

        $candidate = $base;
        $suffix = 0;
        while (User::where('username', $candidate)->exists()) {
            $suffix++;
            $candidate = substr($base, 0, 35) . '_' . $suffix;
        }

        return $candidate;
    }

    private function extractClaimString(object $claims, string $key): ?string
    {
        if (!isset($claims->{$key})) {
            return null;
        }

        $value = $claims->{$key};
        if (is_string($value) || is_numeric($value)) {
            $value = trim((string) $value);
            return $value !== '' ? $value : null;
        }

        return null;
    }

    private function extractClaimBool(object $claims, string $key): bool
    {
        if (!isset($claims->{$key})) {
            return false;
        }

        $value = $claims->{$key};
        if (is_bool($value)) {
            return $value;
        }

        if (is_string($value)) {
            return in_array(strtolower(trim($value)), ['1', 'true', 'yes'], true);
        }

        if (is_numeric($value)) {
            return (int) $value === 1;
        }

        return false;
    }

    private function normalizeRole(?string $role, bool $isGuest = false): string
    {
        if ($isGuest) {
            return 'guest';
        }

        if ($role === 'admin' || $role === 'dm' || $role === 'user') {
            return $role;
        }
        return 'user';
    }

    private function createUnauthorizedResponse(string $message): Response
    {
        $response = new \Slim\Psr7\Response();
        $response->getBody()->write(json_encode([
            'success' => false,
            'message' => $message,
            'error' => 'Authentication required',
        ]));

        return $response
            ->withHeader('Content-Type', 'application/json')
            ->withStatus(401);
    }
}
