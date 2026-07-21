<?php

namespace App\Services;

use Illuminate\Support\Facades\Http;

class ReniecService
{
    public function lookup(string $dni): ?array
    {
        $token = config('services.reniec.token');
        $url = config('services.reniec.url');

        $response = Http::withToken($token)->get($url, ['numero' => $dni]);

        if (! $response->successful()) return null;

        $data = $response->json();

        return [
            'dni' => $data['document_number'],
            'first_name' => $data['first_name'],
            'first_last_name' => $data['first_last_name'],
            'second_last_name' => $data['second_last_name'],
            'full_name' => $data['full_name'],
        ];
    }
}
