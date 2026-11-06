<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Support\Carbon;

class AttendanceSchedule extends Model
{
    public const DEFAULT_CHECK_IN_TIME = '08:00';
    public const CHECK_IN_WINDOW_MINUTES = 15;

    protected $fillable = [
        'pembimbing_id',
        'jam_masuk',
        'jam_pulang',
    ];

    public function pembimbing(): BelongsTo
    {
        return $this->belongsTo(User::class, 'pembimbing_id');
    }

    public static function checkInDeadline(?string $jamMasuk): Carbon
    {
        $time = substr((string) ($jamMasuk ?: self::DEFAULT_CHECK_IN_TIME), 0, 8);

        return Carbon::today()->setTimeFromTimeString($time)->addMinutes(self::CHECK_IN_WINDOW_MINUTES);
    }
}
