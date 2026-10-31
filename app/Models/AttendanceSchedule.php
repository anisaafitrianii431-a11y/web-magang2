<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class AttendanceSchedule extends Model
{
    protected $fillable = [
        'pembimbing_id',
        'jam_masuk',
        'jam_pulang',
    ];

    public function pembimbing(): BelongsTo
    {
        return $this->belongsTo(User::class, 'pembimbing_id');
    }
}
