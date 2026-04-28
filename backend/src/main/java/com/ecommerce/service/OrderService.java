package com.ecommerce.service;

import com.ecommerce.dto.OrderDetailDTO;
import com.ecommerce.dto.OrderListDTO;
import com.ecommerce.dto.CreateOrderRequestDTO;
import java.util.List;

public interface OrderService {
    Long createOrder(Long userId, CreateOrderRequestDTO request);
    List<OrderListDTO> listOrders(Long userId);
    OrderDetailDTO getOrder(Long orderId);
    void payOrder(Long orderId);
    void cancelOrder(Long orderId);
}
