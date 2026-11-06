<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    public function up(): void
    {
        DB::table('absensis')
            ->where('status', 'Alpa')
            ->where(function ($query): void {
                $query->where('keterangan', 'like', 'Tidak melakukan absensi masuk hingga pukul %')
                    ->orWhere('keterangan', 'Tidak hadir dan tidak ada keterangan seharian.');
            })
            ->update(['status' => 'Tidak Hadir']);
    }

    public function down(): void
    {
        DB::table('absensis')
            ->where('status', 'Tidak Hadir')
            ->where(function ($query): void {
                $query->where('keterangan', 'like', 'Tidak melakukan absensi masuk hingga pukul %')
                    ->orWhere('keterangan', 'Tidak hadir dan tidak ada keterangan seharian.');
            })
            ->update(['status' => 'Alpa']);
    }
};
