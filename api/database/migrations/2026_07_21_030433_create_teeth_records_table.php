<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('teeth_records', function (Blueprint $table) {
            $table->id();
            $table->string('tenant_id');
            $table->foreign('tenant_id')->references('id')->on('tenants')->cascadeOnDelete();

            $table->foreignId('patient_id')->constrained()->cascadeOnDelete();
            $table->string('fdi_code', 2);
            $table->string('status')->default('sano');
            $table->string('surface')->nullable();
            $table->foreignId('treatment_id')->nullable()->constrained()->nullOnDelete();
            $table->text('notes')->nullable();

            $table->unique(['patient_id', 'fdi_code']);
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('teeth_records');
    }
};
