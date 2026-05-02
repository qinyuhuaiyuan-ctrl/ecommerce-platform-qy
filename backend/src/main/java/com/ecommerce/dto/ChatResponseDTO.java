package com.ecommerce.dto;

import lombok.Data;
import java.util.List;

@Data
public class ChatResponseDTO {
    private String reply;
    private String sqlQuery;
    private List<?> result;
}
