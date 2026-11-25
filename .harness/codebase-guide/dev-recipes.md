---
tags: [代码库, 验证]
description: 依据项目清单及测试配置记录的执行入口、构建态图片验证方式与实测环境限制
---
# 开发与验证入口

来源：CLAUDE.md、frontend/package.json、vite.config.js、backend/pom.xml、docs/superpowers/tests/playwright.config.js 与 README。

- frontend 下：npm.cmd run dev（5173）、npm.cmd run build；npm.cmd run test:unit 或 npm.cmd test 运行 tests/unit。单文件入口 npm.cmd run test:unit -- tests/unit/theme-init.test.js。sdd-workitem-5 轮次的生产构建曾实际通过（Vite 5.4.21）；sdd-workitem-6 轮次在受限开发环境下 `npm.cmd run build` 与 `npm.cmd run dev` 均在加载配置时（esbuild `ensureServiceIsRunning` → `ChildProcess.spawn`）报 `Error: spawn EPERM`，构建与 dev 服务器未启动、0 项构建检查执行，须由具备正常子进程管道的环境重跑；同轮 `npm.cmd run test:unit` 真实通过 7 files / 84 tests。
- 构建态图片验证入口：先 npm.cmd run build，再用 npx.cmd vite preview 预览构建产物（Vite 自带命令，不新增依赖）。验收要点：dist 内不得残留 `/src/assets/images` 字面引用，`dist/assets/` 下应有 10 个商品 PNG 指纹文件。dev 5173 会直接读取项目根内文件，`/src/assets/images/*.png` 可能偶然可访问，因此 dev 表现不能作为图片缺陷已修复的证据。
- backend 下：mvn spring-boot:run（8080）、mvn test。
- docs/superpowers/tests 下：npx playwright test；可指定 e2e.spec.js 或 performance.spec.js。

Playwright 配置 Chromium、baseURL=http://localhost:5173、超时30秒、HTML/list 报告，无自动启动服务配置。依赖声明位于 frontend，测试目录解析依赖是否成功待实际验证。

sdd-workitem-5 第2轮真实运行现有 Maven 测试：17 项全通过，证据见 backend/target/surefire-reports 和当前 dev-log；没有主题测试通过结论。便携工具在 .harness/.runtime-tools，命令内设置 JAVA_HOME/PATH 及工作区 maven.repo.local、user.home、java.io.tmpdir。

sdd-workitem-6 轮次的后端事实：种子脚本字符集已在 application.yml 中声明 `spring.sql.init.encoding: UTF-8`，启动不再需要 `-Dspring-boot.run.jvmArguments=-Dfile.encoding=UTF-8`（该参数此前只是规避手段，暂存启动脚本与 jar 形态并不携带）。本轮 `mvn test` 真实结果 22 项全通过；受限环境下 `@SpringBootTest` 会触发 ByteBuddy 自附加失败，需在命令行追加 `-DargLine=-Djdk.attach.allowAttachSelf=true` 才能运行，属环境限制而非产品配置要求。8080 冒烟返回分类 5 条、商品 10 条，中文与 data.sql 字面量一致。该轮 workspace 内没有 .harness/.runtime-tools，便携 JDK17 与 Maven 3.9.9 改放在会话临时目录，未向仓库引入任何工具文件。统一记录器发现前端 build/test，不覆盖 Maven、服务或种子；这些项目动作必须另行真实执行。
