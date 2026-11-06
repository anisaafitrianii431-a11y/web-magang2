<?php

namespace App\Console\Commands;

use App\Models\Absensi;
use App\Models\AttendanceSchedule;
use App\Models\Pembimbing;
use App\Models\User;
use Illuminate\Console\Command;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Relations\Relation;

class MarkAbsentAttendance extends Command
{
    protected $signature = 'attendance:mark-absent';

    protected $description = 'Mark active participants without attendance as absent';

    public function handle(): int
    {
        $users = User::query()
            ->whereIn('role', ['peserta', 'pemagang', 'user', 'calon pemagang'])
            ->where(function (Builder $query): void {
                $query->whereHas('pendaftarans', fn (Builder $registration) => $registration->where('status', 'Pemagang Aktif'))
                    ->orWhereHas('magang', fn (Builder $magang) => $magang->where('status', 'Aktif'));
            })
            ->with([
                'magang',
                'pendaftarans' => fn (Relation $registration) => $registration
                    ->where('status', 'Pemagang Aktif')
                    ->latest('id'),
            ])
            ->get();

        $created = 0;

        foreach ($users as $user) {
            $registration = $user->pendaftarans->first();
            $magang = $user->magang;

            if ($registration) {
                $participant = [
                    'participant_code' => 'USER-'.$user->id,
                    'participant_name' => $user->name,
                    'institution' => $registration->asal_instansi,
                    'magang_id' => $magang?->id,
                    'pembimbing_id' => null,
                    'schedule_pembimbing_id' => $registration->pembimbing_id,
                ];
            } elseif ($magang?->status === 'Aktif') {
                $legacyPembimbingId = $magang->pembimbing_id ?? $user->pembimbing_id;
                $pembimbingEmail = $legacyPembimbingId
                    ? Pembimbing::find($legacyPembimbingId)?->email
                    : null;
                $participant = [
                    'participant_code' => $magang->participant_code,
                    'participant_name' => $magang->participant_name,
                    'institution' => $magang->institution,
                    'magang_id' => $magang->id,
                    'pembimbing_id' => $legacyPembimbingId,
                    'schedule_pembimbing_id' => $pembimbingEmail
                        ? User::where('email', $pembimbingEmail)->where('role', 'pembimbing')->value('id')
                        : null,
                ];
            } else {
                continue;
            }

            $jamMasuk = $participant['schedule_pembimbing_id']
                ? AttendanceSchedule::where('pembimbing_id', $participant['schedule_pembimbing_id'])->value('jam_masuk')
                : null;
            $checkInDeadline = AttendanceSchedule::checkInDeadline($jamMasuk);
            if (now()->lt($checkInDeadline)) {
                continue;
            }

            $attendance = Absensi::firstOrCreate(
                [
                    'participant_code' => $participant['participant_code'],
                    'tanggal' => today(),
                ],
                [
                    'user_id' => $user->id,
                    'magang_id' => $participant['magang_id'],
                    'pembimbing_id' => $participant['pembimbing_id'],
                    'participant_name' => $participant['participant_name'],
                    'institution' => $participant['institution'],
                    'status' => 'Tidak Hadir',
                    'keterangan' => 'Tidak melakukan absensi masuk hingga pukul '.$checkInDeadline->format('H:i').'.',
                ]
            );

            if ($attendance->wasRecentlyCreated) {
                $created++;
            }
        }

        $this->info("Marked {$created} participant(s) as Tidak Hadir.");

        return self::SUCCESS;
    }
}
