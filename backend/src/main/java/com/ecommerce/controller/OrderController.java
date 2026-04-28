package com.ecommerce.controller;

import com.ecommerce.dto.CreateOrderRequestDTO;
import com.ecommerce.dto.OrderDetailDTO;
import com.ecommerce.dto.OrderListDTO;
import com.ecommerce.service.OrderService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/orders")
public class OrderController {

    @Autowired
    private OrderService orderService;

    @PostMapping
    public Result<Long> create(@RequestHeader("X-User-Id") Long userId, @RequestBody CreateOrderRequestDTO request) {
        Long orderId = orderService.createOrder(userId, request);
        return Result.success(orderId);
    }

    @GetMapping
    public Result<List<OrderListDTO>> list(@RequestHeader("X-User-Id") Long userId) {
        return Result.success(orderService.listOrders(userId));
    }

    @GetMapping("/{id}")
    public Result<OrderDetailDTO> getById(@PathVariable Long id) {
        OrderDetailDTO dto = orderService.getOrder(id);
        if (dto == null) {
            return Result.error("订单不存在");
        }
        return Result.success(dto);
    }

    @PutMapping("/{id}/pay")
    public Result<Void> pay(@PathVariable Long id) {
        orderService.payOrder(id);
        return Result.success(null);
    }

    @PutMapping("/{id}/cancel")
    public Result<Void> cancel(@PathVariable Long id) {
        orderService.cancelOrder(id);
        return Result.success(null);
    }
}
