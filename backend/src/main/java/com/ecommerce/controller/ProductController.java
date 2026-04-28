package com.ecommerce.controller;

import com.ecommerce.entity.Product;
import com.ecommerce.service.ProductService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/products")
public class ProductController {

    @Autowired
    private ProductService productService;

    @GetMapping
    public Result<List<Product>> list(@RequestParam(required = false) Long categoryId) {
        return Result.success(productService.listProducts(categoryId));
    }

    @GetMapping("/{id}")
    public Result<Product> getById(@PathVariable Long id) {
        Product product = productService.getProduct(id);
        if (product == null) {
            return Result.error("商品不存在");
        }
        return Result.success(product);
    }
}
