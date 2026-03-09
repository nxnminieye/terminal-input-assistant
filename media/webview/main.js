// @ts-check
(function () {
  // VS Code WebView API
  const vscode = acquireVsCodeApi();

  /** @type {Record<string, string>} */
  const I18N = window.I18N || {};

  /** @param {string} key @param {string} fallback */
  function i(key, fallback) { return I18N[key] || fallback || key; }

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
  /** @type {string[]} */
  let favorites = [];

  function loadHistory() {
    const state = vscode.getState();
    history = (state && state.history) || [];
    renderHistory();
    // 同时请求收藏列表（永久存储，从 extension globalState 读取）
    vscode.postMessage({ command: 'getFavorites' });
  }

  function saveHistory() {
    vscode.setState({ history });
  }

  function saveFavorites() {
    vscode.postMessage({ command: 'saveFavorites', favorites });
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

  /** @param {string} text */
  function toggleFavorite(text) {
    const idx = favorites.indexOf(text);
    if (idx === -1) {
      favorites.unshift(text);
    } else {
      favorites.splice(idx, 1);
    }
    saveFavorites();
    renderHistory();
  }

  // ─── 拖拽排序状态 ─────────────────────────────────────────────
  let dragSrcIndex = -1;

  function renderHistory() {
    historyList.innerHTML = '';

    // 渲染收藏区
    favorites.forEach((text, idx) => {
      const item = createHistoryItem(text, true, idx);
      historyList.appendChild(item);
    });

    // 分隔线
    if (favorites.length > 0 && history.filter(t => !favorites.includes(t)).length > 0) {
      const sep = document.createElement('li');
      sep.className = 'history-separator';
      historyList.appendChild(sep);
    }

    // 渲染普通历史区（排除已收藏的）
    history
      .filter(text => !favorites.includes(text))
      .forEach((text) => {
        const item = createHistoryItem(text, false, -1);
        historyList.appendChild(item);
      });
  }

  /**
   * @param {string} text
   * @param {boolean} isFavorited
   * @param {number} favIdx  收藏列表中的索引（非收藏项传 -1）
   * @returns {HTMLLIElement}
   */
  function createHistoryItem(text, isFavorited, favIdx) {
    const item = document.createElement('li');
    item.className = 'history-item' + (isFavorited ? ' favorited' : '');
    item.title = text;

    // 拖拽手柄（仅收藏项）
    if (isFavorited) {
      const handle = document.createElement('span');
      handle.className = 'drag-handle';
      handle.textContent = '⠿';
      handle.title = '';
      item.setAttribute('draggable', 'true');
      item.dataset.favIdx = String(favIdx);

      item.addEventListener('dragstart', e => {
        dragSrcIndex = favIdx;
        e.dataTransfer.effectAllowed = 'move';
        setTimeout(() => item.classList.add('dragging'), 0);
      });
      item.addEventListener('dragend', () => {
        item.classList.remove('dragging');
        dragSrcIndex = -1;
      });
      item.addEventListener('dragover', e => {
        e.preventDefault();
        e.dataTransfer.dropEffect = 'move';
      });
      item.addEventListener('drop', e => {
        e.preventDefault();
        const targetIdx = favIdx;
        if (dragSrcIndex === -1 || dragSrcIndex === targetIdx) { return; }
        const [moved] = favorites.splice(dragSrcIndex, 1);
        favorites.splice(targetIdx, 0, moved);
        saveFavorites();
        renderHistory();
      });

      item.appendChild(handle);
    }

    const textSpan = document.createElement('span');
    textSpan.className = 'history-item-text';
    textSpan.textContent = text;

    // 收藏按钮
    const starBtn = document.createElement('button');
    starBtn.className = 'history-item-star' + (isFavorited ? ' active' : '');
    starBtn.textContent = '★';
    starBtn.title = isFavorited
      ? i('webview.unfavoriteBtn', 'Unfavorite')
      : i('webview.favoriteBtn', '★ Favorite');
    starBtn.addEventListener('click', e => {
      e.stopPropagation();
      toggleFavorite(text);
    });

    // 删除按钮
    const delBtn = document.createElement('button');
    delBtn.className = 'history-item-del';
    delBtn.textContent = '×';
    delBtn.title = '';
    delBtn.addEventListener('click', e => {
      e.stopPropagation();
      // 从收藏和历史中同时删除
      const fidx = favorites.indexOf(text);
      if (fidx !== -1) { favorites.splice(fidx, 1); saveFavorites(); }
      const hidx = history.indexOf(text);
      if (hidx !== -1) { history.splice(hidx, 1); saveHistory(); }
      renderHistory();
    });

    item.appendChild(textSpan);
    item.appendChild(starBtn);
    item.appendChild(delBtn);

    item.addEventListener('click', () => {
      vscode.postMessage({ command: 'sendWithEnter', text });
      showStatus(i('webview.statusSent', 'Sent ✓'), 'success');
    });

    return item;
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
      showStatus(i('webview.statusNoTerminal', 'No terminal available, please open one first'), 'error', 0);
    } else {
      if (statusMsg.classList.contains('error') && statusMsg.textContent === i('webview.statusNoTerminal')) {
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
    followOpt.textContent = i('webview.followActive', '⚡ Follow Active Terminal');
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
    lockBtn.title = locked
      ? i('webview.unlockTitle', 'Click to unlock, resume following active terminal')
      : i('webview.lockTitle', 'Click to lock to current terminal');

    updateControls();
  }

  // ─── 发送文本 ─────────────────────────────────────────────────
  /** @param {boolean} addNewLine */
  function doSend(addNewLine) {
    const text = inputBox.value;
    if (!text.trim() && !text) {
      showStatus(i('webview.statusEmpty', 'Input is empty'), 'error');
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
      showStatus(i('webview.statusEmpty', 'Input is empty'), 'error');
      return;
    }
    addToHistory(text);
    showStatus(i('webview.statusAdded', 'Added to history ✓'), 'success');
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
      case 'favoritesLoaded':
        favorites = msg.favorites || [];
        renderHistory();
        break;
      case 'sendSuccess':
        addToHistory(lastSentText);
        if (/** @type {boolean} */ (msg.clearInput)) {
          inputBox.value = '';
        }
        inputBox.focus();
        showStatus(i('webview.statusSent', 'Sent ✓'), 'success');
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
