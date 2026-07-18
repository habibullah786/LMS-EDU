<?php

namespace App\Http\Middleware;

use Closure;
use App\Models\ApiToken;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;

class AuthenticateApiToken
{
    public function handle(Request $request, Closure $next)
    {
        $authorization = $request->header('Authorization', '');
        if (!str_starts_with($authorization, 'Bearer ')) {
            return response()->json(['message' => 'Unauthorized'], 401);
        }

        $token = trim(substr($authorization, 7));
        if (empty($token)) {
            return response()->json(['message' => 'Unauthorized'], 401);
        }

        $apiToken = ApiToken::with('user')
            ->where('token_hash', hash('sha256', $token))
            ->where('expires_at', '>', now())
            ->first();
        if (!$apiToken || !$apiToken->user) {
            return response()->json(['message' => 'Unauthorized'], 401);
        }

        $user = $apiToken->user;
        if (!$apiToken->last_used_at || $apiToken->last_used_at->lt(now()->subMinutes(5))) {
            $apiToken->forceFill(['last_used_at' => now()])->save();
        }

        Auth::setUser($user);
        $request->setUserResolver(fn () => $user);
        $request->attributes->set('api_token', $apiToken);

        return $next($request);
    }
}
