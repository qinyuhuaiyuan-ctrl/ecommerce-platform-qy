package com.ecommerce.service.impl;

import com.baomidou.mybatisplus.core.conditions.query.QueryWrapper;
import com.ecommerce.dto.*;
import com.ecommerce.entity.*;
import com.ecommerce.mapper.*;
import com.ecommerce.service.OrderService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.List;
import java.util.stream.Collectors;

@Service
public class OrderServiceImpl implements OrderService {

    @Autowired
    private OrderMapper orderMapper;
    @Autowired
    private OrderItemMapper orderItemMapper;
    @Autowired
    private CartMapper cartMapper;
    @Autowired
    private ProductMapper productMapper;

    private static final String[] STATUS_TEXT = {"待支付", "已支付", "已发货", "已完成", "已取消"};
    private static final DateTimeFormatter FORMATTER = DateTimeFormatter.ofPattern("yyyy-MM-dd HH:mm:ss");

    @Override
    @Transactional
    public Long createOrder(Long userId, CreateOrderRequestDTO request) {
        int totalAmount = 0;

        Order order = new Order();
        order.setUserId(userId);
        order.setReceiverName(request.getReceiverName());
        order.setReceiverPhone(request.getReceiverPhone());
        order.setReceiverAddress(request.getReceiverAddress());
        order.setStatus(0);
        order.setCreateTime(LocalDateTime.now());

        orderMapper.insert(order);

        for (Long cartId : request.getCartIds()) {
            Cart cart = cartMapper.selectById(cartId);
            if (cart == null || !cart.getUserId().equals(userId)) continue;

            Product product = productMapper.selectById(cart.getProductId());
            if (product == null) continue;

            int subtotal = product.getPrice().intValue() * cart.getQuantity();
            totalAmount += subtotal;

            OrderItem item = new OrderItem();
            item.setOrderId(order.getId());
            item.setProductId(product.getId());
            item.setProductName(product.getName());
            item.setProductPrice(product.getPrice());
            item.setQuantity(cart.getQuantity());
            item.setSubtotal(product.getPrice().multiply(java.math.BigDecimal.valueOf(cart.getQuantity())));
            orderItemMapper.insert(item);

            cartMapper.deleteById(cartId);
        }

        order.setTotalAmount(java.math.BigDecimal.valueOf(totalAmount));
        orderMapper.updateById(order);

        return order.getId();
    }

    @Override
    public List<OrderListDTO> listOrders(Long userId) {
        QueryWrapper<Order> wrapper = new QueryWrapper<>();
        wrapper.eq("user_id", userId);
        wrapper.orderByDesc("create_time");
        List<Order> orders = orderMapper.selectList(wrapper);

        return orders.stream().map(this::toListDTO).collect(Collectors.toList());
    }

    @Override
    public OrderDetailDTO getOrder(Long orderId) {
        Order order = orderMapper.selectById(orderId);
        if (order == null) return null;

        OrderDetailDTO dto = new OrderDetailDTO();
        dto.setId(order.getId());
        dto.setTotalAmount(order.getTotalAmount().intValue());
        dto.setReceiverName(order.getReceiverName());
        dto.setReceiverPhone(order.getReceiverPhone());
        dto.setReceiverAddress(order.getReceiverAddress());
        dto.setStatus(order.getStatus());
        dto.setStatusText(STATUS_TEXT[order.getStatus()]);
        dto.setCreateTime(order.getCreateTime().format(FORMATTER));
        if (order.getPayTime() != null) {
            dto.setPayTime(order.getPayTime().format(FORMATTER));
        }

        QueryWrapper<OrderItem> wrapper = new QueryWrapper<>();
        wrapper.eq("order_id", orderId);
        List<OrderItem> items = orderItemMapper.selectList(wrapper);

        dto.setItems(items.stream().map(item -> {
            OrderItemDTO itemDTO = new OrderItemDTO();
            itemDTO.setProductName(item.getProductName());
            itemDTO.setPrice(item.getProductPrice().intValue());
            itemDTO.setQuantity(item.getQuantity());
            itemDTO.setSubtotal(item.getSubtotal().intValue());
            return itemDTO;
        }).collect(Collectors.toList()));

        return dto;
    }

    @Override
    public void payOrder(Long orderId) {
        Order order = orderMapper.selectById(orderId);
        if (order != null && order.getStatus() == 0) {
            order.setStatus(1);
            order.setPayTime(LocalDateTime.now());
            orderMapper.updateById(order);
        }
    }

    @Override
    public void cancelOrder(Long orderId) {
        Order order = orderMapper.selectById(orderId);
        if (order != null && order.getStatus() == 0) {
            order.setStatus(4);
            orderMapper.updateById(order);
        }
    }

    private OrderListDTO toListDTO(Order order) {
        OrderListDTO dto = new OrderListDTO();
        dto.setId(order.getId());
        dto.setTotalAmount(order.getTotalAmount().intValue());
        dto.setStatus(order.getStatus());
        dto.setStatusText(STATUS_TEXT[order.getStatus()]);
        dto.setCreateTime(order.getCreateTime().format(FORMATTER));

        QueryWrapper<OrderItem> wrapper = new QueryWrapper<>();
        wrapper.eq("order_id", order.getId());
        dto.setItemCount(orderItemMapper.selectCount(wrapper).intValue());

        return dto;
    }
}
