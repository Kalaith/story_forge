<?php

use App\Controllers\AuthController;
use App\Controllers\StoryController;
use App\Controllers\WritingSampleController;
use App\Middleware\JwtAuthMiddleware;
use Psr\Http\Message\ResponseInterface as Response;
use Psr\Http\Message\ServerRequestInterface as Request;
use Slim\App;
use Slim\Routing\RouteCollectorProxy;

return function (App $app) {
    $app->get('/health', function (Request $request, Response $response) {
        $data = [
            'status' => 'ok',
            'timestamp' => date('c'),
            'version' => '1.0.0',
        ];

        $response->getBody()->write((string) json_encode($data));
        return $response->withHeader('Content-Type', 'application/json');
    });

    $app->group('/auth', function (RouteCollectorProxy $auth) {
        $auth->post('/login', [AuthController::class, 'login']);
        $auth->post('/register', [AuthController::class, 'register']);
        $auth->post('/guest-session', [AuthController::class, 'createGuestSession']);
        $auth->get('/current-user', [AuthController::class, 'currentUser'])->add(new JwtAuthMiddleware());
        $auth->get('/validate-session', [AuthController::class, 'currentUser'])->add(new JwtAuthMiddleware());
        $auth->post('/link-guest', [AuthController::class, 'linkGuestAccount'])->add(new JwtAuthMiddleware());
    });

    // Public read routes used by homepage and story reading.
    $app->group('/stories', function (RouteCollectorProxy $stories) {
        $stories->get('', [StoryController::class, 'index']);
        $stories->get('/{id}', [StoryController::class, 'show']);
    });

    // Protected story mutation routes.
    $app->group('/stories', function (RouteCollectorProxy $stories) {
        $stories->post('', [StoryController::class, 'create']);
        $stories->put('/{id}', [StoryController::class, 'update']);
        $stories->delete('/{id}', [StoryController::class, 'delete']);

        $stories->post('/{id}/paragraphs', [StoryController::class, 'addParagraph']);
        $stories->delete('/{id}/paragraphs/{paragraph_id}', [StoryController::class, 'deleteParagraph']);

        $stories->get('/{story_id}/samples', [WritingSampleController::class, 'getByStory']);
        $stories->post('/{story_id}/samples', [WritingSampleController::class, 'submit']);
    })->add(new JwtAuthMiddleware());

    $app->group('/writing-samples', function (RouteCollectorProxy $samples) {
        $samples->get('', [WritingSampleController::class, 'index']);
        $samples->put('/{id}/review', [WritingSampleController::class, 'review']);
    })->add(new JwtAuthMiddleware());
};
