<?php

namespace App\Http\Controllers;

use App\Models\User;
use App\Services\NotificationService;
use Illuminate\Http\Request;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Str;
use App\Models\ApiToken;
use App\Models\Lead;

class AuthController extends Controller
{
    public function __construct(private NotificationService $notifications) {}

    public function login(Request $request): JsonResponse
    {
        $data = $request->validate([
            'email' => ['required', 'email'],
            'password' => ['required', 'string'],
        ]);

        $user = User::where('email', $data['email'])->first();

        if (!$user || !Hash::check($data['password'], $user->password)) {
            return response()->json(['message' => 'Invalid credentials'], 401);
        }

        $token = $this->issueToken($user, $request);

        Lead::whereRaw('LOWER(email) = ?', [strtolower($user->email)])->where('is_registered', false)->update([
            'user_id' => $user->id,
            'is_registered' => true,
            'registered_at' => now(),
            'updated_at' => now(),
        ]);

        return response()->json([
            'token' => $token,
            'user' => $this->serializeUser($user),
        ]);
    }

    public function register(Request $request): JsonResponse
    {
        $data = $request->validate([
            'name' => ['required', 'string', 'max:255'],
            'email' => ['required', 'email', 'unique:users,email'],
            'password' => ['required', 'string', 'min:8'],
            'phone' => ['nullable', 'string', 'max:30'],
        ]);

        $user = User::create([
            'name' => $data['name'],
            'email' => $data['email'],
            'password' => $data['password'],
            'phone' => $data['phone'] ?? null,
            'role' => 'parent',
        ]);

        $token = $this->issueToken($user, $request);

        Lead::whereRaw('LOWER(email) = ?', [strtolower($user->email)])->where('is_registered', false)->update([
            'user_id' => $user->id,
            'is_registered' => true,
            'registered_at' => now(),
            'updated_at' => now(),
        ]);

        $this->notifications->fireEventWorkflows('user_registered', [
            'parentName'  => $user->name,
            'parentEmail' => $user->email,
            'parentPhone' => $user->phone ?? '',
        ]);

        $this->notifications->userRegistered([
            'name'  => $user->name,
            'email' => $user->email,
            'phone' => $user->phone ?? '',
        ]);

        return response()->json([
            'token' => $token,
            'user' => $this->serializeUser($user),
        ], 201);
    }

    public function logout(Request $request): JsonResponse
    {
        $request->attributes->get('api_token')?->delete();

        return response()->json(['message' => 'Logged out successfully']);
    }

    public function me(Request $request): JsonResponse
    {
        $user = $request->user();

        if (!$user) {
            return response()->json(['message' => 'Unauthorized'], 401);
        }

        return response()->json(['user' => $this->serializeUser($user)]);
    }

    public function updateProfile(Request $request): JsonResponse
    {
        $user = $request->user();
        if (!$user) {
            return response()->json(['message' => 'Unauthorized'], 401);
        }

        $data = $request->validate([
            'name'  => ['sometimes', 'required', 'string', 'max:255'],
            'phone' => ['nullable', 'string', 'max:30'],
        ]);

        $user->fill($data)->save();

        return response()->json(['user' => $this->serializeUser($user)]);
    }

    public function changePassword(Request $request): JsonResponse
    {
        $user = $request->user();
        if (!$user) {
            return response()->json(['message' => 'Unauthorized'], 401);
        }

        $data = $request->validate([
            'current_password'          => ['required', 'string'],
            'new_password'              => ['required', 'string', 'min:8', 'confirmed'],
        ]);

        if (!Hash::check($data['current_password'], $user->password)) {
            return response()->json(['message' => 'Current password is incorrect'], 422);
        }

        $user->password = $data['new_password'];
        $user->save();

        return response()->json(['message' => 'Password updated successfully']);
    }

    private function serializeUser(User $user): array
    {
        return [
            'id' => $user->id,
            'name' => $user->name,
            'email' => $user->email,
            'phone' => $user->phone,
            'role' => $user->role,
            'access_level' => $user->access_level,
            'permissions' => $user->permissions ?? [],
        ];
    }

    private function issueToken(User $user, Request $request): string
    {
        $plainText = Str::random(64);
        $user->apiTokens()->create([
            'name' => (string) $request->userAgent() ?: 'web',
            'token_hash' => hash('sha256', $plainText),
            'expires_at' => now()->addDays((int) config('auth.api_token_days', 30)),
        ]);

        return $plainText;
    }
}
