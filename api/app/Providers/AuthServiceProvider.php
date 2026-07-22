<?php

namespace App\Providers;

use App\Models\AuditLog;
use App\Models\Appointment;
use App\Models\Budget;
use App\Models\CashTransaction;
use App\Models\ConsentForm;
use App\Models\Doctor;
use App\Models\InventoryItem;
use App\Models\Patient;
use App\Models\Payment;
use App\Models\Treatment;
use App\Models\User;
use App\Policies\AppointmentPolicy;
use App\Policies\AuditLogPolicy;
use App\Policies\BudgetPolicy;
use App\Policies\CashTransactionPolicy;
use App\Policies\ConsentFormPolicy;
use App\Policies\DoctorPolicy;
use App\Policies\InventoryPolicy;
use App\Policies\PatientPolicy;
use App\Policies\PaymentPolicy;
use App\Policies\TreatmentPolicy;
use App\Policies\UserPolicy;
use Illuminate\Foundation\Support\Providers\AuthServiceProvider as ServiceProvider;
use Illuminate\Support\Facades\Gate;

class AuthServiceProvider extends ServiceProvider
{
    protected $policies = [
        Patient::class => PatientPolicy::class,
        Doctor::class => DoctorPolicy::class,
        Appointment::class => AppointmentPolicy::class,
        Budget::class => BudgetPolicy::class,
        Payment::class => PaymentPolicy::class,
        CashTransaction::class => CashTransactionPolicy::class,
        Treatment::class => TreatmentPolicy::class,
        ConsentForm::class => ConsentFormPolicy::class,
        InventoryItem::class => InventoryPolicy::class,
        AuditLog::class => AuditLogPolicy::class,
        User::class => UserPolicy::class,
    ];

    public function boot(): void
    {
        Gate::before(function ($user, string $ability) {
            if ($user->hasRole('Super Admin')) {
                return true;
            }
        });
    }
}
