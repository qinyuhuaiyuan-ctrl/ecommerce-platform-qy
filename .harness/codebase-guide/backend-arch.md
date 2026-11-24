---
tags: [代码库, 后端]
description: 后端结构与运行配置事实
---
# 后端

来源：backend/pom.xml、src/main/resources/application.yml 及 Java 路径清单。Java 17、Spring Boot 3.2.0、MyBatis-Plus 3.5.5；controller/service/mapper/entity/dto 分目录，涉及用户、分类、商品、购物车、订单和助手。

配置端口 8080，H2 内存库 ecommerce，启动初始化 schema.sql；实际种子加载行为未核验。助手依赖外部服务及 DEEPSEEK_API_KEY；本次未调用。主题是否需要后端保存尚待确认，不据此新增接口或数据约定。
