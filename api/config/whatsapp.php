<?php

return [
    'provider' => env('WHATSAPP_PROVIDER', 'meta'),

    'meta' => [
        'api_version' => env('WHATSAPP_API_VERSION', 'v19.0'),
        'phone_number_id' => env('WHATSAPP_PHONE_NUMBER_ID'),
        'business_account_id' => env('WHATSAPP_BUSINESS_ACCOUNT_ID'),
        'access_token' => env('WHATSAPP_TOKEN'),
        'webhook_verify_token' => env('WHATSAPP_WEBHOOK_VERIFY_TOKEN'),
    ],

    'templates' => [
        'appointment_reminder' => env('WHATSAPP_TEMPLATE_REMINDER', 'appointment_reminder'),
        'appointment_confirmation' => env('WHATSAPP_TEMPLATE_CONFIRMATION', 'appointment_confirmation'),
    ],
];
