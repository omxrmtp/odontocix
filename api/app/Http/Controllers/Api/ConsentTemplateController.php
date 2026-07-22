<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\ConsentTemplate;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class ConsentTemplateController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $templates = ConsentTemplate::query()
            ->when($request->category, fn ($q) => $q->where('category', $request->category))
            ->orderBy('title')
            ->get();

        return response()->json($templates);
    }

    public function store(Request $request): JsonResponse
    {
        $data = $request->validate([
            'title' => 'required|string|max:255',
            'content' => 'required|string',
            'category' => 'nullable|string|max:50',
            'is_default' => 'nullable|boolean',
        ]);

        $template = ConsentTemplate::create($data);

        return response()->json($template, 201);
    }

    public function show(ConsentTemplate $template): JsonResponse
    {
        return response()->json($template);
    }

    public function update(Request $request, ConsentTemplate $template): JsonResponse
    {
        $data = $request->validate([
            'title' => 'sometimes|string|max:255',
            'content' => 'sometimes|string',
            'category' => 'nullable|string|max:50',
            'is_default' => 'nullable|boolean',
        ]);

        $template->update($data);

        return response()->json($template);
    }

    public function destroy(ConsentTemplate $template): JsonResponse
    {
        $template->delete();

        return response()->json(['message' => 'Plantilla eliminada.']);
    }
}
