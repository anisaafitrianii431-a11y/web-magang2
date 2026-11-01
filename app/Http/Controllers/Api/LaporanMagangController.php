<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\LaporanMagang;
use App\Models\Pendaftaran;
use App\Models\RiwayatRevisiLaporan;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Facades\Validator;

class LaporanMagangController extends Controller
{
    /**
     * Display a listing of reports with search & filter.
     */
    public function index(Request $request)
    {
        $user = $request->user();
        $query = LaporanMagang::with([
            'riwayatRevisi',
            'penilaian',
            'peserta:id,name,email',
            'peserta.pendaftarans' => fn ($registrationQuery) => $registrationQuery->orderByDesc('id'),
        ]);

        if (strtolower((string) $user?->role) === 'pembimbing') {
            $assignedParticipantIds = Pendaftaran::where('pembimbing_id', $user->id)
                ->where('status', 'Pemagang Aktif')
                ->select('user_id');
            $query->whereIn('id_peserta', $assignedParticipantIds);
        } elseif (in_array(strtolower((string) $user?->role), ['peserta', 'pemagang'], true)) {
            $query->where('id_peserta', $user->id);
        }

        if ($request->has('search') && !empty($request->search)) {
            $search = $request->search;
            $query->where(function ($q) use ($search) {
                $q->where('judul_laporan', 'like', "%{$search}%")
                  ->orWhere('abstrak', 'like', "%{$search}%");
            });
        }

        if ($request->has('kategori') && !empty($request->kategori) && $request->kategori !== 'Semua') {
            $query->where('kategori_laporan', $request->kategori);
        }

        if ($request->has('status') && !empty($request->status) && $request->status !== 'Semua') {
            $query->where('status_laporan', $request->status);
        }

        $laporan = $query->orderBy('id_laporan', 'desc')->get()->map(function (LaporanMagang $item) {
            $registration = $item->peserta?->pendaftarans
                ->first(fn (Pendaftaran $pendaftaran) => $pendaftaran->status === 'Pemagang Aktif')
                ?? $item->peserta?->pendaftarans->first();

            $item->setAttribute('nama_peserta', $item->peserta?->name);
            $item->setAttribute('email_peserta', $item->peserta?->email);
            $item->setAttribute('asal_instansi', $registration?->asal_instansi);

            return $item;
        });

        return response()->json([
            'success' => true,
            'message' => 'Daftar laporan magang berhasil diambil',
            'data' => $laporan
        ]);
    }

    /**
     * UC-02: Mengunggah Laporan Magang (Anak Magang)
     */
    public function store(Request $request)
    {
        $validator = Validator::make($request->all(), [
            'judul_laporan' => 'required|string|max:255',
            'kategori_laporan' => 'required|in:Individu,Kelompok',
            'file_laporan' => 'required|file|mimes:pdf|max:25600',
        ]);

        if ($validator->fails()) {
            return response()->json([
                'success' => false,
                'errors' => $validator->errors()
            ], 422);
        }

        $registration = Pendaftaran::where('user_id', $request->user()->id)
            ->where('status', 'Pemagang Aktif')
            ->whereNotNull('pembimbing_id')
            ->first();

        if (!$registration) {
            return response()->json([
                'success' => false,
                'message' => 'Laporan hanya dapat diunggah oleh pemagang aktif yang sudah ditugaskan kepada pembimbing.',
            ], 403);
        }

        $filePath = $request->file('file_laporan')->store(
            "laporan/{$request->user()->id}",
            'public'
        );
        if (! is_string($filePath) || $filePath === '') {
            return response()->json([
                'success' => false,
                'message' => 'PDF laporan gagal disimpan.',
            ], 500);
        }

        try {
            $laporan = LaporanMagang::create([
                'id_peserta' => $request->user()->id,
                'judul_laporan' => $request->judul_laporan,
                'kategori_laporan' => $request->kategori_laporan,
                'file_laporan_pdf' => $filePath,
                'link_google_doc' => null,
                'tgl_submit' => now(),
                'status_laporan' => 'Menunggu Review',
            ]);
        } catch (\Throwable $exception) {
            Storage::disk('public')->delete($filePath);

            throw $exception;
        }

        return response()->json([
            'success' => true,
            'message' => 'Laporan PDF berhasil diunggah',
            'data' => $laporan
        ], 201);
    }

    /**
     * Display the specified report.
     */
    public function show($id)
    {
        $laporan = LaporanMagang::with(['riwayatRevisi', 'penilaian'])->find($id);

        if (!$laporan) {
            return response()->json([
                'success' => false,
                'message' => 'Data laporan tidak ditemukan'
            ], 404);
        }

        return response()->json([
            'success' => true,
            'data' => $laporan
        ]);
    }

    public function download($id)
    {
        $laporan = LaporanMagang::find($id);
        if (!$laporan) {
            return response()->json([
                'success' => false,
                'message' => 'File laporan tidak ditemukan'
            ], 404);
        }

        if ($laporan->link_google_doc) {
            return redirect()->away($laporan->link_google_doc);
        }

        $fileStream = Storage::disk('public')->readStream($laporan->file_laporan_pdf);
        if ($fileStream === false) {
            return response()->json([
                'success' => false,
                'message' => 'File laporan tidak ditemukan'
            ], 404);
        }

        return response()->streamDownload(function () use ($fileStream) {
            fpassthru($fileStream);
            fclose($fileStream);
        }, basename($laporan->file_laporan_pdf), [
            'Content-Type' => 'application/pdf',
        ]);
    }

    /**
     * UC-03: Review & Moderasi Laporan (Pembimbing)
     */
    public function review(Request $request, $id)
    {
        $validator = Validator::make($request->all(), [
            'status_laporan' => 'required|in:Revisi,Disetujui',
            'catatan_revisi' => 'nullable|string',
        ]);

        if ($validator->fails()) {
            return response()->json([
                'success' => false,
                'errors' => $validator->errors()
            ], 422);
        }

        $laporan = LaporanMagang::find($id);
        if (!$laporan) {
            return response()->json([
                'success' => false,
                'message' => 'Laporan tidak ditemukan'
            ], 404);
        }

        $laporan->status_laporan = $request->status_laporan;
        if ($request->has('catatan_revisi')) {
            $laporan->catatan_revisi = $request->catatan_revisi;
        }

        $laporan->save();

        return response()->json([
            'success' => true,
            'message' => 'Review laporan berhasil disimpan',
            'data' => $laporan
        ]);
    }

    /**
     * UC-04: Mengunggah Ulang / Revisi Laporan (Anak Magang)
     */
    public function uploadRevisi(Request $request, $id)
    {
        $validator = Validator::make($request->all(), [
            'link_google_doc' => 'required|url|max:255',
        ]);

        if ($validator->fails()) {
            return response()->json([
                'success' => false,
                'errors' => $validator->errors()
            ], 422);
        }

        $laporan = LaporanMagang::find($id);
        if (!$laporan) {
            return response()->json([
                'success' => false,
                'message' => 'Laporan tidak ditemukan'
            ], 404);
        }

        $data = DB::transaction(function () use ($request, $laporan) {
            $revisi = RiwayatRevisiLaporan::create([
                'id_laporan' => $laporan->id_laporan,
                'link_google_doc' => $request->link_google_doc,
                'tanggal_revisi' => now(),
            ]);

            $laporan->status_laporan = 'Menunggu Review';
            $laporan->save();

            return [
                'laporan' => $laporan->load('riwayatRevisi'),
                'revisi' => $revisi,
            ];
        });

        return response()->json([
            'success' => true,
            'message' => 'Revisi laporan berhasil diunggah',
            'data' => $data
        ]);
    }

    /**
     * Destroy a report.
     */
    public function destroy(Request $request, $id)
    {
        $laporan = LaporanMagang::find($id);
        if (!$laporan) {
            return response()->json([
                'success' => false,
                'message' => 'Data tidak ditemukan'
            ], 404);
        }

        $user = $request->user();
        $role = strtolower(trim((string) $user?->role));
        $canDelete = $role === 'admin'
            || (in_array($role, ['peserta', 'pemagang'], true)
                && (int) $laporan->id_peserta === (int) $user->id)
            || ($role === 'pembimbing' && Pendaftaran::where('user_id', $laporan->id_peserta)
                ->where('pembimbing_id', $user->id)
                ->where('status', 'Pemagang Aktif')
                ->exists());

        if (!$canDelete) {
            return response()->json([
                'success' => false,
                'message' => 'Anda tidak memiliki akses untuk menghapus laporan ini.',
            ], 403);
        }

        $filePath = $laporan->file_laporan_pdf;
        DB::transaction(function () use ($laporan) {
            $laporan->delete();
        });

        if (
            is_string($filePath)
            && $filePath !== ''
            && !filter_var($filePath, FILTER_VALIDATE_URL)
            && !str_contains($filePath, '..')
            && !str_starts_with($filePath, '/')
            && !preg_match('/^[A-Za-z]:/', $filePath)
            && Storage::disk('public')->exists($filePath)
            && !Storage::disk('public')->delete($filePath)
        ) {
            throw new \RuntimeException('Data laporan telah dihapus, tetapi berkas PDF gagal dihapus dari penyimpanan.');
        }

        return response()->json([
            'success' => true,
            'message' => 'Data laporan berhasil dihapus'
        ]);
    }
}
