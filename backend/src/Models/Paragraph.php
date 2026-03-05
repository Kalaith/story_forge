<?php
namespace App\Models;

use App\Models\BaseModel;
use App\Models\User;

class Paragraph extends BaseModel
{
    protected $table = 'paragraphs';

    // Disable updated_at since paragraphs only have created_at
    public const UPDATED_AT = null;

    protected $fillable = [
        'id',
        'story_id',
        'author_id',
        'content',
        'created_at'
    ];

    public function story()
    {
        return $this->belongsTo(Story::class, 'story_id');
    }

    public function author()
    {
        return $this->belongsTo(User::class, 'author_id');
    }
}
