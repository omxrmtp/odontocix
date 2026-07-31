<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('whatsapp_sessions', function (Blueprint $table) {
            $table->id();
            $table->string('tenant_id');
            $table->string('phone', 20);
            $table->string('state')->default('idle'); // idle, registering, booking, confirming
            $table->json('data')->nullable();
            $table->timestamp('last_activity')->useCurrent();
            $table->timestamps();

            $table->unique(['tenant_id', 'phone']);
            $table->index('last_activity');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('whatsapp_sessions');
    }
};
