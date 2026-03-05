<?php
namespace App\Controllers;

use Psr\Http\Message\ResponseInterface as Response;
use Psr\Http\Message\ServerRequestInterface as Request;
use App\Models\Story;
use App\Models\Paragraph;

class StoryController extends BaseController
{
    public function index(Request $request, Response $response): Response
    {
        $stories = Story::with(['creator', 'paragraphs' => function ($query) {
            $query->orderBy('created_at', 'asc');
        }])->get();

        return $this->success($response, $stories);
    }

    public function show(Request $request, Response $response, array $args): Response
    {
        $id = $args['id'];
        $story = Story::with(['creator', 'paragraphs.author'])->find($id);

        if (!$story) {
            return $this->error($response, 'Story not found', 404);
        }

        return $this->success($response, $story);
    }

    public function create(Request $request, Response $response): Response
    {
        $user = $this->getUser($request);
        if ($user === null || empty($user['id'])) {
            return $this->error($response, 'User not authenticated', 401);
        }
        $data = $this->getRequestData($request);

        $story = new Story();
        $story->title = $data['title'] ?? 'Untitled';
        $story->genre = $data['genre'] ?? 'General';
        $story->description = $data['description'] ?? '';
        $story->created_by = (string) $user['id'];
        $story->access_level = $data['accessLevel'] ?? 'anyone';
        $story->require_examples = (bool) ($data['requireExamples'] ?? false);
        $story->save();

        return $this->success($response, $story, 'Story created', 201);
    }

    public function update(Request $request, Response $response, array $args): Response
    {
        $id = $args['id'];
        $user = $this->getUser($request);
        if ($user === null || empty($user['id'])) {
            return $this->error($response, 'User not authenticated', 401);
        }
        $data = $this->getRequestData($request);

        $story = Story::find($id);

        if (!$story) {
            return $this->error($response, 'Story not found', 404);
        }

        $userId = (string) $user['id'];
        $userRole = (string) ($user['role'] ?? 'user');
        if ((string) $story->created_by !== $userId && $userRole !== 'admin') {
            return $this->error($response, 'Unauthorized', 403);
        }

        if (isset($data['title'])) {
            $story->title = (string) $data['title'];
        }
        if (isset($data['genre'])) {
            $story->genre = (string) $data['genre'];
        }
        if (isset($data['description'])) {
            $story->description = (string) $data['description'];
        }
        if (isset($data['accessLevel'])) {
            $story->access_level = (string) $data['accessLevel'];
        }
        if (isset($data['requireExamples'])) {
            $story->require_examples = (bool) $data['requireExamples'];
        }

        $story->save();

        return $this->success($response, $story);
    }

    public function delete(Request $request, Response $response, array $args): Response
    {
        $id = $args['id'];
        $user = $this->getUser($request);
        if ($user === null || empty($user['id'])) {
            return $this->error($response, 'User not authenticated', 401);
        }

        $story = Story::find($id);

        if (!$story) {
            return $this->error($response, 'Story not found', 404);
        }

        $userId = (string) $user['id'];
        $userRole = (string) ($user['role'] ?? 'user');
        if ((string) $story->created_by !== $userId && $userRole !== 'admin') {
            return $this->error($response, 'Unauthorized', 403);
        }

        $story->delete();

        return $this->success($response, ['deleted' => true]);
    }

    public function addParagraph(Request $request, Response $response, array $args): Response
    {
        $storyId = $args['id'];
        $user = $this->getUser($request);
        if ($user === null || empty($user['id'])) {
            return $this->error($response, 'User not authenticated', 401);
        }
        $data = $this->getRequestData($request);

        $story = Story::find($storyId);

        if (!$story) {
            return $this->error($response, 'Story not found', 404);
        }

        if (empty($data['content'])) {
            return $this->error($response, 'Content is required', 400);
        }

        $paragraph = new Paragraph();
        $paragraph->story_id = $story->id;
        $paragraph->author_id = (string) $user['id'];
        $paragraph->content = trim((string) $data['content']);
        $paragraph->save();

        return $this->success($response, $paragraph->load('author'), 'Paragraph added', 201);
    }

    public function deleteParagraph(Request $request, Response $response, array $args): Response
    {
        $storyId = $args['id'];
        $paragraphId = $args['paragraph_id'];
        $user = $this->getUser($request);
        if ($user === null || empty($user['id'])) {
            return $this->error($response, 'User not authenticated', 401);
        }

        $paragraph = Paragraph::where('story_id', $storyId)->find($paragraphId);

        if (!$paragraph) {
            return $this->error($response, 'Paragraph not found', 404);
        }

        $userId = (string) $user['id'];
        $userRole = (string) ($user['role'] ?? 'user');
        if (
            (string) $paragraph->author_id !== $userId &&
            (string) $paragraph->story->created_by !== $userId &&
            $userRole !== 'admin'
        ) {
            return $this->error($response, 'Unauthorized', 403);
        }

        $paragraph->delete();

        return $this->success($response, ['deleted' => true]);
    }
}
