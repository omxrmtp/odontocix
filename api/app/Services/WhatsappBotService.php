<?php

namespace App\Services;

use App\Models\Doctor;
use App\Models\Patient;
use App\Models\WhatsappOutbox;
use App\Models\WhatsappSession;
use Carbon\Carbon;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Illuminate\Validation\ValidationException;

class WhatsappBotService
{
    private const SYSTEM_PROMPT = <<<'PROMPT'
Eres un asistente virtual de una clínica dental en Perú. Tu trabajo es ayudar a los pacientes mediante WhatsApp.

ACCIONES DISPONIBLES (devuelve SIEMPRE JSON válido):
- {"action": "register_patient", "data": {"dni": "12345678", "first_name": "Juan", "first_last_name": "Pérez", "phone": "999999999", "email": "opcional"}}
- {"action": "book_appointment", "data": {"doctor_id": 1, "date": "2026-08-01", "time": "10:00", "reason": "Revisión", "patient_dni": "12345678"}}
- {"action": "check_availability", "data": {"doctor_id": 1, "date": "2026-08-01"}}
- {"action": "confirm_booking", "data": {"confirmed": true}}
- {"action": "ask_clarification", "data": {"question": "¿Con qué doctor desea atenderse?"}}
- {"action": "greeting", "data": {"message": "¡Hola! Soy el asistente de OdontoCix. ¿En qué puedo ayudarte? Puedes agendar una cita, registrar un paciente o consultar disponibilidad."}}
- {"action": "fallback", "data": {"message": "No entendí bien. ¿Puedes repetirlo?"}}

REGLAS:
1. Si el usuario saluda, responde con action "greeting".
2. Si quiere agendar una cita pero falta información (doctor, fecha, hora), pregunta lo que falta con "ask_clarification".
3. Si tiene toda la información para agendar, pregunta confirmación con "confirm_booking" antes de crear.
4. Si quiere registrar un paciente, pide DNI, nombre completo y teléfono.
5. Los DNI peruanos tienen 8 dígitos.
6. Las fechas deben estar en formato YYYY-MM-DD.
7. Responde SIEMPRE en español y de forma amable y profesional.
8. El JSON debe ser válido y no incluir markdown.
PROMPT;

    public function __construct(
        private LlmService $llm,
        private AppointmentBookingService $booking,
        private WhatsappProviderInterface $whatsapp,
    ) {}

    public function handleInboundMessage(string $tenantId, string $fromPhone, string $message): void
    {
        $session = WhatsappSession::firstOrCreate(
            ['tenant_id' => $tenantId, 'phone' => $fromPhone],
            ['state' => 'idle', 'data' => [], 'last_activity' => now()]
        );

        $session->update(['last_activity' => now()]);

        // Historial de conversación (últimos 10 mensajes)
        $history = $session->data['history'] ?? [];
        $history[] = ['role' => 'user', 'content' => $message];
        if (count($history) > 20) {
            $history = array_slice($history, -20);
        }

        // Enriquecer el prompt con contexto de sesión
        $context = $this->buildContext($session);
        $systemPrompt = self::SYSTEM_PROMPT."\n\nCONTEXTO ACTUAL DE LA SESIÓN:\n".$context;

        try {
            $llmResponse = $this->llm->chat($systemPrompt, $history);
        } catch (\Throwable $e) {
            Log::error('LLM error en bot', ['error' => $e->getMessage(), 'phone' => $fromPhone]);
            $this->reply($fromPhone, 'Lo siento, tuve un problema procesando tu mensaje. ¿Podrías intentar de nuevo?');
            return;
        }

        $action = $llmResponse['action'] ?? 'fallback';
        $data = $llmResponse['data'] ?? [];

        // Guardar respuesta del asistente en historial
        $history[] = ['role' => 'assistant', 'content' => json_encode($llmResponse)];
        $session->update(['data' => array_merge($session->data ?? [], ['history' => $history])]);

        match ($action) {
            'register_patient' => $this->actionRegisterPatient($session, $fromPhone, $data),
            'book_appointment' => $this->actionBookAppointment($session, $fromPhone, $data),
            'check_availability' => $this->actionCheckAvailability($session, $fromPhone, $data),
            'confirm_booking' => $this->actionConfirmBooking($session, $fromPhone, $data),
            default => $this->reply($fromPhone, $data['message'] ?? '¿En qué puedo ayudarte?'),
        };
    }

    private function buildContext(WhatsappSession $session): string
    {
        $lines = [];
        $lines[] = "Estado: {$session->state}";

        if (! empty($session->data['pending_patient'])) {
            $p = $session->data['pending_patient'];
            $lines[] = "Paciente pendiente: {$p['first_name']} {$p['first_last_name']} (DNI: {$p['dni']})";
        }

        if (! empty($session->data['pending_appointment'])) {
            $a = $session->data['pending_appointment'];
            $lines[] = "Cita pendiente: doctor_id={$a['doctor_id']}, fecha={$a['date']}, hora={$a['time']}, motivo={$a['reason']}";
        }

        return implode("\n", $lines);
    }

    private function actionRegisterPatient(WhatsappSession $session, string $phone, array $data): void
    {
        $required = ['dni', 'first_name', 'first_last_name'];
        foreach ($required as $field) {
            if (empty($data[$field])) {
                $this->reply($phone, "Para registrar al paciente necesito: DNI, nombre y apellido paterno.");
                return;
            }
        }

        try {
            $patient = $this->booking->upsertPatient([
                'dni'             => $data['dni'],
                'first_name'      => $data['first_name'],
                'first_last_name' => $data['first_last_name'],
                'second_name'     => $data['second_name'] ?? null,
                'second_last_name'=> $data['second_last_name'] ?? null,
                'phone'           => $phone,
                'email'           => $data['email'] ?? null,
            ]);

            $this->reply($phone, "Paciente registrado exitosamente: {$patient->first_name} {$patient->first_last_name}.");
            $session->update(['state' => 'idle']);
        } catch (ValidationException $e) {
            $this->reply($phone, "Error al registrar: ".implode(', ', $e->validator->errors()->all()));
        } catch (\Throwable $e) {
            Log::error('Bot register patient error', ['error' => $e->getMessage()]);
            $this->reply($phone, "Ocurrió un error registrando al paciente. Intente más tarde.");
        }
    }

    private function actionCheckAvailability(WhatsappSession $session, string $phone, array $data): void
    {
        if (empty($data['doctor_id']) || empty($data['date'])) {
            $doctors = Doctor::orderBy('first_name')
                ->get(['id', 'first_name', 'first_last_name', 'specialty'])
                ->map(fn ($d) => "{$d->id}. {$d->first_name} {$d->first_last_name} ({$d->specialty})")
                ->implode("\n");

            $this->reply($phone, "¿Con qué doctor desea atenderse? Envíe el número:\n{$doctors}\nY la fecha (YYYY-MM-DD).");
            return;
        }

        $slots = $this->booking->availableSlots($data['doctor_id'], $data['date']);

        if (empty($slots)) {
            $this->reply($phone, "No hay horarios disponibles para el doctor en esa fecha.");
            return;
        }

        $lines = array_map(fn ($s) => "- {$s['start_time']} - {$s['end_time']}", $slots);
        $this->reply($phone, "Horarios disponibles:\n".implode("\n", $lines)."\n\nResponda con la hora que prefiera.");

        $session->update([
            'state' => 'booking',
            'data' => array_merge($session->data ?? [], ['pending_appointment' => $data]),
        ]);
    }

    private function actionBookAppointment(WhatsappSession $session, string $phone, array $data): void
    {
        $pending = $session->data['pending_appointment'] ?? [];
        $pending = array_merge($pending, array_filter($data));

        if (empty($pending['doctor_id']) || empty($pending['date']) || empty($pending['time'])) {
            $session->update(['data' => array_merge($session->data ?? [], ['pending_appointment' => $pending])]);
            $this->reply($phone, "Necesito confirmar: doctor, fecha y hora para agendar la cita.");
            return;
        }

        // Buscar slot que coincida
        $slot = DB::table('available_slots')
            ->where('doctor_id', $pending['doctor_id'])
            ->whereDate('date', $pending['date'])
            ->whereTime('start_time', $pending['time'])
            ->where('is_available', true)
            ->where('is_booked', false)
            ->first();

        if (! $slot) {
            $this->reply($phone, "El horario seleccionado ya no está disponible. Por favor elija otro.");
            return;
        }

        // Preparar datos del paciente
        $patientDni = $data['patient_dni'] ?? ($session->data['pending_patient']['dni'] ?? null);
        if (! $patientDni) {
            $this->reply($phone, "Para agendar la cita necesito el DNI del paciente.");
            return;
        }

        $patient = Patient::where('dni', $patientDni)->first();
        if (! $patient) {
            $session->update([
                'state' => 'registering',
                'data' => array_merge($session->data ?? [], [
                    'pending_appointment' => $pending,
                    'pending_patient' => ['dni' => $patientDni],
                ]),
            ]);
            $this->reply($phone, "No encontré al paciente con DNI {$patientDni}. Por favor envíe el nombre completo para registrarlo primero.");
            return;
        }

        // Preguntar confirmación
        $doctor = Doctor::find($pending['doctor_id']);
        $this->reply($phone, "Confirma la cita:\nDoctor: {$doctor->first_name} {$doctor->first_last_name}\nFecha: {$pending['date']}\nHora: {$pending['time']}\nMotivo: ".($pending['reason'] ?? 'Consulta')."\n\nResponda 'sí' para confirmar o 'no' para cancelar.");

        $session->update([
            'state' => 'confirming',
            'data' => array_merge($session->data ?? [], [
                'pending_appointment' => array_merge($pending, ['slot_id' => $slot->id]),
            ]),
        ]);
    }

    private function actionConfirmBooking(WhatsappSession $session, string $phone, array $data): void
    {
        $confirmed = $data['confirmed'] ?? false;
        $pending = $session->data['pending_appointment'] ?? [];

        if (! $confirmed || empty($pending['slot_id'])) {
            $this->reply($phone, "Cita cancelada. ¿Desea agendar en otro horario?");
            $session->update(['state' => 'idle', 'data' => array_diff_key($session->data ?? [], array_flip(['pending_appointment']))]);
            return;
        }

        $patientDni = $session->data['pending_patient']['dni']
            ?? $pending['patient_dni']
            ?? null;

        $patient = Patient::where('dni', $patientDni)->first();
        if (! $patient) {
            $this->reply($phone, "Error: no se encontró el paciente.");
            return;
        }

        try {
            $result = $this->booking->bookBySlot(
                $pending['slot_id'],
                [
                    'dni' => $patient->dni,
                    'first_name' => $patient->first_name,
                    'first_last_name' => $patient->first_last_name,
                    'phone' => $patient->phone,
                    'email' => $patient->email,
                ],
                $pending['reason'] ?? null
            );

            $appointment = $result['appointment'];
            $this->reply($phone, "Cita confirmada exitosamente.\nDoctor: {$appointment->doctor->first_name} {$appointment->doctor->first_last_name}\nFecha: {$appointment->start_date->format('d/m/Y')}\nHora: {$appointment->start_date->format('H:i')}\n\n¡Te esperamos!");

            $session->update(['state' => 'idle', 'data' => []]);
        } catch (\Throwable $e) {
            Log::error('Bot confirm booking error', ['error' => $e->getMessage()]);
            $this->reply($phone, "Ocurrió un error agendando la cita. Intente más tarde.");
        }
    }

    private function reply(string $to, string $message): void
    {
        try {
            $this->whatsapp->sendText($to, $message);
        } catch (\Throwable $e) {
            Log::error('Bot reply failed', ['to' => $to, 'error' => $e->getMessage()]);
        }
    }
}
