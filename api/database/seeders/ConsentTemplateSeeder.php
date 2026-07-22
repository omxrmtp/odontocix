<?php

namespace Database\Seeders;

use App\Models\ConsentTemplate;
use App\Models\Tenant;
use App\Services\TenantService;
use Illuminate\Database\Seeder;

class ConsentTemplateSeeder extends Seeder
{
    public function run(TenantService $tenantService): void
    {
        $tenant = Tenant::first();
        if (!$tenant) return;

        $tenantService->setCurrent($tenant);

        $templates = [
            [
                'title' => 'Consentimiento Informado para Procedimientos Generales',
                'content' => '<p>Por medio del presente documento, yo <strong>{{patient_name}}</strong>, identificado(a) con DNI N° <strong>{{patient_dni}}</strong>, declaro que:</p><ol><li>He sido informado(a) sobre la naturaleza, propósito, beneficios, riesgos y alternativas del procedimiento dental que se me va a realizar.</li><li>Entiendo que los procedimientos dentales pueden incluir riesgos como dolor, inflamación, sangrado, infección, alteración de la sensibilidad, entre otros.</li><li>Autorizo al equipo médico de la clínica a realizar el procedimiento necesario según el diagnóstico establecido.</li><li>Me comprometo a seguir las indicaciones postoperatorias proporcionadas por el profesional.</li></ol><p>Firmo este documento en señal de conformidad y aceptación.</p>',
                'category' => 'general',
                'is_default' => true,
            ],
            [
                'title' => 'Consentimiento para Extracción Dental',
                'content' => '<p>Por medio del presente documento, yo <strong>{{patient_name}}</strong>, identificado(a) con DNI N° <strong>{{patient_dni}}</strong>, declaro que:</p><ol><li>He sido informado(a) sobre el procedimiento de extracción dental que se me va a realizar.</li><li>Entiendo los riesgos asociados, incluyendo: sangrado, infección, daño a dientes adyacentes, fractura ósea, alveolitis seca, parestesia temporal o permanente, y la posible necesidad de cirugía adicional.</li><li>Autorizo la administración de anestesia local u otra técnica anestésica según sea necesario.</li><li>Acepto que, en caso de complicaciones, se realizarán las intervenciones adicionales que el profesional considere necesarias.</li></ol><p>Firmo este documento en señal de conformidad y aceptación.</p>',
                'category' => 'quirurgico',
                'is_default' => true,
            ],
            [
                'title' => 'Consentimiento para Tratamiento de Ortodoncia',
                'content' => '<p>Por medio del presente documento, yo <strong>{{patient_name}}</strong>, identificado(a) con DNI N° <strong>{{patient_dni}}</strong>, declaro que:</p><ol><li>He sido informado(a) sobre la duración estimada del tratamiento de ortodoncia, los cuidados necesarios y las visitas periódicas de control.</li><li>Entiendo que el tratamiento puede requerir extracciones dentales, uso de aparatos auxiliares y colaboración activa por mi parte.</li><li>Acepto que los resultados dependen de mi cumplimiento con las indicaciones del ortodoncista.</li><li>Reconozco que pueden existir riesgos como molestias temporales, úlceras bucales, y en casos raros, reabsorción radicular.</li></ol><p>Firmo este documento en señal de conformidad y aceptación.</p>',
                'category' => 'ortodoncia',
                'is_default' => true,
            ],
            [
                'title' => 'Consentimiento para Endodoncia',
                'content' => '<p>Por medio del presente documento, yo <strong>{{patient_name}}</strong>, identificado(a) con DNI N° <strong>{{patient_dni}}</strong>, declaro que:</p><ol><li>He sido informado(a) sobre el procedimiento de tratamiento de conductos (endodoncia).</li><li>Entiendo que el tratamiento consiste en la remoción de la pulpa dental infectada o dañada, limpieza, desinfección y sellado de los conductos radiculares.</li><li>Conozco los riesgos: fractura de instrumentos, perforaciones, infección persistente, dolor postoperatorio, y la posible necesidad de retratamiento o cirugía apical.</li><li>Entiendo que la restauración final (corona o empaste) es necesaria después del tratamiento.</li></ol><p>Firmo este documento en señal de conformidad y aceptación.</p>',
                'category' => 'endodoncia',
                'is_default' => true,
            ],
            [
                'title' => 'Consentimiento para Implante Dental',
                'content' => '<p>Por medio del presente documento, yo <strong>{{patient_name}}</strong>, identificado(a) con DNI N° <strong>{{patient_dni}}</strong>, declaro que:</p><ol><li>He sido informado(a) sobre el procedimiento quirúrgico de colocación de implante(s) dental(es).</li><li>Entiendo los riesgos quirúrgicos: sangrado, infección, daño a estructuras anatómicas (nervio, seno maxilar), rechazo del implante, y la posible necesidad de reintervención.</li><li>Conozco que el proceso de osteointegración puede durar varios meses y requiere controles periódicos.</li><li>Acepto que el éxito del implante depende de mi higiene oral, hábitos (no fumar) y seguimiento de las indicaciones médicas.</li></ol><p>Firmo este documento en señal de conformidad y aceptación.</p>',
                'category' => 'implantologia',
                'is_default' => true,
            ],
        ];

        foreach ($templates as $t) {
            ConsentTemplate::firstOrCreate(
                ['title' => $t['title'], 'tenant_id' => $tenant->id],
                array_merge($t, ['tenant_id' => $tenant->id])
            );
        }

        $this->command->info('Plantillas de consentimiento predeterminadas creadas.');
    }
}
