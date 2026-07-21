<?php

use App\Http\Controllers\Api\AuthController;
use App\Http\Controllers\Api\PatientController;
use App\Http\Controllers\Api\DoctorController;
use App\Http\Controllers\Api\ClinicalRecordController;
use App\Http\Controllers\Api\OdontogramController;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Route;

Route::post('/auth/register', [AuthController::class, 'register']);
Route::post('/auth/login', [AuthController::class, 'login']);

Route::middleware('auth:sanctum')->group(function () {
    Route::get('/auth/me', [AuthController::class, 'me']);
    Route::post('/auth/logout', [AuthController::class, 'logout']);

    Route::get('/reniec/lookup', [PatientController::class, 'lookup']);

    Route::apiResource('patients', PatientController::class);
    Route::get('/patients/{patient}/history', [PatientController::class, 'history']);

    Route::apiResource('doctors', DoctorController::class);

    Route::get('/patients/{patient}/records', [ClinicalRecordController::class, 'index']);
    Route::post('/patients/{patient}/records', [ClinicalRecordController::class, 'store']);
    Route::get('/records/{record}', [ClinicalRecordController::class, 'show']);
    Route::put('/records/{record}', [ClinicalRecordController::class, 'update']);
    Route::delete('/records/{record}', [ClinicalRecordController::class, 'destroy']);

    Route::get('/patients/{patient}/odontogram', [OdontogramController::class, 'show']);
    Route::put('/patients/{patient}/odontogram/{fdiCode}', [OdontogramController::class, 'update']);
});

Route::get('/user', fn (Request $request) => $request->user()->load('roles', 'tenant'))->middleware('auth:sanctum');
