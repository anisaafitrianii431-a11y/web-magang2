<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\AttendanceSchedule;
use App\Models\Pembimbing;
use App\Models\Pendaftaran;
use App\Models\User;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class AttendanceScheduleController extends Controller
{
    private const DEFAULT_CHECKOUT_TIME = '17:00';

    public function showForSupervisor(Request $request): JsonResponse
    {
        return $this->scheduleResponse((int) $request->user()->id);
    }

    public function updateForSupervisor(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'jam_masuk' => ['sometimes', 'required', 'date_format:H:i'],
            'jam_pulang' => ['sometimes', 'required', 'date_format:H:i'],
        ]);

        if (! array_key_exists('jam_masuk', $validated) && ! array_key_exists('jam_pulang', $validated)) {
            return response()->json([
                'message' => 'Isi minimal satu jadwal absensi untuk diperbarui.',
            ], 422);
        }

        $schedule = AttendanceSchedule::updateOrCreate(
            ['pembimbing_id' => $request->user()->id],
            $validated
        );

        return response()->json([
            'message' => 'Jadwal absensi berhasil diperbarui.',
            'data' => [
                'jam_masuk' => substr((string) $schedule->jam_masuk, 0, 5),
                'jam_pulang' => substr((string) $schedule->jam_pulang, 0, 5),
            ],
        ]);
    }

    public function showForParticipant(Request $request): JsonResponse
    {
        $user = $request->user();
        $pembimbingId = Pendaftaran::query()
            ->where('user_id', $user->id)
            ->where('status', 'Pemagang Aktif')
            ->latest('id')
            ->value('pembimbing_id');

        if (! $pembimbingId) {
            $legacyPembimbingId = $user->magang?->pembimbing_id ?? $user->pembimbing_id;
            $email = $legacyPembimbingId
                ? Pembimbing::find($legacyPembimbingId)?->email
                : null;
            $pembimbingId = $email
                ? User::where('email', $email)->where('role', 'pembimbing')->value('id')
                : null;
        }

        return $this->scheduleResponse($pembimbingId ? (int) $pembimbingId : null);
    }

    private function scheduleResponse(?int $pembimbingId): JsonResponse
    {
        $schedule = $pembimbingId
            ? AttendanceSchedule::where('pembimbing_id', $pembimbingId)->first()
            : null;

        return response()->json([
            'data' => [
                'jam_masuk' => substr((string) ($schedule?->jam_masuk ?: AttendanceSchedule::DEFAULT_CHECK_IN_TIME), 0, 5),
                'jam_pulang' => substr((string) ($schedule?->jam_pulang ?: self::DEFAULT_CHECKOUT_TIME), 0, 5),
            ],
        ]);
    }
}
