<?php
namespace App\Models;

use App\Models\BaseModel;
use App\Models\User;

class WritingSample extends BaseModel
{
    protected $table = 'writing_samples';

    protected $fillable = [
        'id',
        'user_id',
        'story_id',
        'content',
        'status'
    ];

    public function user()
    {
        return $this->belongsTo(User::class, 'user_id');
    }

    public function story()
    {
        return $this->belongsTo(Story::class, 'story_id');
    }
}
