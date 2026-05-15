package com.ecommerce.dto;

import org.junit.jupiter.api.Test;
import static org.junit.jupiter.api.Assertions.*;

import java.util.Arrays;
import java.util.List;

public class ChatResponseDTOTest {

    @Test
    public void testGetterAndSetter() {
        // Given
        ChatResponseDTO dto = new ChatResponseDTO();
        String reply = "The price of product 1 is $100.";
        String sqlQuery = "SELECT * FROM products WHERE id = 1";
        List<String> result = Arrays.asList("product1", "product2");

        // When
        dto.setReply(reply);
        dto.setSqlQuery(sqlQuery);
        dto.setResult(result);

        // Then
        assertEquals(reply, dto.getReply());
        assertEquals(sqlQuery, dto.getSqlQuery());
        assertEquals(result, dto.getResult());
    }

    @Test
    public void testNoArgsConstructor() {
        // Given
        ChatResponseDTO dto = new ChatResponseDTO();

        // Then
        assertNull(dto.getReply());
        assertNull(dto.getSqlQuery());
        assertNull(dto.getResult());
    }
}
