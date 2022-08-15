package main

type PositionComponent struct {
	ID         uint   `gorm:"primarykey"`
	X          uint16 `gorm:"default:0"`
	Y          uint16 `gorm:"default:0"`
	O          uint8  `gorm:"default:0"`
	GameMap    uint16 `gorm:"default:1"`
	LastUpdate uint64
	IsPosDirty bool `gorm:"-:all"`
}
