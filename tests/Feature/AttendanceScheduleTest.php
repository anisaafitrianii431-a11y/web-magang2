<?php

namespace Tests\Feature;

use App\Models\Absensi;
use App\Models\AttendanceSchedule;
use App\Models\Magang;
use App\Models\Pendaftaran;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class AttendanceScheduleTest extends TestCase
{
    use RefreshDatabase;

    public function test_supervisor_can_update_the_checkout_time_for_their_participants(): void
    {
        $supervisor = User::factory()->create(['role' => 'pembimbing']);
        $otherSupervisor = User::factory()->create(['role' => 'pembimbing']);

        $this->actingAs($supervisor, 'sanctum')
            ->getJson('/api/pembimbing/jadwal-absensi')
            ->assertOk()
            ->assertJsonPath('data.jam_pulang', '17:00');

        $this->actingAs($supervisor, 'sanctum')
            ->putJson('/api/pembimbing/jadwal-absensi', ['jam_pulang' => '16:30'])
            ->assertOk()
            ->assertJsonPath('data.jam_pulang', '16:30');

        $this->actingAs($otherSupervisor, 'sanctum')
            ->getJson('/api/pembimbing/jadwal-absensi')
            ->assertOk()
            ->assertJsonPath('data.jam_pulang', '17:00');
    }

    public function test_participant_checkout_uses_the_assigned_supervisors_schedule(): void
    {
        $supervisor = User::factory()->create(['role' => 'pembimbing']);
        AttendanceSchedule::create([
            'pembimbing_id' => $supervisor->id,
            'jam_pulang' => '16:30',
        ]);

        $magang = Magang::create([
            'participant_code' => 'TEST-CHECKOUT',
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
            'pembimbing_id' => $supervisor->id,
            'asal_instansi' => 'Kampus Test',
            'file_surat_pengantar' => 'surat_pengantar/test.pdf',
            'status' => 'Pemagang Aktif',
            'tanggal_daftar' => today(),
            'file_surat_balasan' => 'storage/surat_balasan/test.pdf',
            'surat_balasan_diterima_at' => now(),
        ]);
        $this->actingAs($participant, 'sanctum')
            ->getJson('/api/absensi/jadwal')
            ->assertOk()
            ->assertJsonPath('data.jam_pulang', '16:30');

        Absensi::create([
            'user_id' => $participant->id,
            'magang_id' => $magang->id,
            'participant_code' => 'USER-'.$participant->id,
            'participant_name' => $participant->name,
            'tanggal' => today(),
            'jam_masuk' => '08:00:00',
            'status' => 'Hadir',
        ]);

        $this->travelTo(now()->setTime(16, 29));
        $this->actingAs($participant, 'sanctum')
            ->postJson('/api/absensi/pulang')
            ->assertUnprocessable()
            ->assertJsonPath('message', 'Belum waktunya pulang. Absensi pulang hanya bisa dilakukan mulai jam 16:30.');

        $this->travelTo(now()->setTime(16, 30));
        $this->actingAs($participant, 'sanctum')
            ->postJson('/api/absensi/pulang')
            ->assertOk();
    }
}
