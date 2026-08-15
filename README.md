# enghealth

> 工程健康家族「元仪表盘 / 统一体检入口」——零依赖单文件 CLI。

工程健康家族已 **14 件套**（源码层九轴 + git 层四件套 + 配置层 pkgdoctor），但它们各自为政、零依赖单兵作战。**enghealth 把整支 family 聚合成一次命令、一张体检表、一个总分。**

```
enghealth  =  概览(自身零依赖扫描)  +  Σ(14 兄弟 CLI 健康分)  →  统一体检表 + 总分 + CI 门禁
```

## 为什么存在（组合叙事切口）

单点体检工具满天飞，但没有一个零依赖单文件工具能**把一整支同族体检工具编排成统一报告**。enghealth 的价值不在重复任何单兵维度，而在「统一编排 + 统一门禁 + 统一可复现」：跑一次，就知道你的工程在 family 覆盖的所有维度上到底健康不健康。

## 特性

- **零依赖**：单文件 `index.js`，仅用 Node 内置模块，开箱即跑，不需要 `npm install`。
- **自身概览体检**：零依赖扫描 `LICENSE / README / 锁文件 / .gitignore / 测试存在 / package.json 合法性 / .env 泄露 / 是否 git 仓库`。
- **可选增强（家族编排）**：自动在 PATH 或 `--tools-dir` 发现 14 个兄弟 CLI，逐个跑 `--json` 并**容错解析**其健康分汇入矩阵。兄弟工具缺失 / 失败 / JSON 无健康分字段一律**降级为「跳过」**，绝不误判。
- **统一健康分 + CI 门禁**：`--fail-on-low <n>`（任一兄弟低于 n 失败）与 `--min-overall <n>`（总分低于 n 失败），门禁用进程退出码表达，适配 GitHub Actions / GitLab CI。

## 安装

```bash
# 单独用（仅概览体检，零依赖）
npx enghealth <目标目录>

# 或用 family（把 14 件套也装全局，enghealth 自动并入它们）
npm i -g devdoctor testlite debtlens a11ydoctor awaitscan cycscan secscan dupscan typedoctor repodoctor docdoctor commitdoctor reldoctor pkgdoctor enghealth
```

本地开发 / 试用 family 联动：把 `--tools-dir` 指向 family 源码目录（每个工具是 `ol-<name>/index.js`），enghealth 会逐个调用。

## 用法

```bash
# 体检当前目录（不传目标则默认 .）
enghealth .

# 仅看总分与门禁结论
enghealth . --quiet

# 并入 family 兄弟体检（指向 family 源码目录）
enghealth . --tools-dir /path/to/forge/projects/2026-08-15

# CI 门禁：总分不低于 60、任一兄弟不低于 70
enghealth . --min-overall 60 --fail-on-low 70

# 仅输出纯 JSON（门禁结果用退出码表达）
enghealth . --json
```

## 输出示例（带 family 联动）

```
========================================
 工程健康家族 · 统一体检报告 (enghealth)
========================================
目标目录 : /path/to/project
概览健康分 : 100/100（enghealth 自身零依赖扫描）
并入兄弟工具 : 14/14
----------------------------------------
维度          类别    健康分     状态
依赖体检      源码    92        优
测试卫生      源码    80        良
技术债密度    源码    100       优
前端可访问    源码    100       优
异步性能      源码    100       优
结构复杂度    源码    95        优
安全反模式    源码    100       优
重复代码      源码    100       优
类型纪律      源码    100       优
仓库卫生      git     100       优
文档健康      git     100       优
提交规范      git     100       优
发布一致性    git     100       优
配置规范      配置    100       优
----------------------------------------
总分 : 100/100
概览发现：无
----------------------------------------
CI 门禁：PASS
```

## 选项

| 选项 | 说明 |
|---|---|
| `[目标目录]` | 要体检的目录，默认 `.` |
| `--tools-dir <dir>` | 指向 family 兄弟 CLI 源码目录（可多次），回退找 `ol-<name>/index.js` |
| `--json` | 仅向 stdout 输出纯 JSON，门禁用退出码表达 |
| `--quiet` | 仅输出总分与门禁结论 |
| `--fail-on-low <n>` | 任一兄弟健康分低于 `n`（默认 70）则门禁失败 |
| `--min-overall <n>` | 总分低于 `n`（默认 60）则门禁失败 |
| `-V, --version` | 显示版本 |
| `-h, --help` | 显示帮助 |

## 退出码

- `0`：体检完成且门禁通过（或仅展示模式）。
- `2`：门禁失败（CI 应据此阻断）或参数错误。

## 维度缺失语义（容错设计）

- 兄弟工具**未安装 / 未提供 `--tools-dir`**：标记 `跳过(未安装)`，不影响总分与门禁。
- 兄弟工具**调用失败（exit≠0）或 JSON 无健康分字段**：标记 `跳过(failed|unparsable)`，降级不误判——enghealth 只编排、不替兄弟背锅。
- 兄弟工具**正常运行但目标项目不匹配其维度**（例如 `typedoctor` 扫纯 JS 单文件项目、无 TS 类型可检）：标记 `missing`（该维度不适用），不计入总分分母，避免把"无此维度"误算成"0 分差项目"。

enghealth 自身概览永远独立可跑：**即使一个兄弟工具都没装，也能给你一份项目卫生概览体检报告。**

## 与 family 的关系

enghealth 是 family 的**编排层**，不重做任何单兵维度：

| 类别 | 兄弟工具 | 维度 |
|---|---|---|
| 源码层 | devdoctor / testlite / debtlens / a11ydoctor / awaitscan / cycscan / secscan / dupscan / typedoctor | 依赖 / 测试 / 技术债 / 前端可访问 / 异步性能 / 结构复杂度 / 安全 / 重复代码 / 类型纪律 |
| git 层 | repodoctor / docdoctor / commitdoctor / reldoctor | 仓库卫生 / 文档健康 / 提交规范 / 发布一致性 |
| 配置层 | pkgdoctor | package.json 配置规范 |
| 编排层 | **enghealth** | 统一体检入口 + 总分 + CI 门禁 |

## License

MIT
