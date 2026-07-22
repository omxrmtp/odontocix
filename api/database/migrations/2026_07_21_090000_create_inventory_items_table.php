<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('inventory_items', function (Blueprint $table) {
            $table->id();
            $table->string('tenant_id');
            $table->foreign('tenant_id')->references('id')->on('tenants')->cascadeOnDelete();

            $table->string('name');
            $table->text('description')->nullable();
            $table->string('category');
            $table->string('sku')->nullable();
            $table->integer('quantity')->default(0);
            $table->integer('min_stock')->default(5);
            $table->string('unit');
            $table->decimal('unit_cost', 10, 2)->nullable();
            $table->string('supplier')->nullable();
            $table->string('location')->nullable();
            $table->date('expiration_date')->nullable();
            $table->timestamps();

            $table->index(['tenant_id', 'category']);
            $table->index(['tenant_id', 'quantity', 'min_stock']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('inventory_items');
    }
};
