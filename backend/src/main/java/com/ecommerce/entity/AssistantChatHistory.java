package com.ecommerce.entity;

import com.baomidou.mybatisplus.annotation.IdType;
import com.baomidou.mybatisplus.annotation.TableId;
import com.baomidou.mybatisplus.annotation.TableName;
import lombok.Data;
import java.time.LocalDateTime;

@Data
@TableName("assistant_chat_history")
public class AssistantChatHistory {
    @TableId(type = IdType.AUTO)
    private Long id;
    private Long userId;
    private String role;
    private String message;
    private String sqlQuery;
    private String operationType;
    private LocalDateTime createTime;
}
