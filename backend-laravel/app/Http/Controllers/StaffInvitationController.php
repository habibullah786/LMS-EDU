<?php

namespace App\Http\Controllers;

use App\Jobs\SendEmailNotification;
use App\Models\StaffInvitation;
use App\Models\User;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;

class StaffInvitationController extends Controller
{
    private const MODULES = ['leads', 'trial_enrollments', 'parents', 'users', 'classes', 'notifications', 'workflows', 'attendance', 'settings'];

    public function index(Request $request): JsonResponse
    {
        $this->authorizeSuperAdmin($request);
        return response()->json(StaffInvitation::latest()->limit(100)->get());
    }

    public function store(Request $request): JsonResponse
    {
        $this->authorizeSuperAdmin($request);
        $data = $request->validate([
            'name' => ['required', 'string', 'max:255'],
            'email' => ['required', 'email', 'max:255'],
            'access_level' => ['required', 'in:admin,operator'],
            'permissions' => ['nullable', 'array'],
            'permissions.*' => ['array'],
            'permissions.*.*' => ['in:view,edit,delete'],
        ]);
        $permissions = collect($data['permissions'] ?? [])->only(self::MODULES)
            ->map(function ($actions) {
                $actions = array_values(array_unique($actions));
                if ($actions && !in_array('view', $actions, true)) array_unshift($actions, 'view');
                return $actions;
            })->all();
        $token = Str::random(64);
        $invite = StaffInvitation::create([
            ...$data, 'permissions' => $permissions, 'token_hash' => hash('sha256', $token),
            'invited_by' => $request->user()->id, 'expires_at' => now()->addDays(7),
        ]);
        $url = rtrim(config('services.frontend_url'), '/').'/invite/'.urlencode($token);
        SendEmailNotification::dispatch($invite->email, $invite->name, 'You are invited to LMS-EDU',
            '<p>You have been invited as <strong>'.htmlspecialchars(str_replace('_', ' ', $invite->access_level)).'</strong>.</p><p><a href="'.htmlspecialchars($url).'">Accept invitation and set password</a></p>',
            'staff_invitation');
        return response()->json(['message' => 'Invitation sent.', 'invitation' => $invite, 'invite_url' => $url], 201);
    }

    public function show(string $token): JsonResponse
    {
        $invite = $this->validInvitation($token);
        return response()->json(['name' => $invite->name, 'email' => $invite->email, 'access_level' => $invite->access_level]);
    }

    public function accept(Request $request, string $token): JsonResponse
    {
        $data = $request->validate(['password' => ['required', 'string', 'min:8', 'confirmed']]);
        $invite = $this->validInvitation($token);
        DB::transaction(function () use ($invite, $data) {
            User::updateOrCreate(['email' => $invite->email], [
                'name' => $invite->name, 'password' => $data['password'], 'role' => 'admin',
                'access_level' => $invite->access_level, 'permissions' => $invite->permissions ?? [],
            ]);
            $invite->update(['accepted_at' => now()]);
        });
        return response()->json(['message' => 'Invitation accepted. You can now sign in.']);
    }

    private function validInvitation(string $token): StaffInvitation
    {
        $invite = StaffInvitation::where('token_hash', hash('sha256', $token))->first();
        abort_if(!$invite || $invite->accepted_at || $invite->expires_at->isPast(), 410, 'Invitation is invalid or expired.');
        return $invite;
    }

    private function authorizeSuperAdmin(Request $request): void
    {
        abort_unless($request->user()?->isSuperAdmin(), 403, 'Only a Super Admin can manage staff invitations.');
    }
}
