import * as vscode from 'vscode';
import { t } from '../i18n';

interface TerminalInfo {
  id: string;
  name: string;
}

type TerminalChangeCallback = (terminals: TerminalInfo[], activeId: string | null, isLocked: boolean) => void;

/**
 * 管理终端状态：当前目标终端、锁定状态、终端列表变化通知
 */
export class TerminalManager implements vscode.Disposable {
  private currentTerminal: vscode.Terminal | null = null;
  private isLocked = false;
  private terminalIds = new WeakMap<vscode.Terminal, string>();
  private idCounter = 0;
  private disposables: vscode.Disposable[] = [];
  private changeCallbacks: TerminalChangeCallback[] = [];

  constructor() {
    // 初始化时捕获已有终端
    vscode.window.terminals.forEach(t => this.ensureId(t));
    this.currentTerminal = vscode.window.activeTerminal ?? null;

    this.disposables.push(
      vscode.window.onDidChangeActiveTerminal(terminal => {
        if (!this.isLocked) {
          this.currentTerminal = terminal ?? null;
          this.notifyChange();
        }
      }),
      vscode.window.onDidCloseTerminal(terminal => {
        if (this.currentTerminal === terminal) {
          this.isLocked = false;
          this.currentTerminal = vscode.window.activeTerminal ?? null;
          this.notifyChange();
        } else {
          // 列表发生变化，也需要通知
          this.notifyChange();
        }
      }),
      vscode.window.onDidOpenTerminal(terminal => {
        this.ensureId(terminal);
        this.notifyChange();
      }),
    );
  }

  private ensureId(terminal: vscode.Terminal): string {
    if (!this.terminalIds.has(terminal)) {
      this.terminalIds.set(terminal, `term-${++this.idCounter}`);
    }
    return this.terminalIds.get(terminal)!;
  }

  private findTerminalById(id: string): vscode.Terminal | null {
    return vscode.window.terminals.find(t => this.terminalIds.get(t) === id) ?? null;
  }

  private notifyChange(): void {
    const terminals = this.getTerminalList();
    const activeId = this.currentTerminal ? this.terminalIds.get(this.currentTerminal) ?? null : null;
    this.changeCallbacks.forEach(cb => cb(terminals, activeId, this.isLocked));
  }

  /** 注册终端状态变化回调 */
  onDidChange(callback: TerminalChangeCallback): void {
    this.changeCallbacks.push(callback);
  }

  /** 获取终端列表 */
  getTerminalList(): TerminalInfo[] {
    return vscode.window.terminals.map(t => ({
      id: this.ensureId(t),
      name: t.name,
    }));
  }

  /** 获取当前活动终端 ID */
  getActiveTerminalId(): string | null {
    if (!this.currentTerminal) return null;
    return this.terminalIds.get(this.currentTerminal) ?? null;
  }

  /** 获取锁定状态 */
  getLocked(): boolean {
    return this.isLocked;
  }

  /** 手动选择终端（自动锁定） */
  selectTerminal(id: string): void {
    const terminal = this.findTerminalById(id);
    if (terminal) {
      this.currentTerminal = terminal;
      this.isLocked = true;
      this.notifyChange();
    }
  }

  /** 切换锁定状态 */
  toggleLock(): void {
    this.isLocked = !this.isLocked;
    if (!this.isLocked) {
      // 解锁时切回当前活动终端
      this.currentTerminal = vscode.window.activeTerminal ?? this.currentTerminal;
    }
    this.notifyChange();
  }

  /**
   * 发送文本到当前目标终端
   * @param text 要发送的文本
   * @param addNewLine 是否追加换行
   */
  sendText(text: string, addNewLine = false): void {
    if (!this.currentTerminal) {
    throw new Error(t('webview.statusNoTerminal'));
    }
    // 确保终端可见
    this.currentTerminal.show(true);
    this.currentTerminal.sendText(text, addNewLine);
  }

  dispose(): void {
    this.disposables.forEach(d => d.dispose());
  }
}
