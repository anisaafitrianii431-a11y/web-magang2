<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\LokasiAbsensi;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class LokasiAbsensiController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $user = $request->user();
        $isAdmin = strtolower((string) $user?->role) === 'admin';

        $query = LokasiAbsensi::query();

        if (! $isAdmin) {
            $query->where('is_active', true);
        }

        $locations = $query->orderByDesc('is_active')->latest('id')->get();

        return response()->json([
            'status' => 'success',
            'data' => $locations,
        ]);
    }

    public function show($id): JsonResponse
    {
        $location = LokasiAbsensi::findOrFail($id);

        return response()->json([
            'status' => 'success',
            'data' => $location,
        ]);
    }

    public function store(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'nama_lokasi' => ['required', 'string', 'max:255'],
            'alamat' => ['nullable', 'string', 'max:500'],
            'latitude' => ['required', 'numeric', 'between:-90,90'],
            'longitude' => ['required', 'numeric', 'between:-180,180'],
            'radius_meter' => ['required', 'integer', 'min:5', 'max:50000'],
            'is_active' => ['nullable', 'boolean'],
        ]);

        if (! isset($validated['is_active'])) {
            $validated['is_active'] = true;
        }

        $location = LokasiAbsensi::create($validated);

        return response()->json([
            'status' => 'success',
            'message' => 'Lokasi absensi berhasil ditambahkan.',
            'data' => $location,
        ], 201);
    }

    public function update(Request $request, $id): JsonResponse
    {
        $location = LokasiAbsensi::findOrFail($id);

        $validated = $request->validate([
            'nama_lokasi' => ['required', 'string', 'max:255'],
            'alamat' => ['nullable', 'string', 'max:500'],
            'latitude' => ['required', 'numeric', 'between:-90,90'],
            'longitude' => ['required', 'numeric', 'between:-180,180'],
            'radius_meter' => ['required', 'integer', 'min:5', 'max:50000'],
            'is_active' => ['nullable', 'boolean'],
        ]);

        $location->update($validated);

        return response()->json([
            'status' => 'success',
            'message' => 'Lokasi absensi berhasil diperbarui.',
            'data' => $location,
        ]);
    }

    public function toggleActive(Request $request, $id): JsonResponse
    {
        $location = LokasiAbsensi::findOrFail($id);

        if ($request->has('is_active')) {
            $location->is_active = filter_var($request->input('is_active'), FILTER_VALIDATE_BOOLEAN);
        } else {
            $location->is_active = ! $location->is_active;
        }

        $location->save();

        $statusStr = $location->is_active ? 'diaktifkan' : 'dinonaktifkan';

        return response()->json([
            'status' => 'success',
            'message' => "Lokasi {$location->nama_lokasi} berhasil {$statusStr}.",
            'data' => $location,
        ]);
    }

    public function destroy($id): JsonResponse
    {
        $location = LokasiAbsensi::findOrFail($id);
        $location->delete();

        return response()->json([
            'status' => 'success',
            'message' => 'Lokasi absensi berhasil dihapus.',
        ]);
    }

    public function getSettings(): JsonResponse
    {
        $path = storage_path('app/attendance_settings.json');
        $defaultSettings = [
            'allow_zoom' => true,
            'require_zoom_proof' => true,
            'zoom_note' => 'Peserta yang sedang mengikuti rapat/kegiatan Zoom dapat melakukan absensi dengan melampirkan screenshot ruang Zoom.',
        ];

        if (file_exists($path)) {
            $content = file_get_contents($path);
            $settings = json_decode($content, true);
            if (is_array($settings)) {
                $defaultSettings = array_merge($defaultSettings, $settings);
            }
        }

        return response()->json([
            'status' => 'success',
            'data' => $defaultSettings,
        ]);
    }

    public function updateSettings(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'allow_zoom' => ['required', 'boolean'],
            'require_zoom_proof' => ['required', 'boolean'],
            'zoom_note' => ['nullable', 'string', 'max:500'],
        ]);

        $path = storage_path('app/attendance_settings.json');
        $dir = dirname($path);
        if (! is_dir($dir)) {
            mkdir($dir, 0755, true);
        }

        file_put_contents($path, json_encode($validated, JSON_PRETTY_PRINT));

        return response()->json([
            'status' => 'success',
            'message' => 'Kebijakan absensi daring (Zoom) berhasil disimpan.',
            'data' => $validated,
        ]);
    }
}
