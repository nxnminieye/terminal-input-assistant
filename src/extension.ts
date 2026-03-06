import * as vscode from 'vscode';
import { InputPanelProvider } from './panel/InputPanelProvider';
import { TerminalManager } from './terminal/TerminalManager';

export function activate(context: vscode.ExtensionContext): void {
  const terminalManager = new TerminalManager();
  const provider = new InputPanelProvider(context.extensionUri, terminalManager);

  context.subscriptions.push(
    terminalManager,
    vscode.window.registerWebviewViewProvider(InputPanelProvider.viewId, provider, {
      webviewOptions: { retainContextWhenHidden: true },
    }),
    vscode.commands.registerCommand('imeInput.focus', () => {
      // 打开 Panel 并聚焦
      vscode.commands.executeCommand('imeInput.panel.focus');
    }),
  );
}

export function deactivate(): void {
  // 清理由 context.subscriptions 自动处理
}
