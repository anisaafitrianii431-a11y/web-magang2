<?php

namespace Tests\Feature;

use App\Models\Absensi;
use App\Models\AttendanceSchedule;
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
        $this->travelTo(now()->setTime(8, 30));

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
            'status' => 'Tidak Hadir',
            'keterangan' => 'Tidak melakukan absensi masuk hingga pukul 08:15.',
        ]);
        $this->assertDatabaseHas('absensis', [
            'participant_code' => 'TEST-001',
            'user_id' => $legacyParticipant->id,
            'status' => 'Tidak Hadir',
        ]);
        $this->assertDatabaseHas('absensis', [
            'participant_code' => 'TEST-PRESENT',
            'status' => 'Hadir',
        ]);
        $this->assertDatabaseCount('absensis', 3);
    }

    public function test_it_does_not_mark_participants_absent_before_their_checkin_window_ends(): void
    {
        $this->travelTo(now()->setTime(8, 14));

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

        $this->travelTo(now()->setTime(8, 0));
        $this->actingAs($participant, 'sanctum')
            ->postJson('/api/absensi/masuk', ['status' => 'Alpa'])
            ->assertUnprocessable()
            ->assertJsonValidationErrors('status');
    }

    public function test_participant_without_attendance_is_automatically_marked_not_present_after_checkin_window(): void
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

        // Before the 15-minute window ends, the participant is not yet marked absent.
        $this->travelTo(now()->setTime(8, 14));
        $this->actingAs($participant, 'sanctum')
            ->getJson('/api/absensi/hari-ini')
            ->assertOk();
        $this->assertDatabaseMissing('absensis', [
            'participant_code' => 'USER-'.$participant->id,
            'status' => 'Tidak Hadir',
        ]);

        // Once the default 08:15 deadline passes, the participant is marked not present.
        $this->travelTo(now()->setTime(8, 15));
        $response = $this->actingAs($participant, 'sanctum')
            ->getJson('/api/absensi/hari-ini')
            ->assertOk()
            ->assertJsonPath('status', 'Tidak Hadir')
            ->assertJsonPath('keterangan', 'Tidak melakukan absensi masuk hingga pukul 08:15.');

        $this->assertDatabaseHas('absensis', [
            'participant_code' => 'USER-'.$participant->id,
            'status' => 'Tidak Hadir',
            'keterangan' => 'Tidak melakukan absensi masuk hingga pukul 08:15.',
        ]);
    }

    public function test_check_in_after_default_fifteen_minute_window_automatically_marks_participant_absent(): void
    {
        $participant = User::factory()->create(['role' => 'peserta']);
        Pendaftaran::create([
            'user_id' => $participant->id,
            'asal_instansi' => 'Sekolah Test',
            'file_surat_pengantar' => 'surat_pengantar/test.pdf',
            'status' => 'Pemagang Aktif',
            'tanggal_daftar' => today(),
            'file_surat_balasan' => 'storage/surat_balasan/test.pdf',
            'surat_balasan_diterima_at' => now(),
        ]);

        $this->travelTo(now()->setTime(8, 31));
        $this->actingAs($participant, 'sanctum')
            ->postJson('/api/absensi/masuk', ['status' => 'Hadir'])
            ->assertUnprocessable()
            ->assertJsonPath('data.status', 'Tidak Hadir')
            ->assertJsonPath('data.keterangan', 'Tidak melakukan absensi masuk hingga pukul 08:15.');

        $this->assertDatabaseHas('absensis', [
            'user_id' => $participant->id,
            'status' => 'Tidak Hadir',
            'keterangan' => 'Tidak melakukan absensi masuk hingga pukul 08:15.',
        ]);
    }

    public function test_absence_command_uses_the_supervisors_checkin_time_plus_fifteen_minutes(): void
    {
        $supervisor = User::factory()->create(['role' => 'pembimbing']);
        AttendanceSchedule::create([
            'pembimbing_id' => $supervisor->id,
            'jam_masuk' => '09:00',
            'jam_pulang' => '17:00',
        ]);
        $participant = User::factory()->create(['role' => 'peserta']);
        Pendaftaran::create([
            'user_id' => $participant->id,
            'pembimbing_id' => $supervisor->id,
            'asal_instansi' => 'Sekolah Test',
            'file_surat_pengantar' => 'surat_pengantar/test.pdf',
            'status' => 'Pemagang Aktif',
            'tanggal_daftar' => today(),
            'file_surat_balasan' => 'storage/surat_balasan/test.pdf',
            'surat_balasan_diterima_at' => now(),
        ]);

        $this->travelTo(now()->setTime(9, 14));
        $this->artisan('attendance:mark-absent')->assertSuccessful();
        $this->assertDatabaseMissing('absensis', [
            'participant_code' => 'USER-'.$participant->id,
            'status' => 'Tidak Hadir',
        ]);

        $this->travelTo(now()->setTime(9, 15));
        $this->artisan('attendance:mark-absent')->assertSuccessful();
        $this->assertDatabaseHas('absensis', [
            'participant_code' => 'USER-'.$participant->id,
            'status' => 'Tidak Hadir',
            'keterangan' => 'Tidak melakukan absensi masuk hingga pukul 09:15.',
        ]);
    }

    public function test_checkin_after_supervisors_fifteen_minute_window_is_marked_absent(): void
    {
        $supervisor = User::factory()->create(['role' => 'pembimbing']);
        AttendanceSchedule::create([
            'pembimbing_id' => $supervisor->id,
            'jam_masuk' => '09:00',
            'jam_pulang' => '17:00',
        ]);
        $participant = User::factory()->create(['role' => 'peserta']);
        Pendaftaran::create([
            'user_id' => $participant->id,
            'pembimbing_id' => $supervisor->id,
            'asal_instansi' => 'Sekolah Test',
            'file_surat_pengantar' => 'surat_pengantar/test.pdf',
            'status' => 'Pemagang Aktif',
            'tanggal_daftar' => today(),
            'file_surat_balasan' => 'storage/surat_balasan/test.pdf',
            'surat_balasan_diterima_at' => now(),
        ]);

        $this->travelTo(now()->setTime(9, 15));
        $this->actingAs($participant, 'sanctum')
            ->postJson('/api/absensi/masuk', ['status' => 'Hadir'])
            ->assertUnprocessable()
            ->assertJsonPath('data.keterangan', 'Tidak melakukan absensi masuk hingga pukul 09:15.');
    }

    public function test_participant_missed_past_day_is_automatically_marked_not_present_in_history(): void
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

        // Hari Senin dan Selasa otomatis tercatat sebagai Tidak Hadir
        $this->assertDatabaseHas('absensis', [
            'user_id' => $participant->id,
            'tanggal' => today()->subDays(2)->format('Y-m-d 00:00:00'),
            'status' => 'Tidak Hadir',
        ]);
        $this->assertDatabaseHas('absensis', [
            'user_id' => $participant->id,
            'tanggal' => today()->subDays(1)->format('Y-m-d 00:00:00'),
            'status' => 'Tidak Hadir',
        ]);
    }
}
