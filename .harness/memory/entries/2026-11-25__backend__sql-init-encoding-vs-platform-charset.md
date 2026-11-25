---
tags: [Memory, backend, 字符集, 种子数据, Spring-Boot, 乱码]
description: Windows 默认字符集非 UTF-8 时 spring.sql.init 未声明 encoding 会让种子中文解码成乱码，需配置随制品声明并在 UTF-8 环境外复现回归
---

# SQL 初始化脚本字符集与平台默认字符集失配导致中文乱码

- **来源工作项**：`sdd-workitem-6`（【20261225】页面乱码和图片缺失修复）
- **日期**：2026-11-25
- **范围**：backend

## 症状

- 中文 Windows（`chcp`=936）启动后，`/api/categories`、`/api/products` 返回的商品名与描述为 `鏈€鏂版鑻规灉鎵嬫満锛孉17 Pro鑺墖` 一类不可读字符，而静态文案与 Java 常量文案正常。

## 根因

- `spring.sql.init` 未声明 `encoding`，Spring Boot 3.2 的 `SqlInitializationProperties.encoding` 默认空 → 初始化脚本按 JVM 默认字符集解码；JDK17 在中文 Windows 上默认字符集为 GBK（`java -XshowSettings:properties` 显示 `file.encoding = GBK`），UTF-8 字节被按 GBK 解释。Linux/CI 默认 UTF-8，故缺陷只在中文 Windows 暴露；`-Dfile.encoding=UTF-8` 启动参数只是规避手段，jar/暂存启动不带该参数。

## 修复

- 在 `application.yml` 的 `spring.sql.init` 下声明 `encoding: UTF-8`，配置随制品走，dev、CI、jar 三种启动方式一致生效；并新增 `SeedDataEncodingTest`（`@SpringBootTest`）以 `data.sql` 字面量为断言，守住「脚本必须按 UTF-8 解码」。

## 防复发措施

- 任何依赖平台默认字符集的脚本读取都要显式声明字符集；种子中文用「字面量逐字相等 + 不含 `\uFFFD`」双重断言，而不是只查替换字符（GBK 误码多数仍是合法字符，只查 `\uFFFD` 会漏判）。

## 防复发落地文件

- `backend/src/main/resources/application.yml`、`backend/src/test/java/com/ecommerce/SeedDataEncodingTest.java`、`.harness/codebase-guide/backend-arch.md`。

## 复发检测方式

- 后端测试中商品/分类断言失败且实际值呈「繁体或生僻字混排」形态，或 `mvn test -Dtest=SeedDataEncodingTest` 在中文 Windows 上转红，即说明脚本解码字符集再次失配。