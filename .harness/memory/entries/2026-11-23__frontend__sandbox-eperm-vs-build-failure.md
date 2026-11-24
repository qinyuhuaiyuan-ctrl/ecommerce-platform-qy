---
tags: [Memory, frontend, 环境, esbuild, spawn-EPERM]
description: 受限子会话 esbuild spawn EPERM 属环境阻塞而非产品构建失败，需分开记录并交有进程权限的环境重跑
---

# 受限子会话的 spawn EPERM 不等于产品构建失败

- **来源工作项**：`sdd-workitem-5`（网页支持切换白天黑夜模式）
- **日期**：2026-11-23
- **范围**：frontend

## 症状

`vite build` 与 `vitest` 在加载配置阶段报 `Error: spawn EPERM`（`esbuild` 的 `ensureServiceIsRunning` → `ChildProcess.spawn`），构建未开始、0 条断言执行；同一命令在受限子会话与 PM 前台均复现。

## 根因

执行沙箱禁止子进程 stdio 管道，问题位于运行环境而非产品源码、依赖安装或测试逻辑；依赖安装成功也不代表子进程管道可用。

## 修复

不改产品代码、不 patch vendor、不关闭编译检查，把原命令交给具备正常进程权限的环境执行；该工作项第 4 轮由 PM 在恢复后的真实环境执行，得到构建 PASS 与 62 tests PASS 的真实回执。

## 防复发措施

把“环境错误”与“行为 RED／构建失败”分开记录；环境阻塞只保留真实退出码与失败边界，不用静态实现或事后补测替代 TDD；环境恢复后必须重跑同一命令并形成新的 `inputRevision` 回执，不复用旧 FAIL。

落地文件：`.harness/codebase-guide/deps.md`、`.harness/codebase-guide/dev-recipes.md`（已写明先前 esbuild `spawn EPERM` 已恢复、验证结果以对应 dev-log 为准）；无代码级防护，属流程约定。

## 复发检测方式

同类报错出现时先核对是否发生在 `esbuild` 配置打包/服务启动边界且 0 断言执行；若命中即按环境问题处理并上报 PM，不改产品源码。
