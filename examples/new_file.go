package main

import (
	"strconv"
	"testing"
	"time"
)

func TestPlayerMovementHappyDay(t *testing.T) {
	// 0. Setup.
	CreateTestDb()
	world = SetupTestWorld()
	AddNetworkInputSystem(world)
	AddNetworkOutputSystem(world)
	// 1. Several players already exist.
	networkID = uint32(5)
	playerConns = []*DummyConnection{}
	for i := uint32(0); i < networkID; i++ {
		playerConn := NewDummyConnectionWithUserID(i, i)
		playerConns = append(playerConns, playerConn)
		playerName := "Player" + strconv.Itoa(int(i))
		entities.NewPlayerEntity(playerConn, playerName)
	}

	// 2. And a new player is added.
	conn := NewDummyConnectionWithUserID(networkID, networkID)
	player, _ := entities.NewPlayerEntity(conn, "TestCharacter")

	// 3. Some time passes.
	world.Update(float32(time.Second))
	// <snippet>
	// InventoryComponent struct {
	// 	PlayerEntityID uint64        `gorm:"not null;primaryKey"`
	// 	PlayerEntity   *PlayerEntity `gorm:"not null"`
	// 	InventorySlots []InventorySlot
	// }
	// 
	// PlayerEntity struct {
	// 	
	// }
	// 
	// InventorySlot struct {
	// 	ItemID         *uint64       `gorm:"uniqueIndex,where:item_id is not null;"` // Belongs to association.
	// 	Item           *ItemEntity   `gorm:"not null"`
	// 	Slot           uint8         `gorm:"primaryKey"`
	// 	InventoryComponentID uint64	 `gorm:"primaryKey"`
	// }
	// 
	// ItemEntity struct {
	// 
	// }
	// </snippet>
	


	// 4. The player moves.
	player.Move(0, 1)



	// 5. Some time passes.
	world.Update(float32(time.Second))
	

// func (comp *InventoryComponent) GetEquipmentSlot(slot uint8) *InventorySlot {
// 	if slot >= inventorySlot0 {
// 		log.Printf("equipment slot is out of range: %d", slot)
// 		return nil
// 	}
// 	return &comp.InventorySlots[slot]
// }
	equipmentSlots := player.GetInventoryComponent().GetEquipmentSlots()

	// 6. Other players should see the player moved.
	for _, playerConn := range playerConns {
		if playerConn.UserID == conn.UserID {
			continue
		}
		player := playerConn.Player
		if player.X != 0 || player.Y != 1 {
			t.Errorf("Player %d moved to %d, %d, expected 0, 1", playerConn.UserID, player.X, player.Y)
		}
	}
}
