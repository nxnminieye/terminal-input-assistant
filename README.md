# Terminal Input Assistant | 终端输入助手

[English](#english) | [简体中文](#zh-cn)

<br>
<hr>

<h2 id="english">🇬🇧 Terminal Input Assistant</h2>

A robust, safe input buffer for VS Code's integrated terminal. It fundamentally solves the garbled text, swallowed characters, and backspace misalignment issues when using complex, interactive CLI tools (especially with multi-byte characters like CJK).

### 🌟 Core Pain Point: Why does the terminal struggle with CJK?

When you use highly interactive CLI tools (like `claude code`, `vim`, `nano`, or tools built with libraries like `inquirer.js` or `prompt_toolkit`), they often place the terminal into **"Raw Mode"**. In this mode, the tool itself must read and process input byte-by-byte to provide advanced features like cursor movement, syntax highlighting, and auto-completion.

**The Root Cause:** Many of these CLI tools, or their underlying input-handling libraries, fail to properly process multi-byte characters (like UTF-8 encoded Chinese/Japanese/Korean) or complex terminal escape sequences generated during Input Method Editor (IME) interactions.
When you are actively typing, deleting, or modifying characters via an IME, these fragile CLI tools misinterpret the rapid, complex stream of bytes. This results in:

*   **Garbled Text & Swallowed Characters**: The tool misinterprets or drops bytes during fast IME composition.
*   **Cursor Misalignment & Backspace Errors**: The tool calculates character width incorrectly (assuming 1 byte = 1 visual cell), causing the cursor to drift when you try to edit or backspace over CJK characters.
*   **Aggravation over Remote-SSH**: Network latency and SSH protocol encapsulation exacerbate these timing and processing issues when developing on remote servers.

### 💡 The Solution

This extension provides a clean, independent input box in the VS Code Panel. **It completely bypasses the terminal's raw keystroke simulation.**

You perform all complex editing (typing, selecting IME candidates, backspacing, modifying) within this safe GUI buffer. Once you are done, the extension uses VS Code's official `terminal.sendText()` API to inject the final, perfect text string directly into the underlying PTY as an atomic operation.

**No garbled text, no cursor jumping—just smooth, reliable input.**

### ✨ Features

*   **🚀 Stable Input**: Say goodbye to terminal input bugs when dealing with CJK characters in interactive CLIs.
*   **🎯 Smart Tracking**: Automatically follows your active terminal tab or split pane.
*   **🔒 Lock Target**: Pin the input to a specific terminal so you can type even while focused elsewhere.
*   **📜 History Management**: Automatically records successful inputs. Click any history item to quickly re-send it, perfect for repetitive commands.
*   **⌨️ Quick Actions**: Use `Ctrl+Enter` to send text with a newline, and `Ctrl+Shift+I` to summon the panel.
*   **💻 Perfect for Remote-SSH**: Runs purely on your local Extension Host. No installation needed on the remote server.

---

### 📦 Installation & Usage

In the VS Code Extension Marketplace, search for **"Terminal Input Assistant"** and install.

> **💡 Important**: If you are using Remote-SSH, this extension **only** needs to be installed on your **local machine (e.g., Windows client)**. Do not install it on the remote server.

1. Open the VS Code Panel (usually next to the Terminal) and click the **"Input Assistant"** tab.
2. Or use the global shortcut `Ctrl+Shift+I` (`Cmd+Shift+I` on Mac) to quickly open and focus the input box.
3. Type your content in the clean input box.
4. Sending options:
   * **Ctrl+Enter** / **Send+Enter ↵ Button**: Send text and automatically append a newline (Enter). Ideal for executing commands.
   * **Send Button**: Send text only, without a trailing newline. Ideal for filling in prompts that await further input.
   * **History List**: Successful inputs are saved in the history list. Click an item to re-send it instantly.

### ⚙️ Configuration

Search for `imeInput` in VS Code Settings (`Ctrl+,`):

| Setting | Default | Description |
|---------|---------|-------------|
| `imeInput.clearAfterSend` | `true` | Automatically clear the input box after a successful send. Set to `false` to keep the previous input. |

### 🛠️ How it Works

```text
Local VS Code Client (GUI)
  ├─ Input Assistant Panel (WebView) —— A safe buffer, fully compatible with OS IME.
  │    └─ postMessage (Send clean text string)
  └─ Extension Host (Local context)
       └─ VS Code API: terminal.sendText() —— Bypass raw keystrokes, inject text directly.
            └─ Target Terminal PTY (Local Shell or Remote-SSH Server)
```

---

<br>
<h2 id="zh-cn">🇨🇳 终端输入助手 (Terminal Input Assistant)</h2>

为 VS Code 集成终端打造的安全输入缓冲区。从根本上解决在使用复杂的交互式 CLI 工具时，输入中文（及其他多字节字符）产生的乱码、吞字、退格错位等痛点。

### 🌟 核心痛点：为什么终端输入中文总是出问题？

当您使用强交互式的 CLI 工具（例如 `claude code`, `vim`, `nano`，或者基于 `inquirer.js`, `prompt_toolkit` 等库构建的命令行程序）时，它们通常会将终端置于**"原始模式"（Raw Mode）**。在这种模式下，为了实现光标任意移动、语法高亮、自动补全等高级功能，工具必须**亲自接管**并逐字节地读取和处理输入流。

**问题的根源在于 CLI 工具本身：** 许多 CLI 工具底层的输入处理库，在处理多字节字符（如 UTF-8 编码的中日韩字符）或应对输入法（IME）组合过程中的复杂按键转义序列时，存在严重缺陷。
当您通过输入法进行选词、回退（Backspace）、修改时，这些脆弱的 CLI 工具无法正确解析快速连续的字节流，从而导致：

*   **乱码与吞字**：工具在快速的 IME 上屏瞬间错误解析或丢失了字节数据。
*   **光标错位与退格异常**：工具错误地计算了字符宽度（简单地认为 1 个字节 = 1 个视觉单元），当您尝试回退或修改中文字符时，光标定位彻底崩溃。
*   **Remote-SSH 场景恶化**：在远程开发时，网络延迟、抖动以及 SSH 协议的封装，极大地放大了上述底层处理逻辑的脆弱性。虽然问题不仅仅存在于 Windows 终端，但在 Windows 复杂的终端历史包袱下暴露得尤为频繁。

### 💡 解决方案

本插件通过在 VS Code 底部面板（Panel）提供一个独立的、纯净的输入框，**完全绕过了终端底层脆弱的按键捕获机制**。

您在这个安全的 GUI 缓冲区内完成所有复杂的文本编辑（选词、回退、修改）。当您确认输入完毕后，插件会调用 VS Code 官方的 `terminal.sendText()` API，将最终确定的、完美的纯文本字符串，以**原子操作**的形式精准注入到底层 PTY 中。

**无论是多复杂的 CLI 工具，它接收到的都将是一串稳定、连续的文本流，彻底杜绝乱码和崩溃。**

### ✨ 功能特性

*   **🚀 稳定输入**: 彻底告别终端中文输入乱码、字符丢失和修改异常，完美驾驭各类交互式 CLI。
*   **🎯 智能终端追踪**: 自动跟随当前激活的终端窗口，支持分屏终端，指哪打哪。
*   **🔒 锁定目标终端**: 支持手动锁定目标终端。即使您的焦点切换到了代码编辑器或其他终端，输入面板的内容依然会准确发送到被锁定的目标中。
*   **📜 历史记录管理**: 自动记录发送成功的文本。点击历史列表中的项即可一键重新发送，非常适合重复执行的命令。
*   **⌨️ 快捷操作**: 支持 `Ctrl+Enter` 快速发送+回车，支持独立快捷键快速呼出面板。
*   **💻 完美适配 Remote-SSH**: 插件强制运行在本地 Extension Host，完美衔接本地输入法，**无需**在远程服务器上进行任何安装或配置。

### 📦 安装与使用

在 VS Code 扩展商店中搜索 **"Terminal Input Assistant"** 或 **"终端输入助手"** 并一键安装。

> **💡 重要提示**：如果您使用的是 Remote-SSH 远程开发，本插件**只需**安装在您的**本地（如 Windows 客户端）**即可生效，请勿安装到远程服务器。

1. 打开 VS Code 底部面板（通常在终端旁边），找到并点击 **"输入助手"** 选项卡。
2. 或使用全局快捷键 `Ctrl+Shift+I`（Mac 下为 `Cmd+Shift+I`）快速打开并聚焦输入框。
3. 输入内容后：
   * **Ctrl+Enter** / **"发送+回车 ↵" 按钮**：发送文本并自动执行换行（回车）。适合直接执行命令。
   * **"发送" 按钮**：仅发送纯文本，不追加换行。适合填写等待后续输入的交互提示符。
   * **历史记录列表**：发送成功的文本会自动存入下方的历史列表，点击即可快速重复发送。

### ⚙️ 插件配置

您可以在 VS Code 的设置（`Ctrl+,`）中搜索 `imeInput` 进行个性化配置：

| 配置项 | 默认值 | 说明 |
|--------|--------|------|
| `imeInput.clearAfterSend` | `true` | 发送成功后自动清空输入框内容。若设为 `false`，则保留历史输入。 |

### 🛠️ 工作原理 (How it Works)

```text
Local VS Code Client (GUI)
  ├─ Input Assistant Panel (WebView) —— A safe buffer, fully compatible with OS IME.
  │    └─ postMessage (Send clean text string)
  └─ Extension Host (Local context)
       └─ VS Code API: terminal.sendText() —— Bypass raw keystrokes, inject text directly.
            └─ Target Terminal PTY (Local Shell or Remote-SSH Server)
```
