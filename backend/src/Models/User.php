<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use App\Utils\Uuid;

class User extends Model
{
    protected $table = 'users';

    public $incrementing = false;
    protected $keyType = 'string';

    protected $fillable = [
        'webhatch_id',
        'email',
        'display_name',
        'username',
        'role',
        'is_verified',
        'password_hash',
        'created_at',
        'updated_at'
    ];

    protected $casts = [
        'is_verified' => 'boolean',
        'created_at' => 'datetime',
        'updated_at' => 'datetime',
    ];

    protected $hidden = [
        'password_hash',
        'webhatch_id',
    ];

    protected static function boot()
    {
        parent::boot();

        static::creating(function ($model) {
            if (empty($model->id)) {
                $model->id = Uuid::v4();
            }
        });
    }

    public function __construct(array $attributes = [])
    {
        parent::__construct($attributes);

        if (empty($this->id)) {
            $this->id = Uuid::v4();
        }
    }
}
