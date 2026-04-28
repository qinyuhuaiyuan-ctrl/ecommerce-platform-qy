package com.ecommerce.service;

import com.ecommerce.dto.CartItemDTO;
import java.util.List;

public interface CartService {
    List<CartItemDTO> listCartItems(Long userId);
    void addToCart(Long userId, Long productId, Integer quantity);
    void updateQuantity(Long cartId, Integer quantity);
    void removeFromCart(Long cartId);
}
