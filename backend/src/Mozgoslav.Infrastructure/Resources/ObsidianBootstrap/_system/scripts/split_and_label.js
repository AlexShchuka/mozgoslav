// ============================================================

const CONFIG = {
  LM_STUDIO_URL:    'http://localhost:1234/v1/chat/completions',
  MODEL_NAME:       'qwen3.5-27b-claude-4.6-opus-reasoning-distilled-v2',
  TEMPERATURE:      0.2,
  PROMPT_PATH:      '_system/prompts/split-and-label-prompt.md',
  CORRECTIONS_PATH: '_system/corrections.md',
  FLAGGED_PATH:     '_system/flagged.md',
  ARCHIVE_FOLDER:   'archive',
  FOLDERS: {
    'ИДЕЯ':    'ideas',
    'ИНСАЙТ':  'insights',
    'ЧЕЛОВЕК': 'people',
    'ВОПРОС':  'questions',
    'ЗАДАЧА':  'tasks'
  }
};

const slugify = (s) => s
  .toLowerCase()
  .replace(/[^a-zа-я0-9\s-]/g, '')
  .trim()
  .replace(/\s+/g, '-')
  .slice(0, 60) || 'untitled';

const ensureUniquePath = async (folder, slug) => {
  let path = `${folder}/${slug}.md`;
  let i = 2;
  while (await app.vault.adapter.exists(path)) {
    path = `${folder}/${slug}-${i}.md`;
    i++;
  }
  return path;
};

const readOrEmpty = async (path) => {
  try {
    return await app.vault.adapter.read(path);
  } catch (e) {
    return null;
  }
};

const appendToFile = async (path, content) => {
  if (await app.vault.adapter.exists(path)) {
    const existing = await app.vault.adapter.read(path);
    await app.vault.adapter.write(path, existing + content);
  } else {
    await app.vault.adapter.write(path, content);
  }
};

async function callLLM(prompt) {
  const res = await fetch(CONFIG.LM_STUDIO_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: CONFIG.MODEL_NAME,
      messages: [{ role: 'user', content: prompt }],
      temperature: CONFIG.TEMPERATURE,
      stream: false
    })
  });
  if (!res.ok) throw new Error(`LM Studio HTTP ${res.status}`);
  const data = await res.json();
  const text = data?.choices?.[0]?.message?.content;
  if (!text) throw new Error('пустой ответ LM Studio');
  return text;
}

function parseBlocks(llmOutput) {
  return llmOutput
    .split(/\n(?=## )/)
    .map(b => b.trim())
    .filter(b => b.startsWith('## '));
}

module.exports = async function(tp) {
  const currentFile = tp.config.target_file;
  if (!currentFile) {
    new Notice('split-and-label: нет открытого файла', 5000);
    return;
  }
  const currentContent = await app.vault.read(currentFile);

  const promptTemplate = await readOrEmpty(CONFIG.PROMPT_PATH);
  if (!promptTemplate) {
    new Notice(`split-and-label: не найден промпт ${CONFIG.PROMPT_PATH}`, 5000);
    return;
  }

  const corrections = (await readOrEmpty(CONFIG.CORRECTIONS_PATH)) || '(пусто)';

  const fullPrompt = promptTemplate
    .replace('{{CORRECTIONS}}', corrections)
    .replace('{{INPUT_TEXT}}', currentContent);

  new Notice('split-and-label: запрос к LM Studio…', 3000);

  let llmOutput;
  try {
    llmOutput = await callLLM(fullPrompt);
  } catch (e) {
    new Notice(`split-and-label: ${e.message}`, 8000);
    return;
  }

  const blocks = parseBlocks(llmOutput);
  if (blocks.length === 0) {
    new Notice('split-and-label: LLM не вернул ни одного блока', 8000);
    return;
  }

  let created = 0, skipped = 0, flaggedCount = 0;

  for (const block of blocks) {
    const headerMatch = block.match(/^## ([^:]+?)(?::\s*(.+))?$/m);
    if (!headerMatch) { skipped++; continue; }

    const label = headerMatch[1].trim();
    const title = (headerMatch[2] || '').trim();
    const body = block.replace(/^## .*\n?/, '').trim();
    if (!body) { skipped++; continue; }

    if (label === 'FLAGGED') {
      const date = window.moment().format('YYYY-MM-DD HH:mm');
      const append = `\n## ${date} — из ${currentFile.basename}\n${body}\n`;
      await appendToFile(CONFIG.FLAGGED_PATH, append);
      flaggedCount++;
      continue;
    }

    const folder = CONFIG.FOLDERS[label];
    if (!folder) { skipped++; continue; }

    if (!(await app.vault.adapter.exists(folder))) {
      await app.vault.adapter.mkdir(folder);
    }

    const path = await ensureUniquePath(folder, slugify(title));
    const frontmatter = [
      '---',
      `label: ${label}`,
      `source: ${currentFile.path}`,
      `created: ${window.moment().format('YYYY-MM-DD HH:mm')}`,
      'status: needs-review',
      `tags: [${label.toLowerCase()}, inbox-extracted]`,
      '---',
      ''
    ].join('\n');
    await app.vault.create(path, frontmatter + `# ${title}\n\n${body}\n`);
    created++;
  }


  new Notice(
    `split-and-label: создано ${created}, пропущено ${skipped}, в flagged ${flaggedCount}. Оригинал оставлен на месте — перенеси в ${CONFIG.ARCHIVE_FOLDER}/ руками после ревью.`,
    10000
  );
};
