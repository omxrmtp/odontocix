<?php

namespace Database\Seeders;

use App\Models\Tenant;
use App\Models\Treatment;
use App\Services\TenantService;
use Illuminate\Database\Seeder;

class TreatmentSeeder extends Seeder
{
    public function run(TenantService $tenantService): void
    {
        $tenant = Tenant::first();
        if (!$tenant) return;

        $tenantService->setCurrent($tenant);

        $treatments = [
            ['name' => 'Limpieza dental (profilaxis)', 'description' => 'Eliminación de placa bacteriana y sarro', 'base_price' => 80.00, 'estimated_duration_min' => 30],
            ['name' => 'Empaste / Obturación (1 cara)', 'description' => 'Restauración dental con resina compuesta', 'base_price' => 120.00, 'estimated_duration_min' => 30],
            ['name' => 'Empaste / Obturación (2 caras)', 'description' => 'Restauración dental con resina compuesta', 'base_price' => 150.00, 'estimated_duration_min' => 40],
            ['name' => 'Empaste / Obturación (3+ caras)', 'description' => 'Restauración dental con resina compuesta', 'base_price' => 180.00, 'estimated_duration_min' => 45],
            ['name' => 'Extracción simple', 'description' => 'Extracción dental sin complicaciones', 'base_price' => 100.00, 'estimated_duration_min' => 20],
            ['name' => 'Extracción compleja', 'description' => 'Extracción dental quirúrgica', 'base_price' => 200.00, 'estimated_duration_min' => 40],
            ['name' => 'Extracción de muela del juicio', 'description' => 'Extracción de tercer molar', 'base_price' => 250.00, 'estimated_duration_min' => 45],
            ['name' => 'Endodoncia (1 conducto)', 'description' => 'Tratamiento de conducto', 'base_price' => 300.00, 'estimated_duration_min' => 60],
            ['name' => 'Endodoncia (2 conductos)', 'description' => 'Tratamiento de conducto', 'base_price' => 400.00, 'estimated_duration_min' => 75],
            ['name' => 'Endodoncia (3+ conductos)', 'description' => 'Tratamiento de conducto', 'base_price' => 500.00, 'estimated_duration_min' => 90],
            ['name' => 'Corona dental (metal-porcelana)', 'description' => 'Corona protésica', 'base_price' => 600.00, 'estimated_duration_min' => 60],
            ['name' => 'Corona dental (zirconio)', 'description' => 'Corona de alta estética', 'base_price' => 900.00, 'estimated_duration_min' => 60],
            ['name' => 'Puente dental (3 piezas)', 'description' => 'Puente fijo de 3 unidades', 'base_price' => 1500.00, 'estimated_duration_min' => 90],
            ['name' => 'Blanqueamiento dental', 'description' => 'Blanqueamiento con gel y luz LED', 'base_price' => 350.00, 'estimated_duration_min' => 60],
            ['name' => 'Revisión general', 'description' => 'Evaluación clínica completa', 'base_price' => 50.00, 'estimated_duration_min' => 20],
            ['name' => 'Radiografía panorámica', 'description' => 'Radiografía dental panorámica digital', 'base_price' => 80.00, 'estimated_duration_min' => 15],
            ['name' => 'Radiografía periapical', 'description' => 'Radiografía dental por pieza', 'base_price' => 30.00, 'estimated_duration_min' => 10],
            ['name' => 'Sellante dental (por pieza)', 'description' => 'Sellante de fosas y fisuras', 'base_price' => 40.00, 'estimated_duration_min' => 10],
            ['name' => 'Fluorización', 'description' => 'Aplicación tópica de flúor', 'base_price' => 50.00, 'estimated_duration_min' => 15],
            ['name' => 'Incrustación (inlay/onlay)', 'description' => 'Restauración indirecta de resina o porcelana', 'base_price' => 400.00, 'estimated_duration_min' => 60],
            ['name' => 'Implante dental', 'description' => 'Implante osteointegrado', 'base_price' => 1200.00, 'estimated_duration_min' => 90],
            ['name' => 'Prótesis dental total (superior)', 'description' => 'Prótesis removible completa', 'base_price' => 800.00, 'estimated_duration_min' => 60],
            ['name' => 'Prótesis dental total (inferior)', 'description' => 'Prótesis removible completa', 'base_price' => 800.00, 'estimated_duration_min' => 60],
            ['name' => 'Prótesis parcial removible', 'description' => 'Prótesis removible de 1 a 3 piezas', 'base_price' => 500.00, 'estimated_duration_min' => 45],
            ['name' => 'Férula de descarga (relajación)', 'description' => 'Férula oclusal para bruxismo', 'base_price' => 300.00, 'estimated_duration_min' => 30],
            ['name' => 'Gingivectomía', 'description' => 'Cirugía de encías', 'base_price' => 250.00, 'estimated_duration_min' => 45],
            ['name' => 'Curetaje / Raspaje radicular', 'description' => 'Tratamiento de periodontitis por cuadrante', 'base_price' => 150.00, 'estimated_duration_min' => 45],
            ['name' => 'Reconstrucción dental con perno', 'description' => 'Perno intrarradicular más reconstrucción', 'base_price' => 250.00, 'estimated_duration_min' => 30],
            ['name' => 'Consulta de urgencia', 'description' => 'Atención dental de emergencia', 'base_price' => 60.00, 'estimated_duration_min' => 20],
            ['name' => 'Frenectomía', 'description' => 'Eliminación de frenillo', 'base_price' => 300.00, 'estimated_duration_min' => 30],
        ];

        foreach ($treatments as $t) {
            Treatment::firstOrCreate(
                ['name' => $t['name'], 'tenant_id' => $tenant->id],
                $t
            );
        }

        $this->command->info('Tratamientos predeterminados creados para la clínica demo.');
    }
}
