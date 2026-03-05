<?php

namespace App\Models;

use App\Utils\Uuid;
use Illuminate\Database\Eloquent\Model;

abstract class BaseModel extends Model
{
    public $incrementing = false;
    protected $keyType = 'string';

    protected $casts = [
        'created_at' => 'datetime',
        'updated_at' => 'datetime',
    ];

    public function __construct(array $attributes = [])
    {
        parent::__construct($attributes);

        if (empty($this->attributes[$this->getKeyName()])) {
            $this->attributes[$this->getKeyName()] = Uuid::v4();
        }
    }

    protected static function boot()
    {
        parent::boot();

        static::creating(function ($model) {
            if (empty($model->{$model->getKeyName()})) {
                $model->{$model->getKeyName()} = Uuid::v4();
            }
        });
    }
}
