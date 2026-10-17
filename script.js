// Очень простой Markdown-парсер (заголовки, жирный, курсив, картинки, переносы)
function mdToHtml(text) {
  return text
    .replace(/^# (.*)$/gm, '<h1>$1</h1>')
    .replace(/^## (.*)$/gm, '<h2>$1</h2>')
    .replace(/^### (.*)$/gm, '<h3>$1</h3>')
    .replace(/\*\*(.*?)\*\*/g, '<b>$1</b>')
    .replace(/\*(.*?)\*/g, '<i>$1</i>')
    .replace(/!\[(.*?)\]\((.*?)\)/g, '<img src="$2" alt="$1" style="max-width:100%">')
    .replace(/\n/g, '<br>');
}

// Главная: авто-поиск историй по списку ID (временные метки)
async function loadStories() {
  const grid = document.getElementById('stories-grid');
  grid.innerHTML = '<p>Загрузка списка историй...</p>';

  // Здесь можно расширить диапазон, если у тебя уже много старых историй
  const start = Date.now() - (1000 * 60 * 60 * 24 * 365); // год назад
  const end = Date.now() + (1000 * 60 * 60 * 24 * 30);    // +месяц вперёд (на всякий случай)
  const step = 1000; // шаг 1 секунда (можно уменьшить до 100 мс, если историй очень много)

  const stories = [];
  const promises = [];

  for (let t = start; t <= end; t += step) {
    const id = t.toString();
    const url = `stories/${id}.md`;
    promises.push(
      fetch(url)
        .then(r => r.ok ? r.text() : null)
        .then(text => {
          if (text) {
            // Извлекаем заголовок из первой строки, если есть #
            const titleMatch = text.match(/^#\s+(.+)/m);
            const title = titleMatch ? titleMatch[1] : `История от ${new Date(t).toLocaleDateString()}`;
            
            // Краткое описание: первые 2–3 строки без разметки
            let short = text.split('\n').slice(1, 4).join(' ').trim();
            short = short.replace(/\*\*/g, '').replace(/\*/g, '').replace(/!\[.*?\]\(.*?\)/g, '');
            if (short.length > 120) short = short.substring(0, 120) + '...';

            stories.push({ id, title, short });
          }
        })
        .catch(() => {})
    );
  }

  await Promise.all(promises);

  if (stories.length === 0) {
    grid.innerHTML = '<p>Историй пока нет. Добавьте первую через админку.</p>';
    return;
  }

  grid.innerHTML = '';
  stories.sort((a, b) => Number(b.id) - Number(a.id)); // новые сверху

  stories.forEach(s => {
    const card = document.createElement('div');
    card.className = 'card';
    card.innerHTML = `
      <h3>${s.title}</h3>
      <p>${s.short}</p>
      <a href="story.html?id=${s.id}" class="btn">Читать →</a>
    `;
    grid.appendChild(card);
  });
}

// Страница истории: показать контент
async function loadStory() {
  const params = new URLSearchParams(window.location.search);
  const id = params.get('id');
  if (!id) return;

  try {
    const res = await fetch(`stories/${id}.md`);
    if (!res.ok) {
      document.getElementById('story-content').innerHTML = '<p>История не найдена.</p>';
      return;
    }
    const content = await res.text();

    // Заголовок из первой строки
    const titleMatch = content.match(/^#\s+(.+)/m);
    const title = titleMatch ? titleMatch[1] : `История #${id}`;

    document.getElementById('story-title').textContent = title;
    document.getElementById('page-title').textContent = title + ' — Архив ролевых игр';
    document.getElementById('story-content').innerHTML = mdToHtml(content);

    // Галерея: можно искать картинки по именам файлов, но пока оставим по ссылкам в тексте
    // Если хочешь отдельную галерею — скажи, добавлю JSON-файл с путями к картинкам
  } catch (e) {
    document.getElementById('story-content').innerHTML = '<p>Ошибка загрузки истории.</p>';
  }
}

// Админка: генерация шаблона PR
document.addEventListener('DOMContentLoaded', () => {
  const form = document.getElementById('add-story-form');
  if (form) {
    form.addEventListener('submit', e => {
      e.preventDefault();
      const data = new FormData(form);
      const title = data.get('title').trim();
      const short = data.get('short').trim();
      const content = data.get('content').trim();

      const id = Date.now().toString(); // уникальный ID

      const prBody = [
        `### Добавить новую историю: ${title}`,
        '',
        'Этот PR добавляет:',
        `- stories/${id}.md — текст истории',
        '- assets/images/... — картинки (добавить вручную)',
        '',
        '**Что нужно сделать вручную:**',
        '1. Создайте файл `stories/' + id + '.md` и вставьте туда текст ниже.',
        '2. Загрузите картинки в `assets/images/` (если есть).',
        '3. Обновите ссылки на картинки в тексте истории, если нужно.',
        '4. Сделайте коммит и откройте Pull Request.',
        '',
        '---',
        '',
        content
      ].join('\n');

      document.getElementById('pr-body').textContent = prBody;
      document.getElementById('pr-preview').style.display = 'block';

      const repoUrl = 'https://github.com/SphinssaCat/Rolka-';
      document.getElementById('pr-link').href = `${repoUrl}/pull/new/main`;
    });
  }

  if (window.location.pathname.endsWith('index.html') || window.location.pathname === '/') {
    loadStories();
  } else if (window.location.pathname.endsWith('story.html'))
