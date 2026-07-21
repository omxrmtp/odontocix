<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::table('tenants', function (Blueprint $table) {
            $table->string('name');
            $table->string('ruc', 11)->nullable()->unique();
            $table->string('phone', 20)->nullable();
            $table->string('address')->nullable();
            $table->string('email')->nullable();
            $table->string('estado')->default('pending_verification');
        });
    }

    public function down(): void
    {
        Schema::table('tenants', function (Blueprint $table) {
            $table->dropColumn(['name', 'ruc', 'phone', 'address', 'email', 'estado']);
        });
    }
};
