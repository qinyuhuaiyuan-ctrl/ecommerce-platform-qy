package com.ecommerce.service;

import com.ecommerce.entity.Product;
import java.util.List;

public interface ProductService {
    List<Product> listProducts(Long categoryId);
    Product getProduct(Long id);
}
