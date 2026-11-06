<?php

namespace App\Http\Controllers;

use App\Models\Absensi;
use App\Models\AttendanceSchedule;
use App\Models\LokasiAbsensi;
use App\Models\Magang;
use App\Models\Pembimbing;
use App\Models\Pendaftaran;
use App\Models\User;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;

class AbsensiController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        if (! in_array($request->user()?->role, ['admin', 'pembimbing'], true)) {
            return response()->json([
                'message' => 'Anda tidak memiliki izin untuk melihat seluruh data absensi.',
            ], 403);
        }

        $this->autoMarkAbsentAllIfDayEnded();

        $validated = $request->validate([
            'participant_code' => ['nullable', 'string', 'max:30'],
            'tanggal' => ['nullable', 'date'],
        ]);

        $query = Absensi::with(['pembimbing', 'user']);

        if (strtolower((string) $request->user()?->role) === 'pembimbing') {
            $legacyPembimbingId = Pembimbing::where('email', $request->user()->email)->value('id');

            $assignedUserIds = Pendaftaran::query()
                ->where('pembimbing_id', $request->user()->id)
                ->where('status', 'Pemagang Aktif')
                ->pluck('user_id');

            $assignedMagangIds = Magang::query()
                ->when($legacyPembimbingId, fn ($q) => $q->where('pembimbing_id', $legacyPembimbingId))
                ->pluck('id');

            $assignedParticipantCodes = Magang::query()
                ->when($legacyPembimbingId, fn ($q) => $q->where('pembimbing_id', $legacyPembimbingId))
                ->pluck('participant_code');

            $query->where(function ($q) use ($assignedUserIds, $assignedMagangIds, $assignedParticipantCodes, $request, $legacyPembimbingId) {
                $q->whereIn('user_id', $assignedUserIds)
                    ->orWhereIn('magang_id', $assignedMagangIds)
                    ->orWhereIn('participant_code', $assignedParticipantCodes)
                    ->orWhere('pembimbing_id', $request->user()->id)
                    ->when($legacyPembimbingId, fn ($sub) => $sub->orWhere('pembimbing_id', $legacyPembimbingId));
            });
        }

        if (! empty($validated['participant_code'])) {
            $query->where('participant_code', $validated['participant_code']);
        }

        if (! empty($validated['tanggal'])) {
            $query->whereDate('tanggal', $validated['tanggal']);
        }

        return response()->json(
            $query->latest('tanggal')
                ->latest('id')
                ->get()
        );
    }

    public function today(Request $request): JsonResponse
    {
        $user = $request->user();

        if ($user && in_array(strtolower((string) $user->role), ['peserta', 'pemagang', 'user', 'calon pemagang'], true)) {
            $profile = $this->participantProfile($request);
            if ($profile instanceof JsonResponse) {
                return $profile;
            }

            $this->autoMarkAbsentForUserIfDayEnded($user, $profile);

            $attendance = Absensi::where(function ($query) use ($user, $profile) {
                $query->where('user_id', $user->id)
                    ->orWhere('participant_code', $profile['participant_code']);
            })
                ->whereDate('tanggal', today())
                ->first();
        } else {
            $validated = $request->validate([
                'participant_code' => ['required', 'string', 'max:30'],
            ]);
            $query = Absensi::where('participant_code', $validated['participant_code'])
                ->whereDate('tanggal', today());

            if (strtolower((string) $user?->role) === 'pembimbing') {
                $assignedUserIds = Pendaftaran::query()
                    ->where('pembimbing_id', $user->id)
                    ->where('status', 'Pemagang Aktif')
                    ->select('user_id');
                $query->whereIn('user_id', $assignedUserIds);
            }

            $attendance = $query->first();
        }

        return response()->json($attendance);
    }

    public function myAttendance(Request $request): JsonResponse
    {
        $user = $request->user();

        if (! $user || ! in_array(strtolower((string) $user->role), ['peserta', 'pemagang', 'user', 'calon pemagang'], true)) {
            return response()->json([
                'message' => 'Hanya akun peserta yang dapat melihat riwayat pribadinya.',
            ], 403);
        }

        $profile = $this->participantProfile($request);
        if ($profile instanceof JsonResponse) {
            return $profile;
        }

        $this->autoMarkAbsentForUserIfDayEnded($user, $profile);

        $attendance = Absensi::where(function ($query) use ($user, $profile) {
            $query->where('user_id', $user->id)
                ->orWhere('participant_code', $profile['participant_code']);
        })
            ->orderByDesc('tanggal')
            ->get();

        return response()->json($attendance);
    }

    public function checkIn(Request $request): JsonResponse
    {
        $user = $request->user();
        $validated = $request->validate([
            'status' => ['nullable', 'in:Hadir,Tidak Hadir,Izin,Sakit'],
            'tipe_kehadiran' => ['nullable', 'string', 'in:WFO,Zoom,Daring,WFH'],
            'keterangan' => ['nullable', 'string', 'max:255'],
            'foto' => ['nullable', 'image', 'mimes:jpg,jpeg,png,webp', 'max:5120'],
            'latitude' => ['nullable', 'numeric', 'between:-90,90'],
            'longitude' => ['nullable', 'numeric', 'between:-180,180'],
        ]);

        $profile = $this->participantProfile($request);
        if ($profile instanceof JsonResponse) {
            return $profile;
        }

        $checkInTime = $profile['schedule_pembimbing_id']
            ? AttendanceSchedule::where('pembimbing_id', $profile['schedule_pembimbing_id'])->value('jam_masuk')
            : null;
        $checkInTime = substr((string) ($checkInTime ?: AttendanceSchedule::DEFAULT_CHECK_IN_TIME), 0, 5);
        $checkInDeadline = AttendanceSchedule::checkInDeadline($checkInTime);

        if (now()->greaterThanOrEqualTo($checkInDeadline)) {
            $deadlineLabel = $checkInDeadline->format('H:i');
            $reason = "Tidak melakukan absensi masuk hingga pukul {$deadlineLabel}.";
            $this->createAbsentRecordIfNotExists($user, $profile, today(), $reason);

            $attendance = Absensi::where(function ($query) use ($user, $profile) {
                $query->where('user_id', $user->id)
                    ->orWhere('participant_code', $profile['participant_code']);
            })
                ->whereDate('tanggal', today())
                ->first();

            if ($attendance?->status === 'Tidak Hadir' && $attendance->keterangan === $reason) {
                return response()->json([
                    'message' => "Batas absensi masuk pukul {$deadlineLabel} telah lewat. Status Anda otomatis tercatat Tidak Hadir.",
                    'data' => $attendance,
                ], 422);
            }
        }

        $status = $validated['status'] ?? 'Hadir';

        if ($status === 'Hadir' && now()->format('H:i') < $checkInTime) {
            return response()->json([
                'message' => "Belum waktunya absen masuk. Absensi masuk hanya bisa dilakukan mulai jam {$checkInTime}.",
            ], 422);
        }

        $isLeaveRequest = $status === 'Izin';
        $isNotPresent = in_array($status, ['Tidak Hadir', 'Izin', 'Sakit', 'Alpa'], true);
        $finalStatus = $isNotPresent
            ? ($isLeaveRequest ? 'Tidak Hadir' : $status)
            : 'Hadir';
        $pembimbingId = $profile['pembimbing_id'] ?? $user->pembimbing_id;
        $userLat = isset($validated['latitude']) ? (float) $validated['latitude'] : null;
        $userLng = isset($validated['longitude']) ? (float) $validated['longitude'] : null;
        $geofenceDistance = null;

        $tipeKehadiran = $validated['tipe_kehadiran'] ?? 'WFO';
        $isZoomMode = in_array(strtolower((string) $tipeKehadiran), ['zoom', 'daring', 'wfh'], true);

        // Ambil konfigurasi kebijakan absensi daring dari Admin
        $settingsPath = storage_path('app/attendance_settings.json');
        $attendanceSettings = [
            'allow_zoom' => true,
            'require_zoom_proof' => true,
        ];
        if (file_exists($settingsPath)) {
            $decoded = json_decode(file_get_contents($settingsPath), true);
            if (is_array($decoded)) {
                $attendanceSettings = array_merge($attendanceSettings, $decoded);
            }
        }

        // Jika memilih mode Zoom namun dinonaktifkan Admin
        if ($isZoomMode && empty($attendanceSettings['allow_zoom'])) {
            return response()->json([
                'message' => 'Absensi Daring / Zoom saat ini dinonaktifkan oleh Administrator. Silakan lakukan absensi di lokasi kantor.',
            ], 422);
        }

        // Jika memilih mode Zoom dan Admin mewajibkan bukti screenshot
        if ($isZoomMode && ! empty($attendanceSettings['require_zoom_proof']) && ! $request->hasFile('foto')) {
            return response()->json([
                'message' => 'Wajib melampirkan screenshot layar rapat Zoom atau foto bukti kegiatan daring.',
            ], 422);
        }

        // Validasi radius lokasi kantor hanya untuk kehadiran Hadir WFO (bukan Zoom)
        if ($finalStatus === 'Hadir' && ! $isZoomMode) {
            $geofence = $this->validateGeofence($userLat, $userLng);
            if (! $geofence['valid']) {
                return response()->json([
                    'message' => $geofence['message'],
                    'data' => [
                        'distance' => $geofence['distance'] ?? null,
                    ],
                ], 422);
            }
            $geofenceDistance = $geofence['distance'] ?? null;
        } elseif ($finalStatus === 'Hadir' && $isZoomMode) {
            // Untuk Zoom, hitung jarak sebagai log histori tanpa memblokir
            if ($userLat !== null && $userLng !== null) {
                $activeLocations = LokasiAbsensi::where('is_active', true)->get();
                if ($activeLocations->isNotEmpty()) {
                    $closest = null;
                    foreach ($activeLocations as $loc) {
                        $dist = $this->calculateDistance($userLat, $userLng, (float) $loc->latitude, (float) $loc->longitude);
                        if ($closest === null || $dist < $closest) {
                            $closest = $dist;
                        }
                    }
                    $geofenceDistance = $closest ? round($closest) : null;
                }
            }
        }

        $photoPath = $request->file('foto')?->store('absensi', 'public');

        $keteranganFinal = $validated['keterangan'] ?? null;
        if ($isZoomMode) {
            $prefix = '[ZOOM / DARING]';
            if ($keteranganFinal && ! str_contains($keteranganFinal, $prefix)) {
                $keteranganFinal = $prefix . ' ' . $keteranganFinal;
            } elseif (! $keteranganFinal) {
                $keteranganFinal = $prefix . ' Absensi kegiatan daring/Zoom';
            }
        }

        $attendance = Absensi::firstOrCreate(
            [
                'participant_code' => $profile['participant_code'],
                'tanggal' => today(),
            ],
            [
                'user_id' => $user->id,
                'magang_id' => $profile['magang_id'],
                'pembimbing_id' => $pembimbingId,
                'participant_name' => $profile['participant_name'],
                'institution' => $profile['institution'],
                'jam_masuk' => $isNotPresent ? null : now()->format('H:i:s'),
                'status' => $finalStatus,
                'approval_status' => $isLeaveRequest ? 'pending' : null,
                'keterangan' => $keteranganFinal,
                'foto' => $photoPath,
                'latitude' => $userLat,
                'longitude' => $userLng,
                'jarak_meter' => $geofenceDistance,
            ]
        );

        if (! $attendance->wasRecentlyCreated) {
            if ($photoPath) {
                Storage::disk('public')->delete($photoPath);
            }

            return response()->json(['message' => 'Kamu sudah melakukan absensi masuk hari ini.', 'data' => $attendance], 422);
        }

        return response()->json([
            'message' => $isLeaveRequest
                ? 'Permohonan izin berhasil dikirim dan menunggu persetujuan pembimbing.'
                : 'Absensi masuk berhasil dicatat.',
            'data' => $attendance,
        ], 201);
    }

    public function reviewLeave(Request $request, string $id): JsonResponse
    {
        if (! in_array($request->user()?->role, ['admin', 'pembimbing'], true)) {
            return response()->json(['message' => 'Anda tidak memiliki izin untuk memproses permohonan izin.'], 403);
        }

        $validated = $request->validate([
            'decision' => ['required', 'in:approved,rejected'],
        ]);

        $attendance = Absensi::findOrFail($id);

        if (strtolower((string) $request->user()?->role) === 'pembimbing') {
            $legacyPembimbingId = Pembimbing::where('email', $request->user()->email)->value('id');
            $isAssignedRegistration = $attendance->user_id && Pendaftaran::where('user_id', $attendance->user_id)
                ->where('pembimbing_id', $request->user()->id)
                ->where('status', 'Pemagang Aktif')
                ->exists();
            $isDirectPembimbing = ($attendance->pembimbing_id && ($attendance->pembimbing_id === $request->user()->id || $attendance->pembimbing_id === $legacyPembimbingId));
            $isMagangPembimbing = $attendance->magang_id && Magang::where('id', $attendance->magang_id)
                ->when($legacyPembimbingId, fn ($q) => $q->where('pembimbing_id', $legacyPembimbingId))
                ->exists();

            if (! $isAssignedRegistration && ! $isDirectPembimbing && ! $isMagangPembimbing) {
                return response()->json([
                    'message' => 'Anda hanya dapat memproses izin peserta bimbingan yang aktif.',
                ], 403);
            }
        }

        if ($attendance->approval_status !== 'pending') {
            return response()->json([
                'message' => 'Permohonan izin ini sudah diputuskan atau tidak menunggu persetujuan.',
            ], 422);
        }

        $approved = $validated['decision'] === 'approved';
        $attendance->update([
            'status' => $approved ? 'Izin' : 'Alpa',
            'approval_status' => $approved ? 'approved' : 'rejected',
        ]);

        return response()->json([
            'message' => $approved
                ? 'Permohonan izin disetujui.'
                : 'Permohonan izin ditolak.',
            'data' => $attendance,
        ]);
    }

    public function checkOut(Request $request): JsonResponse
    {
        $user = $request->user();
        $validated = $request->validate([
            'latitude' => ['nullable', 'numeric', 'between:-90,90'],
            'longitude' => ['nullable', 'numeric', 'between:-180,180'],
        ]);

        $profile = $this->participantProfile($request);
        if ($profile instanceof JsonResponse) {
            return $profile;
        }

        $checkoutTime = $profile['schedule_pembimbing_id']
            ? AttendanceSchedule::where('pembimbing_id', $profile['schedule_pembimbing_id'])->value('jam_pulang')
            : null;
        $checkoutTime = substr((string) ($checkoutTime ?: '17:00'), 0, 5);

        if (now()->format('H:i') < $checkoutTime) {
            return response()->json(['message' => "Belum waktunya pulang. Absensi pulang hanya bisa dilakukan mulai jam {$checkoutTime}."], 422);
        }

        $attendance = Absensi::where(function ($query) use ($user, $profile) {
            $query->where('user_id', $user->id)
                ->orWhere('participant_code', $profile['participant_code']);
        })
            ->whereDate('tanggal', today())
            ->first();

        if ($attendance && $attendance->jam_pulang) {
            return response()->json(['message' => 'Kamu sudah melakukan absensi pulang hari ini.', 'data' => $attendance], 422);
        }

        $userLat = isset($validated['latitude']) ? (float) $validated['latitude'] : null;
        $userLng = isset($validated['longitude']) ? (float) $validated['longitude'] : null;

        if (! $attendance) {
            $attendance = Absensi::create([
                'user_id' => $user->id,
                'magang_id' => $profile['magang_id'],
                'pembimbing_id' => $profile['pembimbing_id'] ?? null,
                'participant_code' => $profile['participant_code'],
                'participant_name' => $profile['participant_name'],
                'institution' => $profile['institution'],
                'tanggal' => today(),
                'jam_masuk' => null,
                'jam_pulang' => now()->format('H:i:s'),
                'status' => 'Hadir',
            ]);
        } else {
            // Validasi lokasi pulang jika absensi masuk adalah Hadir WFO (bukan Daring / Zoom)
            $isZoomAttendance = str_contains((string) $attendance->keterangan, '[ZOOM');
            if ($attendance->status === 'Hadir' && ! $isZoomAttendance) {
                $geofence = $this->validateGeofence($userLat, $userLng);
                if (! $geofence['valid']) {
                    return response()->json([
                        'message' => $geofence['message'],
                        'data' => [
                            'distance' => $geofence['distance'] ?? null,
                        ],
                    ], 422);
                }
            }

            $attendance->update([
                'jam_pulang' => now()->format('H:i:s'),
                'status' => in_array($attendance->status, ['Belum hadir', null, ''], true) ? 'Hadir' : $attendance->status,
            ]);
        }

        return response()->json(['message' => 'Absensi pulang berhasil dicatat.', 'data' => $attendance]);
    }

    public function update(Request $request, string $id): JsonResponse
    {
        if (! in_array($request->user()?->role, ['admin', 'pembimbing'], true)) {
            return response()->json(['message' => 'Anda tidak memiliki izin untuk mengubah data absensi.'], 403);
        }

        // Validasi input
        $validated = $request->validate([
            'jam_masuk' => ['nullable', 'string', 'max:20'],
            'jam_pulang' => ['nullable', 'string', 'max:20'],
            'status' => ['required', 'in:Hadir,Tidak Hadir,Izin,Sakit,Alpa,Belum hadir'],
            'participant_code' => ['required', 'string', 'max:30'],
            'participant_name' => ['required', 'string', 'max:100'],
            'tanggal' => ['required', 'date'],
            'keterangan' => ['nullable', 'string', 'max:255'],
        ]);

        $assignedUserId = null;
        if (strtolower((string) $request->user()?->role) === 'pembimbing') {
            if (! preg_match('/^USER-(\d+)$/', $validated['participant_code'], $matches)) {
                return response()->json(['message' => 'Kode peserta tidak valid untuk akun Pembimbing ini.'], 403);
            }

            $assignedUserId = (int) $matches[1];
            $isAssigned = Pendaftaran::where('user_id', $assignedUserId)
                ->where('pembimbing_id', $request->user()->id)
                ->where('status', 'Pemagang Aktif')
                ->exists();

            if (! $isAssigned) {
                return response()->json(['message' => 'Anda hanya dapat mengubah absensi peserta bimbingan yang aktif.'], 403);
            }
        }

        // Karena ID bisa jadi "Belum hadir" dari frontend yang belum ada di database,
        // kita cari berdasarkan participant_code dan tanggal, atau buat baru.
        $attendance = Absensi::where('participant_code', $validated['participant_code'])
            ->whereDate('tanggal', $validated['tanggal'])
            ->first();

        if (! $attendance) {
            if ($validated['status'] === 'Belum hadir') {
                return response()->json(['message' => 'Tidak ada perubahan.']);
            }
            // Buat record baru jika belum ada
            $attendance = Absensi::create([
                'participant_code' => $validated['participant_code'],
                'user_id' => $assignedUserId,
                'participant_name' => $validated['participant_name'],
                'tanggal' => $validated['tanggal'],
                'jam_masuk' => $validated['jam_masuk'],
                'jam_pulang' => $validated['jam_pulang'],
                'status' => $validated['status'],
                'keterangan' => $validated['keterangan'] ?? null,
            ]);
        } else {
            // Update record yang ada
            $attendance->update([
                'jam_masuk' => $validated['jam_masuk'],
                'jam_pulang' => $validated['jam_pulang'],
                'status' => $validated['status'],
                'keterangan' => $validated['keterangan'] ?? null,
            ]);
        }

        return response()->json(['message' => 'Data absensi berhasil diperbarui.', 'data' => $attendance]);
    }

    public function store(Request $request): JsonResponse
    {
        if (! in_array($request->user()?->role, ['admin', 'pembimbing'], true)) {
            return response()->json(['message' => 'Anda tidak memiliki izin untuk menambahkan data absensi.'], 403);
        }

        $validated = $request->validate([
            'participant_code' => ['required', 'string', 'max:30'],
            'participant_name' => ['required', 'string', 'max:100'],
            'tanggal' => ['required', 'date'],
            'jam_masuk' => ['nullable', 'string', 'max:20'],
            'jam_pulang' => ['nullable', 'string', 'max:20'],
            'status' => ['required', 'in:Hadir,Tidak Hadir,Izin,Sakit,Alpa'],
            'keterangan' => ['nullable', 'string', 'max:255'],
            'pembimbing_id' => ['nullable', 'integer'],
        ]);

        $attendance = Absensi::create($validated);

        return response()->json([
            'message' => 'Data absensi berhasil ditambahkan.',
            'data' => $attendance,
        ], 201);
    }

    public function destroy(Request $request, string $id): JsonResponse
    {
        if (! in_array($request->user()?->role, ['admin', 'pembimbing'], true)) {
            return response()->json(['message' => 'Anda tidak memiliki izin untuk menghapus data absensi.'], 403);
        }

        $attendance = Absensi::findOrFail($id);
        $attendance->delete();

        return response()->json(['message' => 'Data absensi berhasil dihapus.']);
    }

    private function participantProfile(Request $request): array|JsonResponse
    {
        $user = $request->user();

        if (! $user || ! in_array(strtolower((string) $user->role), ['peserta', 'pemagang', 'user', 'calon pemagang'], true)) {
            return response()->json([
                'message' => 'Absensi pribadi hanya tersedia untuk akun peserta.',
            ], 403);
        }

        $registration = $user->pendaftarans()
            ->where('status', 'Pemagang Aktif')
            ->latest('id')
            ->first();
        if ($registration) {
            return [
                'participant_code' => 'USER-' . $user->id,
                'participant_name' => $user->name,
                'institution' => $registration->asal_instansi,
                'magang_id' => $user->magang?->id,
                'pembimbing_id' => null,
                'schedule_pembimbing_id' => $registration->pembimbing_id,
            ];
        }

        $profile = $user->magang;
        if ($profile && $profile->status === 'Aktif') {
            $legacyPembimbingId = $profile->pembimbing_id ?? $user->pembimbing_id;
            $pembimbingEmail = $legacyPembimbingId
                ? Pembimbing::find($legacyPembimbingId)?->email
                : null;
            $schedulePembimbingId = $pembimbingEmail
                ? User::where('email', $pembimbingEmail)->where('role', 'pembimbing')->value('id')
                : null;

            return [
                'participant_code' => $profile->participant_code,
                'participant_name' => $profile->participant_name,
                'institution' => $profile->institution,
                'magang_id' => $profile->id,
                'pembimbing_id' => $legacyPembimbingId,
                'schedule_pembimbing_id' => $schedulePembimbingId,
            ];
        }

        return response()->json([
            'message' => 'Absensi hanya tersedia untuk peserta dengan pendaftaran magang aktif.',
        ], 403);
    }

    private function calculateDistance(float $lat1, float $lon1, float $lat2, float $lon2): float
    {
        $earthRadius = 6371000; // in meters
        $dLat = deg2rad($lat2 - $lat1);
        $dLon = deg2rad($lon2 - $lon1);

        $a = sin($dLat / 2) * sin($dLat / 2) +
            cos(deg2rad($lat1)) * cos(deg2rad($lat2)) *
            sin($dLon / 2) * sin($dLon / 2);

        $c = 2 * atan2(sqrt($a), sqrt(1 - $a));

        return $earthRadius * $c;
    }

    private function validateGeofence(?float $lat, ?float $lng): array
    {
        $activeLocations = LokasiAbsensi::where('is_active', true)->get();

        if ($activeLocations->isEmpty()) {
            return ['valid' => true, 'distance' => null, 'location' => null];
        }

        if ($lat === null || $lng === null) {
            return [
                'valid' => false,
                'message' => 'Titik koordinat GPS diperlukan untuk absensi Hadir. Mohon aktifkan izin lokasi di browser Anda.',
            ];
        }

        $isWithin = false;
        $closestDistance = null;
        $closestLocation = null;

        foreach ($activeLocations as $loc) {
            $dist = $this->calculateDistance($lat, $lng, (float) $loc->latitude, (float) $loc->longitude);
            if ($closestDistance === null || $dist < $closestDistance) {
                $closestDistance = $dist;
                $closestLocation = $loc;
            }
            if ($dist <= $loc->radius_meter) {
                $isWithin = true;
                $closestDistance = $dist;
                $closestLocation = $loc;
                break;
            }
        }

        if (! $isWithin) {
            $distRounded = round($closestDistance ?? 0);
            $maxRadius = $closestLocation ? $closestLocation->radius_meter : 100;
            $nama = $closestLocation ? $closestLocation->nama_lokasi : 'kantor';
            return [
                'valid' => false,
                'distance' => $distRounded,
                'location' => $closestLocation,
                'message' => "Anda berada di luar radius absensi {$nama}. Jarak Anda saat ini: {$distRounded} meter (Maksimal radius: {$maxRadius} meter). Absensi kehadiran ditolak.",
            ];
        }

        return [
            'valid' => true,
            'distance' => round($closestDistance ?? 0),
            'location' => $closestLocation,
        ];
    }

    private function createAbsentRecordIfNotExists(User $user, array $profile, $date, string $reason): void
    {
        $participantCode = $profile['participant_code'];
        $exists = Absensi::where(function ($query) use ($user, $participantCode) {
            $query->where('user_id', $user->id)
                ->orWhere('participant_code', $participantCode);
        })
            ->whereDate('tanggal', $date)
            ->exists();

        if (! $exists) {
            Absensi::create([
                'user_id' => $user->id,
                'magang_id' => $profile['magang_id'] ?? null,
                'pembimbing_id' => $profile['pembimbing_id'] ?? null,
                'participant_code' => $participantCode,
                'participant_name' => $profile['participant_name'],
                'institution' => $profile['institution'],
                'tanggal' => $date,
                'jam_masuk' => null,
                'jam_pulang' => null,
                'status' => 'Tidak Hadir',
                'keterangan' => $reason,
            ]);
        }
    }

    private function autoMarkAbsentForUserIfDayEnded(User $user, array $profile): void
    {
        // 1. Hari ini: tandai Tidak Hadir setelah masa absensi masuk berakhir.
        $checkInTime = $profile['schedule_pembimbing_id']
            ? AttendanceSchedule::where('pembimbing_id', $profile['schedule_pembimbing_id'])->value('jam_masuk')
            : null;
        $checkInDeadline = AttendanceSchedule::checkInDeadline($checkInTime);

        if (now()->greaterThanOrEqualTo($checkInDeadline)) {
            $reason = 'Tidak melakukan absensi masuk hingga pukul '.$checkInDeadline->format('H:i').'.';
            $this->createAbsentRecordIfNotExists(
                $user,
                $profile,
                today(),
                $reason
            );
        }

        // 2. Hari-hari kerja sebelumnya yang terlewat tanpa absensi.
        $registration = $user->pendaftarans()->where('status', 'Pemagang Aktif')->latest('id')->first();
        if ($registration && $registration->tanggal_daftar) {
            $startDate = \Carbon\Carbon::parse($registration->tanggal_daftar)->startOfDay();
        } elseif ($user->magang?->created_at) {
            $startDate = \Carbon\Carbon::parse($user->magang->created_at)->startOfDay();
        } else {
            $startDate = today()->subDays(14)->startOfDay();
        }

        $limitDate = today()->subDays(30)->startOfDay();
        if ($startDate->lt($limitDate)) {
            $startDate = $limitDate;
        }

        $cursor = $startDate->copy();
        while ($cursor->lt(today())) {
            if (! $cursor->isWeekend()) {
                $this->createAbsentRecordIfNotExists($user, $profile, $cursor->copy(), 'Tidak hadir dan tidak ada keterangan seharian.');
            }
            $cursor->addDay();
        }
    }

    private function autoMarkAbsentAllIfDayEnded(): void
    {
        $activeUsers = User::query()
            ->whereIn('role', ['peserta', 'pemagang', 'user', 'calon pemagang'])
            ->where(function ($query) {
                $query->whereHas('pendaftarans', fn ($r) => $r->where('status', 'Pemagang Aktif'))
                    ->orWhereHas('magang', fn ($m) => $m->where('status', 'Aktif'));
            })
            ->with([
                'magang',
                'pendaftarans' => fn ($r) => $r->where('status', 'Pemagang Aktif')->latest('id'),
            ])
            ->get();

        foreach ($activeUsers as $user) {
            $registration = $user->pendaftarans->first();
            $magang = $user->magang;

            $schedulePembimbingId = null;
            $legacyPembimbingId = null;
            if ($registration) {
                $participantCode = 'USER-'.$user->id;
                $participantName = $user->name;
                $institution = $registration->asal_instansi;
                $magangId = $magang?->id;
                $schedulePembimbingId = $registration->pembimbing_id;
            } elseif ($magang?->status === 'Aktif') {
                $participantCode = $magang->participant_code;
                $participantName = $magang->participant_name;
                $institution = $magang->institution;
                $magangId = $magang->id;
                $legacyPembimbingId = $magang->pembimbing_id ?? $user->pembimbing_id;
                $pembimbingEmail = $legacyPembimbingId
                    ? Pembimbing::find($legacyPembimbingId)?->email
                    : null;
                $schedulePembimbingId = $pembimbingEmail
                    ? User::where('email', $pembimbingEmail)->where('role', 'pembimbing')->value('id')
                    : null;
            } else {
                continue;
            }

            $profile = [
                'participant_code' => $participantCode,
                'participant_name' => $participantName,
                'institution' => $institution,
                'magang_id' => $magangId,
                'pembimbing_id' => $legacyPembimbingId,
                'schedule_pembimbing_id' => $schedulePembimbingId,
            ];

            $this->autoMarkAbsentForUserIfDayEnded($user, $profile);
        }
    }
}
