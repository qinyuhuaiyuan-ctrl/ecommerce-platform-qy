package com.ecommerce.dto;

import lombok.Data;

@Data
public class OrderListDTO {
    private Long id;
    private Integer totalAmount;
    private Integer status;
    private String statusText;
    private String createTime;
    private Integer itemCount;
}
