package main

import "gorm.io/gorm"

type ItemInstanceComponent struct {
	gorm.Model
	ItemTemplateEntityID int
	ItemTemplateEntity   ItemTemplateEntity
	Durability           uint16 `gorm:"default:1"`
	Amount               uint16 `gorm:"default:1"`
}

type ItemTemplateComponent struct {
	gorm.Model
	Name        string `gorm:"default:Default."`
	Description string `gorm:"default:No description."`
	Iconid      uint16 `gorm:"default:0"`
}
