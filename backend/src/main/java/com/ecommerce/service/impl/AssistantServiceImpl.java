package com.ecommerce.service.impl;

import com.ecommerce.config.AssistantConfig;
import com.ecommerce.dto.ChatRequestDTO;
import com.ecommerce.dto.ChatResponseDTO;
import com.ecommerce.entity.AssistantChatHistory;
import com.ecommerce.mapper.AssistantChatHistoryMapper;
import com.ecommerce.entity.Cart;
import com.ecommerce.entity.Order;
import com.ecommerce.entity.Product;
import com.ecommerce.mapper.CartMapper;
import com.ecommerce.mapper.OrderMapper;
import com.ecommerce.mapper.ProductMapper;
import com.baomidou.mybatisplus.core.conditions.query.QueryWrapper;
import com.ecommerce.dto.CartItemDTO;
import com.ecommerce.dto.CreateOrderRequestDTO;
import com.ecommerce.service.AssistantService;
import com.ecommerce.service.CartService;
import com.ecommerce.service.OrderService;
import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.*;
import org.springframework.stereotype.Service;
import javax.sql.DataSource;
import org.springframework.web.client.RestTemplate;

import java.time.LocalDateTime;
import java.util.*;
import java.util.regex.Matcher;
import java.util.stream.Collectors;
import java.util.regex.Pattern;

@Service
public class AssistantServiceImpl implements AssistantService {

    @Autowired
    private AssistantConfig config;

    @Autowired
    private AssistantChatHistoryMapper historyMapper;

    @Autowired
    private ProductMapper productMapper;

    @Autowired
    private CartMapper cartMapper;

    @Autowired
    private OrderMapper orderMapper;

    @Autowired
    private CartService cartService;

    @Autowired
    private OrderService orderService;

    private final ObjectMapper objectMapper = new ObjectMapper();
    private final RestTemplate restTemplate = new RestTemplate();

    private static final String SYSTEM_PROMPT = """
            你是一个电商平台的智能助手。你的任务是将用户的自然语言转换为数据库查询SQL或操作指令。

            ## 数据库表结构
            - user: id, username, phone, create_time
            - product: id, name, description, price, stock, category_id, image_url, status, create_time
            - category: id, name, sort
            - cart: id, user_id, product_id, quantity, create_time
            - orders: id, user_id, total_amount, receiver_name, receiver_phone, receiver_address, status, create_time, pay_time
            - order_item: id, order_id, product_id, product_name, product_price, quantity, subtotal

            ## 拒答规则
            1. 只能回答与电商平台相关的问题（商品、订单、购物车、账户信息等）
            2. 对于无关问题，统一回复："抱歉，我只能帮助你解决电商相关的问题，如商品查询、订单管理等。"
            3. 禁止参与任何非电商相关的对话主题

            ## 安全规则
            1. 只能生成 SELECT 查询，禁止 UPDATE/DELETE/INSERT/DROP
            2. 禁止查询 user 表的 password 字段
            3. 不要添加 user_id 条件，后端会自动注入
            4. 操作类请求返回结构化指令，不要生成 SQL

            ## 可用操作指令（params 都用自然标识符，后端负责解析为数据库 ID）
            - ADD_TO_CART: 加入购物车，params: {productName, quantity?}
            - CREATE_ORDER: 创建订单，params: {receiverName, receiverPhone, receiverAddress}
            - PAY_ORDER: 支付订单，params: {orderDescription}
            - CANCEL_ORDER: 取消订单，params: {orderDescription}
            - UPDATE_CART: 修改购物车数量，params: {productName, quantity}
            - REMOVE_FROM_CART: 移除购物车商品，params: {productName}

            ## 输出格式
            查询时返回（explanation 是展示给用户的自然语言回复）：
            { "type": "QUERY", "sql": "SELECT ...", "explanation": "好的，我帮你查询..." }

            操作时返回（后端直接执行，reply 是执行结果的自然语言回复）：
            { "type": "ACTION", "action": "ADD_TO_CART", "params": {...}, "reply": "已帮你将 iPhone 15 加入购物车" }

            无关问题时返回：
            { "type": "REJECT", "message": "抱歉，我只能帮助你解决电商相关的问题..." }
            """;

    private static final Set<String> ALLOWED_TABLES = Set.of("product", "category", "cart", "orders", "order_item", "user");
    private static final Pattern TABLE_PATTERN = Pattern.compile("\\b(FROM|JOIN)\\s+\"?([a-zA-Z_]+)\"?", Pattern.CASE_INSENSITIVE);
    private static final Pattern STATEMENT_PATTERN = Pattern.compile("^\\s*(SELECT|INSERT|UPDATE|DELETE|DROP|ALTER|CREATE|TRUNCATE)",
            Pattern.CASE_INSENSITIVE);

    @Override
    public ChatResponseDTO chat(ChatRequestDTO request, Long userId) {
        String userMessage = request.getMessage();
        saveHistory(userId, "user", userMessage, null, null);

        ChatResponseDTO response = processChat(userMessage, userId);

        saveHistory(userId, "assistant", response.getReply(), response.getSqlQuery(), null);
        return response;
    }

    private ChatResponseDTO processChat(String userMessage, Long userId) {
        try {
            String llmOutput = callDeepSeek(userMessage);

            Map<String, Object> parsed = objectMapper.readValue(llmOutput, new TypeReference<Map<String, Object>>() {});

            String type = (String) parsed.get("type");

            if ("REJECT".equals(type)) {
                ChatResponseDTO dto = new ChatResponseDTO();
                dto.setReply((String) parsed.get("message"));
                return dto;
            }

            if ("ACTION".equals(type)) {
                return handleAction(parsed, userId);
            }

            if ("QUERY".equals(type)) {
                return handleQuery(parsed, userId);
            }

            ChatResponseDTO dto = new ChatResponseDTO();
            dto.setReply("抱歉，我暂时无法处理这个请求。");
            return dto;

        } catch (Exception e) {
            ChatResponseDTO dto = new ChatResponseDTO();
            dto.setReply("处理请求时出现错误，请稍后重试。");
            return dto;
        }
    }

    private String callDeepSeek(String userMessage) throws Exception {
        Map<String, Object> body = new HashMap<>();
        body.put("model", config.getModel());
        body.put("messages", List.of(
                Map.of("role", "system", "content", SYSTEM_PROMPT),
                Map.of("role", "user", "content", userMessage)
        ));
        body.put("temperature", 0.1);

        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(MediaType.APPLICATION_JSON);
        headers.setBearerAuth(config.getKey());

        HttpEntity<Map<String, Object>> request = new HttpEntity<>(body, headers);
        ResponseEntity<Map> response = restTemplate.postForEntity(config.getUrl(), request, Map.class);

        List<Map<String, Object>> choices = (List<Map<String, Object>>) response.getBody().get("choices");
        Map<String, Object> message = (Map<String, Object>) choices.get(0).get("message");
        return (String) message.get("content");
    }

    private ChatResponseDTO handleQuery(Map<String, Object> parsed, Long userId) {
        String sql = (String) parsed.get("sql");
        String explanation = (String) parsed.get("explanation");

        if (!isValidSql(sql)) {
            ChatResponseDTO dto = new ChatResponseDTO();
            dto.setReply("抱歉，生成的查询不符合安全规则。");
            return dto;
        }

        String safeSql = injectUserId(sql, userId);
        ChatResponseDTO dto = new ChatResponseDTO();
        dto.setReply(explanation);
        dto.setSqlQuery(safeSql);

        try {
            List<Map<String, Object>> result = executeQuery(safeSql);
            dto.setResult(result);
        } catch (Exception e) {
            dto.setReply("查询执行失败：" + e.getMessage());
        }
        return dto;
    }

    private ChatResponseDTO handleAction(Map<String, Object> parsed, Long userId) {
        String action = (String) parsed.get("action");
        Map<String, Object> params = (Map<String, Object>) parsed.get("params");
        String reply = (String) parsed.get("reply");

        ChatResponseDTO dto = new ChatResponseDTO();

        try {
            switch (action) {
                case "ADD_TO_CART" -> {
                    String productName = (String) params.get("productName");
                    int quantity = params.containsKey("quantity") ? Integer.parseInt(params.get("quantity").toString()) : 1;
                    Long productId = resolveProductId(productName);
                    cartService.addToCart(userId, productId, quantity);
                }
                case "REMOVE_FROM_CART" -> {
                    String productName = (String) params.get("productName");
                    Long cartId = resolveCartId(userId, productName);
                    cartService.removeFromCart(cartId);
                }
                case "UPDATE_CART" -> {
                    String productName = (String) params.get("productName");
                    int quantity = Integer.parseInt(params.get("quantity").toString());
                    Long cartId = resolveCartId(userId, productName);
                    cartService.updateQuantity(cartId, quantity);
                }
                case "CREATE_ORDER" -> {
                    List<CartItemDTO> cartItems = cartService.listCartItems(userId);
                    List<Long> cartIds = cartItems.stream().map(CartItemDTO::getId).collect(Collectors.toList());
                    CreateOrderRequestDTO orderReq = new CreateOrderRequestDTO();
                    orderReq.setCartIds(cartIds);
                    orderReq.setReceiverName((String) params.get("receiverName"));
                    orderReq.setReceiverPhone((String) params.get("receiverPhone"));
                    orderReq.setReceiverAddress((String) params.get("receiverAddress"));
                    orderService.createOrder(userId, orderReq);
                }
                case "PAY_ORDER" -> {
                    String description = (String) params.get("orderDescription");
                    Long orderId = resolveOrderId(userId, description);
                    orderService.payOrder(orderId);
                }
                case "CANCEL_ORDER" -> {
                    String description = (String) params.get("orderDescription");
                    Long orderId = resolveOrderId(userId, description);
                    orderService.cancelOrder(orderId);
                }
            }
            dto.setReply(reply);
        } catch (Exception e) {
            dto.setReply("操作失败：" + e.getMessage());
        }
        return dto;
    }

    private Long resolveProductId(String productName) {
        List<Product> products = productMapper.selectList(
            new QueryWrapper<Product>().like("name", productName).eq("status", 1));
        if (products.isEmpty()) throw new RuntimeException("未找到商品：" + productName);
        return products.get(0).getId();
    }

    private Long resolveCartId(Long userId, String productName) {
        Long productId = resolveProductId(productName);
        List<Cart> items = cartMapper.selectList(
            new QueryWrapper<Cart>().eq("user_id", userId).eq("product_id", productId));
        if (items.isEmpty()) throw new RuntimeException("购物车中没有该商品：" + productName);
        return items.get(0).getId();
    }

    private Long resolveOrderId(Long userId, String description) {
        QueryWrapper<Order> wrapper = new QueryWrapper<Order>().eq("user_id", userId);
        if (description == null || description.contains("最新") || description.contains("最近")) {
            wrapper.orderByDesc("create_time");
        } else {
            try {
                wrapper.eq("id", Long.valueOf(description));
            } catch (NumberFormatException e) {
                wrapper.orderByDesc("create_time");
            }
        }
        List<Order> orders = orderMapper.selectList(wrapper);
        if (orders.isEmpty()) throw new RuntimeException("未找到订单");
        return orders.get(0).getId();
    }

    private boolean isValidSql(String sql) {
        if (sql == null || sql.isBlank()) return false;

        // Reject stacked queries
        if (sql.contains(";")) return false;

        // Strip SQL comments before validation
        String cleaned = sql.replaceAll("/\\*.*?\\*/", " ").replaceAll("--[^\n]*", " ");

        Matcher stmtMatcher = STATEMENT_PATTERN.matcher(cleaned.trim());
        if (!stmtMatcher.find()) return false;
        String stmtType = stmtMatcher.group(1).toUpperCase();
        if (!"SELECT".equals(stmtType)) return false;

        // Block PASSWORD column access
        if (cleaned.toUpperCase().contains("PASSWORD")) return false;

        // Block SELECT * FROM user (protects password column via wildcard)
        String upperSql = cleaned.toUpperCase();
        if (upperSql.contains("SELECT *") && (upperSql.contains("FROM \"USER\"") || upperSql.contains("FROM USER"))) {
            return false;
        }

        Matcher tableMatcher = TABLE_PATTERN.matcher(cleaned);
        while (tableMatcher.find()) {
            String table = tableMatcher.group(2).toLowerCase();
            if (!ALLOWED_TABLES.contains(table)) return false;
        }
        return true;
    }

    // Only tables that have a user_id column
    private static final Set<String> USER_ID_TABLES = Set.of("cart", "orders");

    private String injectUserId(String sql, Long userId) {
        // Only inject user_id for tables that have the column
        String upper = sql.toUpperCase();
        boolean needsUserId = USER_ID_TABLES.stream().anyMatch(t -> upper.contains(t.toUpperCase()));
        if (!needsUserId) return sql;

        if (upper.contains("WHERE")) {
            return sql.replaceAll("(?i)WHERE", "WHERE user_id = " + userId + " AND ");
        } else if (upper.contains("ORDER BY")) {
            return sql.replaceAll("(?i)ORDER BY", "WHERE user_id = " + userId + " ORDER BY");
        } else {
            return sql + " WHERE user_id = " + userId;
        }
    }

    @Autowired
    private javax.sql.DataSource dataSource;

    private List<Map<String, Object>> executeQuery(String sql) {
        try (var conn = dataSource.getConnection();
             var stmt = conn.createStatement();
             var rs = stmt.executeQuery(sql)) {
            var meta = rs.getMetaData();
            int cols = meta.getColumnCount();
            List<Map<String, Object>> rows = new ArrayList<>();
            while (rs.next()) {
                Map<String, Object> row = new LinkedHashMap<>();
                for (int i = 1; i <= cols; i++) {
                    row.put(meta.getColumnName(i), rs.getObject(i));
                }
                rows.add(row);
            }
            return rows;
        } catch (Exception e) {
            throw new RuntimeException("SQL 执行失败", e);
        }
    }

    private void saveHistory(Long userId, String role, String message, String sqlQuery, String operationType) {
        AssistantChatHistory history = new AssistantChatHistory();
        history.setUserId(userId);
        history.setRole(role);
        history.setMessage(message);
        history.setSqlQuery(sqlQuery);
        history.setOperationType(operationType);
        history.setCreateTime(LocalDateTime.now());
        historyMapper.insert(history);
    }
}
