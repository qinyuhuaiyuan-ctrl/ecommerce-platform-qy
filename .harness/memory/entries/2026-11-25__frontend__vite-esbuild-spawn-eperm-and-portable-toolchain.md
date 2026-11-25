---
tags: [Memory, frontend, 环境, esbuild, spawn-EPERM, 工具链]
description: 受限沙箱禁止子进程管道 stdio 会让 vite/esbuild、npm 生命周期脚本与 ByteBuddy attach 全部 EPERM，属环境阻塞而非产品失败
---

# vite/esbuild spawn EPERM 与可移植工具链恢复

- **来源工作项**：`sdd-workitem-6`（【20261225】页面乱码和图片缺失修复）
- **日期**：2026-11-25
- **范围**：frontend

## 症状

- `npm.cmd run build` / `npm.cmd run dev` 在加载 `vite.config.js` 阶段报 `Error: spawn EPERM`（`esbuild ensureServiceIsRunning → ChildProcess.spawn`），构建与 dev 服务器均未启动、0 项构建检查执行；`npm ci` 亦在生命周期脚本处报 `EPERM`；`mvn test` 的 `@SpringBootTest` 报 `Could not self-attach to current VM using external process`。

## 根因

- 受限执行沙箱禁止子进程管道 stdio。最小复现：`node -e "spawn(process.execPath,['-e','console.log(1)'],{stdio:['pipe','pipe','pipe']})"` 抛 `spawn EPERM`，把 `stdio` 改为 `'inherit'` 即成功；esbuild 服务、npm 生命周期脚本、ByteBuddy 外部 attach 三者都走管道。

## 修复

- 不改产品代码、不 patch vendor、不关闭检查。依赖安装改用 `npm.cmd ci --ignore-scripts`（只装 package.json 已声明的包）；后端测试追加 `-DargLine=-Djdk.attach.allowAttachSelf=true`；构建与 dev 服务器交给具备正常进程权限的环境重跑（本轮由 PM 用官方入口 `bash verify.sh` 跑通并产出 PASS 回执），并保留真实退出码与失败边界。

## 防复发措施

- 开工前先跑一条最小 `spawn` 探针，区分「环境阻塞」与「产品构建失败」；环境阻塞只记录真实输出，不用静态实现或事后补测替代构建证据；恢复后必须重跑同一命令形成新回执，不复用旧 FAIL。取得别人跑出的回执时，必须自己重算 `scriptSha256` / `evidenceSha256` / `inputRevision`，并直接对磁盘产物（而非日志文字）做检索，才能采信。

## 防复发落地文件

- `.harness/codebase-guide/dev-recipes.md`（写明构建态验证入口与 `-DargLine` 环境限制）；`.harness/codebase-guide/frontend-arch.md`（dev 与构建态路径差异不可混用）。

## 复发检测方式

- 报错栈首帧是否为 `esbuild ... ensureServiceIsRunning → ChildProcess.spawn` 或 `ByteBuddyAgent.installExternal`，且断言/构建产出为 0；命中即按环境问题处理并上报 PM，不改产品源码。反之，若同一命令在别的环境产出 PASS，仍要在本机把回执哈希与 `inputRevision` 重算一遍再采信。