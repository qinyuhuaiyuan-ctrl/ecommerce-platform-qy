package com.ecommerce.dto;

import lombok.Data;

@Data
public class LoginResponseDTO {
    private Long userId;
    private String username;
    private String token;
}
