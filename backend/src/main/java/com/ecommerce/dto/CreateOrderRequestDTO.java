package com.ecommerce.dto;

import lombok.Data;
import java.util.List;

@Data
public class CreateOrderRequestDTO {
    private List<Long> cartIds;
    private String receiverName;
    private String receiverPhone;
    private String receiverAddress;
}
