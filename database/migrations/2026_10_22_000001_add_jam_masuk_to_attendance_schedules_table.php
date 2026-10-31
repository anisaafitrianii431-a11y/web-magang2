<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('attendance_schedules', function (Blueprint $table) {
            if (! Schema::hasColumn('attendance_schedules', 'jam_masuk')) {
                $table->time('jam_masuk')->default('08:00:00')->after('pembimbing_id');
            }
        });
    }

    public function down(): void
    {
        Schema::table('attendance_schedules', function (Blueprint $table) {
            if (Schema::hasColumn('attendance_schedules', 'jam_masuk')) {
                $table->dropColumn('jam_masuk');
            }
        });
    }
};
