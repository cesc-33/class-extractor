// render.js
const el = id => document.getElementById(id);

// Config
const fileExtensions = [
  "js", "ts", "jsx", "tsx", "mjs", "cjs", "json", "html", "css", "scss", "less", "vue", "svelte",
  "md", "py", "java", "kt", "kts", "cs", "cpp", "c", "cc", "cxx", "h", "hpp", "rs", "go", "rb",
  "php", "swift", "m", "mm", "sql", "xml", "yaml", "yml", "toml", "ini", "gradle", "properties",
  "proto", "scala", "hs"
];

let folder = null;
const selectedIgnores = new Set(['.git', 'package-lock.json', 'package.json']);

let slider, tokenValue, checkBox, uploadDropZone, exclusionDropZone, exclusionTagsContainer, logElement, barElement, fillBar, toggleBtn, optionsBody;

// prevent browser from opening file
function prevent(e) { e.preventDefault(); e.stopPropagation(); }
document.addEventListener('dragover', prevent);
document.addEventListener('drop', prevent);

function setOptionsOpen(open) {
  optionsBody.classList.toggle('collapsed', !open);
  toggleBtn.textContent = open ? 'close options' : 'show options';
}

// control Options Menu
function setOptionsEnabled(enabled) {
  if (enabled) {
    optionsBody.classList.remove('disabled');
  } else {
    optionsBody.classList.add('disabled');
  }
}

function log(s) {
  if (!logElement) return;
  logElement.textContent += s + '\n';
  logElement.scrollTop = logElement.scrollHeight;
}

function updateBadge() {
  tokenValue.textContent = slider.disabled ? "disabled" : slider.value;
}

function renderExclusions() {
  exclusionTagsContainer.innerHTML = '';
  selectedIgnores.forEach(item => {
    const tag = document.createElement('span');
    tag.className = 'tag';
    tag.innerHTML = `${item} <span class="remove-tag" data-val="${item}">&times;</span>`;
    exclusionTagsContainer.appendChild(tag);
  });
}

function handleFiles(filePath) {
  if (!filePath) return;
  folder = filePath;
  const sel = el('selFolder');
  if (sel) sel.textContent = filePath;
  log(`📁 Selected file/folder: ${filePath}`);
  
  // Enable Options
  setOptionsEnabled(true);
}

// Extract only file and folder name
function extractNameFromPath(fullPath) {
  return fullPath.split(/[/\\]/).pop();
}

function getPatterns() {
  const raw = el('patterns')?.value || '';
  return raw.split(',').map(s => s.trim()).filter(Boolean);
}

async function runSave(kind) {
  if (!folder) return log('⚠️ Select file first.');

  const patterns = getPatterns();
  const exclusions = Array.from(selectedIgnores);
  const defaultName = kind === 'txt' ? 'classes.txt' : 'classes.md';
  const filter = kind === 'txt'
    ? [{ name: 'Text', extensions: ['txt'] }]
    : [{ name: 'Markdown', extensions: ['md'] }];

  const outPath = await window.api.saveFile(defaultName, filter);
  if (!outPath) return log('❌ Saving canceled.');

  const tokenLimit = Number(slider.value);
  const opts = { folder, patterns, exclusions, tokenLimit };
  if (kind === 'txt') opts.outTxtPath = outPath;
  else opts.outMdPath = outPath;

  log('⏳ Extracting files...');
  barElement.style.display = 'block';
  fillBar.style.background = 'linear-gradient(90deg, var(--success), var(--success-hover))';
  fillBar.style.width = '0%';

  let progress = 0;
  const progressInterval = setInterval(() => {
    progress += (95 - progress) * 0.2;
    fillBar.style.width = `${progress}%`;
  }, 30);

  try {
    const res = await window.api.runExtract(opts);

    clearInterval(progressInterval);
    fillBar.style.width = '100%';
    setTimeout(() => {
      barElement.style.display = 'none';
      fillBar.style.width = '0%';
    }, 500);

    if (res.ok) {
      if (res.info.files === 0) log('⚠️ No matching files found!');
      else log(`✅ Finished! ${res.info.files} Files exported.`);
    } else {
      log(`❌ Error: ${res.error}`);
    }
  } catch (err) {
    clearInterval(progressInterval);
    fillBar.style.background = '#ef4444';
    fillBar.style.width = '100%';
    setTimeout(() => {
      barElement.style.display = 'none';
    }, 1500);
    log(`❌ Unexpected error: ${err?.message || String(err)}`);
  }
}

function init() {
  slider = el('tokenSlider');
  tokenValue = el('tokenValue');
  checkBox = el('checkBox');
  uploadDropZone = el('upload-drop-zone');
  exclusionDropZone = el('exclusion-drop-zone');
  exclusionTagsContainer = el('exclusionTags');
  logElement = el('log');
  barElement = el('bar');
  fillBar = el('fill');
  toggleBtn = el('toggleOptions');
  optionsBody = document.querySelector('.card.options .options-body');

  setOptionsEnabled(false);
  setOptionsOpen(false);

  const patternsInput = el('patterns');
  if (patternsInput) patternsInput.value = fileExtensions.map(ext => `**/*.${ext}`).join(',');

  // upload drop zone
  ['dragenter', 'dragover'].forEach(evt => {
    uploadDropZone?.addEventListener(evt, (e) => { prevent(e); uploadDropZone.classList.add('dragover'); });
  });
  ['dragleave', 'drop'].forEach(evt => {
    uploadDropZone?.addEventListener(evt, (e) => { prevent(e); uploadDropZone.classList.remove('dragover'); });
  });

  uploadDropZone?.addEventListener('drop', (e) => {
    prevent(e);
    const files = Array.from(e.dataTransfer.files || []);
    if (!files.length) return;
    const filePath = window.api.getPathForFile(files[0]);
    handleFiles(filePath);
  });

  // exceptions drop zone
  ['dragenter', 'dragover'].forEach(evt => {
    exclusionDropZone?.addEventListener(evt, (e) => { prevent(e); exclusionDropZone.classList.add('dragover'); });
  });
  ['dragleave', 'drop'].forEach(evt => {
    exclusionDropZone?.addEventListener(evt, (e) => { prevent(e); exclusionDropZone.classList.remove('dragover'); });
  });

  exclusionDropZone?.addEventListener('drop', (e) => {
    prevent(e);
    // allow drop only when menu active
    if(optionsBody.classList.contains('disabled')) return; 

    const files = Array.from(e.dataTransfer.files || []);
    if (!files.length) return;
    const filePath = window.api.getPathForFile(files[0]);
    if (filePath) {
      const name = extractNameFromPath(filePath);
      selectedIgnores.add(name);
      renderExclusions();
    }
  });

  // Slider / Checkbox
  slider.disabled = !checkBox.checked;
  updateBadge();
  checkBox.addEventListener('change', () => {
    slider.disabled = !checkBox.checked;
    updateBadge();
  });
  slider.addEventListener('input', () => updateBadge());

  // Buttons
  uploadDropZone?.addEventListener('click', async () => {
    const filePath = await window.api.selectFile();
    handleFiles(filePath);
  });

  exclusionDropZone?.addEventListener('click', async () => {
    if(optionsBody.classList.contains('disabled')) return; 

    const path = await window.api.selectFile();
    if (path) {
      const name = extractNameFromPath(path);
      selectedIgnores.add(name);
      renderExclusions();
    }
  });

  toggleBtn?.addEventListener('click', (e) => {
    e.preventDefault();
    const isOpen = !optionsBody.classList.contains('collapsed');
    setOptionsOpen(!isOpen);
  });

  el('btnSaveTxt')?.addEventListener('click', () => runSave('txt'));
  el('btnSaveMd')?.addEventListener('click', () => runSave('md'));

  el('addIgnore')?.addEventListener('click', () => {
    const val = el('ignoreInput')?.value.trim();
    if (!val) return;
    val.split(',').forEach(v => {
      const clean = v.trim();
      if (clean) selectedIgnores.add(clean);
    });
    el('ignoreInput').value = '';
    renderExclusions();
  });

  el('ignoreInput')?.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') el('addIgnore')?.click();
  });

  exclusionTagsContainer?.addEventListener('click', (e) => {
    const target = e.target;
    if (target.classList && target.classList.contains('remove-tag')) {
      const val = target.dataset.val;
      if (!val) return;
      selectedIgnores.delete(val);
      renderExclusions();
    }
  });

  renderExclusions();
}

init();