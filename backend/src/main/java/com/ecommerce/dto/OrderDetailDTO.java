package com.ecommerce.dto;

import lombok.Data;
import java.util.List;

@Data
public class OrderDetailDTO {
    private Long id;
    private Integer totalAmount;
    private String receiverName;
    private String receiverPhone;
    private String receiverAddress;
    private Integer status;
    private String statusText;
    private String createTime;
    private String payTime;
    private List<OrderItemDTO> items;
}
