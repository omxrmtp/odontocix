<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('idempotency_keys', function (Blueprint $table) {
            $table->string('key', 64)->primary();
            $table->string('tenant_id');
            $table->string('resource_type'); // e.g. patients, appointments
            $table->string('status')->default('processing'); // processing, completed, failed
            $table->json('request_payload')->nullable();
            $table->json('response_payload')->nullable();
            $table->timestamp('expires_at');
            $table->timestamps();

            $table->index(['tenant_id', 'resource_type']);
            $table->index('expires_at');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('idempotency_keys');
    }
};
