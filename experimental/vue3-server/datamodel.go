package vue3server

type Product struct {
	SKU       string  `json:"sku"`
	Title     string  `json:"title"`
	UnitsSold int     `json:"units_sold"`
	Price     float64 `json:"unit_price"`
	Discount  float64 `json:"discount"`
}

type Products struct {
	Products []Product `json:"products"`
}
