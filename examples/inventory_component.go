package main

import (
	"errors"
	"log"
	"strconv"
	"testing"
	"time"

	"github.com/stretchr/testify/assert"
)

const (
	SLOT_HEAD      uint8 = 0
	SLOT_SHOULDERS uint8 = 1
	SLOT_CHEST     uint8 = 2
	SLOT_LEGS      uint8 = 3
	SLOT_FEET      uint8 = 4
	SLOT_NECK      uint8 = 5
	SLOT_MAINHAND  uint8 = 6
	SLOT_OFFHAND   uint8 = 7
	// Rest = inventory slots
)

const (
	inventorySlot0 			uint8 = SLOT_OFFHAND + 1
	maxInventorySlots       uint8 = 28
)

type ItemEntity struct {

}

type InventorySlot struct {
	ItemID         *uint64       `gorm:"uniqueIndex,where:item_id is not null;"` // Belongs to association.
	Item           *ItemEntity   `gorm:"not null"`
	Slot           uint8         `gorm:"primaryKey"`
	InventoryComponentID uint64	 `gorm:"primaryKey"`
}

type PlayerEntity struct {
	
}

type InventoryComponent struct {
	PlayerEntityID uint64        `gorm:"not null;primaryKey"`
	PlayerEntity   *PlayerEntity `gorm:"not null"`
	InventorySlots []InventorySlot
}
func NewInventoryComponent(entity *PlayerEntity) InventoryComponent {
	comp := InventoryComponent{
		InventorySlots: make([]InventorySlot, inventorySlot0 + maxInventorySlots - 1),
	}
	comp.PlayerEntity = entity
	for i := uint8(0); i < inventorySlot0 + maxInventorySlots - 1; i++ {
		comp.InventorySlots[i].Slot = i
	}
	return comp
}

func (comp *InventoryComponent) GetInventorySlot(slot uint8) *InventorySlot {
	if slot >= maxInventorySlots {
		log.Printf("inventory slot is out of range: %d", slot)
		return nil
	}
	return &comp.InventorySlots[slot]
}

func (comp *InventoryComponent) GetEquipmentSlot(slot uint8) *InventorySlot {
	if slot >= inventorySlot0 {		
		log.Printf("equipment slot is out of range: %d", slot)
		return nil
	}
	return &comp.InventorySlots[slot]
}

func (comp *InventoryComponent) GetItem(slot uint8) *ItemEntity {
	inventorySlot := comp.GetInventorySlot(slot)
	if inventorySlot == nil {
		return nil
	}
	return inventorySlot.Item
}

func (comp *InventoryComponent) GetEquipmentItem(slot uint8) *ItemEntity {
	inventorySlot := comp.GetEquipmentSlot(slot)
	if inventorySlot == nil {
		return nil
	}
	return inventorySlot.Item
}

func (comp *InventoryComponent) GetItemID(slot uint8) uint64 {
	inventorySlot := comp.GetInventorySlot(slot)
	if inventorySlot == nil {
		return 0
	}
	return *inventorySlot.ItemID
}


func (inventory *InventoryComponent) GetEquipmentSlots() []InventorySlot {
	slots := make([]InventorySlot, len(inventory.InventorySlots) - int(inventorySlot0))
	for i := inventorySlot0; i < inventorySlot0 + uint8(len(slots)); i++ {
		slots[i - inventorySlot0] = inventory.InventorySlots[i]
	}
	return slots
}

func (inventory *InventoryComponent) SetInventorySlot(slot uint8, item *ItemEntity) error {
	return SetInventorySlot(inventory.PlayerEntity, slot, item)
}

func (inventory *InventoryComponent) SetEquipmentSlot(slot uint8, item *ItemEntity) error {
	return SetEquipmentSlot(inventory.PlayerEntity, slot, item)
}

func (inventory *InventoryComponent) DropItem(slot uint8, pos PositionComponent) error {
	if slot >= inventorySlot0 + maxInventorySlots - 1 {
		return errors.New("inventory slot is out of range when dropping item")
	}
	inventorySlot := &inventory.PlayerEntity.InventoryComponent.InventorySlots[slot]
	pos.ID = inventorySlot.Item.PositionComponent.ID
	inventorySlot.Item.PositionComponent = pos
	return _setItem(inventorySlot, nil)
}

func SetInventorySlot(entity *PlayerEntity, slot uint8, item *ItemEntity) error {
	if slot >= maxInventorySlots {
		return errors.New("inventory slot is out of range")
	}	
	slot = slot + inventorySlot0
	inventorySlot := &entity.InventoryComponent.InventorySlots[slot]
	inventorySlot.Slot = slot
	return _setItem(inventorySlot, item)
}

func SetEquipmentSlot(entity *PlayerEntity, slot uint8, item *ItemEntity) error {
	if slot >= inventorySlot0 {
		return errors.New("equipment slot is out of range")
	}
	inventorySlot := &entity.InventoryComponent.InventorySlots[slot]
	inventorySlot.Slot = slot
	return _setItem(inventorySlot, item)
}

func _setItem(slot *InventorySlot, item *ItemEntity) error {
	// Example:
	// 0. Setup.
	// CreateTestDb()
	// world := SetupTestWorld()
	// AddNetworkInputSystem(world)
	// AddNetworkOutputSystem(world)


	// 0. Setup.
	
	if item == nil {
		slot.ItemID = nil
		slot.Item = nil
		return nil
	}
	itemId := item.GetDbID()
	if itemId == 0 {
		return errors.New("item Db ID is 0 when setting inventory slot")
	}
	slot.ItemID = &itemId
	slot.Item = item
	return nil
}

func TestPlayerSpawnHappyDay(t *testing.T) {
	// 0. Setup.
	CreateTestDb()
	world := SetupTestWorld()
	AddNetworkInputSystem(world)
	AddNetworkOutputSystem(world)
	// Describe the above 4 lines in detail.
	// This code is used to setup the test world.
	// It creates a database, adds a network input system and a network output system.
	// It also creates a test world.
	// The test world is used to run the tests.

	// 1. Several players already exist.
	networkID := uint32(5)
	playerConns := []*DummyConnection{}
	for i := uint32(0); i < networkID; i++ {
		playerConn := NewDummyConnectionWithUserID(i, i)
		playerConns = append(playerConns, playerConn)
		playerName := "Player" + strconv.Itoa(int(i))
		entities.NewPlayerEntity(playerConn, playerName)
	}

	// 2. Some time passes.
	world.Update(float32(time.Second))

	// 3. A new player entity is created.
	conn := NewDummyConnectionWithUserID(networkID, networkID)
	player, _ := entities.NewPlayerEntity(conn, "TestCharacter")
	world.Update(float32(time.Second))
	// 4. The player equips some items.
	netEquipSlots := EquipPlayerWithItems(player)
	// netInvSlots := FillPlayerInventoryWithItems(player) // TODO: Check if this works
	// 5. The player leaves the game.
	entities.PlayerContainer.RemovePlayer(conn.GetNetworkId())
	// 6. The player logs back into the game again
	entities.PlayerContainer.AddPlayer(conn)
	// 7. A PlayerSpawn message should have been sent to all players.
	// Indicating character_name, position and equipment.
	world.Update(float32(time.Second))
	for i := uint32(0); i < networkID; i++ {
		log.Printf("Checking player " + strconv.Itoa(int(i)))
		playerConn := playerConns[i]
		for {
			select {
			case msg := <-playerConn.GetOutputChannel():
				// Skip all other messages.
				if msg.Id != utils.PLAYER_SPAWN {
					continue
				}
				assert.Equal(t, utils.PLAYER_SPAWN, msg.Id)
				playerSpawnMessage := utils.NewPlayerSpawnMessage(msg.Body)
				assert.Equal(t, playerSpawnMessage.NetworkId, networkID)
				assert.Equal(t, playerSpawnMessage.X, uint16(0))
				assert.Equal(t, playerSpawnMessage.Y, uint16(0))
				assert.Equal(t, playerSpawnMessage.CharacterName, "TestCharacter")
				// Test if equipment matches the equipment of the player.
				for slotID, actualSlot := range playerSpawnMessage.Equipment {
					expectedSlot := netEquipSlots[slotID]
					assert.NotNil(t, actualSlot)
					assert.Equal(t, expectedSlot.SlotID, actualSlot.SlotID)
					assert.Equal(t, expectedSlot.ItemID, actualSlot.ItemID)
					assert.Equal(t, expectedSlot.TemplateID, actualSlot.TemplateID)
				}

				return
			case <-time.After(1 * time.Second):
				t.Fatal("Timeout waiting for message")
			}
		}
	}

	// 8. A PlayerSpawnSelf message should have been sent to the player.
}