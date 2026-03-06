import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';

let strings: Record<string, string> = {};

export function loadI18n(extensionPath: string): void {
  const lang = vscode.env.language.toLowerCase();
  const candidates = [
    `package.nls.${lang}.json`,
    `package.nls.${lang.split('-')[0]}.json`,
  ];

  let loaded = false;
  for (const candidate of candidates) {
    const filePath = path.join(extensionPath, candidate);
    if (fs.existsSync(filePath)) {
      try {
        strings = JSON.parse(fs.readFileSync(filePath, 'utf8'));
        loaded = true;
        break;
      } catch {
        // 忽略解析错误，继续尝试下一个候选
      }
    }
  }

  if (!loaded) {
    try {
      const defaultPath = path.join(extensionPath, 'package.nls.json');
      strings = JSON.parse(fs.readFileSync(defaultPath, 'utf8'));
    } catch {
      strings = {};
    }
  }
}

export function t(key: string, fallback = key): string {
  return strings[key] ?? fallback;
}
