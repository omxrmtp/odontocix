<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('tenants', function (Blueprint $table) {
            $table->boolean('sunat_enabled')->default(false)->after('whatsapp_enabled');
            $table->string('sunat_environment')->default('beta')->after('sunat_enabled');
            $table->text('sunat_certificate')->nullable()->after('sunat_environment');
            $table->text('sunat_certificate_password')->nullable()->after('sunat_certificate');
            $table->string('sunat_certificate_name')->nullable()->after('sunat_certificate_password');
            $table->string('sunat_sol_user')->nullable()->after('sunat_certificate_name');
            $table->text('sunat_sol_password')->nullable()->after('sunat_sol_user');
            $table->string('sunat_serie_boleta')->default('B001')->after('sunat_sol_password');
            $table->string('sunat_serie_factura')->default('F001')->after('sunat_serie_boleta');
            $table->unsignedBigInteger('sunat_correlative_boleta')->default(0)->after('sunat_serie_factura');
            $table->unsignedBigInteger('sunat_correlative_factura')->default(0)->after('sunat_correlative_boleta');
        });
    }

    public function down(): void
    {
        Schema::table('tenants', function (Blueprint $table) {
            $table->dropColumn([
                'sunat_enabled',
                'sunat_environment',
                'sunat_certificate',
                'sunat_certificate_password',
                'sunat_certificate_name',
                'sunat_sol_user',
                'sunat_sol_password',
                'sunat_serie_boleta',
                'sunat_serie_factura',
                'sunat_correlative_boleta',
                'sunat_correlative_factura',
            ]);
        });
    }
};
