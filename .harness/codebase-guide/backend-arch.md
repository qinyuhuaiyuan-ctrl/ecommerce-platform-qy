---
tags: [代码库, 后端]
description: 后端结构与运行配置事实
---
# 后端

来源：backend/pom.xml、src/main/resources/application.yml 及 Java 路径清单。Java 17、Spring Boot 3.2.0、MyBatis-Plus 3.5.5；controller/service/mapper/entity/dto 分目录，涉及用户、分类、商品、购物车、订单和助手。

配置端口 8080，H2 内存库 ecommerce；`spring.sql.init.mode=always`，每次启动执行 `schema.sql` 与 `data.sql`（`data-locations` 取 Spring Boot 默认 `optional:classpath*:data.sql`）。自 sdd-workitem-6 起在 `spring.sql.init` 下显式声明 `encoding: UTF-8`：脚本字符集不再依赖 JVM 默认字符集，中文 Windows（JDK17 默认 GBK）与 Linux/CI 行为一致。此前该配置缺失，种子中文在中文 Windows 上被按平台字符集解码成不可读字符，只能靠 `-Dfile.encoding=UTF-8` 启动参数偶然绕开，而暂存启动脚本与 jar 形态不带该参数。`SeedDataEncodingTest` 以 `@SpringBootTest` 加载真实上下文，断言 5 条分类名与 10 条商品名/描述与 `data.sql` 中文字面量逐字一致、且不含替换字符，同时断言 `image_url` 仍为源码树取值 `/src/assets/images/*.png`（后端不改写该取值，解析发生在前端）。助手依赖外部服务及 DEEPSEEK_API_KEY；本次未调用。主题是否需要后端保存尚待确认，不据此新增接口或数据约定。
