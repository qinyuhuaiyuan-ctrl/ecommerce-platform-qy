package com.ecommerce.controller;

import com.ecommerce.dto.CartItemDTO;
import com.ecommerce.service.CartService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/cart")
public class CartController {

    @Autowired
    private CartService cartService;

    @GetMapping
    public Result<List<CartItemDTO>> list(@RequestHeader("X-User-Id") Long userId) {
        return Result.success(cartService.listCartItems(userId));
    }

    @PostMapping
    public Result<Void> add(@RequestHeader("X-User-Id") Long userId, @RequestBody Map<String, Object> params) {
        Long productId = Long.valueOf(params.get("productId").toString());
        Integer quantity = Integer.valueOf(params.get("quantity").toString());
        cartService.addToCart(userId, productId, quantity);
        return Result.success(null);
    }

    @PutMapping("/{id}")
    public Result<Void> updateQuantity(@PathVariable Long id, @RequestBody Map<String, Integer> params) {
        cartService.updateQuantity(id, params.get("quantity"));
        return Result.success(null);
    }

    @DeleteMapping("/{id}")
    public Result<Void> delete(@PathVariable Long id) {
        cartService.removeFromCart(id);
        return Result.success(null);
    }
}
