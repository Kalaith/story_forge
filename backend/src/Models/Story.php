<?php
namespace App\Models;

use App\Models\BaseModel;
use App\Models\User;

class Story extends BaseModel
{
    protected $table = 'stories';

    protected $fillable = [
        'id',
        'title',
        'genre',
        'description',
        'created_by',
        'access_level',
        'require_examples'
    ];

    protected $casts = [
        'require_examples' => 'boolean',
    ];

    public function creator()
    {
        return $this->belongsTo(User::class, 'created_by');
    }

    public function paragraphs()
    {
        return $this->hasMany(Paragraph::class, 'story_id')->orderBy('created_at', 'asc');
    }

    public function writingSamples()
    {
        return $this->hasMany(WritingSample::class, 'story_id');
    }
}
