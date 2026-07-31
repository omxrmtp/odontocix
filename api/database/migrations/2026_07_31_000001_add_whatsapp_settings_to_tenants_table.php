<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('tenants', function (Blueprint $table) {
            $table->text('whatsapp_access_token')->nullable()->after('whatsapp_phone_number_id');
            $table->string('whatsapp_business_account_id')->nullable()->after('whatsapp_access_token');
            $table->text('whatsapp_app_secret')->nullable()->after('whatsapp_business_account_id');
            $table->text('whatsapp_webhook_verify_token')->nullable()->after('whatsapp_app_secret');
            $table->boolean('whatsapp_enabled')->default(false)->after('whatsapp_webhook_verify_token');
        });
    }

    public function down(): void
    {
        Schema::table('tenants', function (Blueprint $table) {
            $table->dropColumn([
                'whatsapp_access_token',
                'whatsapp_business_account_id',
                'whatsapp_app_secret',
                'whatsapp_webhook_verify_token',
                'whatsapp_enabled',
            ]);
        });
    }
};
