package com.ecommerce;

import com.ecommerce.entity.Category;
import com.ecommerce.entity.Product;
import com.ecommerce.service.CategoryService;
import com.ecommerce.service.ProductService;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;

import java.util.List;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertTrue;

/**
 * 种子脚本编码守卫：schema.sql / data.sql 必须以 UTF-8 解码，
 * 否则中文 Windows 上按平台默认字符集解码会让种子中文变成不可读字符。
 */
@SpringBootTest
class SeedDataEncodingTest {

    private static final char REPLACEMENT_CHARACTER = '\uFFFD';

    private static final List<String> EXPECTED_CATEGORIES = List.of(
            "电子产品", "服装", "图书", "食品", "家居用品");

    @Autowired
    private CategoryService categoryService;

    @Autowired
    private ProductService productService;

    @Test
    void categoryNamesAreDecodedAsUtf8() {
        List<Category> categories = categoryService.listCategories();

        assertEquals(5, categories.size(), "种子数据应加载 5 条分类");
        List<String> names = categories.stream().map(Category::getName).toList();
        assertTrue(names.containsAll(EXPECTED_CATEGORIES),
                "分类名应以 UTF-8 解码为可读中文，实际为 " + names);
        names.forEach(name -> assertFalse(name.indexOf(REPLACEMENT_CHARACTER) >= 0,
                "分类名含替换字符: " + name));
    }

    @Test
    void productNamesAreDecodedAsUtf8() {
        List<Product> products = productService.listProducts(null);

        assertEquals(10, products.size(), "种子数据应加载 10 条商品");
        List<String> names = products.stream().map(Product::getName).toList();
        assertTrue(names.contains("纯棉T恤"), "商品名应以 UTF-8 解码为可读中文，实际为 " + names);
        assertTrue(names.contains("iPhone 15 Pro"), "商品名应与源文件逐字一致，实际为 " + names);
        names.forEach(name -> assertFalse(name.indexOf(REPLACEMENT_CHARACTER) >= 0,
                "商品名含替换字符: " + name));
    }

    @Test
    void productDescriptionsMatchTheSeedScriptLiterals() {
        List<Product> products = productService.listProducts(null);

        Product phone = products.stream()
                .filter(product -> "iPhone 15 Pro".equals(product.getName()))
                .findFirst()
                .orElseThrow(() -> new AssertionError("未找到 iPhone 15 Pro 商品"));

        assertEquals("最新款苹果手机，A17 Pro芯片", phone.getDescription(),
                "商品描述应与 data.sql 中文字面量逐字一致");
        products.forEach(product -> assertFalse(
                product.getDescription() != null && product.getDescription().indexOf(REPLACEMENT_CHARACTER) >= 0,
                "商品描述含替换字符: " + product.getDescription()));
    }

    @Test
    void productSingleViewKeepsReadableChinese() {
        Product phone = productService.listProducts(null).stream()
                .filter(product -> "iPhone 15 Pro".equals(product.getName()))
                .findFirst()
                .orElseThrow(() -> new AssertionError("未找到 iPhone 15 Pro 商品"));

        Product loaded = productService.getProduct(phone.getId());

        assertNotNull(loaded, "按 id 查询应返回商品");
        assertEquals("iPhone 15 Pro", loaded.getName());
        assertEquals("最新款苹果手机，A17 Pro芯片", loaded.getDescription());
    }

    @Test
    void productImageUrlsKeepTheirSeedValues() {
        List<Product> products = productService.listProducts(null);

        assertTrue(products.stream()
                        .allMatch(product -> product.getImageUrl() != null
                                && product.getImageUrl().startsWith("/src/assets/images/")),
                "种子 image_url 取值形态不得因本次修复改变");
    }
}
