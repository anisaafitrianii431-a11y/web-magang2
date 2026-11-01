<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('master_penilaian', function (Blueprint $table) {
            $table->id();
            $table->string('kode', 100)->nullable()->index();
            $table->string('pertanyaan', 500);
            $table->decimal('bobot', 5, 2);
            $table->unsignedInteger('urutan')->default(1);
            $table->boolean('aktif')->default(true);
            $table->timestamps();
        });

        $now = now();
        DB::table('master_penilaian')->insert([
            ['kode' => 'ketertiban_awal', 'pertanyaan' => 'Ketertiban proses magang pada awal kegiatan', 'bobot' => 10, 'urutan' => 1, 'aktif' => true, 'created_at' => $now, 'updated_at' => $now],
            ['kode' => 'kelengkapan_laporan', 'pertanyaan' => 'Kelengkapan sistematika laporan', 'bobot' => 50, 'urutan' => 2, 'aktif' => true, 'created_at' => $now, 'updated_at' => $now],
            ['kode' => 'kerapian_dokumentasi', 'pertanyaan' => 'Kerapian catatan dokumentasi kegiatan magang', 'bobot' => 20, 'urutan' => 3, 'aktif' => true, 'created_at' => $now, 'updated_at' => $now],
            ['kode' => 'analisis_penugasan', 'pertanyaan' => 'Analisis hasil penugasan', 'bobot' => 10, 'urutan' => 4, 'aktif' => true, 'created_at' => $now, 'updated_at' => $now],
            ['kode' => 'ketertiban_akhir', 'pertanyaan' => 'Ketertiban proses magang pada akhir kegiatan', 'bobot' => 10, 'urutan' => 5, 'aktif' => true, 'created_at' => $now, 'updated_at' => $now],
        ]);
    }

    public function down(): void
    {
        Schema::dropIfExists('master_penilaian');
    }
};
