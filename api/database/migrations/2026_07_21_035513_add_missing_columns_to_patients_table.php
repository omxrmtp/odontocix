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
        Schema::table('patients', function (Blueprint $table) {
            $table->string('second_name', 100)->nullable()->after('first_name');
            $table->string('gender', 1)->nullable()->after('birth_date');
            $table->string('email', 255)->nullable()->after('phone');
            $table->string('reference', 255)->nullable()->after('address');
        });
    }

    public function down(): void
    {
        Schema::table('patients', function (Blueprint $table) {
            $table->dropColumn(['second_name', 'gender', 'email', 'reference']);
        });
    }
};
