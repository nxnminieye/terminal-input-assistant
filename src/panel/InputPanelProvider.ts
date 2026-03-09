import * as vscode from 'vscode';
import * as path from 'path';
import * as fs from 'fs';
import { getNonce } from '../utils/getNonce';
import { TerminalManager } from '../terminal/TerminalManager';
import { t } from '../i18n';

export class InputPanelProvider implements vscode.WebviewViewProvider {
  public static readonly viewId = 'imeInput.panel';

  private view?: vscode.WebviewView;

  constructor(
    private readonly extensionUri: vscode.Uri,
    private readonly terminalManager: TerminalManager,
    private readonly context: vscode.ExtensionContext,
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

  private handleMessage(msg: { command: string; text?: string; id?: string; favorites?: string[] }): void {
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

      case 'getFavorites': {
        const favorites = this.context.globalState.get<string[]>('favorites', []);
        this.postMessage({ type: 'favoritesLoaded', favorites });
        break;
      }

      case 'saveFavorites':
        this.context.globalState.update('favorites', msg.favorites ?? []);
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

    // 构建 i18n 对象，注入到 webview 全局变量
    const i18nKeys = [
      'webview.followActive', 'webview.selectTitle', 'webview.lockUnlockTitle',
      'webview.placeholder', 'webview.sendEnterBtn', 'webview.sendBtn',
      'webview.addHistoryBtn', 'webview.historyHeader', 'webview.statusSent',
      'webview.statusAdded', 'webview.statusEmpty', 'webview.statusNoTerminal',
      'webview.lockTitle', 'webview.unlockTitle',
      'webview.favoriteBtn', 'webview.unfavoriteBtn',
    ];
    const i18nObj: Record<string, string> = {};
    i18nKeys.forEach(k => { i18nObj[k] = t(k); });
    const i18nScript = `<script nonce="${nonce}">window.I18N=${JSON.stringify(i18nObj)};</script>`;

    html = html
      .replace(/\{\{NONCE\}\}/g, nonce)
      .replace('{{STYLE_URI}}', styleUri.toString())
      .replace('{{SCRIPT_URI}}', scriptUri.toString())
      .replace('{{I18N_SCRIPT}}', i18nScript)
      .replace('{{I18N_HTML_LANG}}', t('webview.htmlLang'))
      .replace('{{I18N_HTML_TITLE}}', t('webview.htmlTitle'))
      .replace('{{I18N_FOLLOW_ACTIVE}}', t('webview.followActive'))
      .replace('{{I18N_SELECT_TITLE}}', t('webview.selectTitle'))
      .replace('{{I18N_LOCK_UNLOCK_TITLE}}', t('webview.lockUnlockTitle'))
      .replace('{{I18N_PLACEHOLDER}}', t('webview.placeholder'))
      .replace('{{I18N_SEND_ENTER_BTN}}', t('webview.sendEnterBtn'))
      .replace('{{I18N_SEND_BTN}}', t('webview.sendBtn'))
      .replace('{{I18N_ADD_HISTORY_BTN}}', t('webview.addHistoryBtn'))
      .replace('{{I18N_HISTORY_HEADER}}', t('webview.historyHeader'));

    return html;
  }
}
