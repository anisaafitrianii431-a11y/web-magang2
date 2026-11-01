<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\MasterPenilaian;
use Illuminate\Http\Request;

class MasterPenilaianController extends Controller
{
    public function index()
    {
        $questions = MasterPenilaian::query()
            ->orderBy('urutan')
            ->orderBy('id')
            ->get();

        return response()->json(['success' => true, 'data' => $questions]);
    }

    public function active()
    {
        $questions = MasterPenilaian::query()
            ->where('aktif', true)
            ->orderBy('urutan')
            ->orderBy('id')
            ->get();

        return response()->json(['success' => true, 'data' => $questions]);
    }

    public function store(Request $request)
    {
        $validated = $request->validate([
            'pertanyaan' => ['required', 'string', 'max:500'],
            'bobot' => ['required', 'numeric', 'gt:0', 'lte:100'],
            'urutan' => ['nullable', 'integer', 'min:1'],
        ]);

        $question = MasterPenilaian::create([
            'pertanyaan' => trim($validated['pertanyaan']),
            'bobot' => $validated['bobot'],
            'urutan' => $validated['urutan'] ?? ((int) MasterPenilaian::max('urutan') + 1),
            'aktif' => true,
        ]);

        return response()->json([
            'success' => true,
            'message' => 'Pertanyaan penilaian berhasil ditambahkan.',
            'data' => $question,
        ], 201);
    }

    public function update(Request $request, int $id)
    {
        $question = MasterPenilaian::findOrFail($id);
        $validated = $request->validate([
            'pertanyaan' => ['required', 'string', 'max:500'],
            'bobot' => ['required', 'numeric', 'gt:0', 'lte:100'],
            'urutan' => ['required', 'integer', 'min:1'],
            'aktif' => ['sometimes', 'boolean'],
        ]);

        $question->update([
            'pertanyaan' => trim($validated['pertanyaan']),
            'bobot' => $validated['bobot'],
            'urutan' => $validated['urutan'],
            'aktif' => $validated['aktif'] ?? $question->aktif,
        ]);

        return response()->json([
            'success' => true,
            'message' => 'Pertanyaan penilaian berhasil diperbarui.',
            'data' => $question->fresh(),
        ]);
    }

    public function destroy(int $id)
    {
        $question = MasterPenilaian::findOrFail($id);
        $question->aktif = false;
        $question->save();

        return response()->json([
            'success' => true,
            'message' => 'Pertanyaan dinonaktifkan. Riwayat penilaian sebelumnya tetap tersimpan.',
        ]);
    }
}
