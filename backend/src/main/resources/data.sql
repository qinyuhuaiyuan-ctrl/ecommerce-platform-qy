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
