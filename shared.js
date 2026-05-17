// shared.js — спільні утиліти для всіх курсів

// ===================== STORAGE =====================
const Storage = {
  key: null, // встановлюється кожною сторінкою

  load() {
    try { return JSON.parse(localStorage.getItem(this.key) || '{}'); }
    catch { return {}; }
  },

  save(data) {
    if (!this.key) return;
    localStorage.setItem(this.key, JSON.stringify(data));
  },

  getQuizResult(topicId) {
    return this.load().quizResults?.[topicId] ?? null;
    // повертає { chosen: number, isCorrect: boolean } або null
  },

  saveQuizResult(topicId, chosen, isCorrect) {
    const data = this.load();
    data.quizResults = data.quizResults || {};
    data.quizResults[topicId] = { chosen, isCorrect };
    this.save(data);
    updateProgress();
  }
};

// ===================== PROGRESS =====================
let totalTopics = 0;

function updateProgress() {
  const results = Storage.load().quizResults || {};
  const correct = Object.values(results).filter(r => r.isCorrect).length;

  const fill = document.getElementById('progress-fill');
  const score = document.getElementById('progress-score');
  if (fill) fill.style.width = totalTopics ? `${(correct / totalTopics) * 100}%` : '0%';
  if (score) score.textContent = `${correct} / ${totalTopics}`;

  Object.entries(results).forEach(([id, r]) => {
    document.getElementById(`nav-${id}`)?.classList.toggle('done', r.isCorrect);
  });
}

// ===================== UTILITIES =====================
function escHtml(s) {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

function highlightJS(code) {
  const escaped = code.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  const KW = /^(const|let|var|function|return|if|else|for|while|class|constructor|new|of|in|this|typeof|null|undefined|true|false|import|export|default|break|continue|switch|case|throw|try|catch|async|await)$/;
  const BI = /^(console|Math|JSON|Promise|URL|URLSearchParams|Map|Set|Array|Object|Error)$/;

  function tok(chunk) {
    return chunk
      .replace(/\b([A-Za-z_$][A-Za-z0-9_$]*)\b/g, m =>
        KW.test(m) ? `<span class="kw">${m}</span>` :
        BI.test(m) ? `<span class="bi">${m}</span>` : m)
      .replace(/\b(\d+)\b/g, '<span class="num">$1</span>');
  }

  let result = '', i = 0;
  const s = escaped;
  while (i < s.length) {
    if (s[i] === '/' && s[i + 1] === '/') {
      const end = s.indexOf('\n', i);
      const slice = end === -1 ? s.slice(i) : s.slice(i, end);
      result += `<span class="cmt">${slice}</span>`;
      i += slice.length;
    } else if (s[i] === '"' || s[i] === "'" || s[i] === '`') {
      const q = s[i]; let j = i + 1;
      while (j < s.length && s[j] !== q) { if (s[j] === '\\') j++; j++; }
      result += `<span class="str">${s.slice(i, j + 1)}</span>`;
      i = j + 1;
    } else {
      let j = i;
      while (j < s.length && !((s[j] === '/' && s[j + 1] === '/') || s[j] === '"' || s[j] === "'" || s[j] === '`')) j++;
      if (j === i) j = i + 1;
      result += tok(s.slice(i, j));
      i = j;
    }
  }
  return result;
}

// ===================== CODE RUNNER =====================
function runCode(source) {
  const logs = [];
  const origLog = console.log, origWarn = console.warn, origError = console.error;

  const fmt = (...args) => args.map(a => {
    if (a === null) return 'null';
    if (a === undefined) return 'undefined';
    if (typeof a === 'object') { try { return JSON.stringify(a); } catch { return String(a); } }
    return String(a);
  }).join(' ');

  console.log   = (...a) => { origLog(...a);   logs.push({ t: 'log', m: fmt(...a) }); };
  console.warn  = (...a) => { origWarn(...a);  logs.push({ t: 'log', m: '⚠ ' + fmt(...a) }); };
  console.error = (...a) => { origError(...a); logs.push({ t: 'err', m: fmt(...a) }); };

  try { new Function(source)(); }
  catch (e) { logs.push({ t: 'err', m: e.message }); }
  finally { console.log = origLog; console.warn = origWarn; console.error = origError; }

  return logs;
}

function showOutput(el, logs) {
  el.innerHTML = logs.length
    ? logs.map(l => `<div class="out-line ${l.t}">${escHtml(l.m)}</div>`).join('')
    : '<div class="out-line log" style="opacity:.4">// нема виводу</div>';
  el.classList.add('show');
}

function handleRunCode(btn) {
  const pre = btn.closest('pre.code');
  const outputEl = pre.nextElementSibling;
  showOutput(outputEl, runCode(pre.querySelector('code').textContent));
}

function handlePlaygroundRun(btn) {
  const pg = btn.closest('.playground');
  showOutput(pg.querySelector('.playground-output'), runCode(pg.querySelector('textarea').value));
}

function handleTabKey(e) {
  if (e.key !== 'Tab') return;
  e.preventDefault();
  const t = e.target, s = t.selectionStart;
  t.value = t.value.slice(0, s) + '  ' + t.value.slice(t.selectionEnd);
  t.selectionStart = t.selectionEnd = s + 2;
}

// ===================== RENDER: TASK =====================
function renderTask(task) {
  let io = `<div class="task-io">
    <div><span class="lbl in">Вхід: </span>${escHtml(task.input)}</div>
    <div><span class="lbl out">Вихід: </span>${escHtml(task.output)}</div>
  </div>`;
  if (task.input2) {
    io += `<div class="task-io">
      <div><span class="lbl in2">Вхід 2: </span>${escHtml(task.input2)}</div>
      <div><span class="lbl out2">Вихід 2: </span>${escHtml(task.output2)}</div>
    </div>`;
  }
  return `<div class="task">
    <div class="task-head"><span>✏️</span><span class="task-title">${task.title}</span></div>
    <div class="task-desc">${task.desc}</div>
    ${io}
    <div class="hint-box"><b>Підказка:</b> ${task.hint}</div>
    <button class="solution-toggle" onclick="toggleSolution(this)">Показати рішення ▼</button>
    <div class="solution-code">
      <pre class="code"><button class="copy-btn" onclick="copyCode(this)">copy</button><code>${highlightJS(task.solution)}</code></pre>
      <div class="code-output"></div>
    </div>
    <div class="playground">
      <div class="playground-head">
        <span class="playground-label">▶ Спробуй сам</span>
        <button class="run-btn" onclick="handlePlaygroundRun(this)">Запустити</button>
      </div>
      <textarea spellcheck="false" placeholder="// Напиши своє рішення тут..." onkeydown="handleTabKey(event)"></textarea>
      <div class="playground-output"></div>
    </div>
  </div>`;
}

// ===================== RENDER: QUIZ =====================
function renderQuiz(quiz, id) {
  const letters = ['A', 'B', 'C', 'D'];
  const saved = Storage.getQuizResult(id);

  const opts = quiz.options.map((opt, i) => {
    let cls = '';
    if (saved !== null) {
      if (i === quiz.correct) cls = 'correct';
      else if (i === saved.chosen) cls = 'wrong';
    }
    const disabled = saved !== null ? 'disabled' : '';
    return `<button class="quiz-opt ${cls}" ${disabled} onclick="answerQuiz(this,${i},${quiz.correct},${id})"><span class="opt-letter">${letters[i]}</span>${escHtml(opt)}</button>`;
  }).join('');

  let resultHtml;
  if (saved === null) {
    resultHtml = `<div class="quiz-result" id="qr-${id}"></div>`;
  } else if (saved.isCorrect) {
    resultHtml = `<div class="quiz-result show ok">✓ Правильно!</div>`;
  } else {
    resultHtml = `<div class="quiz-result show fail">✗ Неправильно. Правильна відповідь виділена зеленим.</div>`;
  }

  return `<div class="quiz" id="quiz-${id}">
    <div class="quiz-label">🧪 Тест</div>
    <div class="quiz-q">${escHtml(quiz.q)}</div>
    <div class="quiz-opts">${opts}</div>
    ${resultHtml}
  </div>`;
}

function answerQuiz(btn, chosen, correct, id) {
  const quiz = document.getElementById(`quiz-${id}`);
  quiz.querySelectorAll('.quiz-opt').forEach(o => (o.disabled = true));
  quiz.querySelectorAll('.quiz-opt')[correct].classList.add('correct');
  const isCorrect = chosen === correct;
  if (!isCorrect) btn.classList.add('wrong');

  const result = quiz.querySelector('.quiz-result');
  result.textContent = isCorrect ? '✓ Правильно!' : '✗ Неправильно. Правильна відповідь виділена зеленим.';
  result.className = `quiz-result show ${isCorrect ? 'ok' : 'fail'}`;

  Storage.saveQuizResult(id, chosen, isCorrect);
}

// ===================== INTERACTIONS =====================
let openTopicId = null;

function toggleTopic(id) {
  const prev = openTopicId;
  if (prev !== null) {
    const prevEl = document.getElementById(`topic-${prev}`);
    prevEl.classList.remove('open');
    prevEl.querySelector('.topic-header').setAttribute('aria-expanded', 'false');
    document.getElementById(`nav-${prev}`)?.classList.remove('active');
  }
  if (prev === id) { openTopicId = null; return; }
  openTopicId = id;
  const el = document.getElementById(`topic-${id}`);
  el.classList.add('open');
  el.querySelector('.topic-header').setAttribute('aria-expanded', 'true');
  document.getElementById(`nav-${id}`)?.classList.add('active');
  setTimeout(() => el.scrollIntoView({ behavior: 'smooth', block: 'start' }), 50);
}

function scrollToTopic(id) { toggleTopic(id); }

function toggleSolution(btn) {
  const code = btn.nextElementSibling;
  const isOpen = code.classList.toggle('open');
  btn.classList.toggle('open', isOpen);
  btn.textContent = isOpen ? 'Сховати рішення ▲' : 'Показати рішення ▼';
}

function copyCode(btn) {
  const text = btn.closest('pre.code').querySelector('code').textContent;
  navigator.clipboard.writeText(text).then(() => {
    btn.textContent = '✓';
    btn.classList.add('copied');
    setTimeout(() => { btn.textContent = 'copy'; btn.classList.remove('copied'); }, 1500);
  });
}
