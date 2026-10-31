<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\User;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use Illuminate\Validation\Rule;

class AuthController extends Controller
{
    public function register(Request $request): JsonResponse
    {
        $existingUser = User::where('email', $request->input('email'))->first();
        $validated = $request->validate([
            'nama' => 'required_without:name|string|max:255',
            'name' => 'required_without:nama|string|max:255',
            'email' => ['required', 'string', 'email', 'max:255', Rule::unique('users', 'email')->ignore($existingUser?->id)],
            'nim' => ['nullable', 'string', 'max:50', Rule::unique('users', 'nim')->ignore($existingUser?->id)],
            'password' => 'required|string|min:8',
            'role' => ['sometimes', Rule::in(['Pemagang', 'pemagang', 'peserta'])],
            'no_hp' => 'nullable|string|max:255',
        ]);

        if ($existingUser) {
            if ($existingUser->nim !== null
                || ! in_array(strtolower((string) $existingUser->role), ['peserta', 'pemagang', 'calon pemagang'], true)
                || ! Hash::check($validated['password'], $existingUser->password)) {
                return response()->json([
                    'status' => 'error',
                    'message' => 'Email sudah terdaftar. Silakan masuk menggunakan akun tersebut.',
                ], 422);
            }

            $existingUser->nim = $validated['nim'] ?? null;
            $existingUser->no_hp = $validated['no_hp'] ?? $existingUser->no_hp;
            $existingUser->save();

            return response()->json([
                'status' => 'success',
                'message' => 'NIM berhasil ditambahkan ke akun Anda. Silakan masuk.',
                'data' => [
                    'user' => $this->presentUser($existingUser),
                ],
            ]);
        }

        $user = User::create([
            'name' => $validated['nama'] ?? $validated['name'],
            'email' => $validated['email'],
            'nim' => ! empty($validated['nim']) ? trim($validated['nim']) : null,
            'password' => Hash::make($validated['password']),
            'role' => 'peserta',
            'no_hp' => $validated['no_hp'] ?? null,
        ]);

        $token = $user->createToken('auth_token')->plainTextToken;

        return response()->json([
            'status' => 'success',
            'message' => 'Registrasi akun berhasil',
            'data' => [
                'user' => $this->presentUser($user),
                'access_token' => $token,
                'token_type' => 'Bearer',
            ],
        ], 201);
    }

    public function createPembimbing(Request $request): JsonResponse
    {
        if (strtolower((string) $request->user()?->role) !== 'admin') {
            return response()->json([
                'message' => 'Hanya Admin yang dapat menambahkan Pembimbing.',
            ], 403);
        }

        $validated = $request->validate([
            'nama' => 'required|string|max:255',
            'email' => 'required|string|email|max:255|unique:users,email',
            'password' => 'required|string|min:8',
            'no_hp' => 'nullable|string|max:255',
        ]);

        $user = User::create([
            'name' => $validated['nama'],
            'email' => $validated['email'],
            'password' => Hash::make($validated['password']),
            'role' => 'pembimbing',
            'no_hp' => $validated['no_hp'] ?? null,
        ]);

        return response()->json([
            'data' => $this->presentUser($user),
            'message' => 'Akun Pembimbing berhasil dibuat.',
        ], 201);
    }

    public function login(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'email' => 'required|string|max:255',
            'password' => 'required|string',
        ]);

        $identifier = $validated['email'];
        if (filter_var($identifier, FILTER_VALIDATE_EMAIL)) {
            $user = User::with('magang')->where('email', $identifier)->first();
        } else {
            $user = User::with('magang')
                ->whereHas('magang', function ($query) use ($identifier) {
                    $query->where('participant_code', $identifier)
                        ->where('status', 'Aktif');
                })
                ->first();
        }

        if (! $user || ! Hash::check($validated['password'], $user->password)) {
            return response()->json([
                'status' => 'error',
                'message' => 'Email/NPM atau password salah',
            ], 401);
        }

        if (in_array($user->role, ['peserta', 'user'], true)
            && $user->email === 'peserta@absensi.com') {
            return response()->json([
                'status' => 'error',
                'message' => 'Akun peserta bersama tidak dapat digunakan. Silakan masuk menggunakan email dan password akun pribadi.',
            ], 403);
        }

        $token = $user->createToken('auth_token')->plainTextToken;

        return response()->json([
            'status' => 'success',
            'message' => 'Login berhasil',
            'data' => [
                'user' => $this->presentUser($user),
                'access_token' => $token,
                'token_type' => 'Bearer',
            ],
        ]);
    }

    public function logout(Request $request): JsonResponse
    {
        $request->user()->currentAccessToken()->delete();

        return response()->json([
            'status' => 'success',
            'message' => 'Berhasil logout',
        ]);
    }

    public function me(Request $request): JsonResponse
    {
        return response()->json([
            'status' => 'success',
            'data' => $this->presentUser($request->user()->load('magang')),
        ]);
    }

    public function getPembimbing(Request $request): JsonResponse
    {
        if (strtolower((string) $request->user()?->role) !== 'admin') {
            return response()->json([
                'message' => 'Hanya Admin yang dapat melihat daftar Pembimbing.',
            ], 403);
        }

        $pembimbings = User::where('role', 'pembimbing')->get();

        return response()->json([
            'data' => $pembimbings->map(fn (User $user) => $this->presentUser($user)),
        ]);
    }

    private function presentUser(User $user): array
    {
        return [
            'id' => $user->id,
            'name' => $user->name ?? $user->nama,
            'nama' => $user->name ?? $user->nama,
            'email' => $user->email,
            'nim' => $user->nim,
            'program_studi' => $user->program_studi,
            'alamat' => $user->alamat,
            'role' => $user->role,
            'no_hp' => $user->no_hp,
            'foto' => $user->foto,
            'magang' => $user->relationLoaded('magang') ? $user->magang : null,
        ];
    }
}
