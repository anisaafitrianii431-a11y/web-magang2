<?php

namespace Tests\Feature;

use App\Models\Absensi;
use App\Models\Magang;
use App\Models\Pendaftaran;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class ApiLoginTest extends TestCase
{
    use RefreshDatabase;

    public function test_login_returns_a_sanctum_access_token(): void
    {
        User::factory()->create([
            'email' => 'admin@magang.com',
            'password' => 'password',
            'role' => 'admin',
        ]);

        $response = $this->postJson('/api/login', [
            'email' => 'admin@magang.com',
            'password' => 'password',
        ]);

        $response->assertOk()
            ->assertJsonPath('status', 'success')
            ->assertJsonPath('data.user.email', 'admin@magang.com')
            ->assertJsonStructure([
                'data' => ['access_token', 'token_type'],
            ]);

        $this->assertDatabaseCount('personal_access_tokens', 1);
    }

    public function test_participant_can_log_in_using_their_npm_and_password(): void
    {
        $magang = $this->createMagang('231013018', 'Peserta Test');
        User::factory()->create([
            'name' => 'Peserta Test',
            'email' => '231013018@peserta.magang.id',
            'password' => 'temporary-password',
            'role' => 'peserta',
            'magang_id' => $magang->id,
        ]);

        $this->postJson('/api/login', [
            'email' => '231013018',
            'password' => 'temporary-password',
        ])
            ->assertOk()
            ->assertJsonPath('status', 'success')
            ->assertJsonPath('data.user.magang.participant_code', '231013018')
            ->assertJsonStructure(['data' => ['access_token', 'token_type']]);
    }

    public function test_participant_can_log_in_using_their_email_and_regular_password_without_a_magang_link(): void
    {
        User::factory()->create([
            'email' => 'anisa@example.com',
            'password' => 'regular-password',
            'role' => 'peserta',
        ]);

        $this->postJson('/api/login', [
            'email' => 'anisa@example.com',
            'password' => 'regular-password',
        ])
            ->assertOk()
            ->assertJsonPath('status', 'success')
            ->assertJsonPath('data.user.email', 'anisa@example.com');
    }
    public function test_existing_participant_can_add_missing_nim_with_their_password(): void
    {
        $participant = User::factory()->create([
            'email' => 'participant@example.com',
            'password' => 'current-password',
            'role' => 'peserta',
            'nim' => null,
        ]);

        $this->postJson('/api/register', [
            'nama' => $participant->name,
            'nim' => '231013018',
            'email' => $participant->email,
            'password' => 'current-password',
        ])
            ->assertOk()
            ->assertJsonPath('status', 'success')
            ->assertJsonPath('data.user.nim', '231013018');

        $this->assertDatabaseHas('users', [
            'id' => $participant->id,
            'nim' => '231013018',
        ]);
        $this->assertDatabaseCount('users', 1);
    }

    public function test_existing_participant_cannot_add_nim_without_their_password(): void
    {
        $participant = User::factory()->create([
            'email' => 'participant@example.com',
            'password' => 'current-password',
            'role' => 'peserta',
            'nim' => null,
        ]);

        $this->postJson('/api/register', [
            'nama' => $participant->name,
            'nim' => '231013018',
            'email' => $participant->email,
            'password' => 'wrong-password',
        ])
            ->assertUnprocessable()
            ->assertJsonPath('message', 'Email sudah terdaftar. Silakan masuk menggunakan akun tersebut.');

        $this->assertDatabaseHas('users', [
            'id' => $participant->id,
            'nim' => null,
        ]);
    }

    public function test_unlinked_shared_participant_account_cannot_log_in(): void
    {
        User::factory()->create([
            'email' => 'peserta@absensi.com',
            'password' => 'password',
            'role' => 'peserta',
        ]);

        $this->postJson('/api/login', [
            'email' => 'peserta@absensi.com',
            'password' => 'password',
        ])
            ->assertForbidden()
            ->assertJsonPath('message', 'Akun peserta bersama tidak dapat digunakan. Silakan masuk menggunakan email dan password akun pribadi.');
    }

    public function test_participant_with_active_registration_can_check_in_without_a_magang_link(): void
    {
        $participant = User::factory()->create([
            'name' => 'Peserta Pendaftaran',
            'role' => 'peserta',
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
            ->postJson('/api/absensi/masuk', ['status' => 'Hadir'])
            ->assertCreated()
            ->assertJsonPath('data.participant_code', 'USER-'.$participant->id)
            ->assertJsonPath('data.participant_name', 'Peserta Pendaftaran')
            ->assertJsonPath('data.user_id', $participant->id);
    }

    public function test_admin_can_add_an_attendance_record(): void
    {
        $admin = User::factory()->create(['role' => 'admin']);

        $response = $this->actingAs($admin, 'sanctum')->postJson('/api/absensi', [
            'participant_code' => 'peserta@example.com',
            'participant_name' => 'Peserta Test',
            'tanggal' => '2026-10-16',
            'jam_masuk' => '08:00:00',
            'jam_pulang' => '17:00:00',
            'status' => 'Hadir',
            'keterangan' => 'Absensi manual oleh admin',
        ]);

        $response->assertCreated()
            ->assertJsonPath('message', 'Data absensi berhasil ditambahkan.')
            ->assertJsonPath('data.participant_code', 'peserta@example.com');

        $this->assertDatabaseHas('absensis', [
            'participant_code' => 'peserta@example.com',
            'participant_name' => 'Peserta Test',
            'tanggal' => '2026-10-16',
            'status' => 'Hadir',
        ]);
    }

    public function test_participant_can_only_view_their_own_attendance_history(): void
    {
        $magang = $this->createMagang('231013018', 'Peserta Test');
        $participant = User::factory()->create([
            'email' => 'participant@example.com',
            'role' => 'peserta',
            'magang_id' => $magang->id,
        ]);
        $this->createActiveRegistration($participant);

        Absensi::create([
            'participant_code' => 'USER-'.$participant->id,
            'participant_name' => $magang->participant_name,
            'user_id' => $participant->id,
            'tanggal' => '2026-10-15',
            'status' => 'Hadir',
        ]);

        Absensi::create([
            'participant_code' => 'other@example.com',
            'participant_name' => 'Peserta Lain',
            'tanggal' => '2026-10-15',
            'status' => 'Hadir',
        ]);

        $this->actingAs($participant, 'sanctum')
            ->getJson('/api/absensi-saya')
            ->assertOk()
            ->assertJsonCount(1)
            ->assertJsonPath('0.participant_code', 'USER-'.$participant->id);
    }

    public function test_participant_cannot_spoof_another_code_for_attendance_or_today_status(): void
    {
        $ownMagang = $this->createMagang('231013018', 'Peserta Test');
        $otherMagang = $this->createMagang('231013027', 'Peserta Lain');
        $participant = User::factory()->create([
            'role' => 'peserta',
            'magang_id' => $ownMagang->id,
        ]);
        $this->createActiveRegistration($participant);

        $ownAttendance = Absensi::create([
            'participant_code' => 'USER-'.$participant->id,
            'participant_name' => $ownMagang->participant_name,
            'user_id' => $participant->id,
            'tanggal' => today(),
            'status' => 'Hadir',
        ]);
        Absensi::create([
            'participant_code' => $otherMagang->participant_code,
            'participant_name' => $otherMagang->participant_name,
            'tanggal' => today(),
            'status' => 'Hadir',
        ]);

        $this->actingAs($participant, 'sanctum')
            ->getJson('/api/absensi/hari-ini?participant_code='.$otherMagang->participant_code)
            ->assertOk()
            ->assertJsonPath('participant_code', 'USER-'.$participant->id);

        $ownAttendance->delete();

        $this->travelTo(today()->setTime(8, 0));
        $this->actingAs($participant, 'sanctum')
            ->postJson('/api/absensi/masuk', [
                'participant_code' => $otherMagang->participant_code,
                'participant_name' => $otherMagang->participant_name,
            ])
            ->assertCreated()
            ->assertJsonPath('data.participant_code', 'USER-'.$participant->id)
            ->assertJsonPath('data.participant_name', $participant->name)
            ->assertJsonPath('data.user_id', $participant->id);

        $this->assertDatabaseMissing('absensis', [
            'participant_code' => $otherMagang->participant_code,
            'user_id' => $participant->id,
        ]);
    }

    public function test_participant_without_a_linked_profile_cannot_check_in_or_view_history(): void
    {
        $participant = User::factory()->create(['role' => 'peserta']);

        $this->actingAs($participant, 'sanctum')
            ->postJson('/api/absensi/masuk', ['status' => 'Hadir'])
            ->assertForbidden()
            ->assertJsonPath('message', 'Absensi hanya tersedia untuk peserta dengan pendaftaran magang aktif.');

        $this->actingAs($participant, 'sanctum')
            ->getJson('/api/absensi-saya')
            ->assertForbidden();
    }

    public function test_participant_can_check_in_starting_at_eight_am(): void
    {
        $magang = $this->createMagang('231013018', 'Peserta Test');
        $participant = User::factory()->create([
            'role' => 'peserta',
            'magang_id' => $magang->id,
        ]);
        $this->createActiveRegistration($participant);

        $this->travelTo(now()->setTime(7, 59));
        $this->actingAs($participant, 'sanctum')
            ->postJson('/api/absensi/masuk', ['status' => 'Hadir'])
            ->assertUnprocessable()
            ->assertJsonPath('message', 'Belum waktunya absen masuk. Absensi masuk hanya bisa dilakukan mulai jam 08:00.');

        $this->travelTo(now()->setTime(8, 0));
        $this->actingAs($participant, 'sanctum')
            ->postJson('/api/absensi/masuk', ['status' => 'Hadir'])
            ->assertCreated();
    }

    public function test_participant_can_check_out_starting_at_five_pm(): void
    {
        $magang = $this->createMagang('231013018', 'Peserta Test');
        $participant = User::factory()->create([
            'role' => 'peserta',
            'magang_id' => $magang->id,
        ]);
        $this->createActiveRegistration($participant);
        Absensi::create([
            'participant_code' => 'USER-'.$participant->id,
            'participant_name' => $magang->participant_name,
            'tanggal' => today(),
            'jam_masuk' => '08:00:00',
            'status' => 'Hadir',
            'user_id' => $participant->id,
            'magang_id' => $magang->id,
        ]);

        $this->travelTo(now()->setTime(16, 59));
        $this->actingAs($participant, 'sanctum')
            ->postJson('/api/absensi/pulang')
            ->assertUnprocessable()
            ->assertJsonPath('message', 'Belum waktunya pulang. Absensi pulang hanya bisa dilakukan mulai jam 17:00.');

        $this->travelTo(now()->setTime(17, 0));
        $this->actingAs($participant, 'sanctum')
            ->postJson('/api/absensi/pulang')
            ->assertOk();
    }

    public function test_admin_can_link_a_participant_account_to_one_npm(): void
    {
        $magang = $this->createMagang('231013018', 'Peserta Test');
        $participant = User::factory()->create(['role' => 'peserta']);
        $otherParticipant = User::factory()->create(['role' => 'peserta']);
        $admin = User::factory()->create(['role' => 'admin']);

        $this->actingAs($admin, 'sanctum')
            ->putJson('/api/users/'.$participant->id.'/peserta', [
                'participant_code' => $magang->participant_code,
            ])
            ->assertOk()
            ->assertJsonPath('data.magang.participant_code', $magang->participant_code);

        $this->actingAs($admin, 'sanctum')
            ->putJson('/api/users/'.$otherParticipant->id.'/peserta', [
                'participant_code' => $magang->participant_code,
            ])
            ->assertConflict()
            ->assertJsonPath('linked_account_email', $participant->email);

        $this->assertDatabaseHas('users', [
            'id' => $participant->id,
            'magang_id' => $magang->id,
        ]);

        $this->actingAs($admin, 'sanctum')
            ->putJson('/api/users/'.$otherParticipant->id.'/peserta', [
                'participant_code' => $magang->participant_code,
                'replace_existing' => true,
            ])
            ->assertOk()
            ->assertJsonPath('data.magang.participant_code', $magang->participant_code)
            ->assertJsonPath('previous_account_id', $participant->id);

        $this->assertDatabaseHas('users', [
            'id' => $participant->id,
            'magang_id' => null,
        ]);
        $this->assertDatabaseHas('users', [
            'id' => $otherParticipant->id,
            'magang_id' => $magang->id,
        ]);
    }

    public function test_participant_cannot_access_the_full_attendance_list(): void
    {
        $participant = User::factory()->create(['role' => 'peserta']);

        $this->actingAs($participant, 'sanctum')
            ->getJson('/api/absensi')
            ->assertForbidden();
    }

    public function test_attendance_lists_require_authentication(): void
    {
        $this->getJson('/api/absensi')->assertUnauthorized();
        $this->getJson('/api/absensi-saya')->assertUnauthorized();
        $this->getJson('/api/absensi/hari-ini')->assertUnauthorized();
        $this->postJson('/api/absensi/masuk', ['status' => 'Hadir'])->assertUnauthorized();
    }

    private function createMagang(string $code, string $name): Magang
    {
        return Magang::create([
            'participant_code' => $code,
            'participant_name' => $name,
            'institution' => 'Sekolah Test',
            'status' => 'Aktif',
        ]);
    }

    private function createActiveRegistration(User $user): Pendaftaran
    {
        return Pendaftaran::create([
            'user_id' => $user->id,
            'asal_instansi' => 'Sekolah Test',
            'file_surat_pengantar' => 'surat_pengantar/test.pdf',
            'status' => 'Pemagang Aktif',
            'tanggal_daftar' => today(),
            'file_surat_balasan' => 'storage/surat_balasan/test.pdf',
            'surat_balasan_diterima_at' => now(),
        ]);
    }
}
