<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('patients', function (Blueprint $table) {
            $table->id();
            $table->string('tenant_id');
            $table->foreign('tenant_id')->references('id')->on('tenants')->cascadeOnDelete();

            $table->string('dni', 8)->unique();
            $table->string('first_name');
            $table->string('first_last_name');
            $table->string('second_last_name')->nullable();
            $table->string('full_name')->virtualAs("first_last_name || ' ' || COALESCE(second_last_name, '') || ' ' || first_name");
            $table->string('phone', 20)->nullable();
            $table->string('address')->nullable();
            $table->string('blood_type', 5)->nullable();
            $table->date('birth_date')->nullable();
            $table->text('observations')->nullable();
            $table->timestamp('reniec_cached_at')->nullable();

            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('patients');
    }
};
