<?php

use App\Http\Controllers\Api\AppointmentController;
use App\Http\Controllers\Api\AuditLogController;
use App\Http\Controllers\Api\AuthController;
use App\Http\Controllers\Api\BudgetController;
use App\Http\Controllers\Api\CashRegisterController;
use App\Http\Controllers\Api\ClinicalRecordController;
use App\Http\Controllers\Api\ConsentFormController;
use App\Http\Controllers\Api\ConsentTemplateController;
use App\Http\Controllers\Api\DoctorController;
use App\Http\Controllers\Api\InventoryController;
use App\Http\Controllers\Api\OdontogramController;
use App\Http\Controllers\Api\PatientController;
use App\Http\Controllers\Api\PaymentController;
use App\Http\Controllers\Api\PatientTreatmentController;
use App\Http\Controllers\Api\PdfController;
use App\Http\Controllers\Api\DashboardController;
use App\Http\Controllers\Api\PatientPortalController;
use App\Http\Controllers\Api\ProfileController;
use App\Http\Controllers\Api\ReportController;
use App\Http\Controllers\Api\AvailableSlotController;
use App\Http\Controllers\Api\OnlineBookingController;
use App\Http\Controllers\Api\TreatmentController;
use App\Http\Controllers\Api\RoleController;
use App\Http\Controllers\Api\UserController;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Route;

Route::get('/debug/user-check', function (Illuminate\Http\Request $request) {
    $email = $request->query('email', 'admin@odontocix.com');
    $appKey = config('app.key') ? 'SET' : 'MISSING';
    $dbDefault = config('database.default');
    $dbUrl = config('database.connections.pgsql.url');
    $dbUrlSnippet = $dbUrl ? substr($dbUrl, 0, 40) . '...' : 'NULL';
    $driverName = config("database.connections.{$dbDefault}.driver");
    $configCached = file_exists(base_path('bootstrap/cache/config.php'));

    $user = \App\Models\User::where('email', $email)->first();

    $result = [
        'config_cached' => $configCached,
        'db_default' => $dbDefault,
        'db_driver' => $driverName,
        'db_url' => $dbUrlSnippet,
        'app_key' => $appKey,
        'email_searched' => $email,
        'user_found' => $user ? true : false,
    ];

    if ($user) {
        $result['user_id'] = $user->id;
        $result['user_email'] = $user->email;
        $result['user_tenant_id'] = $user->tenant_id;
        $result['hash_prefix'] = substr($user->password, 0, 7);
        $result['hash_check'] = \Illuminate\Support\Facades\Hash::check('admin123456', $user->password);
        $result['user_roles'] = $user->getRoleNames()->toArray();
    }

    return response()->json($result);
});

Route::get('/debug/db-connections', function () {
    $connections = config('database.connections');
    $result = [];
    foreach ($connections as $name => $conn) {
        $result[$name] = [
            'driver' => $conn['driver'] ?? 'N/A',
            'url' => isset($conn['url']) ? ($conn['url'] ? 'SET' : 'NULL') : 'N/A',
            'host' => $conn['host'] ?? 'N/A',
            'database' => $conn['database'] ?? 'N/A',
        ];
    }
    return response()->json([
        'default' => config('database.default'),
        'connections' => $result,
    ]);
});

Route::post('/auth/register', [AuthController::class, 'register']);
Route::post('/auth/login', [AuthController::class, 'login']);

Route::get('/debug/pdf-test', function () {
    try {
        $pdf = Barryvdh\DomPDF\Facade\Pdf::loadHTML('<h1>PDF Test</h1><p>If you see this, DomPDF works.</p>');
        return $pdf->download('test.pdf');
    } catch (\Throwable $e) {
        return response()->json([
            'error' => $e->getMessage(),
            'class' => get_class($e),
            'file' => $e->getFile(),
            'line' => $e->getLine(),
        ], 500);
    }
});

Route::prefix('portal')->group(function () {
    Route::get('/patient/{token}', [PatientPortalController::class, 'patient']);
    Route::put('/patient/{token}', [PatientPortalController::class, 'updatePatient']);
    Route::get('/patient/{token}/appointments', [PatientPortalController::class, 'appointments']);
    Route::put('/patient/{token}/appointments/{appointment}/cancel', [PatientPortalController::class, 'cancelAppointment']);
    Route::get('/patient/{token}/history', [PatientPortalController::class, 'history']);
    Route::get('/patient/{token}/budgets', [PatientPortalController::class, 'budgets']);
    Route::get('/patient/{token}/payments', [PatientPortalController::class, 'payments']);
    Route::get('/patient/{token}/payments/{paymentId}/receipt', [PatientPortalController::class, 'downloadPaymentReceipt']);
    Route::get('/patient/{token}/doctors', [PatientPortalController::class, 'doctors']);
    Route::get('/patient/{token}/slots', [PatientPortalController::class, 'slots']);
    Route::post('/patient/{token}/appointments', [PatientPortalController::class, 'bookAppointment']);
    Route::get('/patient/{token}/consent-forms', [PatientPortalController::class, 'consentForms']);
    Route::post('/patient/{token}/consent-forms/{consentForm}/sign', [PatientPortalController::class, 'signConsentForm']);
    Route::get('/patient/{token}/history/pdf', [PatientPortalController::class, 'historyPdf']);
});

Route::prefix('online-booking')->group(function () {
    Route::get('/doctors', [OnlineBookingController::class, 'doctors']);
    Route::get('/slots', [OnlineBookingController::class, 'slots']);
    Route::post('/appointments', [OnlineBookingController::class, 'book']);
});

Route::middleware('auth:sanctum')->group(function () {
    Route::get('/auth/me', [AuthController::class, 'me']);
    Route::post('/auth/logout', [AuthController::class, 'logout']);

    Route::get('/reniec/lookup', [PatientController::class, 'lookup']);

    // Patients
    Route::middleware('permission:pacientes.ver')->group(function () {
        Route::get('/patients', [PatientController::class, 'index']);
        Route::get('/patients/{patient}', [PatientController::class, 'show']);
        Route::get('/patients/{patient}/history', [PatientController::class, 'history']);
        Route::get('/patients/{patient}/records', [ClinicalRecordController::class, 'index']);
        Route::post('/patients/{patient}/records', [ClinicalRecordController::class, 'store']);
        Route::get('/records/{record}', [ClinicalRecordController::class, 'show']);
        Route::get('/patients/{patient}/odontogram', [OdontogramController::class, 'show']);
        Route::put('/patients/{patient}/odontogram/{fdiCode}', [OdontogramController::class, 'update']);
        Route::post('/patients/{patient}/treatments', [PatientTreatmentController::class, 'store']);
    });
    Route::middleware('permission:pacientes.editar')->group(function () {
        Route::post('/patients', [PatientController::class, 'store']);
        Route::put('/patients/{patient}', [PatientController::class, 'update']);
        Route::delete('/patients/{patient}', [PatientController::class, 'destroy']);
        Route::put('/records/{record}', [ClinicalRecordController::class, 'update']);
        Route::delete('/records/{record}', [ClinicalRecordController::class, 'destroy']);
        Route::put('/patient-treatments/{treatment}', [PatientTreatmentController::class, 'update']);
        Route::delete('/patient-treatments/{treatment}', [PatientTreatmentController::class, 'destroy']);
    });

    // Doctors
    Route::middleware('permission:doctores.ver')->group(function () {
        Route::get('/doctors', [DoctorController::class, 'index']);
        Route::get('/doctors/{doctor}', [DoctorController::class, 'show']);
    });
    Route::middleware('permission:doctores.editar')->group(function () {
        Route::post('/doctors', [DoctorController::class, 'store']);
        Route::put('/doctors/{doctor}', [DoctorController::class, 'update']);
        Route::delete('/doctors/{doctor}', [DoctorController::class, 'destroy']);
    });

    // Appointments
    Route::middleware('permission:citas.ver')->group(function () {
        Route::get('/appointments', [AppointmentController::class, 'index']);
        Route::get('/appointments/upcoming-for-reminders', [AppointmentController::class, 'upcomingForReminders']);
        Route::get('/appointments/{appointment}', [AppointmentController::class, 'show']);
        Route::get('/appointments/{appointment}/whatsapp-links', [AppointmentController::class, 'whatsappLinks']);
    });
    Route::middleware('permission:citas.editar')->group(function () {
        Route::post('/appointments', [AppointmentController::class, 'store']);
        Route::put('/appointments/{appointment}', [AppointmentController::class, 'update']);
        Route::delete('/appointments/{appointment}', [AppointmentController::class, 'destroy']);
    });

    // Budgets
    Route::middleware('permission:presupuestos.ver')->group(function () {
        Route::get('/budgets', [BudgetController::class, 'index']);
        Route::get('/budgets/{budget}', [BudgetController::class, 'show']);
    });
    Route::middleware('permission:presupuestos.editar')->group(function () {
        Route::post('/budgets', [BudgetController::class, 'store']);
        Route::put('/budgets/{budget}', [BudgetController::class, 'update']);
        Route::delete('/budgets/{budget}', [BudgetController::class, 'destroy']);
    });

    // Payments
    Route::middleware('permission:pagos.ver')->group(function () {
        Route::get('/payments', [PaymentController::class, 'index']);
        Route::get('/payments/{payment}', [PaymentController::class, 'show']);
        Route::get('/budgets/{budget}/balance', [PaymentController::class, 'budgetBalance']);
    });
    Route::middleware('permission:pagos.editar')->group(function () {
        Route::post('/payments', [PaymentController::class, 'store']);
        Route::delete('/payments/{payment}', [PaymentController::class, 'destroy']);
    });

    // Cash
    Route::middleware('permission:caja.ver')->group(function () {
        Route::get('/cash', [CashRegisterController::class, 'index']);
        Route::get('/cash/summary', [CashRegisterController::class, 'summary']);
    });
    Route::middleware('permission:caja.editar')->group(function () {
        Route::post('/cash', [CashRegisterController::class, 'store']);
        Route::delete('/cash/{transaction}', [CashRegisterController::class, 'destroy']);
    });

    // Treatments
    Route::middleware('permission:tratamientos.ver')->group(function () {
        Route::get('/treatments', [TreatmentController::class, 'index']);
    });
    Route::middleware('permission:tratamientos.editar')->group(function () {
        Route::post('/treatments', [TreatmentController::class, 'store']);
        Route::put('/treatments/{treatment}', [TreatmentController::class, 'update']);
        Route::delete('/treatments/{treatment}', [TreatmentController::class, 'destroy']);
    });

    // Consent Forms
    Route::middleware('permission:consentimientos.ver')->group(function () {
        Route::get('/consent-forms', [ConsentFormController::class, 'index']);
        Route::get('/consent-forms/{form}', [ConsentFormController::class, 'show']);
    });
    Route::middleware('permission:consentimientos.editar')->group(function () {
        Route::post('/consent-forms', [ConsentFormController::class, 'store']);
        Route::put('/consent-forms/{form}', [ConsentFormController::class, 'update']);
        Route::delete('/consent-forms/{form}', [ConsentFormController::class, 'destroy']);
        Route::post('/consent-forms/{form}/sign', [ConsentFormController::class, 'sign']);
    });

    // Inventory
    Route::middleware('permission:inventario.ver')->group(function () {
        Route::get('/inventory', [InventoryController::class, 'index']);
        Route::get('/inventory/low-stock', [InventoryController::class, 'lowStock']);
        Route::get('/inventory/{inventory}', [InventoryController::class, 'show']);
    });
    Route::middleware('permission:inventario.editar')->group(function () {
        Route::post('/inventory', [InventoryController::class, 'store']);
        Route::put('/inventory/{inventory}', [InventoryController::class, 'update']);
        Route::delete('/inventory/{inventory}', [InventoryController::class, 'destroy']);
        Route::post('/inventory/{inventory}/movement', [InventoryController::class, 'movement']);
    });

    // Available Slots
    Route::middleware('permission:disponibilidad.ver')->group(function () {
        Route::get('/available-slots', [AvailableSlotController::class, 'index']);
        Route::get('/available-slots/{available_slot}', [AvailableSlotController::class, 'show']);
    });
    Route::middleware('permission:disponibilidad.editar')->group(function () {
        Route::post('/available-slots', [AvailableSlotController::class, 'store']);
        Route::put('/available-slots/{available_slot}', [AvailableSlotController::class, 'update']);
        Route::delete('/available-slots/{available_slot}', [AvailableSlotController::class, 'destroy']);
    });

    // Audit Logs
    Route::middleware('permission:auditoria.ver')->group(function () {
        Route::get('/audit-logs', [AuditLogController::class, 'index']);
    });

    // Reports
    Route::middleware('permission:reportes.ver')->group(function () {
        Route::get('/reports/income', [ReportController::class, 'incomeReport']);
        Route::get('/reports/treatments', [ReportController::class, 'treatmentReport']);
        Route::get('/reports/doctors', [ReportController::class, 'doctorProductivity']);
        Route::get('/reports/patients', [ReportController::class, 'patientRetention']);
    });

    // Dashboard & Profile (no specific permission middleware)
    Route::get('/dashboard/stats', [DashboardController::class, 'stats']);
    Route::get('/dashboard/charts', [DashboardController::class, 'charts']);

    Route::get('/profile', [ProfileController::class, 'show']);
    Route::put('/profile', [ProfileController::class, 'update']);
    Route::put('/profile/password', [ProfileController::class, 'password']);
    Route::get('/tenant', [ProfileController::class, 'tenant']);
    Route::put('/tenant', [ProfileController::class, 'updateTenant']);

    Route::get('/pdf/budgets/{budget}', [PdfController::class, 'budgetPdf']);
    Route::get('/pdf/payments/{payment}/receipt', [PdfController::class, 'paymentReceipt']);
    Route::get('/pdf/patients/{patient}/history', [PdfController::class, 'patientHistory']);
    Route::get('/pdf/consent-forms/{form}', [PdfController::class, 'consentFormPdf']);

    Route::middleware('permission:consentimientos.editar')->apiResource('consent-templates', ConsentTemplateController::class);

    // Roles & Permissions — GET solo requiere ver
    Route::middleware('permission:configuracion.ver')->group(function () {
        Route::get('/roles', [RoleController::class, 'index']);
        Route::get('/roles/{role}', [RoleController::class, 'show']);
        Route::get('/permissions', [RoleController::class, 'permissions']);
        Route::get('/users', [UserController::class, 'index']);
        Route::get('/users/{user}', [UserController::class, 'show']);
    });

    // Roles & Permissions — escritura requiere editar
    Route::middleware('permission:configuracion.editar')->group(function () {
        Route::post('/roles', [RoleController::class, 'store']);
        Route::put('/roles/{role}', [RoleController::class, 'update']);
        Route::delete('/roles/{role}', [RoleController::class, 'destroy']);
        Route::post('/users', [UserController::class, 'store']);
        Route::put('/users/{user}', [UserController::class, 'update']);
        Route::delete('/users/{user}', [UserController::class, 'destroy']);
        Route::put('/users/{user}/role', [UserController::class, 'assignRole']);
        Route::put('/users/{user}/toggle-active', [UserController::class, 'toggleActive']);
    });
});

Route::get('/user', function (Request $request) {
    $user = $request->user()->load('roles', 'permissions', 'tenant');
    return response()->json([
        'id' => $user->id,
        'name' => $user->name,
        'email' => $user->email,
        'is_active' => $user->is_active,
        'tenant_id' => $user->tenant_id,
        'roles' => $user->roles->map(fn ($r) => ['id' => $r->id, 'name' => $r->name]),
        'permissions' => $user->getAllPermissions()->pluck('name'),
        'tenant' => $user->tenant,
    ]);
})->middleware('auth:sanctum');
