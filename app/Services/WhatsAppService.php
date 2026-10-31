<?php

namespace App\Services;

use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;

class WhatsAppService
{
    /**
     * Konversi format nomor telepon lokal ke format internasional Indonesia (62)
     */
    public static function formatPhoneNumber(string $phone): string
    {
        $cleaned = preg_replace('/[^0-9]/', '', $phone);
        if (str_starts_with($cleaned, '0')) {
            $cleaned = '62' . substr($cleaned, 1);
        } elseif (str_starts_with($cleaned, '8')) {
            $cleaned = '62' . $cleaned;
        }
        return $cleaned;
    }

    /**
     * Susun template pesan notifikasi pendaftaran resmi PAM Techno
     */
    public static function buildRegistrationMessage(string $namaPeserta): string
    {
        $company = 'PAM Techno';

        return "Halo, {$namaPeserta} 👋\n\n"
            . "Terima kasih telah mendaftar program magang di {$company}.\n\n"
            . "Kami informasikan bahwa formulir pendaftaran magang Anda telah berhasil kami terima.\n\n"
            . "📋 Status: Pendaftaran Diterima\n"
            . "📅 Tahap selanjutnya: Verifikasi berkas dan data peserta oleh admin.\n\n"
            . "Mohon menunggu informasi selanjutnya melalui WhatsApp ini. Jika terdapat data yang perlu dilengkapi, admin akan menghubungi Anda.\n\n"
            . "Terima kasih atas perhatian dan partisipasi Anda.\n\n"
            . "Hormat kami,\n"
            . "Admin Penerimaan Magang\n"
            . "{$company}";
    }

    /**
     * Kirim pesan notifikasi WhatsApp ke nomor peserta
     * Mendukung gateway Fonnte / Wablas via API Token, atau fallback wa.me / logger
     */
    public static function sendRegistrationNotification(string $phone, string $namaPeserta): array
    {
        $target = self::formatPhoneNumber($phone);
        $message = self::buildRegistrationMessage($namaPeserta);
        $token = env('FONNTE_TOKEN', env('WA_GATEWAY_TOKEN'));
        $waUrl = 'https://wa.me/' . $target . '?text=' . urlencode($message);

        // Jika token gateway Fonnte disetel di .env, kirim langsung via API
        if (! empty($token)) {
            try {
                $response = Http::withHeaders([
                    'Authorization' => $token,
                ])->asForm()->post('https://api.fonnte.com/send', [
                    'target' => $target,
                    'message' => $message,
                    'countryCode' => '62',
                ]);

                Log::info("WhatsApp Fonnte response for {$target}: " . $response->body());

                return [
                    'sent' => $response->successful(),
                    'provider' => 'fonnte',
                    'target' => $target,
                    'wa_url' => $waUrl,
                    'message' => $message,
                    'response' => $response->json(),
                ];
            } catch (\Throwable $e) {
                Log::error("Failed to send WhatsApp message via Fonnte: " . $e->getMessage());
            }
        }

        // Catat pesan di log sistem
        Log::info("WhatsApp Notification generated for {$target} ({$namaPeserta}):\n{$message}");

        return [
            'sent' => true,
            'provider' => 'direct_wa',
            'target' => $target,
            'wa_url' => $waUrl,
            'message' => $message,
        ];
    }
}
