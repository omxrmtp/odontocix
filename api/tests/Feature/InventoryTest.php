<?php

namespace Tests\Feature;

use App\Models\InventoryItem;
use App\Models\InventoryMovement;
use Tests\CreatesTenant;
use Tests\TestCase;
use Illuminate\Foundation\Testing\RefreshDatabase;

class InventoryTest extends TestCase
{
    use RefreshDatabase, CreatesTenant;

    protected function setUp(): void
    {
        parent::setUp();
        $this->setUpTenant();
    }

    public function test_can_list_inventory_items(): void
    {
        InventoryItem::factory()->count(3)->create(['tenant_id' => $this->tenant->id]);

        $response = $this->getJson('/api/inventory', $this->authHeaders());

        $response->assertOk()
            ->assertJsonStructure(['data']);
        $this->assertCount(3, $response->json('data'));
    }

    public function test_can_filter_by_category(): void
    {
        InventoryItem::factory()->create(['tenant_id' => $this->tenant->id, 'category' => 'insumos']);
        InventoryItem::factory()->create(['tenant_id' => $this->tenant->id, 'category' => 'equipos']);

        $response = $this->getJson('/api/inventory?category=insumos', $this->authHeaders());

        $response->assertOk();
        $this->assertCount(1, $response->json('data'));
        $this->assertEquals('insumos', $response->json('data.0.category'));
    }

    public function test_can_filter_low_stock(): void
    {
        InventoryItem::factory()->create(['tenant_id' => $this->tenant->id, 'quantity' => 2, 'min_stock' => 5]);
        InventoryItem::factory()->create(['tenant_id' => $this->tenant->id, 'quantity' => 10, 'min_stock' => 5]);

        $response = $this->getJson('/api/inventory?low_stock=1', $this->authHeaders());

        $response->assertOk();
        $this->assertCount(1, $response->json('data'));
        $this->assertEquals(2, $response->json('data.0.quantity'));
    }

    public function test_can_search_items(): void
    {
        InventoryItem::factory()->create(['tenant_id' => $this->tenant->id, 'name' => 'Guantes']);
        InventoryItem::factory()->create(['tenant_id' => $this->tenant->id, 'name' => 'Mascarillas']);

        $response = $this->getJson('/api/inventory?search=guan', $this->authHeaders());

        $response->assertOk();
        $this->assertCount(1, $response->json('data'));
        $this->assertEquals('Guantes', $response->json('data.0.name'));
    }

    public function test_can_create_item(): void
    {
        $data = [
            'name' => 'Guantes de nitrilo',
            'category' => 'insumos',
            'unit' => 'caja',
            'quantity' => 50,
            'min_stock' => 10,
        ];

        $response = $this->postJson('/api/inventory', $data, $this->authHeaders());

        $response->assertCreated()
            ->assertJsonFragment(['name' => 'Guantes de nitrilo']);
    }

    public function test_can_show_item_with_movements(): void
    {
        $item = InventoryItem::factory()->create(['tenant_id' => $this->tenant->id]);
        InventoryMovement::factory()->create([
            'tenant_id' => $this->tenant->id,
            'inventory_item_id' => $item->id,
            'user_id' => $this->user->id,
        ]);

        $response = $this->getJson("/api/inventory/{$item->id}", $this->authHeaders());

        $response->assertOk()
            ->assertJsonStructure(['id', 'movements']);
    }

    public function test_can_update_item(): void
    {
        $item = InventoryItem::factory()->create(['tenant_id' => $this->tenant->id]);

        $response = $this->putJson("/api/inventory/{$item->id}", [
            'name' => 'Updated name',
            'min_stock' => 20,
        ], $this->authHeaders());

        $response->assertOk()
            ->assertJsonFragment(['name' => 'Updated name', 'min_stock' => 20]);
    }

    public function test_can_delete_item(): void
    {
        $item = InventoryItem::factory()->create(['tenant_id' => $this->tenant->id]);

        $response = $this->deleteJson("/api/inventory/{$item->id}", [], $this->authHeaders());

        $response->assertOk()
            ->assertJson(['message' => 'Artículo eliminado.']);
        $this->assertDatabaseMissing('inventory_items', ['id' => $item->id]);
    }

    public function test_can_register_entry_movement(): void
    {
        $item = InventoryItem::factory()->create(['tenant_id' => $this->tenant->id, 'quantity' => 10]);

        $response = $this->postJson("/api/inventory/{$item->id}/movement", [
            'type' => 'entry',
            'quantity' => 5,
            'reason' => 'Compra mensual',
        ], $this->authHeaders());

        $response->assertOk()
            ->assertJsonFragment(['quantity' => 15]);
        $this->assertDatabaseHas('inventory_movements', [
            'inventory_item_id' => $item->id,
            'type' => 'entry',
            'quantity' => 5,
        ]);
    }

    public function test_can_register_exit_movement(): void
    {
        $item = InventoryItem::factory()->create(['tenant_id' => $this->tenant->id, 'quantity' => 10]);

        $response = $this->postJson("/api/inventory/{$item->id}/movement", [
            'type' => 'exit',
            'quantity' => 3,
            'reason' => 'Uso clínico',
        ], $this->authHeaders());

        $response->assertOk()
            ->assertJsonFragment(['quantity' => 7]);
    }

    public function test_exit_movement_fails_when_insufficient_stock(): void
    {
        $item = InventoryItem::factory()->create(['tenant_id' => $this->tenant->id, 'quantity' => 2]);

        $response = $this->postJson("/api/inventory/{$item->id}/movement", [
            'type' => 'exit',
            'quantity' => 5,
        ], $this->authHeaders());

        $response->assertStatus(500);
    }

    public function test_can_register_adjustment_movement(): void
    {
        $item = InventoryItem::factory()->create(['tenant_id' => $this->tenant->id, 'quantity' => 10]);

        $response = $this->postJson("/api/inventory/{$item->id}/movement", [
            'type' => 'adjustment',
            'quantity' => 8,
            'reason' => 'Inventario físico',
        ], $this->authHeaders());

        $response->assertOk()
            ->assertJsonFragment(['quantity' => 8]);
    }

    public function test_can_list_low_stock_items(): void
    {
        InventoryItem::factory()->create(['tenant_id' => $this->tenant->id, 'quantity' => 2, 'min_stock' => 5]);
        InventoryItem::factory()->create(['tenant_id' => $this->tenant->id, 'quantity' => 10, 'min_stock' => 5]);

        $response = $this->getJson('/api/inventory/low-stock', $this->authHeaders());

        $response->assertOk()
            ->assertJsonCount(1);
    }
}
