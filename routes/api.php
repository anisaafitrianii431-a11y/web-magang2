<?php

use App\Http\Controllers\AbsensiController;
use App\Http\Controllers\Api\AktivitasController as ApiAktivitasController;
use App\Http\Controllers\Api\AuthController as ApiAuthController;
use App\Http\Controllers\Api\BerandaController as ApiBerandaController;
use App\Http\Controllers\Api\LaporanMagangController;
use App\Http\Controllers\Api\LokasiAbsensiController;
use App\Http\Controllers\Api\ParticipantAccountController;
use App\Http\Controllers\Api\PendaftaranController;
use App\Http\Controllers\Api\PenilaianController;
use App\Http\Controllers\Api\PeriodeController;
use App\Http\Controllers\Api\TugasController;
use App\Http\Controllers\MagangController;
use App\Http\Controllers\PembimbingController;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Route;
use App\Http\Controllers\Api\RekapitulasiController;

Route::get('/', function () {
    return response()->json([
        'status' => 'online',
        'message' => 'Backend REST API Portal Magang is running',
        'version' => '1.0.0',
    ]);
});

Route::post('/register', [ApiAuthController::class, 'register']);
Route::post('/login', [ApiAuthController::class, 'login']);

Route::get('/beranda', [ApiBerandaController::class, 'index']);
Route::get('/beranda/profil', [ApiBerandaController::class, 'getProfil']);
Route::get('/beranda/alumni', [ApiBerandaController::class, 'getAlumni']);
Route::get('/komentar', [ApiBerandaController::class, 'getKomentar']);
Route::post('/komentar', [ApiBerandaController::class, 'storeKomentar']);

Route::get('/aktivitas', [ApiAktivitasController::class, 'index']);
Route::get('/aktivitas/{id}', [ApiAktivitasController::class, 'show']);
Route::post('/aktivitas/{id}/komentar', [ApiAktivitasController::class, 'storeKomentar'])->middleware('auth:sanctum');
Route::post('/aktivitas', [ApiAktivitasController::class, 'store'])->middleware('auth:sanctum');

Route::get('/test', function () {
    return response()->json(['message' => 'Halo dari Laravel API!']);
});

Route::middleware('auth:sanctum')->group(function () {
    Route::post('/logout', [ApiAuthController::class, 'logout']);
    Route::get('/me', [ApiAuthController::class, 'me']);
    Route::get('/user', function (Request $request) {
        return $request->user();
    });

    Route::middleware('role:admin')->group(function () {
        Route::get('/admin/pembimbing', [ApiAuthController::class, 'getPembimbing']);
        Route::post('/admin/pembimbing', [ApiAuthController::class, 'createPembimbing']);
        Route::get('/users/peserta', [ParticipantAccountController::class, 'index']);
        Route::put('/users/{user}/peserta', [ParticipantAccountController::class, 'update']);

        Route::get('/admin/lokasi', [LokasiAbsensiController::class, 'index']);
        Route::post('/admin/lokasi', [LokasiAbsensiController::class, 'store']);
        Route::get('/admin/lokasi/{id}', [LokasiAbsensiController::class, 'show']);
        Route::put('/admin/lokasi/{id}', [LokasiAbsensiController::class, 'update']);
        Route::delete('/admin/lokasi/{id}', [LokasiAbsensiController::class, 'destroy']);
        Route::patch('/admin/lokasi/{id}/toggle', [LokasiAbsensiController::class, 'toggleActive']);
        Route::get('/admin/pengaturan-absensi', [LokasiAbsensiController::class, 'getSettings']);
        Route::post('/admin/pengaturan-absensi', [LokasiAbsensiController::class, 'updateSettings']);
    });

    Route::get('/lokasi-absensi', [LokasiAbsensiController::class, 'index']);
    Route::get('/pengaturan-absensi', [LokasiAbsensiController::class, 'getSettings']);

    Route::get('/periode', [PeriodeController::class, 'index']);
    Route::middleware('role:admin')->group(function () {
        Route::post('/periode', [PeriodeController::class, 'store']);
        Route::put('/periode/{id}', [PeriodeController::class, 'update']);
        Route::delete('/periode/{id}', [PeriodeController::class, 'destroy']);
    });

    Route::middleware('role:admin,pembimbing')->group(function () {
        Route::get('/pendaftaran', [PendaftaranController::class, 'index']);
    });
    Route::middleware('role:admin')->group(function () {
        Route::post('/pendaftaran/{id}/status', [PendaftaranController::class, 'update']);
    });
    Route::middleware('role:peserta')->group(function () {
        Route::get('/pendaftaran/me', [PendaftaranController::class, 'myRegistration']);
        Route::get('/pendaftaran/me/surat-balasan/download', [PendaftaranController::class, 'downloadReplyLetter']);
        Route::post('/pendaftaran', [PendaftaranController::class, 'store']);
        Route::put('/pendaftaran/cancel', [PendaftaranController::class, 'cancelRegistration']);
    });

    // Pembimbing hanya membaca dan mengubah absensi peserta aktif yang ditugaskan.
    // Identitas peserta pada alur baru ditautkan ke akun melalui USER-{id}.
    Route::middleware('role:admin,pembimbing')->group(function () {
        Route::get('/absensi', [AbsensiController::class, 'index']);
        Route::put('/absensi/{id}', [AbsensiController::class, 'update']);
        Route::post('/absensi/{id}/review-izin', [AbsensiController::class, 'reviewLeave']);
    });

    Route::middleware(['role:admin,pembimbing,peserta', 'active.internship'])->group(function () {
        Route::get('/magang', [MagangController::class, 'index']);
    });
    Route::middleware(['role:admin,pembimbing,peserta', 'active.internship', 'reply.letter.received'])->group(function () {
        Route::get('/absensi/hari-ini', [AbsensiController::class, 'today']);
    });
    Route::middleware(['role:peserta', 'active.internship', 'reply.letter.received'])->group(function () {
        Route::post('/absensi/masuk', [AbsensiController::class, 'checkIn']);
        Route::post('/absensi/pulang', [AbsensiController::class, 'checkOut']);
        Route::get('/absensi-saya', [AbsensiController::class, 'myAttendance']);
    });

    Route::middleware('role:admin')->group(function () {
        Route::post('/magang', [MagangController::class, 'store']);
        Route::apiResource('/pembimbing', PembimbingController::class);
        Route::post('/absensi', [AbsensiController::class, 'store']);
        Route::delete('/absensi/{id}', [AbsensiController::class, 'destroy']);
    });
});

Route::prefix('v1')->middleware('auth:sanctum')->group(function () {
    Route::middleware('role:admin,pembimbing,peserta')->group(function () {
        Route::get('/laporan-magang', [LaporanMagangController::class, 'index']);
        Route::get('/laporan-magang/{id}', [LaporanMagangController::class, 'show']);
        Route::get('/laporan-magang/{id}/download', [LaporanMagangController::class, 'download']);
    });

    Route::middleware('role:peserta')->group(function () {
        Route::post('/laporan-magang', [LaporanMagangController::class, 'store']);
        Route::post('/laporan-magang/{id}/revisi', [LaporanMagangController::class, 'uploadRevisi']);
    });

    Route::middleware('role:admin,pembimbing')->group(function () {
        Route::post('/laporan-magang/{id}/review', [LaporanMagangController::class, 'review']);
        Route::delete('/laporan-magang/{id}', [LaporanMagangController::class, 'destroy']);
        Route::get('/penilaian', [PenilaianController::class, 'index']);
        Route::get('/penilaian/peserta', [PenilaianController::class, 'participants']);
        Route::post('/penilaian', [PenilaianController::class, 'store']);
        Route::post('/penilaian/peserta/{userId}/pdf', [PenilaianController::class, 'uploadFinalAssessmentPdf']);
        Route::get('/penilaian/peserta/{userId}/pdf', [PenilaianController::class, 'downloadFinalAssessmentPdf']);
        Route::get('/rekapitulasi', [RekapitulasiController::class, 'index']);
    });
});

Route::middleware('auth:sanctum')->group(function () {
    Route::middleware('role:admin,pembimbing,peserta')->group(function () {
        Route::get('/tugas', [TugasController::class, 'index']);
        Route::get('/tugas/{id}', [TugasController::class, 'show']);
    });

    Route::middleware('role:admin,pembimbing')->group(function () {
        Route::post('/tugas', [TugasController::class, 'store']);
        Route::put('/tugas/{id}', [TugasController::class, 'update']);
        Route::delete('/tugas/{id}', [TugasController::class, 'destroy']);
        Route::get('/tugas/{id}/submisi', [TugasController::class, 'daftarSubmisi']);
        Route::get('/submisi', [TugasController::class, 'semuaSubmisi']);
        Route::get('/submisi/{submisiId}/download', [TugasController::class, 'download']);
        Route::put('/submisi/{submisiId}/nilai', [TugasController::class, 'beriNilai']);
        Route::post('/submisi/{submisiId}/nilai', [TugasController::class, 'beriNilai']);
        Route::post('/submisi/{submisiId}/penilaian', [TugasController::class, 'beriNilai']);
    });

    Route::middleware(['role:peserta', 'active.internship'])->group(function () {
        Route::post('/tugas/{id}/submit', [TugasController::class, 'submit']);
        Route::post('/tugas/{id}/submisi', [TugasController::class, 'submit']);
        Route::get('/submisi-saya', [TugasController::class, 'submisiSaya']);
    });
});
