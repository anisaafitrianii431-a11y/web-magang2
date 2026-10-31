<?php

namespace App\Console\Commands;

use App\Models\Absensi;
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
        if (now()->format('H:i') < '08:00') {
            $this->info('It is too early to mark attendance as absent.');

            return self::SUCCESS;
        }

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
                ];
            } elseif ($magang?->status === 'Aktif') {
                $participant = [
                    'participant_code' => $magang->participant_code,
                    'participant_name' => $magang->participant_name,
                    'institution' => $magang->institution,
                    'magang_id' => $magang->id,
                    'pembimbing_id' => $magang->pembimbing_id ?? $user->pembimbing_id,
                ];
            } else {
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
                    'status' => 'Alpa',
                    'keterangan' => 'Tidak melakukan absensi masuk hingga pukul 08.00.',
                ]
            );

            if ($attendance->wasRecentlyCreated) {
                $created++;
            }
        }

        $this->info("Marked {$created} participant(s) as Alpa.");

        return self::SUCCESS;
    }
}
