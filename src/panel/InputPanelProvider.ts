import * as vscode from 'vscode';
import * as path from 'path';
import * as fs from 'fs';
import { getNonce } from '../utils/getNonce';
import { TerminalManager } from '../terminal/TerminalManager';

export class InputPanelProvider implements vscode.WebviewViewProvider {
  public static readonly viewId = 'imeInput.panel';

  private view?: vscode.WebviewView;

  constructor(
    private readonly extensionUri: vscode.Uri,
    private readonly terminalManager: TerminalManager,
  ) {
    // 监听终端状态变化，推送给前端
    terminalManager.onDidChange((terminals, activeTerminalId, isLocked) => {
      this.postMessage({
        type: 'updateTerminalList',
        terminals,
        activeTerminalId,
        isLocked,
      });
    });
  }

  resolveWebviewView(
    webviewView: vscode.WebviewView,
    _context: vscode.WebviewViewResolveContext,
    _token: vscode.CancellationToken,
  ): void {
    this.view = webviewView;

    webviewView.webview.options = {
      enableScripts: true,
      localResourceRoots: [
        vscode.Uri.joinPath(this.extensionUri, 'media', 'webview'),
      ],
    };

    webviewView.webview.html = this.getHtmlContent(webviewView.webview);

    // 保留上下文，切换 Tab 不丢失内容
    webviewView.retainContextWhenHidden = true;

    // 接收前端消息
    webviewView.webview.onDidReceiveMessage(msg => this.handleMessage(msg));
  }

  private handleMessage(msg: { command: string; text?: string; id?: string }): void {
    switch (msg.command) {
      case 'ready':
        // 推送初始状态
        this.postMessage({
          type: 'updateTerminalList',
          terminals: this.terminalManager.getTerminalList(),
          activeTerminalId: this.terminalManager.getActiveTerminalId(),
          isLocked: this.terminalManager.getLocked(),
        });
        break;

      case 'send':
      case 'sendWithEnter': {
        const text = msg.text ?? '';
        const addNewLine = msg.command === 'sendWithEnter';
        try {
          this.terminalManager.sendText(text, addNewLine);
          const config = vscode.workspace.getConfiguration('imeInput');
          const clearAfterSend = config.get<boolean>('clearAfterSend', true);
          this.postMessage({ type: 'sendSuccess', clearInput: clearAfterSend });
        } catch (err) {
          this.postMessage({
            type: 'sendError',
            message: err instanceof Error ? err.message : String(err),
          });
        }
        break;
      }

      case 'selectTerminal':
        if (msg.id) {
          this.terminalManager.selectTerminal(msg.id);
        }
        break;

      case 'toggleLock':
        this.terminalManager.toggleLock();
        break;
    }
  }

  private postMessage(data: unknown): void {
    this.view?.webview.postMessage(data);
  }

  /** 聚焦 WebView（让输入框获得焦点） */
  focus(): void {
    this.view?.show(true);
  }

  private getHtmlContent(webview: vscode.Webview): string {
    const webviewDir = vscode.Uri.joinPath(this.extensionUri, 'media', 'webview');
    const styleUri = webview.asWebviewUri(vscode.Uri.joinPath(webviewDir, 'style.css'));
    const scriptUri = webview.asWebviewUri(vscode.Uri.joinPath(webviewDir, 'main.js'));
    const nonce = getNonce();

    const htmlPath = vscode.Uri.joinPath(webviewDir, 'index.html').fsPath;
    let html = fs.readFileSync(htmlPath, 'utf8');

    html = html
      .replace(/\{\{NONCE\}\}/g, nonce)
      .replace('{{STYLE_URI}}', styleUri.toString())
      .replace('{{SCRIPT_URI}}', scriptUri.toString());

    return html;
  }
}
