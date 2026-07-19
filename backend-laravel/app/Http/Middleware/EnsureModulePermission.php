<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;

class EnsureModulePermission
{
    public function handle(Request $request, Closure $next, string $module)
    {
        $action = match ($request->method()) {
            'GET', 'HEAD' => 'view',
            'DELETE' => 'delete',
            default => 'edit',
        };

        if (!$request->user()?->canAccess($module, $action)) {
            return response()->json(['message' => "You do not have {$action} access to {$module}."], 403);
        }
        return $next($request);
    }
}
