<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        // 1. Eliminar permisos .leer
        $leerPerms = DB::table('permissions')
            ->where('name', 'like', '%.leer')
            ->pluck('id');

        DB::table('role_has_permissions')
            ->whereIn('permission_id', $leerPerms)
            ->delete();

        DB::table('model_has_permissions')
            ->whereIn('permission_id', $leerPerms)
            ->delete();

        DB::table('permissions')
            ->whereIn('id', $leerPerms)
            ->delete();

        // 2. Eliminar permisos historia.*
        $historiaPerms = DB::table('permissions')
            ->where('name', 'like', 'historia.%')
            ->pluck('id');

        DB::table('role_has_permissions')
            ->whereIn('permission_id', $historiaPerms)
            ->delete();

        DB::table('model_has_permissions')
            ->whereIn('permission_id', $historiaPerms)
            ->delete();

        DB::table('permissions')
            ->whereIn('id', $historiaPerms)
            ->delete();
    }

    public function down(): void
    {
        // No rollback needed — old permissions are obsolete
    }
};
