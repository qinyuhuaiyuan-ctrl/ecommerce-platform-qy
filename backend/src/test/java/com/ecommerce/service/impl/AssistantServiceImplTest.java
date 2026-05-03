package com.ecommerce.service.impl;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import java.lang.reflect.Method;

import static org.junit.jupiter.api.Assertions.*;

public class AssistantServiceImplTest {

    private AssistantServiceImpl service;
    private Method isValidSqlMethod;

    @BeforeEach
    public void setUp() throws Exception {
        service = new AssistantServiceImpl();
        isValidSqlMethod = AssistantServiceImpl.class.getDeclaredMethod("isValidSql", String.class);
        isValidSqlMethod.setAccessible(true);
    }

    private boolean invokeIsValidSql(String sql) throws Exception {
        return (boolean) isValidSqlMethod.invoke(service, sql);
    }

    @Test
    public void shouldReturnTrueForValidSelect() throws Exception {
        assertTrue(invokeIsValidSql("SELECT * FROM product"));
    }

    @Test
    public void shouldReturnFalseForInsertStatement() throws Exception {
        assertFalse(invokeIsValidSql("INSERT INTO product VALUES (1, 'test')"));
    }

    @Test
    public void shouldReturnFalseForDropStatement() throws Exception {
        assertFalse(invokeIsValidSql("DROP TABLE product"));
    }

    @Test
    public void shouldReturnFalseForNullSql() throws Exception {
        assertFalse(invokeIsValidSql(null));
    }

    @Test
    public void shouldReturnFalseForEmptySql() throws Exception {
        assertFalse(invokeIsValidSql(""));
    }

    @Test
    public void shouldReturnFalseForBlankSql() throws Exception {
        assertFalse(invokeIsValidSql("   "));
    }

    @Test
    public void shouldReturnFalseForSqlWithPassword() throws Exception {
        assertFalse(invokeIsValidSql("SELECT password FROM user"));
    }

    @Test
    public void shouldReturnTrueForSelectWithJoin() throws Exception {
        assertTrue(invokeIsValidSql("SELECT * FROM orders o JOIN order_item oi ON o.id = oi.order_id"));
    }

    @Test
    public void shouldReturnFalseForDeleteStatement() throws Exception {
        assertFalse(invokeIsValidSql("DELETE FROM cart WHERE id = 1"));
    }

    @Test
    public void shouldReturnFalseForUpdateStatement() throws Exception {
        assertFalse(invokeIsValidSql("UPDATE product SET price = 100 WHERE id = 1"));
    }

    @Test
    public void shouldReturnFalseForUnknownTable() throws Exception {
        assertFalse(invokeIsValidSql("SELECT * FROM secret_table"));
    }

    @Test
    public void shouldReturnFalseForAlterStatement() throws Exception {
        assertFalse(invokeIsValidSql("ALTER TABLE product ADD COLUMN new_col VARCHAR(100)"));
    }

    @Test
    public void shouldReturnTrueForSelectFromAllowedTables() throws Exception {
        assertTrue(invokeIsValidSql("SELECT * FROM category"));
        assertTrue(invokeIsValidSql("SELECT * FROM cart"));
        assertTrue(invokeIsValidSql("SELECT * FROM orders"));
        assertTrue(invokeIsValidSql("SELECT * FROM order_item"));
        assertTrue(invokeIsValidSql("SELECT * FROM user"));
    }
}
