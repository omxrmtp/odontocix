<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('teeth_record_histories', function (Blueprint $table) {
            $table->id();
            $table->string('tenant_id');
            $table->foreign('tenant_id')->references('id')->on('tenants')->cascadeOnDelete();

            $table->foreignId('patient_id')->constrained()->cascadeOnDelete();
            $table->string('fdi_code', 2);
            $table->string('old_status')->nullable();
            $table->string('new_status');
            $table->string('old_surface')->nullable();
            $table->string('new_surface')->nullable();
            $table->text('old_notes')->nullable();
            $table->text('new_notes')->nullable();
            $table->foreignId('changed_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('teeth_record_histories');
    }
};
