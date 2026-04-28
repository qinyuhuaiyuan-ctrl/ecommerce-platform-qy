package com.ecommerce.dto;

import lombok.Data;

@Data
public class OrderItemDTO {
    private String productName;
    private Integer price;
    private Integer quantity;
    private Integer subtotal;
}
