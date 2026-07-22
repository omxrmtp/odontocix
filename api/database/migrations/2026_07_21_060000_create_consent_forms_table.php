<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('consent_forms', function (Blueprint $table) {
            $table->id();
            $table->string('tenant_id');
            $table->foreign('tenant_id')->references('id')->on('tenants')->cascadeOnDelete();

            $table->foreignId('patient_id')->constrained()->cascadeOnDelete();
            $table->string('title');
            $table->text('content');
            $table->text('signature_data')->nullable();
            $table->dateTime('signed_at')->nullable();
            $table->boolean('signed_by_patient')->default(false);
            $table->boolean('signed_by_guardian')->default(false);
            $table->string('guardian_name')->nullable();
            $table->string('guardian_dni')->nullable();
            $table->string('ip_address')->nullable();

            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('consent_forms');
    }
};
