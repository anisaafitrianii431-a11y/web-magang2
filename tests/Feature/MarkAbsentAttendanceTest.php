<?php

namespace Tests\Feature;

use App\Models\Absensi;
use App\Models\Magang;
use App\Models\Pendaftaran;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class MarkAbsentAttendanceTest extends TestCase
{
    use RefreshDatabase;

    public function test_it_marks_active_participants_without_attendance_as_absent_and_preserves_existing_records(): void
    {
        $this->travelTo(now()->setTime(8, 0));

        $registeredParticipant = User::factory()->create(['role' => 'peserta']);
        Pendaftaran::create([
            'user_id' => $registeredParticipant->id,
            'asal_instansi' => 'Sekolah Test',
            'file_surat_pengantar' => 'surat_pengantar/test.pdf',
            'status' => 'Pemagang Aktif',
            'tanggal_daftar' => today(),
            'file_surat_balasan' => 'storage/surat_balasan/test.pdf',
            'surat_balasan_diterima_at' => now(),
        ]);

        $magang = Magang::create([
            'participant_code' => 'TEST-001',
            'participant_name' => 'Peserta Magang',
            'institution' => 'Kampus Test',
            'status' => 'Aktif',
        ]);
        $legacyParticipant = User::factory()->create([
            'role' => 'peserta',
            'magang_id' => $magang->id,
        ]);

        $presentMagang = Magang::create([
            'participant_code' => 'TEST-PRESENT',
            'participant_name' => 'Peserta Hadir',
            'institution' => 'Kampus Test',
            'status' => 'Aktif',
        ]);
        $presentParticipant = User::factory()->create([
            'role' => 'peserta',
            'magang_id' => $presentMagang->id,
        ]);
        Absensi::create([
            'user_id' => $presentParticipant->id,
            'magang_id' => $presentMagang->id,
            'participant_code' => 'TEST-PRESENT',
            'participant_name' => $presentParticipant->name,
            'tanggal' => today(),
            'status' => 'Hadir',
            'jam_masuk' => '08:00:00',
        ]);

        $this->artisan('attendance:mark-absent')->assertSuccessful();
        $this->artisan('attendance:mark-absent')->assertSuccessful();

        $this->assertDatabaseHas('absensis', [
            'participant_code' => 'USER-'.$registeredParticipant->id,
            'status' => 'Alpa',
            'keterangan' => 'Tidak melakukan absensi masuk hingga pukul 08.00.',
        ]);
        $this->assertDatabaseHas('absensis', [
            'participant_code' => 'TEST-001',
            'user_id' => $legacyParticipant->id,
            'status' => 'Alpa',
        ]);
        $this->assertDatabaseHas('absensis', [
            'participant_code' => 'TEST-PRESENT',
            'status' => 'Hadir',
        ]);
        $this->assertDatabaseCount('absensis', 3);
    }

    public function test_it_does_not_mark_participants_absent_before_eight(): void
    {
        $this->travelTo(now()->setTime(7, 59));

        $magang = Magang::create([
            'participant_code' => 'TEST-EARLY',
            'participant_name' => 'Peserta Test',
            'institution' => 'Kampus Test',
            'status' => 'Aktif',
        ]);
        User::factory()->create([
            'role' => 'peserta',
            'magang_id' => $magang->id,
        ]);

        $this->artisan('attendance:mark-absent')->assertSuccessful();

        $this->assertDatabaseCount('absensis', 0);
    }

    public function test_participant_cannot_submit_alpa_as_a_check_in_status(): void
    {
        $magang = Magang::create([
            'participant_code' => 'TEST-SELF-ALPA',
            'participant_name' => 'Peserta Test',
            'institution' => 'Kampus Test',
            'status' => 'Aktif',
        ]);
        $participant = User::factory()->create([
            'role' => 'peserta',
            'magang_id' => $magang->id,
        ]);
        Pendaftaran::create([
            'user_id' => $participant->id,
            'asal_instansi' => 'Sekolah Test',
            'file_surat_pengantar' => 'surat_pengantar/test.pdf',
            'status' => 'Pemagang Aktif',
            'tanggal_daftar' => today(),
            'file_surat_balasan' => 'storage/surat_balasan/test.pdf',
            'surat_balasan_diterima_at' => now(),
        ]);

        $this->actingAs($participant, 'sanctum')
            ->postJson('/api/absensi/masuk', ['status' => 'Alpa'])
            ->assertUnprocessable()
            ->assertJsonValidationErrors('status');
    }

    public function test_participant_without_attendance_is_automatically_marked_as_alpa_when_day_ends(): void
    {
        $magang = Magang::create([
            'participant_code' => 'TEST-AUTO-ALPA',
            'participant_name' => 'Peserta Alpa Otomatis',
            'institution' => 'Kampus Test',
            'status' => 'Aktif',
        ]);
        $participant = User::factory()->create([
            'role' => 'peserta',
            'magang_id' => $magang->id,
        ]);
        Pendaftaran::create([
            'user_id' => $participant->id,
            'asal_instansi' => 'Sekolah Test',
            'file_surat_pengantar' => 'surat_pengantar/test.pdf',
            'status' => 'Pemagang Aktif',
            'tanggal_daftar' => today(),
            'file_surat_balasan' => 'storage/surat_balasan/test.pdf',
            'surat_balasan_diterima_at' => now(),
        ]);

        // Saat siang hari sebelum jam pulang (misal 14:00), belum ada record dan belum otomatis alpa
        $this->travelTo(now()->setTime(14, 0));
        $this->actingAs($participant, 'sanctum')
            ->getJson('/api/absensi/hari-ini')
            ->assertOk();
        $this->assertDatabaseMissing('absensis', [
            'participant_code' => 'USER-'.$participant->id,
            'status' => 'Alpa',
        ]);

        // Setelah melewati jam pulang (misal 17:05), otomatis tercatat sebagai Alpa
        $this->travelTo(now()->setTime(17, 5));
        $response = $this->actingAs($participant, 'sanctum')
            ->getJson('/api/absensi/hari-ini')
            ->assertOk()
            ->assertJsonPath('status', 'Alpa')
            ->assertJsonPath('keterangan', 'Tidak hadir dan tidak ada keterangan seharian.');

        $this->assertDatabaseHas('absensis', [
            'participant_code' => 'USER-'.$participant->id,
            'status' => 'Alpa',
            'keterangan' => 'Tidak hadir dan tidak ada keterangan seharian.',
        ]);
    }

    public function test_participant_missed_past_day_is_automatically_marked_as_alpa_in_history(): void
    {
        // Misalkan tanggal pendaftaran dimulai 2 hari lalu pada hari kerja
        $this->travelTo(now()->startOfWeek()->addDays(2)->setTime(9, 0)); // Hari Rabu

        $participant = User::factory()->create(['role' => 'peserta']);
        Pendaftaran::create([
            'user_id' => $participant->id,
            'asal_instansi' => 'Sekolah Test',
            'file_surat_pengantar' => 'surat_pengantar/test.pdf',
            'status' => 'Pemagang Aktif',
            'tanggal_daftar' => today()->subDays(2), // Hari Senin
            'file_surat_balasan' => 'storage/surat_balasan/test.pdf',
            'surat_balasan_diterima_at' => now()->subDays(2),
        ]);

        // Peserta membuka riwayat absensi
        $response = $this->actingAs($participant, 'sanctum')
            ->getJson('/api/absensi-saya')
            ->assertOk();

        // Hari Senin dan Selasa otomatis tercatat sebagai Alpa
        $this->assertDatabaseHas('absensis', [
            'user_id' => $participant->id,
            'tanggal' => today()->subDays(2)->format('Y-m-d 00:00:00'),
            'status' => 'Alpa',
        ]);
        $this->assertDatabaseHas('absensis', [
            'user_id' => $participant->id,
            'tanggal' => today()->subDays(1)->format('Y-m-d 00:00:00'),
            'status' => 'Alpa',
        ]);
    }
}
