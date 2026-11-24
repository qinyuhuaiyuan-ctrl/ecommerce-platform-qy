---
tags: [规格, 索引]
description: 项目规格来源索引与 Harness 域规格目录，指向既有设计来源与已合并的领域规格
---
# 项目规格来源

既有来源：[电商平台客户端设计](../../docs/superpowers/specs/2026-04-26-ecommerce-platform-design.md)，含架构、用户、分类商品、购物车与订单设计。按需核对正文，不把设计描述自动视为已冻结或已验收需求。

CLAUDE.md 提及的 2026-04-29 测试设计文件未在 specs 目录发现。

## Harness 域规格

| 域 | 规格文件 | 前缀 | 编号范围 | 能力摘要 |
|---|---|---|---|---|
| 网页显示偏好 | [display-preferences.md](display-preferences.md) | DSP | DSP-R-001～007 / DSP-S-001～021 | 双主题展示一致性、手动切换、系统跟随、手动优先、同一浏览器记忆、身份独立、上下文保护、受限环境降级 |

跨域约束：DSP-C-001（主题变化不改变业务语义）、DSP-C-002（主题选择不以登录身份为边界）。

当前工作项锁定 standard，依据 workflow/runtime-policy.md，不按范围重新判档。
