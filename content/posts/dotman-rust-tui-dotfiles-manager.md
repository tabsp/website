---
title: "用 Rust 写了一个 dotfiles 管理工具"
description: "原来的脚本越来越难维护，所以写了一个支持 Plan、执行预览和历史记录的 TUI 工具。"
date: 2026-07-11
tags: [Rust, TUI, dotfiles]
draft: false
slug: "dotman-rust-tui-dotfiles-manager"
---

我一直使用 Git 管理 Fish、Neovim、tmux、Ghostty 等配置。

最开始只需要写几个脚本，把仓库中的文件链接到 `~/.config`。后来又陆续加入了软件安装、目录创建、插件更新、旧配置清理和不同系统的判断，脚本逐渐变得不好维护。

主要有几个问题：

1. macOS 和 Linux 的安装方式不同；
2. 不同机器不需要完全相同的配置；
3. 执行前看不到完整的操作列表；
4. 文件已经存在时，不容易判断应该备份、覆盖还是跳过；
5. 执行失败后，只能从终端输出中寻找失败位置；
6. 关闭终端后，无法再查看之前的执行结果。

所以我写了一个简单的 dotfiles 管理工具：`dotman`。

项目代码仍然放在我的 dotfiles 仓库中：

<https://github.com/tabsp/dotfiles>

## 基本流程

dotman 使用 Rust 编写，支持 macOS 和 Linux，默认提供一个基于 Ratatui 的终端界面。

执行流程如下：

```text
Profile → Sync → Plan → Review → Run → History
```

Profile 用来记录 dotfiles 仓库地址、分支和本地路径。

运行时先同步仓库，再读取其中的 `dotman.yaml`，生成本次部署计划。确认没有问题后才会真正执行，最后保存运行记录。

日常使用直接运行：

```sh
dotman
```

无人值守环境可以使用：

```sh
dotman deploy --headless
```

## 配置

部署内容保存在仓库根目录的 `dotman.yaml` 中。

```yaml
package_managers:
  macos: brew
  ubuntu: brew
  arch: pacman

auto_install_pkg_manager: true
default_shell: fish

install:
  - fish
  - tmux
  - neovim
  - lazygit
  - ripgrep
  - fzf

links:
  ~/.config/fish: config/fish
  ~/.config/nvim: config/nvim
  ~/.tmux.conf: config/tmux.conf

create:
  - ~/.config/fish/local.d
  - ~/Workspace

shell:
  - command: fish -lc 'fisher update'
    description: Sync fish plugins
    optional: true
    if: command -v fish >/dev/null 2>&1

clean:
  - target: ~/.config/old-tool
    force: true
```

目前支持五类操作：

- `install`：安装软件；
- `links`：创建配置文件软链接；
- `create`：创建目录；
- `shell`：执行额外命令；
- `clean`：清理旧配置。

软件安装命令不直接写在 YAML 中，而是从内置工具数据库中根据当前平台选择。

链接也可以单独设置冲突处理方式：

```yaml
links:
  - target: ~/.config/nvim
    source: config/nvim
    backup: true
    relink: false
```

这样在目标目录已经存在时，可以明确选择备份或重新链接，不需要在 shell 中重复写判断逻辑。

## Plan 和 Review

我的几台机器用途不同，并不需要安装完全相同的软件。

以前通常使用 hostname、环境变量或者多份脚本区分，现在 dotman 会先生成 Plan，可以在界面中选择本机需要的项目，并保存选择结果。

Plan 只表示准备执行什么，Review 会进一步检查当前状态，例如：

- 软件是否已经安装；
- 软链接是否正确；
- 目标路径是否存在冲突；
- shell 命令的执行条件是否满足；
- clean 会删除或备份什么；
- 是否需要 sudo。

这样可以在真正修改文件之前发现问题。

## 执行和历史记录

执行时，每个 action 都有独立状态：

```text
Pending
Running
Changed
No Change
Skipped
Not Run
Aborted
Failed
```

stdout 和 stderr 会实时显示在界面中，并按照具体操作分组。

如果中途取消，已经完成的操作会保留原状态，当前操作标记为 `Aborted`，剩余操作标记为 `Not Run`。

每次执行都会生成一个 ULID，记录保存在：

```text
~/.local/share/dotman/runs/<ulid>.json
```

可以通过下面的命令查看：

```sh
dotman history
dotman run <ulid>
```

记录中包含执行时间、主机信息、配置版本、每个操作的状态、错误和输出。

这主要解决了脚本运行结束后无法回头检查的问题。

## 为什么使用 Rust

选择 Rust 首先是因为它比较适合这类工具。

dotman 需要处理文件系统、子进程、并发输出、执行中断、状态转换和终端恢复。使用结构体和枚举表达 Plan、Action 和 Run，比使用大量字符串和条件判断更清晰。

另一个原因是 Rust 比较适合使用 Agent 开发。

Agent 修改代码后，可以立即运行：

```sh
cargo check
cargo clippy
cargo test
```

编译器会直接指出字段变化、类型不匹配和没有处理完整的枚举分支。

例如给 action 新增一个状态后，所有没有处理该状态的 `match` 都会产生编译错误。Agent 可以根据这些错误继续修改，而不是等到运行时才发现某个界面或历史记录漏掉了新状态。

Rust 的类型约束在这里相当于额外的检查机制，比较适合让 Agent 持续修改和重构代码。

另外，最终程序可以编译为单个二进制文件，新机器不需要先安装 Python 或 Node.js。

## 项目结构

主要代码大致分为以下几部分：

```text
src/
├── config.rs       # 读取 dotman.yaml
├── profile.rs      # 管理仓库和 Profile
├── plan.rs         # 生成 Plan
├── execute.rs      # 执行操作
├── store.rs        # 保存选择和运行记录
├── headless.rs     # 无交互模式
├── ops/            # install、link、shell、clean
└── tui/            # Plan、Review、Run、History
```

执行器和 TUI 是分开的。

执行器产生结构化事件，TUI 将事件显示为进度和日志，Headless 模式则直接输出到终端。两种模式使用同一套执行逻辑。

目前 dotman 已经可以完成我自己的新机器初始化和日常配置同步，后续主要继续补充测试、跨平台行为和 TUI 细节。
