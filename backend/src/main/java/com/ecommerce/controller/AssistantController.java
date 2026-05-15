package com.ecommerce.controller;

import com.ecommerce.dto.ChatRequestDTO;
import com.ecommerce.dto.ChatResponseDTO;
import com.ecommerce.service.AssistantService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/assistant")
public class AssistantController {

    @Autowired
    private AssistantService assistantService;

    @PostMapping("/chat")
    public Result<ChatResponseDTO> chat(@RequestBody ChatRequestDTO request,
                                        @RequestHeader("X-User-Id") Long userId) {
        if (request.getMessage() == null || request.getMessage().isBlank()) {
            return Result.error("消息不能为空");
        }
        return Result.success(assistantService.chat(request, userId));
    }
}
