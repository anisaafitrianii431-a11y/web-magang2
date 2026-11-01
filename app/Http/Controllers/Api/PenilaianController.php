<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\LaporanMagang;
use App\Models\MasterPenilaian;
use App\Models\Pendaftaran;
use App\Models\Penilaian;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Facades\Validator;

class PenilaianController extends Controller
{
    public function participants(Request $request)
    {
        $registrations = Pendaftaran::with(['user:id,name,email'])
            ->where('status', 'Pemagang Aktif')
            ->when(
                strtolower((string) $request->user()->role) === 'pembimbing',
                fn ($query) => $query->where('pembimbing_id', $request->user()->id)
            )
            ->orderByDesc('id')
            ->get()
            ->filter(fn (Pendaftaran $registration) => $registration->user !== null)
            ->unique('user_id')
            ->values();

        $participants = $registrations->map(function (Pendaftaran $registration) {
            $report = LaporanMagang::with(['penilaian' => fn ($query) => $query->orderByDesc('id_penilaian')])
                ->where('id_peserta', $registration->user_id)
                ->orderByDesc('id_laporan')
                ->first();
            $latestEvaluation = $report?->penilaian->first();

            return [
                'user_id' => $registration->user_id,
                'nama_peserta' => $registration->user->name,
                'email' => $registration->user->email,
                'asal_instansi' => $registration->asal_instansi,
                'has_penilaian_akhir_pdf' => filled($registration->penilaian_akhir_pdf),
                'penilaian' => $this->latestParticipantEvaluation($registration->user_id, $report),
                'laporan' => $report ? [
                    'id_laporan' => $report->id_laporan,
                    'judul_laporan' => $report->judul_laporan,
                    'status_laporan' => $report->status_laporan,
                    'nilai_laporan' => $report->nilai_laporan,
                    'tanggal_dinilai' => $report->tanggal_dinilai,
                    'penilaian' => $latestEvaluation,
                ] : null,
            ];
        });

        return response()->json([
            'success' => true,
            'data' => $participants,
        ]);
    }

    private function latestParticipantEvaluation(int $userId, ?LaporanMagang $report): ?Penilaian
    {
        $participantEvaluation = Penilaian::where('id_peserta', $userId)
            ->whereNull('id_laporan_magang')
            ->orderByDesc('id_penilaian')
            ->first();
        $reportEvaluation = $report?->penilaian->first();

        if (! $participantEvaluation) {
            return $reportEvaluation;
        }

        if (! $reportEvaluation) {
            return $participantEvaluation;
        }

        return $participantEvaluation->tanggal_nilai?->greaterThan($reportEvaluation->tanggal_nilai)
            ? $participantEvaluation
            : $reportEvaluation;
    }

    public function uploadFinalAssessmentPdf(Request $request, int $userId)
    {
        $validator = Validator::make($request->all(), [
            'file' => 'required|file|mimes:pdf|max:25600',
        ]);

        if ($validator->fails()) {
            return response()->json([
                'success' => false,
                'errors' => $validator->errors(),
            ], 422);
        }

        $registration = $this->assignedActiveRegistration($request, $userId);
        if (! $registration) {
            return response()->json([
                'success' => false,
                'message' => 'Pemagang aktif tidak ditemukan atau tidak ditugaskan kepada Anda.',
            ], 404);
        }

        $oldPath = $registration->penilaian_akhir_pdf;
        $newPath = $request->file('file')->store('penilaian_akhir', 'public');
        $registration->penilaian_akhir_pdf = $newPath;
        $registration->save();

        if ($oldPath && $oldPath !== $newPath) {
            Storage::disk('public')->delete($oldPath);
        }

        return response()->json([
            'success' => true,
            'message' => 'PDF penilaian akhir berhasil diunggah.',
            'data' => [
                'user_id' => $userId,
                'has_penilaian_akhir_pdf' => true,
            ],
        ]);
    }

    public function downloadFinalAssessmentPdf(Request $request, int $userId)
    {
        $registration = $this->assignedActiveRegistration($request, $userId);
        if (! $registration || ! $registration->penilaian_akhir_pdf) {
            return response()->json([
                'success' => false,
                'message' => 'PDF penilaian akhir tidak ditemukan.',
            ], 404);
        }

        $disk = Storage::disk('public');
        if (! $disk->exists($registration->penilaian_akhir_pdf)) {
            return response()->json([
                'success' => false,
                'message' => 'Berkas PDF penilaian akhir tidak ditemukan di penyimpanan.',
            ], 404);
        }

        return $disk->download(
            $registration->penilaian_akhir_pdf,
            "penilaian-akhir-{$userId}.pdf"
        );
    }

    private function assignedActiveRegistration(Request $request, int $userId): ?Pendaftaran
    {
        return Pendaftaran::where('user_id', $userId)
            ->where('status', 'Pemagang Aktif')
            ->when(
                strtolower((string) $request->user()->role) === 'pembimbing',
                fn ($query) => $query->where('pembimbing_id', $request->user()->id)
            )
            ->orderByDesc('id')
            ->first();
    }

    /**
     * UC-05: Penilaian Laporan (Pembimbing)
     */
    public function store(Request $request)
    {
        $criteria = MasterPenilaian::query()
            ->where('aktif', true)
            ->orderBy('urutan')
            ->orderBy('id')
            ->get();

        if ($criteria->isEmpty() || round((float) $criteria->sum('bobot'), 2) !== 100.0) {
            return response()->json([
                'success' => false,
                'message' => 'Aktifkan pertanyaan penilaian dengan total bobot tepat 100% sebelum mengisi penilaian.',
            ], 422);
        }

        $rules = [
            'id_peserta' => 'required|integer|exists:users,id',
            'id_laporan_magang' => 'nullable|integer|exists:laporan_magang,id_laporan',
            'rincian_nilai' => ['required', 'array', 'size:'.$criteria->count()],
        ];
        foreach ($criteria as $criterion) {
            $rules['rincian_nilai.'.$criterion->id] = ['required', 'numeric', 'between:0,100'];
        }

        $validator = Validator::make($request->all(), $rules);

        if ($validator->fails()) {
            return response()->json([
                'success' => false,
                'errors' => $validator->errors()
            ], 422);
        }

        $report = $request->filled('id_laporan_magang')
            ? LaporanMagang::findOrFail($request->id_laporan_magang)
            : null;

        if ($report && (int) $report->id_peserta !== (int) $request->id_peserta) {
            return response()->json([
                'success' => false,
                'message' => 'Laporan tidak cocok dengan peserta yang dipilih.',
            ], 422);
        }

        if (strtolower((string) $request->user()->role) === 'pembimbing') {
            $isAssigned = Pendaftaran::where('user_id', $request->id_peserta)
                ->where('pembimbing_id', $request->user()->id)
                ->where('status', 'Pemagang Aktif')
                ->exists();

            if (! $isAssigned) {
                return response()->json([
                    'success' => false,
                    'message' => 'Anda tidak ditugaskan untuk menilai laporan peserta ini.',
                ], 403);
            }
        }

        if ($report && $report->status_laporan !== 'Disetujui') {
            return response()->json([
                'success' => false,
                'message' => 'Laporan harus disetujui sebelum dapat dinilai.',
            ], 422);
        }

        $rubric = [];
        $total = 0;
        foreach ($criteria as $criterion) {
            $score = (float) $request->input('rincian_nilai.'.$criterion->id);
            $weightedScore = round($score * $criterion->bobot / 100, 2);
            $rubric[(string) $criterion->id] = [
                'master_id' => $criterion->id,
                'kode' => $criterion->kode,
                'pertanyaan' => $criterion->pertanyaan,
                'aspek' => $criterion->pertanyaan,
                'nilai' => $score,
                'bobot' => $criterion->bobot,
                'nilai_akhir' => $weightedScore,
            ];
            $total += $weightedScore;
        }
        $total = round($total, 2);
        $predicate = match (true) {
            $total >= 85 => 'A (Sangat Baik)',
            $total >= 75 => 'B+ (Baik)',
            $total >= 65 => 'B (Cukup Baik)',
            $total >= 50 => 'C (Perlu Evaluasi)',
            default => 'D (Kurang)',
        };

        $penilaian = DB::transaction(function () use ($request, $report, $rubric, $total, $predicate) {
            $query = Penilaian::where('id_peserta', $request->id_peserta);
            if ($report) {
                $query->where('id_laporan_magang', $report->id_laporan);
            } else {
                $query->whereNull('id_laporan_magang');
            }

            $penilaian = $query->orderByDesc('id_penilaian')->first()
                ?? new Penilaian([
                    'id_peserta' => $request->id_peserta,
                    'id_laporan_magang' => $report?->id_laporan,
                ]);

            $penilaian->fill([
                'id_peserta' => $request->id_peserta,
                'id_pembimbing' => $request->user()->id,
                'judul_nilai' => 'Penilaian Akhir Laporan Magang',
                'catatan' => null,
                'tanggal_nilai' => now(),
                'poin_nilai' => $predicate,
                'rincian_nilai' => $rubric,
                'nilai_akhir' => $total,
            ]);
            $penilaian->save();

            if ($report) {
                $report->nilai_laporan = $total;
                $report->tanggal_dinilai = now();
                $report->save();
            }

            return $penilaian->load('laporan');
        });

        return response()->json([
            'success' => true,
            'message' => 'Penilaian laporan berhasil disimpan',
            'data' => $penilaian
        ]);
    }

    /**
     * Get all evaluation records.
     */
    public function index()
    {
        $penilaian = Penilaian::with('laporan')->orderBy('id_penilaian', 'desc')->get();

        return response()->json([
            'success' => true,
            'data' => $penilaian
        ]);
    }
}
