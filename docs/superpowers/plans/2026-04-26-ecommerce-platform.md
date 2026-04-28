# 电商平台实现计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 构建一个具备基础功能的电商Web平台客户端，包含用户注册登录、商品浏览、购物车、下单等核心功能。

**Architecture:** 前后端分离架构。后端使用 Spring Boot + MyBatis-Plus + H2 提供 REST API，前端使用 Vue 3 + Vite 实现 PC Web 端。

**Tech Stack:**

- 后端：Spring Boot 3.x + MyBatis-Plus + H2 + JDK 17
- 前端：Vue 3 + Vite + Axios + Vue Router
- 构建工具：Maven（后端）/ npm（前端）

***

## 文件结构规划

```
Superpower/
├── backend/                    # 后端项目
│   ├── src/main/java/
│   │   └── com/ecommerce/
│   │       ├── EcommerceApplication.java
│   │       ├── config/         # 配置类
│   │       ├── controller/     # 控制器
│   │       ├── service/        # 业务逻辑
│   │       ├── mapper/        # 数据访问
│   │       ├── entity/        # 实体类
│   │       ├── dto/           # 数据传输对象
│   │       └── interceptor/  # 拦截器
│   ├── src/main/resources/
│   │   ├── application.yml
│   │   └── data.sql           # 初始化数据
│   └── pom.xml
├── frontend/                   # 前端项目
│   ├── src/
│   │   ├── main.js
│   │   ├── App.vue
│   │   ├── router/
│   │   ├── views/
│   │   ├── components/
│   │   ├── api/
│   │   └── assets/
│   ├── index.html
│   └── package.json
└── docs/superpowers/specs/
    └── 2026-04-26-ecommerce-platform-design.md
```

***

## 第一阶段：后端基础框架搭建

### Task 1: 创建 Spring Boot 项目结构

**Files:**

- Create: `backend/pom.xml`
- Create: `backend/src/main/java/com/ecommerce/EcommerceApplication.java`
- Create: `backend/src/main/resources/application.yml`
- [ ] **Step 1: 创建后端项目目录和 pom.xml**

```xml
<?xml version="1.0" encoding="UTF-8"?>
<project xmlns="http://maven.apache.org/POM/4.0.0"
         xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"
         xsi:schemaLocation="http://maven.apache.org/POM/4.0.0 http://maven.apache.org/xsd/maven-4.0.0.xsd">
    <modelVersion>4.0.0</modelVersion>
    
    <parent>
        <groupId>org.springframework.boot</groupId>
        <artifactId>spring-boot-starter-parent</artifactId>
        <version>3.2.0</version>
        <relativePath/>
    </parent>
    
    <groupId>com.ecommerce</groupId>
    <artifactId>ecommerce-backend</artifactId>
    <version>1.0.0</version>
    <name>ecommerce-backend</name>
    
    <properties>
        <java.version>17</java.version>
    </properties>
    
    <dependencies>
        <dependency>
            <groupId>org.springframework.boot</groupId>
            <artifactId>spring-boot-starter-web</artifactId>
        </dependency>
        <dependency>
            <groupId>com.baomidou</groupId>
            <artifactId>mybatis-plus-spring-boot3-starter</artifactId>
            <version>3.5.5</version>
        </dependency>
        <dependency>
            <groupId>com.h2database</groupId>
            <artifactId>h2</artifactId>
            <scope>runtime</scope>
        </dependency>
        <dependency>
            <groupId>org.springframework.boot</groupId>
            <artifactId>spring-boot-starter-validation</artifactId>
        </dependency>
        <dependency>
            <groupId>org.projectlombok</groupId>
            <artifactId>lombok</artifactId>
            <optional>true</optional>
        </dependency>
    </dependencies>
    
    <build>
        <plugins>
            <plugin>
                <groupId>org.springframework.boot</groupId>
                <artifactId>spring-boot-maven-plugin</artifactId>
            </plugin>
        </plugins>
    </build>
</project>
```

- [ ] **Step 2: 创建主启动类**

```java
package com.ecommerce;

import org.mybatis.spring.annotation.MapperScan;
import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;

@SpringBootApplication
@MapperScan("com.ecommerce.mapper")
public class EcommerceApplication {
    public static void main(String[] args) {
        SpringApplication.run(EcommerceApplication.class, args);
    }
}
```

- [ ] **Step 3: 创建 application.yml 配置**

```yaml
server:
  port: 8080

spring:
  application:
    name: ecommerce-backend
  datasource:
    driver-class-name: org.h2.Driver
    url: jdbc:h2:mem:ecommerce
    username: sa
    password:
  h2:
    console:
      enabled: true
      path: /h2-console
  sql:
    init:
      mode: always
      schema-locations: classpath:schema.sql

mybatis-plus:
  configuration:
    log-impl: org.apache.ibatis.logging.stdout.StdOutImpl
    map-underscore-to-camel-case: true
  global-config:
    db-config:
      id-type: auto
```

- [ ] **Step 4: 创建 schema.sql 数据库表结构**

```sql
-- 用户表
CREATE TABLE IF NOT EXISTS user (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    username VARCHAR(50) NOT NULL UNIQUE,
    password VARCHAR(100) NOT NULL,
    phone VARCHAR(20),
    create_time TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 分类表
CREATE TABLE IF NOT EXISTS category (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(50) NOT NULL,
    sort INT DEFAULT 0
);

-- 商品表
CREATE TABLE IF NOT EXISTS product (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    description VARCHAR(500),
    price DECIMAL(10,2) NOT NULL,
    stock INT DEFAULT 0,
    category_id BIGINT,
    image_url VARCHAR(200),
    status TINYINT DEFAULT 1,
    create_time TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 购物车表
CREATE TABLE IF NOT EXISTS cart (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    user_id BIGINT NOT NULL,
    product_id BIGINT NOT NULL,
    quantity INT DEFAULT 1,
    create_time TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 订单表
CREATE TABLE IF NOT EXISTS orders (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    user_id BIGINT NOT NULL,
    total_amount DECIMAL(10,2) DEFAULT 0,
    receiver_name VARCHAR(50),
    receiver_phone VARCHAR(20),
    receiver_address VARCHAR(200),
    status TINYINT DEFAULT 0,
    create_time TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    pay_time TIMESTAMP
);

-- 订单明细表
CREATE TABLE IF NOT EXISTS order_item (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    order_id BIGINT NOT NULL,
    product_id BIGINT NOT NULL,
    product_name VARCHAR(100),
    product_price DECIMAL(10,2),
    quantity INT,
    subtotal DECIMAL(10,2)
);
```

- [ ] **Step 5: 验证项目能启动**

Run: 在 backend 目录执行 `mvn spring-boot:run`
Expected: 启动成功，端口 8080

- [ ] **Step 6: 提交代码**

```bash
mkdir -p backend/src/main/java/com/ecommerce
mkdir -p backend/src/main/resources
# 添加文件后提交
git add backend/
git commit -m "feat: 创建 Spring Boot 基础项目结构"
```

***

### Task 2: 创建实体类和数据库表

**Files:**

- Create: `backend/src/main/java/com/ecommerce/entity/User.java`
- Create: `backend/src/main/java/com/ecommerce/entity/Category.java`
- Create: `backend/src/main/java/com/ecommerce/entity/Product.java`
- Create: `backend/src/main/java/com/ecommerce/entity/Cart.java`
- Create: `backend/src/main/java/com/ecommerce/entity/Order.java`
- Create: `backend/src/main/java/com/ecommerce/entity/OrderItem.java`
- [ ] **Step 1: 创建 User 实体类**

```java
package com.ecommerce.entity;

import com.baomidou.mybatisplus.annotation.IdType;
import com.baomidou.mybatisplus.annotation.TableId;
import com.baomidou.mybatisplus.annotation.TableName;
import lombok.Data;
import java.time.LocalDateTime;

@Data
@TableName("user")
public class User {
    @TableId(type = IdType.AUTO)
    private Long id;
    private String username;
    private String password;
    private String phone;
    private LocalDateTime createTime;
}
```

- [ ] **Step 2: 创建 Category 实体类**

```java
package com.ecommerce.entity;

import com.baomidou.mybatisplus.annotation.IdType;
import com.baomidou.mybatisplus.annotation.TableId;
import com.baomidou.mybatisplus.annotation.TableName;
import lombok.Data;

@Data
@TableName("category")
public class Category {
    @TableId(type = IdType.AUTO)
    private Long id;
    private String name;
    private Integer sort;
}
```

- [ ] **Step 3: 创建 Product 实体类**

```java
package com.ecommerce.entity;

import com.baomidou.mybatisplus.annotation.IdType;
import com.baomidou.mybatisplus.annotation.TableId;
import com.baomidou.mybatisplus.annotation.TableName;
import lombok.Data;
import java.math.BigDecimal;
import java.time.LocalDateTime;

@Data
@TableName("product")
public class Product {
    @TableId(type = IdType.AUTO)
    private Long id;
    private String name;
    private String description;
    private BigDecimal price;
    private Integer stock;
    private Long categoryId;
    private String imageUrl;
    private Integer status;
    private LocalDateTime createTime;
}
```

- [ ] **Step 4: 创建 Cart 实体类**

```java
package com.ecommerce.entity;

import com.baomidou.mybatisplus.annotation.IdType;
import com.baomidou.mybatisplus.annotation.TableId;
import com.baomidou.mybatisplus.annotation.TableName;
import lombok.Data;
import java.time.LocalDateTime;

@Data
@TableName("cart")
public class Cart {
    @TableId(type = IdType.AUTO)
    private Long id;
    private Long userId;
    private Long productId;
    private Integer quantity;
    private LocalDateTime createTime;
}
```

- [ ] **Step 5: 创建 Order 实体类**

```java
package com.ecommerce.entity;

import com.baomidou.mybatisplus.annotation.IdType;
import com.baomidou.mybatisplus.annotation.TableId;
import com.baomidou.mybatisplus.annotation.TableName;
import lombok.Data;
import java.math.BigDecimal;
import java.time.LocalDateTime;

@Data
@TableName("orders")
public class Order {
    @TableId(type = IdType.AUTO)
    private Long id;
    private Long userId;
    private BigDecimal totalAmount;
    private String receiverName;
    private String receiverPhone;
    private String receiverAddress;
    private Integer status;
    private LocalDateTime createTime;
    private LocalDateTime payTime;
}
```

- [ ] **Step 6: 创建 OrderItem 实体类**

```java
package com.ecommerce.entity;

import com.baomidou.mybatisplus.annotation.IdType;
import com.baomidou.mybatisplus.annotation.TableId;
import com.baomidou.mybatisplus.annotation.TableName;
import lombok.Data;
import java.math.BigDecimal;

@Data
@TableName("order_item")
public class OrderItem {
    @TableId(type = IdType.AUTO)
    private Long id;
    private Long orderId;
    private Long productId;
    private String productName;
    private BigDecimal productPrice;
    private Integer quantity;
    private BigDecimal subtotal;
}
```

- [ ] **Step 7: 提交代码**

```bash
git add backend/src/main/java/com/ecommerce/entity/
git commit -m "feat: 创建实体类 User, Category, Product, Cart, Order, OrderItem"
```

***

### Task 3: 创建 Mapper 接口

**Files:**

- Create: `backend/src/main/java/com/ecommerce/mapper/UserMapper.java`
- Create: `backend/src/main/java/com/ecommerce/mapper/CategoryMapper.java`
- Create: `backend/src/main/java/com/ecommerce/mapper/ProductMapper.java`
- Create: `backend/src/main/java/com/ecommerce/mapper/CartMapper.java`
- Create: `backend/src/main/java/com/ecommerce/mapper/OrderMapper.java`
- Create: `backend/src/main/java/com/ecommerce/mapper/OrderItemMapper.java`
- [ ] **Step 1: 创建 UserMapper**

```java
package com.ecommerce.mapper;

import com.baomidou.mybatisplus.core.mapper.BaseMapper;
import com.ecommerce.entity.User;
import org.apache.ibatis.annotations.Mapper;

@Mapper
public interface UserMapper extends BaseMapper<User> {
}
```

- [ ] **Step 2: 创建 CategoryMapper**

```java
package com.ecommerce.mapper;

import com.baomidou.mybatisplus.core.mapper.BaseMapper;
import com.ecommerce.entity.Category;
import org.apache.ibatis.annotations.Mapper;

@Mapper
public interface CategoryMapper extends BaseMapper<Category> {
}
```

- [ ] **Step 3: 创建 ProductMapper**

```java
package com.ecommerce.mapper;

import com.baomidou.mybatisplus.core.mapper.BaseMapper;
import com.ecommerce.entity.Product;
import org.apache.ibatis.annotations.Mapper;

@Mapper
public interface ProductMapper extends BaseMapper<Product> {
}
```

- [ ] **Step 4: 创建 CartMapper**

```java
package com.ecommerce.mapper;

import com.baomidou.mybatisplus.core.mapper.BaseMapper;
import com.ecommerce.entity.Cart;
import org.apache.ibatis.annotations.Mapper;

@Mapper
public interface CartMapper extends BaseMapper<Cart> {
}
```

- [ ] **Step 5: 创建 OrderMapper**

```java
package com.ecommerce.mapper;

import com.baomidou.mybatisplus.core.mapper.BaseMapper;
import com.ecommerce.entity.Order;
import org.apache.ibatis.annotations.Mapper;

@Mapper
public interface OrderMapper extends BaseMapper<Order> {
}
```

- [ ] **Step 6: 创建 OrderItemMapper**

```java
package com.ecommerce.mapper;

import com.baomidou.mybatisplus.core.mapper.BaseMapper;
import com.ecommerce.entity.OrderItem;
import org.apache.ibatis.annotations.Mapper;

@Mapper
public interface OrderItemMapper extends BaseMapper<OrderItem> {
}
```

- [ ] **Step 7: 提交代码**

```bash
git add backend/src/main/java/com/ecommerce/mapper/
git commit -m "feat: 创建 Mapper 接口"
```

***

## 第二阶段：用户模块

### Task 4: 用户注册登录功能

**Files:**

- Create: `backend/src/main/java/com/ecommerce/service/UserService.java`
- Create: `backend/src/main/java/com/ecommerce/service/impl/UserServiceImpl.java`
- Create: `backend/src/main/java/com/ecommerce/controller/UserController.java`
- Create: `backend/src/main/java/com/ecommerce/dto/LoginRequestDTO.java`
- Create: `backend/src/main/java/com/ecommerce/dto/RegisterRequestDTO.java`
- Create: `backend/src/main/java/com/ecommerce/dto/LoginResponseDTO.java`
- Create: `backend/src/main/java/com/ecommerce/config/CorsConfig.java`
- [ ] **Step 1: 创建 DTO 类**

```java
// LoginRequestDTO.java
package com.ecommerce.dto;

import lombok.Data;

@Data
public class LoginRequestDTO {
    private String username;
    private String password;
}
```

```java
// RegisterRequestDTO.java
package com.ecommerce.dto;

import lombok.Data;

@Data
public class RegisterRequestDTO {
    private String username;
    private String password;
    private String phone;
}
```

```java
// LoginResponseDTO.java
package com.ecommerce.dto;

import lombok.Data;

@Data
public class LoginResponseDTO {
    private Long userId;
    private String username;
    private String token;
}
```

- [ ] **Step 2: 创建 UserService 接口和实现**

```java
// UserService.java
package com.ecommerce.service;

import com.ecommerce.dto.LoginRequestDTO;
import com.ecommerce.dto.LoginResponseDTO;
import com.ecommerce.dto.RegisterRequestDTO;

public interface UserService {
    LoginResponseDTO loginUser(LoginRequestDTO request);
    void registerUser(RegisterRequestDTO request);
}
```

```java
// UserServiceImpl.java
package com.ecommerce.service.impl;

import com.baomidou.mybatisplus.core.conditions.query.QueryWrapper;
import com.ecommerce.dto.LoginRequestDTO;
import com.ecommerce.dto.LoginResponseDTO;
import com.ecommerce.dto.RegisterRequestDTO;
import com.ecommerce.entity.User;
import com.ecommerce.mapper.UserMapper;
import com.ecommerce.service.UserService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import java.time.LocalDateTime;
import java.util.UUID;

@Service
public class UserServiceImpl implements UserService {

    @Autowired
    private UserMapper userMapper;

    @Override
    public LoginResponseDTO loginUser(LoginRequestDTO request) {
        QueryWrapper<User> wrapper = new QueryWrapper<>();
        wrapper.eq("username", request.getUsername());
        User user = userMapper.selectOne(wrapper);
        
        if (user == null || !user.getPassword().equals(request.getPassword())) {
            throw new RuntimeException("用户名或密码错误");
        }
        
        LoginResponseDTO response = new LoginResponseDTO();
        response.setUserId(user.getId());
        response.setUsername(user.getUsername());
        response.setToken(UUID.randomUUID().toString());
        return response;
    }

    @Override
    public void registerUser(RegisterRequestDTO request) {
        QueryWrapper<User> wrapper = new QueryWrapper<>();
        wrapper.eq("username", request.getUsername());
        if (userMapper.selectOne(wrapper) != null) {
            throw new RuntimeException("用户名已存在");
        }
        
        User user = new User();
        user.setUsername(request.getUsername());
        user.setPassword(request.getPassword());
        user.setPhone(request.getPhone());
        user.setCreateTime(LocalDateTime.now());
        userMapper.insert(user);
    }
}
```

- [ ] **Step 3: 创建 UserController**

```java
package com.ecommerce.controller;

import com.ecommerce.dto.LoginRequestDTO;
import com.ecommerce.dto.LoginResponseDTO;
import com.ecommerce.dto.RegisterRequestDTO;
import com.ecommerce.service.UserService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/user")
public class UserController {

    @Autowired
    private UserService userService;

    @PostMapping("/login")
    public Result<LoginResponseDTO> login(@RequestBody LoginRequestDTO request) {
        try {
            LoginResponseDTO response = userService.loginUser(request);
            return Result.success(response);
        } catch (Exception e) {
            return Result.error(e.getMessage());
        }
    }

    @PostMapping("/register")
    public Result<Void> register(@RequestBody RegisterRequestDTO request) {
        try {
            userService.registerUser(request);
            return Result.success(null);
        } catch (Exception e) {
            return Result.error(e.getMessage());
        }
    }
}
```

- [ ] **Step 4: 创建 Result 工具类**

```java
package com.ecommerce.controller;

import lombok.Data;

@Data
public class Result<T> {
    private Integer code;
    private String message;
    private T data;

    public static <T> Result<T> success(T data) {
        Result<T> result = new Result<>();
        result.setCode(200);
        result.setMessage("success");
        result.setData(data);
        return result;
    }

    public static <T> Result<T> error(String message) {
        Result<T> result = new Result<>();
        result.setCode(500);
        result.setMessage(message);
        return result;
    }
}
```

- [ ] **Step 5: 创建 CORS 配置**

```java
package com.ecommerce.config;

import org.springframework.context.annotation.Configuration;
import org.springframework.web.servlet.config.annotation.CorsRegistry;
import org.springframework.web.servlet.config.annotation.WebMvcConfigurer;

@Configuration
public class CorsConfig implements WebMvcConfigurer {
    @Override
    public void addToCartCorsMappings(CorsRegistry registry) {
        registry.addMapping("/**")
                .allowedOrigins("http://localhost:5173")
                .allowedMethods("GET", "POST", "PUT", "DELETE", "OPTIONS")
                .allowedHeaders("*")
                .allowCredentials(true);
    }
}
```

- [ ] **Step 6: 验证接口**

Run: 启动后端，使用 Postman 或 curl 测试

- POST /api/user/register {"username":"test","password":"123","phone":"13800138000"}
- POST /api/user/login {"username":"test","password":"123"}
- [ ] **Step 7: 提交代码**

```bash
git add backend/src/main/java/com/ecommerce/
git commit -m "feat: 实现用户注册登录功能"
```

***

## 第三阶段：商品模块

### Task 5: 商品分类和列表功能

**Files:**

- Create: `backend/src/main/java/com/ecommerce/service/CategoryService.java`
- Create: `backend/src/main/java/com/ecommerce/service/impl/CategoryServiceImpl.java`
- Create: `backend/src/main/java/com/ecommerce/service/ProductService.java`
- Create: `backend/src/main/java/com/ecommerce/service/impl/ProductServiceImpl.java`
- Create: `backend/src/main/java/com/ecommerce/controller/CategoryController.java`
- Create: `backend/src/main/java/com/ecommerce/controller/ProductController.java`
- [ ] **Step 1: 创建 CategoryService**

```java
// CategoryService.java
package com.ecommerce.service;

import com.ecommerce.entity.Category;
import java.util.List;

public interface CategoryService {
    List<Category> listCategories();
}
```

```java
// CategoryServiceImpl.java
package com.ecommerce.service.impl;

import com.baomidou.mybatisplus.core.conditions.query.QueryWrapper;
import com.ecommerce.entity.Category;
import com.ecommerce.mapper.CategoryMapper;
import com.ecommerce.service.CategoryService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import java.util.List;

@Service
public class CategoryServiceImpl implements CategoryService {

    @Autowired
    private CategoryMapper categoryMapper;

    @Override
    public List<Category> listCategories() {
        QueryWrapper<Category> wrapper = new QueryWrapper<>();
        wrapper.orderByAsc("sort");
        return categoryMapper.selectList(wrapper);
    }
}
```

- [ ] **Step 2: 创建 ProductService**

```java
// ProductService.java
package com.ecommerce.service;

import com.ecommerce.entity.Product;
import java.util.List;

public interface ProductService {
    List<Product> listProducts(Long categoryId);
    Product getProduct(Long id);
}
```

```java
// ProductServiceImpl.java
package com.ecommerce.service.impl;

import com.baomidou.mybatisplus.core.conditions.query.QueryWrapper;
import com.ecommerce.entity.Product;
import com.ecommerce.mapper.ProductMapper;
import com.ecommerce.service.ProductService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import java.util.List;

@Service
public class ProductServiceImpl implements ProductService {

    @Autowired
    private ProductMapper productMapper;

    @Override
    public List<Product> listProducts(Long categoryId) {
        QueryWrapper<Product> wrapper = new QueryWrapper<>();
        wrapper.eq("status", 1);
        if (categoryId != null) {
            wrapper.eq("category_id", categoryId);
        }
        wrapper.orderByDesc("create_time");
        return productMapper.selectList(wrapper);
    }

    @Override
    public Product getProduct(Long id) {
        return productMapper.selectById(id);
    }
}
```

- [ ] **Step 3: 创建 CategoryController**

```java
package com.ecommerce.controller;

import com.ecommerce.entity.Category;
import com.ecommerce.service.CategoryService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/categories")
public class CategoryController {

    @Autowired
    private CategoryService categoryService;

    @GetMapping
    public Result<List<Category>> list() {
        return Result.success(categoryService.listCategories());
    }
}
```

- [ ] **Step 4: 创建 ProductController**

```java
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
```

- [ ] **Step 5: 创建初始化数据的 data.sql**

```sql
-- 分类数据
INSERT INTO category (name, sort) VALUES ('电子产品', 1);
INSERT INTO category (name, sort) VALUES ('服装', 2);
INSERT INTO category (name, sort) VALUES ('图书', 3);
INSERT INTO category (name, sort) VALUES ('食品', 4);
INSERT INTO category (name, sort) VALUES ('家居用品', 5);

-- 商品数据
INSERT INTO product (name, description, price, stock, category_id, image_url, status, create_time) 
VALUES ('iPhone 15 Pro', '最新款苹果手机，A17 Pro芯片', 7999.00, 100, 1, '/src/assets/images/iphone15.png', 1, CURRENT_TIMESTAMP);

INSERT INTO product (name, description, price, stock, category_id, image_url, status, create_time) 
VALUES ('MacBook Air M3', '轻薄便携，续航超长', 9499.00, 50, 1, '/src/assets/images/macbook.png', 1, CURRENT_TIMESTAMP);

INSERT INTO product (name, description, price, stock, category_id, image_url, status, create_time) 
VALUES ('纯棉T恤', '100%纯棉，舒适透气', 99.00, 200, 2, '/src/assets/images/tshirt.png', 1, CURRENT_TIMESTAMP);

INSERT INTO product (name, description, price, stock, category_id, image_url, status, create_time) 
VALUES ('牛仔裤', '经典款式，弹性面料', 199.00, 150, 2, '/src/assets/images/jeans.png', 1, CURRENT_TIMESTAMP);

INSERT INTO product (name, description, price, stock, category_id, image_url, status, create_time) 
VALUES ('Python编程从入门到实践', 'Python入门经典书籍', 89.00, 80, 3, '/src/assets/images/python-book.png', 1, CURRENT_TIMESTAMP);

INSERT INTO product (name, description, price, stock, category_id, image_url, status, create_time) 
VALUES ('算法导论', '计算机经典教材', 128.00, 30, 3, '/src/assets/images/algorithm-book.png', 1, CURRENT_TIMESTAMP);

INSERT INTO product (name, description, price, stock, category_id, image_url, status, create_time) 
VALUES ('进口坚果礼盒', '多种坚果，营养丰富', 168.00, 100, 4, '/src/assets/images/nuts.png', 1, CURRENT_TIMESTAMP);

INSERT INTO product (name, description, price, stock, category_id, image_url, status, create_time) 
VALUES ('有机茶叶', '高山有机茶叶，清香扑鼻', 88.00, 60, 4, '/src/assets/images/tea.png', 1, CURRENT_TIMESTAMP);

INSERT INTO product (name, description, price, stock, category_id, image_url, status, create_time) 
VALUES ('北欧风格台灯', '简约时尚，护眼灯光', 159.00, 40, 5, '/src/assets/images/lamp.png', 1, CURRENT_TIMESTAMP);

INSERT INTO product (name, description, price, stock, category_id, image_url, status, create_time) 
VALUES ('记忆棉枕头', '人体工学设计，舒适睡眠', 129.00, 70, 5, '/src/assets/images/pillow.png', 1, CURRENT_TIMESTAMP);
```

- [ ] **Step 6: 验证接口**

Run: 测试分类和商品接口

- GET /api/categories
- GET /api/products
- GET /api/products/1
- [ ] **Step 7: 提交代码**

```bash
git add backend/src/main/java/com/ecommerce/
git add backend/src/main/resources/data.sql
git commit -m "feat: 实现商品分类和列表功能"
```

***

## 第四阶段：购物车模块

### Task 6: 购物车功能

**Files:**

- Create: `backend/src/main/java/com/ecommerce/service/CartService.java`
- Create: `backend/src/main/java/com/ecommerce/service/impl/CartServiceImpl.java`
- Create: `backend/src/main/java/com/ecommerce/controller/CartController.java`
- Create: `backend/src/main/java/com/ecommerce/dto/CartItemDTO.java`
- [ ] **Step 1: 创建 CartItemDTO**

```java
package com.ecommerce.dto;

import lombok.Data;

@Data
public class CartItemDTO {
    private Long id;
    private Long productId;
    private String productName;
    private String imageUrl;
    private Integer price;
    private Integer quantity;
    private Integer subtotal;
}
```

- [ ] **Step 2: 创建 CartService**

```java
// CartService.java
package com.ecommerce.service;

import com.ecommerce.dto.CartItemDTO;
import java.util.List;

public interface CartService {
    List<CartItemDTO> listCartItems(Long userId);
    void addToCart(Long userId, Long productId, Integer quantity);
    void updateQuantity(Long cartId, Integer quantity);
    void removeFromCart(Long cartId);
}
```

```java
// CartServiceImpl.java
package com.ecommerce.service.impl;

import com.baomidou.mybatisplus.core.conditions.query.QueryWrapper;
import com.ecommerce.dto.CartItemDTO;
import com.ecommerce.entity.Cart;
import com.ecommerce.entity.Product;
import com.ecommerce.mapper.CartMapper;
import com.ecommerce.mapper.ProductMapper;
import com.ecommerce.service.CartService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import java.time.LocalDateTime;
import java.util.List;
import java.util.stream.Collectors;

@Service
public class CartServiceImpl implements CartService {

    @Autowired
    private CartMapper cartMapper;
    @Autowired
    private ProductMapper productMapper;

    @Override
    public List<CartItemDTO> listCartItems(Long userId) {
        QueryWrapper<Cart> wrapper = new QueryWrapper<>();
        wrapper.eq("user_id", userId);
        List<Cart> carts = cartMapper.selectList(wrapper);
        
        return carts.stream().map(cart -> {
            CartItemDTO dto = new CartItemDTO();
            dto.setId(cart.getId());
            dto.setProductId(cart.getProductId());
            dto.setQuantity(cart.getQuantity());
            
            Product product = productMapper.selectById(cart.getProductId());
            if (product != null) {
                dto.setProductName(product.getName());
                dto.setImageUrl(product.getImageUrl());
                dto.setPrice(product.getPrice().intValue());
                dto.setSubtotal(product.getPrice().intValue() * cart.getQuantity());
            }
            return dto;
        }).collect(Collectors.toList());
    }

    @Override
    public void addToCart(Long userId, Long productId, Integer quantity) {
        QueryWrapper<Cart> wrapper = new QueryWrapper<>();
        wrapper.eq("user_id", userId).eq("product_id", productId);
        Cart existingCart = cartMapper.selectOne(wrapper);
        
        if (existingCart != null) {
            existingCart.setQuantity(existingCart.getQuantity() + quantity);
            cartMapper.updateById(existingCart);
        } else {
            Cart cart = new Cart();
            cart.setUserId(userId);
            cart.setProductId(productId);
            cart.setQuantity(quantity);
            cart.setCreateTime(LocalDateTime.now());
            cartMapper.insert(cart);
        }
    }

    @Override
    public void updateQuantity(Long cartId, Integer quantity) {
        Cart cart = cartMapper.selectById(cartId);
        if (cart != null) {
            cart.setQuantity(quantity);
            cartMapper.updateById(cart);
        }
    }

    @Override
    public void removeFromCart(Long cartId) {
        cartMapper.deleteById(cartId);
    }
}
```

- [ ] **Step 3: 创建 CartController**

```java
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
```

- [ ] **Step 4: 验证接口**

Run: 测试购物车接口（需要先登录获取 userId）

- GET /api/cart（需要 X-User-Id header）
- POST /api/cart
- PUT /api/cart/1
- DELETE /api/cart/1
- [ ] **Step 5: 提交代码**

```bash
git add backend/src/main/java/com/ecommerce/
git commit -m "feat: 实现购物车功能"
```

***

## 第五阶段：订单模块

### Task 7: 订单创建和支付功能

**Files:**

- Create: `backend/src/main/java/com/ecommerce/service/OrderService.java`
- Create: `backend/src/main/java/com/ecommerce/service/impl/OrderServiceImpl.java`
- Create: `backend/src/main/java/com/ecommerce/controller/OrderController.java`
- Create: `backend/src/main/java/com/ecommerce/dto/CreateOrderRequestDTO.java`
- Create: `backend/src/main/java/com/ecommerce/dto/OrderDetailDTO.java`
- Create: `backend/src/main/java/com/ecommerce/dto/OrderListDTO.java`
- [ ] **Step 1: 创建 DTO**

```java
// CreateOrderRequestDTO.java
package com.ecommerce.dto;

import lombok.Data;
import java.util.List;

@Data
public class CreateOrderRequestDTO {
    private List<Long> cartIds;
    private String receiverName;
    private String receiverPhone;
    private String receiverAddress;
}
```

```java
// OrderDetailDTO.java
package com.ecommerce.dto;

import lombok.Data;
import java.util.List;

@Data
public class OrderDetailDTO {
    private Long id;
    private Integer totalAmount;
    private String receiverName;
    private String receiverPhone;
    private String receiverAddress;
    private Integer status;
    private String statusText;
    private String createTime;
    private String payTime;
    private List<OrderItemDTO> items;
}
```

```java
// OrderItemDTO.java
package com.ecommerce.dto;

import lombok.Data;
import java.math.BigDecimal;

@Data
public class OrderItemDTO {
    private String productName;
    private Integer price;
    private Integer quantity;
    private Integer subtotal;
}
```

```java
// OrderListDTO.java
package com.ecommerce.dto;

import lombok.Data;

@Data
public class OrderListDTO {
    private Long id;
    private Integer totalAmount;
    private Integer status;
    private String statusText;
    private String createTime;
    private Integer itemCount;
}
```

- [ ] **Step 2: 创建 OrderService**

```java
// OrderService.java
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
```

```java
// OrderServiceImpl.java
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
```

- [ ] **Step 3: 创建 OrderController**

```java
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
```

- [ ] **Step 4: 验证接口**

Run: 测试订单接口

- POST /api/orders（创建订单）
- GET /api/orders（订单列表）
- GET /api/orders/1（订单详情）
- PUT /api/orders/1/pay（支付）
- PUT /api/orders/1/cancel（取消）
- [ ] **Step 5: 提交代码**

```bash
git add backend/src/main/java/com/ecommerce/
git commit -m "feat: 实现订单创建和支付功能"
```

***

## 第六阶段：前端开发

### Task 8: 创建 Vue 前端项目

**Files:**

- Create: `frontend/package.json`
- Create: `frontend/vite.config.js`
- Create: `frontend/index.html`
- Create: `frontend/src/main.js`
- Create: `frontend/src/App.vue`
- Create: `frontend/src/router/index.js`
- Create: `frontend/src/api/index.js`
- [ ] **Step 1: 创建 package.json**

```json
{
  "name": "ecommerce-frontend",
  "version": "1.0.0",
  "type": "module",
  "scripts": {
    "dev": "vite",
    "build": "vite build"
  },
  "dependencies": {
    "vue": "^3.4.0",
    "vue-router": "^4.2.5",
    "axios": "^1.6.0"
  },
  "devDependencies": {
    "@vitejs/plugin-vue": "^5.0.0",
    "vite": "^5.0.0"
  }
}
```

- [ ] **Step 2: 创建 vite.config.js**

```javascript
import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'

export default defineConfig({
  plugins: [vue()],
  server: {
    port: 5173,
    proxy: {
      '/api': {
        target: 'http://localhost:8080',
        changeOrigin: true
      }
    }
  }
})
```

- [ ] **Step 3: 创建 index.html**

```html
<!DOCTYPE html>
<html lang="zh-CN">
<head>
  <meta charset="UTF-8">
  <title>电商平台</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; }
  </style>
</head>
<body>
  <div id="app"></div>
  <script type="module" src="/src/main.js"></script>
</body>
</html>
```

- [ ] **Step 4: 创建 main.js**

```javascript
import { createApp } from 'vue'
import App from './App.vue'
import router from './router'

createApp(App).use(router).mount('#app')
```

- [ ] **Step 5: 创建 App.vue**

```vue
<template>
  <div id="app">
    <router-view />
  </div>
</template>

<script setup>
</script>

<style>
#app {
  min-height: 100vh;
  background-color: #f5f5f5;
}
</style>
```

- [ ] **Step 6: 创建 router/index.js**

```javascript
import { createRouter, createWebHistory } from 'vue-router'

const routes = [
  { path: '/', redirect: '/products' },
  { path: '/login', component: () => import('../views/Login.vue') },
  { path: '/register', component: () => import('../views/Register.vue') },
  { path: '/products', component: () => import('../views/ProductList.vue') },
  { path: '/product/:id', component: () => import('../views/ProductDetail.vue') },
  { path: '/cart', component: () => import('../views/Cart.vue') },
  { path: '/order/confirm', component: () => import('../views/OrderConfirm.vue') },
  { path: '/orders', component: () => import('../views/OrderList.vue') },
  { path: '/order/:id', component: () => import('../views/OrderDetail.vue') },
  { path: '/:pathMatch(.*)*', redirect: '/products' }
]

const router = createRouter({
  history: createWebHistory(),
  routes
})

export default router
```

- [ ] **Step 7: 创建 api/index.js**

```javascript
import axios from 'axios'

const api = axios.create({
  baseURL: '/api',
  timeout: 10000
})

api.interceptors.request.use(config => {
  const userId = localStorage.getItem('userId')
  if (userId) {
    config.headers['X-User-Id'] = userId
  }
  return config
})

export const userApi = {
  login: (data) => api.post('/user/login', data),
  register: (data) => api.post('/user/register', data)
}

export const categoryApi = {
  list: () => api.get('/categories')
}

export const productApi = {
  list: (categoryId) => api.get('/products', { params: { categoryId } }),
  getById: (id) => api.get(`/products/${id}`)
}

export const cartApi = {
  list: () => api.get('/cart'),
  add: (productId, quantity) => api.post('/cart', { productId, quantity }),
  updateQuantity: (id, quantity) => api.put(`/cart/${id}`, { quantity }),
  delete: (id) => api.delete(`/cart/${id}`)
}

export const orderApi = {
  create: (data) => api.post('/orders', data),
  list: () => api.get('/orders'),
  getById: (id) => api.get(`/orders/${id}`),
  pay: (id) => api.put(`/orders/${id}/pay`),
  cancel: (id) => api.put(`/orders/${id}/cancel`)
}

export default api
```

- [ ] **Step 8: 提交代码**

```bash
mkdir -p frontend/src/router frontend/src/views frontend/src/api
# 添加文件后提交
git add frontend/
git commit -m "feat: 创建 Vue 前端项目基础结构"
```

***

### Task 9: 用户页面开发

**Files:**

- Create: `frontend/src/views/Login.vue`
- Create: `frontend/src/views/Register.vue`
- [ ] **Step 1: 创建 Login.vue**

```vue
<template>
  <div class="login-page">
    <div class="login-box">
      <h2>登录</h2>
      <form @submit.prevent="handleLogin">
        <div class="form-group">
          <input v-model="form.username" placeholder="用户名" required />
        </div>
        <div class="form-group">
          <input v-model="form.password" type="password" placeholder="密码" required />
        </div>
        <button type="submit" class="btn-primary">登录</button>
        <p class="link-text">
          还没有账号？<router-link to="/register">立即注册</router-link>
        </p>
      </form>
    </div>
  </div>
</template>

<script setup>
import { reactive } from 'vue'
import { useRouter } from 'vue-router'
import { userApi } from '../api'

const router = useRouter()
const form = reactive({ username: '', password: '' })

const handleLogin = async () => {
  try {
    const res = await userApi.login(form)
    localStorage.setItem('userId', res.data.data.userId)
    localStorage.setItem('username', res.data.data.username)
    router.push('/products')
  } catch (e) {
    alert(e.response?.data?.message || '登录失败')
  }
}
</script>

<style scoped>
.login-page { display: flex; justify-content: center; align-items: center; height: 100vh; background: #f5f5f5; }
.login-box { width: 360px; padding: 40px; background: #fff; border-radius: 8px; box-shadow: 0 2px 8px rgba(0,0,0,0.1); }
h2 { text-align: center; margin-bottom: 30px; color: #FF6700; }
.form-group { margin-bottom: 20px; }
input { width: 100%; height: 40px; padding: 0 12px; border: 1px solid #e0e0e0; border-radius: 4px; font-size: 14px; }
input:focus { outline: none; border-color: #FF6700; }
.btn-primary { width: 100%; height: 44px; background: #FF6700; color: #fff; border: none; border-radius: 4px; font-size: 16px; cursor: pointer; }
.btn-primary:hover { background: #e65c00; }
.link-text { text-align: center; margin-top: 20px; color: #999; }
.link-text a { color: #FF6700; }
</style>
```

- [ ] **Step 2: 创建 Register.vue**

```vue
<template>
  <div class="register-page">
    <div class="register-box">
      <h2>注册</h2>
      <form @submit.prevent="handleRegister">
        <div class="form-group">
          <input v-model="form.username" placeholder="用户名" required />
        </div>
        <div class="form-group">
          <input v-model="form.password" type="password" placeholder="密码" required />
        </div>
        <div class="form-group">
          <input v-model="form.phone" placeholder="手机号" required />
        </div>
        <button type="submit" class="btn-primary">注册</button>
        <p class="link-text">
          已有账号？<router-link to="/login">立即登录</router-link>
        </p>
      </form>
    </div>
  </div>
</template>

<script setup>
import { reactive } from 'vue'
import { useRouter } from 'vue-router'
import { userApi } from '../api'

const router = useRouter()
const form = reactive({ username: '', password: '', phone: '' })

const handleRegister = async () => {
  try {
    await userApi.register(form)
    alert('注册成功，请登录')
    router.push('/login')
  } catch (e) {
    alert(e.response?.data?.message || '注册失败')
  }
}
</script>

<style scoped>
.register-page { display: flex; justify-content: center; align-items: center; height: 100vh; background: #f5f5f5; }
.register-box { width: 360px; padding: 40px; background: #fff; border-radius: 8px; box-shadow: 0 2px 8px rgba(0,0,0,0.1); }
h2 { text-align: center; margin-bottom: 30px; color: #FF6700; }
.form-group { margin-bottom: 20px; }
input { width: 100%; height: 40px; padding: 0 12px; border: 1px solid #e0e0e0; border-radius: 4px; font-size: 14px; }
input:focus { outline: none; border-color: #FF6700; }
.btn-primary { width: 100%; height: 44px; background: #FF6700; color: #fff; border: none; border-radius: 4px; font-size: 16px; cursor: pointer; }
.btn-primary:hover { background: #e65c00; }
.link-text { text-align: center; margin-top: 20px; color: #999; }
.link-text a { color: #FF6700; }
</style>
```

- [ ] **Step 3: 提交代码**

```bash
git add frontend/src/views/
git commit -m "feat: 实现登录注册页面"
```

***

### Task 10: 商品列表和详情页开发

**Files:**

- Create: `frontend/src/views/ProductList.vue`
- Create: `frontend/src/views/ProductDetail.vue`
- [ ] **Step 1: 创建 ProductList.vue**

```vue
<template>
  <div class="layout">
    <header class="header">
      <div class="container">
        <h1 class="logo">电商平台</h1>
        <nav class="nav">
          <router-link to="/products">商品列表</router-link>
          <router-link to="/cart">购物车</router-link>
          <router-link to="/orders">我的订单</router-link>
          <span class="username">{{ username }}</span>
          <a href="#" @click.prevent="logout">退出</a>
        </nav>
      </div>
    </header>
    <div class="main container">
      <aside class="sidebar">
        <h3>商品分类</h3>
        <ul>
          <li :class="{ active: !categoryId }" @click="categoryId = null">全部分类</li>
          <li v-for="cat in categories" :key="cat.id" :class="{ active: categoryId === cat.id }" @click="categoryId = cat.id">
            {{ cat.name }}
          </li>
        </ul>
      </aside>
      <main class="content">
        <div class="product-grid">
          <div v-for="product in products" :key="product.id" class="product-card" @click="goDetail(product.id)">
            <img :src="product.imageUrl" :alt="product.name" />
            <div class="product-info">
              <h4>{{ product.name }}</h4>
              <p class="desc">{{ product.description }}</p>
              <p class="price">¥{{ product.price }}</p>
              <button class="btn-add" @click.stop="addToCart(product.id)">加入购物车</button>
            </div>
          </div>
        </div>
      </main>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, watch } from 'vue'
import { useRouter } from 'vue-router'
import { categoryApi, productApi, cartApi } from '../api'

const router = useRouter()
const categories = ref([])
const products = ref([])
const categoryId = ref(null)
const username = localStorage.getItem('username') || ''

const loadCategories = async () => {
  const res = await categoryApi.list()
  categories.value = res.data.data
}

const loadProducts = async () => {
  const res = await productApi.list(categoryId.value)
  products.value = res.data.data
}

const goDetail = (id) => router.push(`/product/${id}`)

const addToCart = async (productId) => {
  try {
    await cartApi.add(productId, 1)
    alert('已加入购物车')
  } catch (e) {
    alert('请先登录')
    router.push('/login')
  }
}

const logout = () => {
  localStorage.clear()
  router.push('/login')
}

watch(categoryId, loadProducts)
onMounted(() => { loadCategories(); loadProducts() })
</script>

<style scoped>
.layout { min-height: 100vh; }
.header { height: 60px; background: #fff; border-bottom: 1px solid #e0e0e0; }
.container { width: 1200px; margin: 0 auto; display: flex; align-items: center; }
.logo { color: #FF6700; font-size: 24px; }
.nav { margin-left: auto; display: flex; gap: 20px; }
.nav a { color: #333; text-decoration: none; }
.nav a:hover { color: #FF6700; }
.username { color: #FF6700; }
.main { padding: 20px 0; display: flex; gap: 20px; }
.sidebar { width: 200px; background: #fff; padding: 20px; }
.sidebar h3 { margin-bottom: 15px; color: #333; }
.sidebar ul { list-style: none; }
.sidebar li { padding: 10px; cursor: pointer; border-radius: 4px; }
.sidebar li:hover, .sidebar li.active { background: #FFF3E0; color: #FF6700; }
.content { flex: 1; }
.product-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 20px; }
.product-card { background: #fff; border-radius: 8px; overflow: hidden; cursor: pointer; transition: transform 0.2s; }
.product-card:hover { transform: translateY(-4px); box-shadow: 0 4px 12px rgba(0,0,0,0.1); }
.product-card img { width: 100%; height: 200px; object-fit: cover; }
.product-info { padding: 15px; }
.product-info h4 { font-size: 14px; margin-bottom: 8px; }
.desc { font-size: 12px; color: #999; margin-bottom: 8px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.price { color: #FF6700; font-size: 18px; font-weight: bold; margin-bottom: 10px; }
.btn-add { width: 100%; padding: 8px; background: #FF6700; color: #fff; border: none; border-radius: 4px; cursor: pointer; }
.btn-add:hover { background: #e65c00; }
</style>
```

- [ ] **Step 2: 创建 ProductDetail.vue**

```vue
<template>
  <div class="layout">
    <header class="header">
      <div class="container">
        <h1 class="logo" @click="router.push('/products')">电商平台</h1>
        <nav class="nav">
          <router-link to="/products">商品列表</router-link>
          <router-link to="/cart">购物车</router-link>
          <router-link to="/orders">我的订单</router-link>
        </nav>
      </div>
    </header>
    <div class="main container" v-if="product">
      <div class="product-detail">
        <img :src="product.imageUrl" :alt="product.name" class="product-img" />
        <div class="product-info">
          <h2>{{ product.name }}</h2>
          <p class="desc">{{ product.description }}</p>
          <p class="price">¥{{ product.price }}</p>
          <p class="stock">库存: {{ product.stock }}</p>
          <div class="actions">
            <div class="quantity">
              <button @click="quantity > 1 && quantity--">-</button>
              <span>{{ quantity }}</span>
              <button @click="quantity < product.stock && quantity++">+</button>
            </div>
            <button class="btn-add" @click="addToCart">加入购物车</button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { productApi, cartApi } from '../api'

const route = useRoute()
const router = useRouter()
const product = ref(null)
const quantity = ref(1)

const loadProduct = async () => {
  const res = await productApi.getById(route.params.id)
  product.value = res.data.data
}

const addToCart = async () => {
  try {
    await cartApi.add(product.value.id, quantity.value)
    alert('已加入购物车')
  } catch (e) {
    alert('请先登录')
    router.push('/login')
  }
}

onMounted(loadProduct)
</script>

<style scoped>
.layout { min-height: 100vh; }
.header { height: 60px; background: #fff; border-bottom: 1px solid #e0e0e0; }
.container { width: 1200px; margin: 0 auto; }
.logo { color: #FF6700; font-size: 24px; cursor: pointer; }
.nav { float: right; display: flex; gap: 20px; line-height: 60px; }
.nav a { color: #333; text-decoration: none; }
.main { padding: 40px 0; }
.product-detail { display: flex; gap: 40px; background: #fff; padding: 40px; border-radius: 8px; }
.product-img { width: 400px; height: 400px; object-fit: cover; }
.product-info { flex: 1; }
.product-info h2 { font-size: 24px; margin-bottom: 20px; }
.desc { color: #666; margin-bottom: 20px; }
.price { color: #FF6700; font-size: 32px; font-weight: bold; margin-bottom: 15px; }
.stock { color: #999; margin-bottom: 30px; }
.actions { display: flex; gap: 20px; }
.quantity { display: flex; align-items: center; border: 1px solid #e0e0e0; }
.quantity button { width: 40px; height: 40px; border: none; background: #f5f5f5; cursor: pointer; }
.quantity span { width: 60px; text-align: center; }
.btn-add { padding: 12px 40px; background: #FF6700; color: #fff; border: none; border-radius: 4px; font-size: 16px; cursor: pointer; }
.btn-add:hover { background: #e65c00; }
</style>
```

- [ ] **Step 3: 提交代码**

```bash
git add frontend/src/views/
git commit -m "feat: 实现商品列表和详情页"
```

***

### Task 11: 购物车页面开发

**Files:**

- Create: `frontend/src/views/Cart.vue`
- [ ] **Step 1: 创建 Cart.vue**

```vue
<template>
  <div class="layout">
    <header class="header">
      <div class="container">
        <h1 class="logo" @click="router.push('/products')">电商平台</h1>
        <nav class="nav">
          <router-link to="/products">商品列表</router-link>
          <router-link to="/cart">购物车</router-link>
          <router-link to="/orders">我的订单</router-link>
        </nav>
      </div>
    </header>
    <div class="main container">
      <div class="cart-page">
        <h2>购物车</h2>
        <div v-if="cartItems.length" class="cart-list">
          <div v-for="item in cartItems" :key="item.id" class="cart-item">
            <img :src="item.imageUrl" :alt="item.productName" />
            <div class="item-info">
              <h4>{{ item.productName }}</h4>
              <p class="price">¥{{ item.price }}</p>
            </div>
            <div class="quantity">
              <button @click="updateQuantity(item.id, item.quantity - 1)">-</button>
              <span>{{ item.quantity }}</span>
              <button @click="updateQuantity(item.id, item.quantity + 1)">+</button>
            </div>
            <p class="subtotal">¥{{ item.subtotal }}</p>
            <button class="btn-delete" @click="deleteItem(item.id)">删除</button>
          </div>
          <div class="cart-footer">
            <p class="total">总计: ¥{{ total }}</p>
            <button class="btn-checkout" @click="goConfirm">去结算</button>
          </div>
        </div>
        <div v-else class="empty">
          <p>购物车是空的</p>
          <router-link to="/products">去购物</router-link>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { cartApi } from '../api'

const router = useRouter()
const cartItems = ref([])

const total = computed(() => cartItems.value.reduce((sum, item) => sum + item.subtotal, 0))

const loadCart = async () => {
  try {
    const res = await cartApi.list()
    cartItems.value = res.data.data
  } catch (e) {
    router.push('/login')
  }
}

const updateQuantity = async (id, quantity) => {
  if (quantity < 1) return
  await cartApi.updateQuantity(id, quantity)
  loadCart()
}

const deleteItem = async (id) => {
  await cartApi.delete(id)
  loadCart()
}

const goConfirm = () => {
  router.push('/order/confirm')
}

onMounted(loadCart)
</script>

<style scoped>
.layout { min-height: 100vh; }
.header { height: 60px; background: #fff; border-bottom: 1px solid #e0e0e0; }
.container { width: 1200px; margin: 0 auto; }
.logo { color: #FF6700; font-size: 24px; cursor: pointer; }
.nav { float: right; display: flex; gap: 20px; line-height: 60px; }
.nav a { color: #333; text-decoration: none; }
.main { padding: 40px 0; }
.cart-page { background: #fff; padding: 30px; border-radius: 8px; }
.cart-page h2 { margin-bottom: 20px; }
.cart-list { }
.cart-item { display: flex; align-items: center; padding: 20px 0; border-bottom: 1px solid #f0f0f0; }
.cart-item img { width: 80px; height: 80px; object-fit: cover; }
.item-info { flex: 1; margin-left: 20px; }
.item-info h4 { font-size: 14px; }
.price { color: #FF6700; margin-top: 5px; }
.quantity { display: flex; align-items: center; margin: 0 40px; }
.quantity button { width: 30px; height: 30px; border: 1px solid #e0e0e0; background: #fff; cursor: pointer; }
.quantity span { width: 40px; text-align: center; }
.subtotal { width: 100px; color: #FF6700; font-weight: bold; }
.btn-delete { padding: 6px 16px; background: #fff; border: 1px solid #e0e0e0; border-radius: 4px; cursor: pointer; }
.btn-delete:hover { color: #ff4d4f; border-color: #ff4d4f; }
.cart-footer { display: flex; justify-content: space-between; align-items: center; margin-top: 20px; }
.total { font-size: 20px; color: #FF6700; font-weight: bold; }
.btn-checkout { padding: 12px 40px; background: #FF6700; color: #fff; border: none; border-radius: 4px; font-size: 16px; cursor: pointer; }
.btn-checkout:hover { background: #e65c00; }
.empty { text-align: center; padding: 60px 0; }
.empty p { color: #999; margin-bottom: 20px; }
.empty a { color: #FF6700; }
</style>
```

- [ ] **Step 2: 提交代码**

```bash
git add frontend/src/views/Cart.vue
git commit -m "feat: 实现购物车页面"
```

***

### Task 12: 订单页面开发

**Files:**

- Create: `frontend/src/views/OrderConfirm.vue`
- Create: `frontend/src/views/OrderList.vue`
- Create: `frontend/src/views/OrderDetail.vue`
- [ ] **Step 1: 创建 OrderConfirm.vue**

```vue
<template>
  <div class="layout">
    <header class="header">
      <div class="container">
        <h1 class="logo" @click="router.push('/products')">电商平台</h1>
      </div>
    </header>
    <div class="main container">
      <div class="confirm-page">
        <h2>确认订单</h2>
        <div class="section">
          <h3>收货信息</h3>
          <div class="form">
            <input v-model="form.receiverName" placeholder="收货人姓名" />
            <input v-model="form.receiverPhone" placeholder="联系电话" />
            <input v-model="form.receiverAddress" placeholder="收货地址" />
          </div>
        </div>
        <div class="section">
          <h3>商品清单</h3>
          <div class="item-list">
            <div v-for="item in cartItems" :key="item.id" class="item">
              <span>{{ item.productName }}</span>
              <span>x{{ item.quantity }}</span>
              <span class="price">¥{{ item.subtotal }}</span>
            </div>
          </div>
        </div>
        <div class="footer">
          <p class="total">实付: ¥{{ total }}</p>
          <button class="btn-submit" @click="submitOrder">提交订单</button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { cartApi, orderApi } from '../api'

const router = useRouter()
const cartItems = ref([])
const form = ref({ receiverName: '', receiverPhone: '', receiverAddress: '' })

const total = computed(() => cartItems.value.reduce((sum, item) => sum + item.subtotal, 0))

const loadCart = async () => {
  const res = await cartApi.list()
  cartItems.value = res.data.data
}

const submitOrder = async () => {
  if (!form.value.receiverName || !form.value.receiverPhone || !form.value.receiverAddress) {
    alert('请填写完整收货信息')
    return
  }
  try {
    const res = await orderApi.create({
      cartIds: cartItems.value.map(i => i.id),
      ...form.value
    })
    const orderId = res.data.data
    if (confirm('订单创建成功，是否立即支付？')) {
      await orderApi.pay(orderId)
      alert('支付成功')
      router.push('/orders')
    } else {
      router.push('/orders')
    }
  } catch (e) {
    alert(e.response?.data?.message || '创建订单失败')
  }
}

onMounted(loadCart)
</script>

<style scoped>
.layout { min-height: 100vh; }
.header { height: 60px; background: #fff; border-bottom: 1px solid #e0e0e0; }
.container { width: 1200px; margin: 0 auto; }
.logo { color: #FF6700; font-size: 24px; cursor: pointer; line-height: 60px; }
.main { padding: 40px 0; }
.confirm-page { background: #fff; padding: 30px; border-radius: 8px; }
.confirm-page h2 { margin-bottom: 30px; }
.section { margin-bottom: 30px; }
.section h3 { margin-bottom: 15px; font-size: 16px; }
.form input { width: 100%; height: 40px; padding: 0 12px; margin-bottom: 10px; border: 1px solid #e0e0e0; border-radius: 4px; }
.item-list { border: 1px solid #f0f0f0; border-radius: 4px; }
.item { display: flex; padding: 15px; border-bottom: 1px solid #f0f0f0; }
.item span { flex: 1; }
.item .price { text-align: right; color: #FF6700; }
.footer { display: flex; justify-content: space-between; align-items: center; margin-top: 30px; }
.total { font-size: 24px; color: #FF6700; font-weight: bold; }
.btn-submit { padding: 14px 60px; background: #FF6700; color: #fff; border: none; border-radius: 4px; font-size: 16px; cursor: pointer; }
.btn-submit:hover { background: #e65c00; }
</style>
```

- [ ] **Step 2: 创建 OrderList.vue**

```vue
<template>
  <div class="layout">
    <header class="header">
      <div class="container">
        <h1 class="logo" @click="router.push('/products')">电商平台</h1>
        <nav class="nav">
          <router-link to="/products">商品列表</router-link>
          <router-link to="/cart">购物车</router-link>
          <router-link to="/orders">我的订单</router-link>
        </nav>
      </div>
    </header>
    <div class="main container">
      <div class="order-page">
        <h2>我的订单</h2>
        <div v-if="orders.length" class="order-list">
          <div v-for="order in orders" :key="order.id" class="order-card" @click="goDetail(order.id)">
            <div class="order-header">
              <span>订单号: {{ order.id }}</span>
              <span>{{ order.createTime }}</span>
              <span class="status" :class="'status-' + order.status">{{ order.statusText }}</span>
            </div>
            <div class="order-body">
              <span>商品数量: {{ order.itemCount }}</span>
              <span class="total">¥{{ order.totalAmount }}</span>
            </div>
          </div>
        </div>
        <div v-else class="empty">
          <p>暂无订单</p>
          <router-link to="/products">去购物</router-link>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { orderApi } from '../api'

const router = useRouter()
const orders = ref([])

const loadOrders = async () => {
  try {
    const res = await orderApi.list()
    orders.value = res.data.data
  } catch (e) {
    router.push('/login')
  }
}

const goDetail = (id) => router.push(`/order/${id}`)

onMounted(loadOrders)
</script>

<style scoped>
.layout { min-height: 100vh; }
.header { height: 60px; background: #fff; border-bottom: 1px solid #e0e0e0; }
.container { width: 1200px; margin: 0 auto; }
.logo { color: #FF6700; font-size: 24px; cursor: pointer; }
.nav { float: right; display: flex; gap: 20px; line-height: 60px; }
.nav a { color: #333; text-decoration: none; }
.main { padding: 40px 0; }
.order-page { background: #fff; padding: 30px; border-radius: 8px; }
.order-page h2 { margin-bottom: 20px; }
.order-card { padding: 20px; border: 1px solid #f0f0f0; border-radius: 4px; margin-bottom: 15px; cursor: pointer; transition: all 0.2s; }
.order-card:hover { border-color: #FF6700; box-shadow: 0 2px 8px rgba(255,103,0,0.1); }
.order-header { display: flex; justify-content: space-between; margin-bottom: 10px; color: #999; font-size: 12px; }
.order-body { display: flex; justify-content: space-between; }
.total { color: #FF6700; font-size: 18px; font-weight: bold; }
.status-0 { color: #faad14; }
.status-1 { color: #52c41a; }
.status-2 { color: #1890ff; }
.status-3 { color: #52c41a; }
.status-4 { color: #999; }
.empty { text-align: center; padding: 60px 0; }
.empty p { color: #999; margin-bottom: 20px; }
.empty a { color: #FF6700; }
</style>
```

- [ ] **Step 3: 创建 OrderDetail.vue**

```vue
<template>
  <div class="layout">
    <header class="header">
      <div class="container">
        <h1 class="logo" @click="router.push('/products')">电商平台</h1>
        <nav class="nav">
          <router-link to="/products">商品列表</router-link>
          <router-link to="/cart">购物车</router-link>
          <router-link to="/orders">我的订单</router-link>
        </nav>
      </div>
    </header>
    <div class="main container" v-if="order">
      <div class="detail-page">
        <h2>订单详情</h2>
        <div class="info-section">
          <div class="info-row">
            <span class="label">订单号:</span>
            <span>{{ order.id }}</span>
          </div>
          <div class="info-row">
            <span class="label">订单状态:</span>
            <span class="status" :class="'status-' + order.status">{{ order.statusText }}</span>
          </div>
          <div class="info-row">
            <span class="label">下单时间:</span>
            <span>{{ order.createTime }}</span>
          </div>
          <div v-if="order.payTime" class="info-row">
            <span class="label">支付时间:</span>
            <span>{{ order.payTime }}</span>
          </div>
        </div>
        <div class="info-section">
          <h3>收货信息</h3>
          <div class="info-row">
            <span class="label">收货人:</span>
            <span>{{ order.receiverName }}</span>
          </div>
          <div class="info-row">
            <span class="label">联系电话:</span>
            <span>{{ order.receiverPhone }}</span>
          </div>
          <div class="info-row">
            <span class="label">收货地址:</span>
            <span>{{ order.receiverAddress }}</span>
          </div>
        </div>
        <div class="info-section">
          <h3>商品清单</h3>
          <div class="item-list">
            <div v-for="(item, index) in order.items" :key="index" class="item">
              <span>{{ item.productName }}</span>
              <span>¥{{ item.price }} x {{ item.quantity }}</span>
              <span class="price">¥{{ item.subtotal }}</span>
            </div>
          </div>
        </div>
        <div class="footer">
          <p class="total">实付: ¥{{ order.totalAmount }}</p>
          <div class="actions">
            <button v-if="order.status === 0" class="btn-pay" @click="payOrder">立即支付</button>
            <button v-if="order.status === 0" class="btn-cancel" @click="cancelOrder">取消订单</button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { orderApi } from '../api'

const route = useRoute()
const router = useRouter()
const order = ref(null)

const loadOrder = async () => {
  const res = await orderApi.getById(route.params.id)
  order.value = res.data.data
}

const payOrder = async () => {
  await orderApi.pay(order.value.id)
  alert('支付成功')
  loadOrder()
}

const cancelOrder = async () => {
  if (confirm('确定要取消订单吗？')) {
    await orderApi.cancel(order.value.id)
    alert('订单已取消')
    loadOrder()
  }
}

onMounted(loadOrder)
</script>

<style scoped>
.layout { min-height: 100vh; }
.header { height: 60px; background: #fff; border-bottom: 1px solid #e0e0e0; }
.container { width: 1200px; margin: 0 auto; }
.logo { color: #FF6700; font-size: 24px; cursor: pointer; }
.nav { float: right; display: flex; gap: 20px; line-height: 60px; }
.nav a { color: #333; text-decoration: none; }
.main { padding: 40px 0; }
.detail-page { background: #fff; padding: 30px; border-radius: 8px; }
.detail-page h2 { margin-bottom: 30px; }
.info-section { margin-bottom: 30px; padding-bottom: 20px; border-bottom: 1px solid #f0f0f0; }
.info-section h3 { margin-bottom: 15px; font-size: 16px; }
.info-row { display: flex; margin-bottom: 10px; }
.label { width: 80px; color: #999; }
.status-0 { color: #faad14; }
.status-1 { color: #52c41a; }
.status-2 { color: #1890ff; }
.status-3 { color: #52c41a; }
.status-4 { color: #999; }
.item-list { border: 1px solid #f0f0f0; border-radius: 4px; }
.item { display: flex; padding: 15px; border-bottom: 1px solid #f0f0f0; }
.item span { flex: 1; }
.item .price { text-align: right; color: #FF6700; }
.footer { display: flex; justify-content: space-between; align-items: center; margin-top: 30px; }
.total { font-size: 24px; color: #FF6700; font-weight: bold; }
.actions { display: flex; gap: 10px; }
.btn-pay { padding: 12px 30px; background: #FF6700; color: #fff; border: none; border-radius: 4px; cursor: pointer; }
.btn-cancel { padding: 12px 30px; background: #fff; border: 1px solid #e0e0e0; border-radius: 4px; cursor: pointer; }
</style>
```

- [ ] **Step 4: 提交代码**

```bash
git add frontend/src/views/
git commit -m "feat: 实现订单确认页、订单列表页、订单详情页"
```

***

## 总结

**实现计划已完成，包含以下任务：**

- Task 1: 创建 Spring Boot 项目结构
- Task 2: 创建实体类和数据库表
- Task 3: 创建 Mapper 接口
- Task 4: 用户注册登录功能
- Task 5: 商品分类和列表功能
- Task 6: 购物车功能
- Task 7: 订单创建和支付功能
- Task 8: 创建 Vue 前端项目
- Task 9: 用户页面开发
- Task 10: 商品列表和详情页开发
- Task 11: 购物车页面开发
- Task 12: 订单页面开发

