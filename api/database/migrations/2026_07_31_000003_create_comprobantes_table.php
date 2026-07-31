<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('comprobantes', function (Blueprint $table) {
            $table->id();
            $table->string('tenant_id');
            $table->foreign('tenant_id')->references('id')->on('tenants')->cascadeOnDelete();

            $table->string('tipo_doc', 2); // 01 = Factura, 03 = Boleta
            $table->string('serie', 4);
            $table->unsignedBigInteger('correlativo');
            $table->foreignId('budget_id')->nullable()->constrained()->nullOnDelete();
            $table->foreignId('payment_id')->nullable()->constrained()->nullOnDelete();
            $table->foreignId('patient_id')->nullable()->constrained()->nullOnDelete();

            // Receptor
            $table->string('doc_type', 1)->nullable(); // 1 = DNI, 6 = RUC
            $table->string('doc_number')->nullable();
            $table->string('name')->nullable();
            $table->string('address')->nullable();

            // Montos
            $table->decimal('mto_oper_gravadas', 10, 2)->default(0);
            $table->decimal('mto_igv', 10, 2)->default(0);
            $table->decimal('total_impuestos', 10, 2)->default(0);
            $table->decimal('valor_venta', 10, 2)->default(0);
            $table->decimal('subtotal', 10, 2)->default(0);
            $table->decimal('mto_imp_venta', 10, 2)->default(0);

            // Estado y errores
            $table->string('estado')->default('pendiente'); // pendiente, enviado, aceptado, aceptado_con_observaciones, rechazado, error
            $table->string('error_code')->nullable();
            $table->text('error_message')->nullable();
            $table->string('cdr_code')->nullable();
            $table->text('cdr_description')->nullable();
            $table->json('cdr_notes')->nullable();
            $table->string('hash')->nullable();

            // Archivos
            $table->string('xml_path')->nullable();
            $table->string('cdr_zip_path')->nullable();
            $table->string('pdf_path')->nullable();

            $table->timestamp('emitted_at')->nullable();
            $table->timestamp('cdr_at')->nullable();
            $table->timestamps();

            $table->index(['tenant_id', 'estado']);
            $table->unique(['tenant_id', 'serie', 'correlativo']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('comprobantes');
    }
};
