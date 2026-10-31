<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use App\Models\Pendaftaran;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Storage;
use Illuminate\Validation\Rule;
use App\Services\WhatsAppService;

class PendaftaranController extends Controller
{
    // Admin views all (urutkan dari yang terbaru di paling atas)
    public function index()
    {
        $pendaftarans = Pendaftaran::with(['user', 'periode', 'pembimbing'])
            ->latest('id')
            ->get();
        return response()->json(['data' => $pendaftarans]);
    }

    // User views own registration
    public function myRegistration()
    {
        $user = Auth::user();
        $pendaftaran = Pendaftaran::with(['user', 'periode', 'pembimbing'])->where('user_id', $user->id)->first();
        return response()->json(['data' => $pendaftaran]);
    }

    public function downloadReplyLetter()
    {
        $pendaftaran = Pendaftaran::query()
            ->where('user_id', Auth::id())
            ->where('status', 'Pemagang Aktif')
            ->latest('id')
            ->first();

        if (! $pendaftaran || ! $pendaftaran->file_surat_balasan) {
            return response()->json(['message' => 'Surat balasan belum tersedia.'], 404);
        }

        $storedPath = $pendaftaran->file_surat_balasan;
        if (! str_starts_with($storedPath, 'storage/surat_balasan/')) {
            return response()->json(['message' => 'Lokasi surat balasan tidak valid.'], 404);
        }

        $relativePath = 'surat_balasan/' . basename($storedPath);
        $disk = Storage::disk('public');
        if (! $disk->exists($relativePath)) {
            $disk = Storage::disk('local');
            $relativePath = 'public/' . $relativePath;
            if (! $disk->exists($relativePath)) {
                return response()->json(['message' => 'Berkas surat balasan tidak ditemukan.'], 404);
            }
        }

        $pendaftaran->surat_balasan_diterima_at = now();
        $pendaftaran->save();

        return $disk->download($relativePath, basename($relativePath));
    }

    // Pemagang submit registration
    public function store(Request $request)
    {
        $request->validate([
            'periode_id' => 'required|exists:periode_magangs,id',
            'nim' => 'nullable|string|max:50',
            'asal_instansi' => 'required|string|max:150',
            'no_hp' => 'required|string|max:20',
            'program_studi' => 'required|string|max:150',
            'alamat' => 'required|string|max:1000',
            'pas_foto' => 'required|image|mimes:jpg,jpeg,png|max:2048',
            'file_surat_pengantar' => 'required|file|mimes:pdf|max:2048',
        ]);

        $user = Auth::user();

        // Check if already registered
        $existing = Pendaftaran::where('user_id', $user->id)->first();
        if ($existing) {
            return response()->json(['message' => 'Anda sudah mendaftar magang'], 400);
        }

        $photoPath = $request->file('pas_foto')->store('pas_foto', 'public');

        $userUpdate = [
            'no_hp' => $request->input('no_hp'),
            'program_studi' => $request->input('program_studi'),
            'alamat' => $request->input('alamat'),
            'foto' => $photoPath,
        ];
        if (! empty($request->input('nim'))) {
            $userUpdate['nim'] = trim($request->input('nim'));
        }
        $user->update($userUpdate);

        // Handle file upload
        $file = $request->file('file_surat_pengantar');
        $filename = time() . '_' . $file->getClientOriginalName();
        $path = $file->storeAs('public/surat_pengantar', $filename);

        $pendaftaran = Pendaftaran::create([
            'user_id' => $user->id,
            'periode_id' => $request->periode_id,
            'asal_instansi' => $request->asal_instansi,
            'file_surat_pengantar' => 'storage/surat_pengantar/' . $filename,
            'tanggal_daftar' => now(),
            'status' => 'Calon Pemagang',
        ]);
        $pendaftaran->load(['user', 'periode', 'pembimbing']);

        $namaPeserta = $user->name ?? $user->nama ?? 'Peserta';
        $waNotification = WhatsAppService::sendRegistrationNotification(
            (string) $request->input('no_hp'),
            $namaPeserta
        );

        return response()->json([
            'data' => $pendaftaran,
            'message' => 'Pendaftaran magang berhasil dikirim!',
            'whatsapp_notification' => $waNotification,
        ]);
    }

    // Admin updates status
    public function update(Request $request, $id)
    {
        $request->validate([
            'status' => 'required|string|in:Calon Pemagang,Pemagang Aktif,Ditolak,Alumni',
            'pembimbing_id' => [
                'nullable',
                Rule::exists('users', 'id')->where(fn ($query) => $query->where('role', 'pembimbing')),
            ],
            'tanggal_selesai' => 'nullable|date',
            'file_surat_balasan' => 'nullable|file|mimes:pdf|max:2048',
        ]);

        $pendaftaran = Pendaftaran::findOrFail($id);
        $pendaftaran->status = $request->status;
        $pendaftaran->pembimbing_id = $request->pembimbing_id;
        $pendaftaran->tanggal_selesai = $request->tanggal_selesai;

        if ($request->hasFile('file_surat_balasan')) {
            $file = $request->file('file_surat_balasan');
            $filename = time() . '_' . $file->getClientOriginalName();
            $file->storeAs('surat_balasan', $filename, 'public');
            $pendaftaran->file_surat_balasan = 'storage/surat_balasan/' . $filename;
            $pendaftaran->surat_balasan_diterima_at = null;
        }

        $pendaftaran->save();

        return response()->json(['data' => $pendaftaran, 'message' => 'Status pendaftaran berhasil diupdate']);
    }

    // Pemagang membatalkan pendaftaran
    public function cancelRegistration()
    {
        $user = Auth::user();

        $pendaftaran = Pendaftaran::where('user_id', $user->id)->first();

        if (!$pendaftaran) {
            return response()->json(['message' => 'Data pendaftaran tidak ditemukan'], 404);
        }

        if ($pendaftaran->status != 'Calon Pemagang') {
            return response()->json(['message' => 'Tidak dapat membatalkan pendaftaran pada tahap ini'], 400);
        }

        $pendaftaran->status = 'Dibatalkan';
        $pendaftaran->save();

        return response()->json([
            'data' => $pendaftaran,
            'message' => 'Pengajuan magang berhasil dibatalkan'
        ]);
    }
}
