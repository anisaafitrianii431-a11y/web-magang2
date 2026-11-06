<?php

namespace App\Http\Controllers;

use App\Models\Magang;
use App\Models\Pendaftaran;
use Illuminate\Http\Request;
use Illuminate\Http\JsonResponse;

class MagangController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        if (strtolower((string) $request->user()?->role) === 'pembimbing') {
            $pesertaBimbingan = Pendaftaran::with('user')
                ->where('pembimbing_id', $request->user()->id)
                ->where('status', 'Pemagang Aktif')
                ->get()
                ->filter(fn (Pendaftaran $pendaftaran) => $pendaftaran->user !== null)
                ->map(fn (Pendaftaran $pendaftaran) => [
                    'id' => $pendaftaran->id,
                    'participant_code' => 'USER-' . $pendaftaran->user_id,
                    'nim' => $pendaftaran->user->nim,
                    'participant_name' => $pendaftaran->user->name,
                    'institution' => $pendaftaran->asal_instansi,
                    'status' => 'Aktif',
                ])
                ->values();

            return response()->json($pesertaBimbingan);
        }

        return response()->json(
            Magang::with('pembimbing')->orderBy('participant_name')->get()
        );
    }

    public function store(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'participant_code' => ['required', 'string', 'max:30', 'unique:magangs,participant_code'],
            'participant_name' => ['required', 'string', 'max:100'],
            'institution' => ['nullable', 'string', 'max:120'],
        ]);

        $magang = Magang::create($validated);

        return response()->json([
            'message' => 'Data magang berhasil ditambahkan.',
            'data' => $magang,
        ], 201);
    }
}
