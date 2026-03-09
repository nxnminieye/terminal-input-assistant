# Terminal Input Assistant

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
