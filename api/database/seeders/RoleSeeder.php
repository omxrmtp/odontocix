<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use Spatie\Permission\Models\Permission;
use Spatie\Permission\Models\Role;

class RoleSeeder extends Seeder
{
    public function run(): void
    {
        $modules = [
            'pacientes',
            'doctores',
            'citas',
            'disponibilidad',
            'tratamientos',
            'consentimientos',
            'presupuestos',
            'pagos',
            'caja',
            'inventario',
            'reportes',
            'auditoria',
            'configuracion',
        ];

        $permissions = [];
        foreach ($modules as $module) {
            foreach (['ver', 'editar'] as $level) {
                $permissions[] = "{$module}.{$level}";
            }
        }

        foreach ($permissions as $perm) {
            Permission::firstOrCreate(['name' => $perm, 'guard_name' => 'web']);
        }

        $superAdmin = Role::firstOrCreate(['name' => 'Super Admin', 'guard_name' => 'web']);
        $superAdmin->syncPermissions($permissions);

        $admin = Role::firstOrCreate(['name' => 'Admin Clinica', 'guard_name' => 'web']);
        $admin->syncPermissions($permissions);

        $doctor = Role::firstOrCreate(['name' => 'Doctor', 'guard_name' => 'web']);
        $doctor->syncPermissions([
            'pacientes.ver', 'pacientes.editar',
            'doctores.ver',
            'citas.ver', 'citas.editar',
            'disponibilidad.ver', 'disponibilidad.editar',
            'tratamientos.ver',
            'consentimientos.ver', 'consentimientos.editar',
            'presupuestos.ver',
            'pagos.ver',
            'reportes.ver',
            'auditoria.ver',
        ]);

        $recepcionista = Role::firstOrCreate(['name' => 'Recepcionista', 'guard_name' => 'web']);
        $recepcionista->syncPermissions([
            'pacientes.ver', 'pacientes.editar',
            'doctores.ver',
            'citas.ver', 'citas.editar',
            'disponibilidad.ver', 'disponibilidad.editar',
            'tratamientos.ver',
            'consentimientos.ver',
            'presupuestos.ver', 'presupuestos.editar',
            'pagos.ver',
            'caja.ver',
        ]);

        $cajero = Role::firstOrCreate(['name' => 'Cajero', 'guard_name' => 'web']);
        $cajero->syncPermissions([
            'pacientes.ver',
            'citas.ver',
            'presupuestos.ver',
            'pagos.ver', 'pagos.editar',
            'caja.ver', 'caja.editar',
            'reportes.ver',
        ]);
    }
}
