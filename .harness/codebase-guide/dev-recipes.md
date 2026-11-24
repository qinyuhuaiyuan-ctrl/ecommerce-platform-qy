---
tags: [代码库, 验证]
description: 依据项目清单及测试配置记录的执行入口，均未运行
---
# 开发与验证入口

来源：CLAUDE.md、frontend/package.json、vite.config.js、backend/pom.xml、docs/superpowers/tests/playwright.config.js 与 README。

- frontend 下：npm.cmd run dev（5173）、npm.cmd run build；npm.cmd run test:unit 或 npm.cmd test 运行 tests/unit。单文件入口 npm.cmd run test:unit -- tests/unit/theme-init.test.js。先前 esbuild spawn EPERM 已恢复：生产构建在恢复后的环境实际通过（Vite 5.4.21、102 modules、生成 dist），全量单测 4 files / 62 tests passed；统一 development-verify 回执 status=PASS、exitCode=0。实际证据与历史阻塞记录以当前开发日志及其 checks/ 目录为准。
- backend 下：mvn spring-boot:run（8080）、mvn test（测试依赖与文件已存在）。
- docs/superpowers/tests 下：npx playwright test；可指定 e2e.spec.js 或 performance.spec.js。

Playwright 配置 Chromium、baseURL=http://localhost:5173、超时30秒、HTML/list 报告，无自动启动服务配置。依赖声明位于 frontend，测试目录解析依赖是否成功待实际验证。

sdd-workitem-5第2轮真实运行现有Maven测试：17项全通过，证据见backend/target/surefire-reports和当前dev-log；没有主题测试通过结论。便携工具在.harness/.runtime-tools，命令内设置JAVA_HOME/PATH及工作区maven.repo.local、user.home、java.io.tmpdir。Spring启动采用 -Dspring-boot.run.jvmArguments=-Dfile.encoding=UTF-8；此参数仅传给应用子JVM，避免Windows默认编码导致SQL中文乱码，也避免将Maven改为UTF8后无法读取已有编译状态的编码冲突。实际8080冒烟返回分类5条、商品10条，中文与价格/库存及分类关系核对通过，服务已关闭。统一记录器发现前端 build/test，不覆盖 Maven、服务或种子；这些项目动作必须另行真实执行。
