// @ts-check
(function () {
  // VS Code WebView API
  const vscode = acquireVsCodeApi();

  /** @type {HTMLSelectElement} */
  const terminalSelect = document.getElementById('terminalSelect');
  /** @type {HTMLButtonElement} */
  const lockBtn = document.getElementById('lockBtn');
  /** @type {HTMLTextAreaElement} */
  const inputBox = document.getElementById('inputBox');
  /** @type {HTMLButtonElement} */
  const sendEnterBtn = document.getElementById('sendEnterBtn');
  /** @type {HTMLButtonElement} */
  const sendBtn = document.getElementById('sendBtn');
  /** @type {HTMLButtonElement} */
  const addHistoryBtn = document.getElementById('addHistoryBtn');
  /** @type {HTMLDivElement} */
  const statusMsg = document.getElementById('statusMsg');
  /** @type {HTMLUListElement} */
  const historyList = document.getElementById('historyList');

  // ─── 状态 ───────────────────────────────────────────────────
  let isLocked = false;
  let hasTerminals = false;
  let lastSentText = '';

  // ─── 历史记录 ─────────────────────────────────────────────────
  const MAX_HISTORY = 20;
  /** @type {string[]} */
  let history = [];

  function loadHistory() {
    const state = vscode.getState();
    history = (state && state.history) || [];
    renderHistory();
  }

  function saveHistory() {
    vscode.setState({ history });
  }

  /** @param {string} text */
  function addToHistory(text) {
    if (!text.trim()) { return; }
    // 去重：已存在则移到最前
    const idx = history.indexOf(text);
    if (idx !== -1) { history.splice(idx, 1); }
    history.unshift(text);
    if (history.length > MAX_HISTORY) { history.pop(); }
    saveHistory();
    renderHistory();
  }

  function renderHistory() {
    historyList.innerHTML = '';
    history.forEach(text => {
      const item = document.createElement('li');
      item.className = 'history-item';
      item.textContent = text;
      item.title = text;
      item.addEventListener('click', () => {
        vscode.postMessage({ command: 'sendWithEnter', text });
        showStatus('已发送 ✓', 'success');
      });
      historyList.appendChild(item);
    });
  }

  // ─── 状态显示 ────────────────────────────────────────────────
  let statusTimer = null;

  function showStatus(msg, type = 'info', duration = 2000) {
    statusMsg.textContent = msg;
    statusMsg.className = 'status-msg' + (type !== 'info' ? ' ' + type : '');
    if (duration > 0) {
      clearTimeout(statusTimer);
      statusTimer = setTimeout(() => {
        statusMsg.textContent = '';
        statusMsg.className = 'status-msg';
      }, duration);
    }
  }

  // ─── 更新 UI 控件状态 ─────────────────────────────────────────
  function updateControls() {
    const disabled = !hasTerminals;
    inputBox.disabled = disabled;
    sendEnterBtn.disabled = disabled;
    sendBtn.disabled = disabled;
    terminalSelect.disabled = disabled;
    lockBtn.disabled = disabled;

    if (disabled) {
      showStatus('没有可用的终端，请先打开一个终端', 'error', 0);
    } else {
      if (statusMsg.classList.contains('error') && statusMsg.textContent.includes('没有可用')) {
        statusMsg.textContent = '';
        statusMsg.className = 'status-msg';
      }
    }
  }

  // ─── 渲染终端下拉框 ───────────────────────────────────────────
  /**
   * @param {{ id: string; name: string }[]} terminals
   * @param {string | null} activeTerminalId
   * @param {boolean} locked
   */
  function renderTerminalList(terminals, activeTerminalId, locked) {
    isLocked = locked;
    hasTerminals = terminals.length > 0;

    terminalSelect.innerHTML = '';

    const followOpt = document.createElement('option');
    followOpt.value = '__active__';
    followOpt.textContent = '⚡ 跟随活动终端';
    terminalSelect.appendChild(followOpt);

    terminals.forEach(t => {
      const opt = document.createElement('option');
      opt.value = t.id;
      opt.textContent = t.name;
      terminalSelect.appendChild(opt);
    });

    if (locked && activeTerminalId) {
      terminalSelect.value = activeTerminalId;
    } else {
      terminalSelect.value = '__active__';
    }

    lockBtn.textContent = locked ? '🔒' : '🔓';
    lockBtn.className = 'icon-btn' + (locked ? ' locked' : '');
    lockBtn.title = locked ? '点击解锁，恢复跟随活动终端' : '点击锁定到当前终端';

    updateControls();
  }

  // ─── 发送文本 ─────────────────────────────────────────────────
  /** @param {boolean} addNewLine */
  function doSend(addNewLine) {
    const text = inputBox.value;
    if (!text.trim() && !text) {
      showStatus('输入内容为空', 'error');
      return;
    }
    lastSentText = text;
    vscode.postMessage({ command: addNewLine ? 'sendWithEnter' : 'send', text });
  }

  // ─── 事件绑定 ─────────────────────────────────────────────────
  sendEnterBtn.addEventListener('click', () => doSend(true));
  sendBtn.addEventListener('click', () => doSend(false));

  addHistoryBtn.addEventListener('click', () => {
    const text = inputBox.value;
    if (!text.trim()) {
      showStatus('输入内容为空', 'error');
      return;
    }
    addToHistory(text);
    showStatus('已加入历史 ✓', 'success');
  });

  inputBox.addEventListener('keydown', e => {
    if (e.key === 'Enter' && e.ctrlKey) {
      e.preventDefault();
      doSend(true); // 默认发送+回车
    }
  });

  terminalSelect.addEventListener('change', () => {
    const id = terminalSelect.value;
    if (id === '__active__') {
      if (isLocked) {
        vscode.postMessage({ command: 'toggleLock' });
      }
    } else {
      vscode.postMessage({ command: 'selectTerminal', id });
    }
  });

  lockBtn.addEventListener('click', () => {
    vscode.postMessage({ command: 'toggleLock' });
  });

  // ─── 接收来自 Extension 的消息 ────────────────────────────────
  window.addEventListener('message', event => {
    const msg = event.data;
    switch (msg.type) {
      case 'updateTerminalList':
        renderTerminalList(msg.terminals, msg.activeTerminalId, msg.isLocked);
        break;
      case 'sendSuccess':
        addToHistory(lastSentText);
        if (/** @type {boolean} */ (msg.clearInput)) {
          inputBox.value = '';
        }
        inputBox.focus();
        showStatus('已发送 ✓', 'success');
        break;
      case 'sendError':
        showStatus(msg.message, 'error');
        break;
    }
  });

  // ─── 启动 ─────────────────────────────────────────────────────
  vscode.postMessage({ command: 'ready' });
  loadHistory();
  setTimeout(() => inputBox.focus(), 100);
})();
