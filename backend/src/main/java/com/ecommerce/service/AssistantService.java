package com.ecommerce.service;

import com.ecommerce.dto.ChatRequestDTO;
import com.ecommerce.dto.ChatResponseDTO;

public interface AssistantService {
    ChatResponseDTO chat(ChatRequestDTO request, Long userId);
}
