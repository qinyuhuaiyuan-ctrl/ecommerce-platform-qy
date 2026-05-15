package com.ecommerce.dto;

import org.junit.jupiter.api.Test;
import static org.junit.jupiter.api.Assertions.*;

public class ChatRequestDTOTest {

    @Test
    public void testGetterAndSetter() {
        // Given
        ChatRequestDTO dto = new ChatRequestDTO();
        String message = "Hello, what is the price of product 1?";

        // When
        dto.setMessage(message);

        // Then
        assertEquals(message, dto.getMessage());
    }

    @Test
    public void testNoArgsConstructor() {
        // Given
        ChatRequestDTO dto = new ChatRequestDTO();

        // Then
        assertNull(dto.getMessage());
    }
}
