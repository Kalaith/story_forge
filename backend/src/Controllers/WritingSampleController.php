<?php
namespace App\Controllers;

use Psr\Http\Message\ResponseInterface as Response;
use Psr\Http\Message\ServerRequestInterface as Request;
use App\Models\WritingSample;
use App\Models\Story;

class WritingSampleController extends BaseController
{
    public function index(Request $request, Response $response): Response
    {
        $samples = WritingSample::with(['user', 'story'])->get();

        return $this->success($response, $samples);
    }

    public function getByStory(Request $request, Response $response, array $args): Response
    {
        $storyId = $args['story_id'];
        $user = $this->getUser($request);
        if ($user === null || empty($user['id'])) {
            return $this->error($response, 'User not authenticated', 401);
        }

        $story = Story::find($storyId);
        if (!$story) {
            return $this->error($response, 'Story not found', 404);
        }

        $userId = (string) $user['id'];
        $userRole = (string) ($user['role'] ?? 'user');
        if ((string) $story->created_by !== $userId && $userRole !== 'admin') {
            return $this->error($response, 'Unauthorized', 403);
        }

        $samples = WritingSample::with('user')->where('story_id', $storyId)->get();

        return $this->success($response, $samples);
    }

    public function submit(Request $request, Response $response, array $args): Response
    {
        $storyId = $args['story_id'];
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
        
        // Prevent duplicate pending samples
        $existing = WritingSample::where('story_id', $storyId)
            ->where('user_id', (string) $user['id'])
            ->where('status', 'pending')
            ->first();

        if ($existing) {
            return $this->error($response, 'You already have a pending sample for this story', 400);
        }

        $sample = new WritingSample();
        $sample->story_id = $story->id;
        $sample->user_id = (string) $user['id'];
        $sample->content = trim((string) $data['content']);
        $sample->status = 'pending';
        $sample->save();

        return $this->success($response, $sample->load('user'), 'Writing sample submitted', 201);
    }

    public function review(Request $request, Response $response, array $args): Response
    {
        $sampleId = $args['id'];
        $user = $this->getUser($request);
        if ($user === null || empty($user['id'])) {
            return $this->error($response, 'User not authenticated', 401);
        }
        $data = $this->getRequestData($request);

        $sample = WritingSample::with('story')->find($sampleId);

        if (!$sample) {
            return $this->error($response, 'Writing sample not found', 404);
        }

        $userId = (string) $user['id'];
        $userRole = (string) ($user['role'] ?? 'user');
        if ((string) $sample->story->created_by !== $userId && $userRole !== 'admin') {
            return $this->error($response, 'Unauthorized', 403);
        }

        if (!isset($data['status']) || !in_array($data['status'], ['approved', 'rejected'])) {
            return $this->error($response, 'Invalid status', 400);
        }

        $sample->status = $data['status'];
        $sample->save();

        if ($sample->status === 'approved') {
            \Illuminate\Database\Capsule\Manager::table('story_approved_contributors')
                ->updateOrInsert(
                    ['story_id' => $sample->story_id, 'user_id' => $sample->user_id],
                    ['created_at' => \Carbon\Carbon::now()]
                );
        }

        return $this->success($response, $sample);
    }
}
