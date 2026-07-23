let books = [];
let currentFilter = { search: '', genre: '', sort: 'authorLast' };
let currentLibrary = 'completed';
let editingId = null;

const STATUS_META = {
  tbr: {
    pillLabel: 'TBR',
    addBtnLabel: '+ Add to TBR',
    emptyMsg: 'Your TBR shelf is empty.',
    emptyCta: 'Add the first book to your TBR list',
    formTitleNew: 'Add to your TBR list',
    submitLabelNew: 'Add to TBR',
    statCountLabel: 'On the shelf',
    showAvgRating: false,
    showRating: false,
    showDate: false,
    dateLabel: '',
    showSpice: false,
    reviewLabel: 'Why you want to read it',
    reviewPlaceholder: 'A recommendation, a note, why it caught your eye...'
  },
  reading: {
    pillLabel: 'Reading',
    addBtnLabel: '+ Add to Currently Reading',
    emptyMsg: 'Nothing here yet.',
    emptyCta: 'Add a book you are currently reading',
    formTitleNew: 'Add a book you are reading',
    submitLabelNew: 'Add to Currently Reading',
    statCountLabel: 'In progress',
    showAvgRating: false,
    showRating: false,
    showDate: false,
    dateLabel: '',
    showSpice: false,
    reviewLabel: 'Notes while reading',
    reviewPlaceholder: 'Thoughts as you go...'
  },
  completed: {
    pillLabel: 'Completed',
    addBtnLabel: '+ Add a finished book',
    emptyMsg: 'Your shelf is empty.',
    emptyCta: 'Add the first book you finished',
    formTitleNew: 'Add a finished book',
    submitLabelNew: 'Add to shelf',
    statCountLabel: 'Finished',
    showAvgRating: true,
    showRating: true,
    showDate: true,
    dateLabel: 'Date finished',
    showSpice: true,
    reviewLabel: 'Your review',
    reviewPlaceholder: 'What did you think?'
  },
  dnf: {
    pillLabel: 'DNF',
    addBtnLabel: '+ Add to Did Not Finish',
    emptyMsg: 'Nothing here yet.',
    emptyCta: 'Add a book you did not finish',
    formTitleNew: 'Add a book you did not finish',
    submitLabelNew: 'Add to Did Not Finish',
    statCountLabel: 'Set aside',
    showAvgRating: false,
    showRating: false,
    showDate: true,
    dateLabel: 'Date stopped',
    showSpice: true,
    reviewLabel: 'Why you stopped',
    reviewPlaceholder: 'What made you put it down?'
  }
};

const SPINE_COLORS = [
  { name: 'Coral', hex: '#FF6F61' },
  { name: 'Sunshine', hex: '#FFC93C' },
  { name: 'Sky', hex: '#4FB0C6' },
  { name: 'Grass', hex: '#57C68A' },
  { name: 'Lavender', hex: '#9E86D9' },
  { name: 'Bubblegum', hex: '#FF8FB1' },
  { name: 'Tangerine', hex: '#FFA552' },
  { name: 'Mint', hex: '#3FBF9B' }
];

function hashStr(s){
  let h = 0;
  for (let i = 0; i < s.length; i++){ h = (h * 31 + s.charCodeAt(i)) >>> 0; }
  return h;
}

const SERIES_RIBBONS = [
  { bg: '#FFFFFF', fg: '#3A2E4D' },
  { bg: '#FFE8A3', fg: '#7A4E00' },
  { bg: '#D9FFF3', fg: '#0E6E52' },
  { bg: '#FFD6E8', fg: '#8A2A55' },
  { bg: '#E3D9FF', fg: '#4B2E8A' }
];

function seriesRibbon(name){
  return SERIES_RIBBONS[hashStr(name + 'ribbon') % SERIES_RIBBONS.length];
}

function seriesInitials(name){
  const words = (name || '').split(' ').filter(Boolean);
  return words.map(w => w[0]).slice(0, 3).join('').toUpperCase() || '?';
}

function allSeriesNames(){
  return Array.from(new Set(books.map(b => b.series).filter(Boolean))).sort();
}

function colorForBook(b){
  if (b.color) return b.color;
  return SPINE_COLORS[hashStr(b.title || 'x') % SPINE_COLORS.length].hex;
}

function widthForBook(b){
  if (b.pages && b.pages > 0){
    const clamped = Math.min(Math.max(b.pages, 50), 900);
    return Math.round(26 + (clamped - 50) / (900 - 50) * 46);
  }
  const base = 34;
  const variance = hashStr((b.title||'') + 'w') % 26;
  return base + variance;
}

function heightForBook(b){
  const base = 175;
  const variance = hashStr((b.title||'') + 'h') % 50;
  return base + variance;
}

async function loadBooks(){
  try {
    if (window.storage) {
      const result = await window.storage.get('books', false);
      books = result ? JSON.parse(result.value) : [];
    } else {
      const raw = localStorage.getItem('reading_library_books');
      books = raw ? JSON.parse(raw) : [];
    }
  } catch (e) {
    books = [];
  }
  let migrated = false;
  books = books.map(b => {
    const needsMigration = !b.status || b.dateAdded === undefined || !b.history;
    if (!needsMigration) return b;
    migrated = true;
    const status = b.status || 'completed';
    const dateAdded = b.dateAdded || b.dateFinished || null;
    const history = b.history && b.history.length ? b.history : [{ status: status, date: dateAdded || new Date().toISOString().slice(0, 10) }];
    return Object.assign({}, b, { status, dateAdded, history });
  });

  const seenKeys = new Set();
  const deduped = [];
  books.forEach(b => {
    const key = bookKey(b);
    if (seenKeys.has(key)){
      migrated = true;
      return;
    }
    seenKeys.add(key);
    deduped.push(b);
  });
  books = deduped;

  if (migrated) saveBooks();
  render();
}

async function saveBooks(){
  try {
    if (window.storage) {
      await window.storage.set('books', JSON.stringify(books), false);
    } else {
      localStorage.setItem('reading_library_books', JSON.stringify(books));
    }
  } catch (e) {
    console.error('Could not save', e);
  }
}

function escapeHtml(s){
  const d = document.createElement('div');
  d.textContent = s || '';
  return d.innerHTML;
}

function starsHtml(rating){
  let out = '';
  for (let i = 1; i <= 5; i++){
    const diff = rating - (i - 1);
    const fillPct = diff >= 1 ? 100 : (diff >= 0.5 ? 50 : 0);
    out += '<span class="star-wrap"><span class="star-bg">☆</span><span class="star-fg" style="width:'+fillPct+'%;">★</span></span>';
  }
  return out;
}

function spiceHtml(level){
  if (level === null || level === undefined) return '';
  let out = '';
  for (let i = 1; i <= 5; i++){
    out += '<span class="' + (i <= level ? 'on' : 'off') + '">🌶️</span>';
  }
  return out;
}

function updateStats(){
  const meta = STATUS_META[currentLibrary];
  const shelfBooks = books.filter(b => b.status === currentLibrary);
  document.getElementById('statCount').textContent = shelfBooks.length;
  document.getElementById('statCountLabel').textContent = meta.statCountLabel;

  const statAvgWrap = document.getElementById('statAvgWrap');
  if (meta.showAvgRating){
    statAvgWrap.style.display = '';
    const rated = shelfBooks.filter(b => b.rating);
    const avg = rated.length ? (rated.reduce((a,b)=>a+b.rating,0) / rated.length).toFixed(1) : '—';
    document.getElementById('statAvg').textContent = avg;
    document.getElementById('statAvgLabel').textContent = 'Avg rating';
  } else {
    statAvgWrap.style.display = 'none';
  }

  const genres = new Set(shelfBooks.map(b => b.genre).filter(Boolean));
  document.getElementById('statGenres').textContent = genres.size;

  document.querySelectorAll('.lib-count').forEach(el => {
    const st = el.dataset.countFor;
    el.textContent = books.filter(b => b.status === st).length;
  });
}

function updateGenreFilter(){
  const sel = document.getElementById('genreFilter');
  const current = sel.value;
  const genres = Array.from(new Set(books.filter(b => b.status === currentLibrary).map(b => b.genre).filter(Boolean))).sort();
  sel.innerHTML = '<option value="">All Genres</option>' + genres.map(g => '<option value="'+escapeHtml(g)+'">'+escapeHtml(g)+'</option>').join('');
  sel.value = current;
}

function authorLastName(author){
  const parts = (author || '').trim().split(/\s+/).filter(Boolean);
  return parts.length ? parts[parts.length - 1] : '';
}

function matchesFilter(b){
  if (b.status !== currentLibrary) return false;
  const s = currentFilter.search.trim().toLowerCase();
  if (s && !((b.title||'').toLowerCase().includes(s) || (b.author||'').toLowerCase().includes(s))) return false;
  if (currentFilter.genre && b.genre !== currentFilter.genre) return false;
  return true;
}

function sortList(list){
  const out = list.slice();
  const byAuthorLast = (a,b) => authorLastName(a.author).localeCompare(authorLastName(b.author));
  if (currentFilter.sort === 'title'){
    out.sort((a,b) => (a.title||'').localeCompare(b.title||'') || byAuthorLast(a,b));
  } else if (currentFilter.sort === 'rating'){
    out.sort((a,b) => ((b.rating||0) - (a.rating||0)) || byAuthorLast(a,b));
  } else if (currentFilter.sort === 'recent'){
    out.sort((a,b) => (b.dateFinished||'').localeCompare(a.dateFinished||'') || byAuthorLast(a,b));
  } else {
    out.sort(byAuthorLast);
  }
  return out;
}

function getFilteredSorted(){
  const filtered = books.filter(matchesFilter);
  const sorted = sortList(filtered);

  const result = [];
  const placedSeries = new Set();
  sorted.forEach(b => {
    if (b.series){
      if (placedSeries.has(b.series)) return;
      placedSeries.add(b.series);
      const seriesBooks = filtered.filter(x => x.series === b.series);
      seriesBooks.sort((a,c) => {
        if (a.seriesOrder != null && c.seriesOrder != null) return a.seriesOrder - c.seriesOrder;
        if (a.seriesOrder != null) return -1;
        if (c.seriesOrder != null) return 1;
        return (a.dateFinished||'').localeCompare(c.dateFinished||'');
      });
      result.push(...seriesBooks);
    } else {
      result.push(b);
    }
  });
  return result;
}

function packRows(list, availWidth){
  const gap = 6;
  const rows = [];
  let current = [];
  let currentWidth = 0;
  list.forEach(b => {
    const w = widthForBook(b);
    const addWidth = current.length === 0 ? w : w + gap;
    if (current.length > 0 && currentWidth + addWidth > availWidth){
      rows.push(current);
      current = [b];
      currentWidth = w;
    } else {
      current.push(b);
      currentWidth += addWidth;
    }
  });
  if (current.length) rows.push(current);
  return rows;
}

function render(){
  updateStats();
  updateGenreFilter();
  const container = document.getElementById('shelfContainer');
  const list = getFilteredSorted();
  const libraryBooks = books.filter(b => b.status === currentLibrary);
  const meta = STATUS_META[currentLibrary];

  if (libraryBooks.length === 0){
    container.innerHTML = '<div class="shelf-unit"><div class="shelf-row"><div class="spines"><div class="empty-shelf">'+meta.emptyMsg+'<span class="cta" id="emptyAddLink">'+meta.emptyCta+'</span></div></div><div class="plank"></div></div></div>';
    document.getElementById('emptyAddLink').onclick = openAddForm;
    return;
  }

  if (list.length === 0){
    container.innerHTML = '<div class="shelf-unit"><div class="shelf-row"><div class="spines"><div class="empty-shelf">No books match that search.</div></div><div class="plank"></div></div></div>';
    return;
  }

  const shelfUnitPadLR = 24 * 2;
  const shelfUnitBorder = 3 * 2;
  const spinesPadLR = 4 * 2;
  const availWidth = Math.max(200, container.clientWidth - shelfUnitPadLR - shelfUnitBorder - spinesPadLR);
  const rows = packRows(list, availWidth);
  let html = '<div class="shelf-unit">';
  rows.forEach(row => {
    html += '<div class="shelf-row"><div class="spines">';
    row.forEach(b => {
      const color = colorForBook(b);
      const w = widthForBook(b);
      const h = heightForBook(b);
      const ribbon = b.series ? seriesRibbon(b.series) : null;
      const ribbonHtml = ribbon ? '<span class="series-ribbon" style="background:'+ribbon.bg+';color:'+ribbon.fg+';" title="Series: '+escapeHtml(b.series)+'">'+escapeHtml(seriesInitials(b.series))+'</span>' : '';
      html += '<div class="spine" data-id="'+b.id+'" style="background:'+color+';width:'+w+'px;height:'+h+'px;" title="'+escapeHtml(b.title)+(b.series?' — '+escapeHtml(b.series):'')+'">' +
        ribbonHtml +
        '<span class="rule top"></span>' +
        '<span class="title">'+escapeHtml(b.title)+'</span>' +
        '<span class="author">'+escapeHtml(authorLastName(b.author))+'</span>' +
        '<span class="rule bottom"></span>' +
        '</div>';
    });
    html += '</div><div class="plank"></div></div>';
  });
  html += '</div>';
  container.innerHTML = html;

  container.querySelectorAll('.spine').forEach(el => {
    el.addEventListener('click', () => openDetail(parseInt(el.dataset.id)));
  });
}

function openDetail(id){
  const b = books.find(x => x.id === id);
  if (!b) return;
  const overlay = document.getElementById('overlay');
  const spread = document.getElementById('bookSpread');
  const meta = STATUS_META[b.status] || STATUS_META.completed;

  const genreTag = b.genre ? '<span class="tag">'+escapeHtml(b.genre)+'</span>' : '';
  const seriesTag = b.series ? '<span class="tag" style="background:var(--lav);color:#fff;">'+escapeHtml(b.series)+(b.seriesOrder ? ' #'+b.seriesOrder : '')+'</span>' : '';
  const FORMAT_LABELS = { book: '📕 Book', ebook: '📱 Ebook', audiobook: '🎧 Audiobook' };
  const formatTag = b.format ? '<span class="tag" style="background:var(--mint);color:#fff;">'+(FORMAT_LABELS[b.format] || b.format)+'</span>' : '';
  const spiceBlock = (meta.showSpice && b.spice !== null && b.spice !== undefined) ?
    '<div class="field-label">Spice level</div><div class="spice-row">'+spiceHtml(b.spice)+'</div>' : '';
  const pubBits = [];
  if (b.pages) pubBits.push(b.pages + ' Pages');
  if (b.publisher) pubBits.push(escapeHtml(b.publisher));
  if (b.publishYear) pubBits.push('Pub. ' + b.publishYear);
  const pubLine = pubBits.length ? '<div class="date-line">'+pubBits.join(' · ')+'</div>' : '';
  const addedLine = (!meta.showDate && b.dateAdded) ? '<div class="date-line">Added '+escapeHtml(b.dateAdded)+'</div>' : '';
  const finishedLine = (meta.showDate && b.dateFinished) ? '<div class="date-line">'+meta.dateLabel+' '+escapeHtml(b.dateFinished)+'</div>' : '';
  const dateBlock = finishedLine + addedLine + pubLine;
  const hardCopyBlock = '<div class="field-label">Hard copy</div><div style="display:flex;align-items:center;gap:8px;font-size:14px;color:var(--ink);">' +
    '<i style="display:inline-block;width:18px;height:18px;border-radius:5px;background:'+(b.ownsHardCopy?'var(--grass)':'#EFE7D6')+';position:relative;flex-shrink:0;">' +
    (b.ownsHardCopy ? '<span style="position:absolute;inset:0;display:flex;align-items:center;justify-content:center;color:#fff;font-size:12px;font-weight:700;">✓</span>' : '') +
    '</i>' + (b.ownsHardCopy ? 'Yes, on the shelf' : 'No, not owned') + '</div>';

  const ratingBlock = !meta.showRating ? '' :
    '<div class="field-label">Your rating</div>' +
    '<div class="stars">'+ (b.rating ? starsHtml(b.rating) : '<span style="font-family:Quicksand, sans-serif;font-weight:600;font-size:12px;color:var(--ink-soft);">Not rated</span>') +'</div>';

  let transitionButtons = '';
  if (b.status === 'tbr'){
    transitionButtons = '<button id="startReadingBtn" class="btn-lav" style="background:var(--lav);">Start Reading</button><button id="finishBtn" style="background:var(--grass);">Mark as Finished</button>';
  } else if (b.status === 'reading'){
    transitionButtons = '<button id="finishBtn" style="background:var(--grass);">Mark as Finished</button><button id="dnfBtn" style="background:var(--tangerine);">Did Not Finish</button>';
  } else if (b.status === 'dnf'){
    transitionButtons = '<button id="retryBtn" class="btn-lav" style="background:var(--lav);">Want to Try Reading Again</button>';
  } else if (b.status === 'completed'){
    transitionButtons = '<button id="rereadBtn" class="btn-lav" style="background:var(--lav);">Reread</button>';
  }
  const actionsBlock =
    '<div class="page-actions">' +
      transitionButtons +
      '<button id="editBtn">Edit</button>' +
      '<button class="danger" id="deleteBtn">Remove</button>' +
    '</div>';

  const HISTORY_LABELS = { tbr: 'Added to TBR', reading: 'Started reading', completed: 'Marked as finished', dnf: 'Marked as did not finish' };
  const historyBlock = (b.history && b.history.length) ?
    '<div class="field-label" style="margin-top:24px;">Shelf history</div>' +
    '<ul style="list-style:none;padding:0;margin:0;">' +
      b.history.map(h => '<li style="font-size:13px;color:var(--ink-soft);padding:6px 0;border-bottom:1px dashed #FFDDBB;">'+escapeHtml(h.label || HISTORY_LABELS[h.status] || h.status)+' — '+escapeHtml(h.date)+'</li>').join('') +
    '</ul>' : '';

  const rightPage =
    '<div class="page right">' +
      '<div class="field-label">'+meta.reviewLabel+'</div>' +
      (b.review ? '<p class="review-text">'+escapeHtml(b.review)+'</p>' : '<p class="review-empty">Nothing written yet.</p>') +
      historyBlock +
    '</div>';

  spread.classList.remove('no-spine');
  spread.innerHTML =
    '<button class="close-x" id="closeBtn" aria-label="Close">×</button>' +
    '<div class="page left">' +
      '<h2 class="book-title">'+escapeHtml(b.title)+'</h2>' +
      '<p class="book-author">'+escapeHtml(b.author || 'Unknown author')+'</p>' +
      '<div class="tag-row">'+genreTag+seriesTag+formatTag+'</div>' +
      ratingBlock +
      spiceBlock +
      hardCopyBlock +
      '<div style="margin-top:18px;">'+dateBlock+'</div>' +
      actionsBlock +
    '</div>' +
    rightPage;

  overlay.classList.add('open');
  document.getElementById('closeBtn').onclick = closeOverlay;
  document.getElementById('editBtn').onclick = () => openEditForm(b.id);
  document.getElementById('deleteBtn').onclick = () => confirmDelete(b.id);
  const finishBtn = document.getElementById('finishBtn');
  if (finishBtn) finishBtn.onclick = () => markAsFinished(b.id);
  const startReadingBtn = document.getElementById('startReadingBtn');
  if (startReadingBtn) startReadingBtn.onclick = () => startReading(b.id);
  const retryBtn = document.getElementById('retryBtn');
  if (retryBtn) retryBtn.onclick = () => retryReading(b.id);
  const dnfBtn = document.getElementById('dnfBtn');
  if (dnfBtn) dnfBtn.onclick = () => markDnf(b.id);
  const rereadBtn = document.getElementById('rereadBtn');
  if (rereadBtn) rereadBtn.onclick = () => rereadBook(b.id);
}

function markAsFinished(id){
  const b = books.find(x => x.id === id);
  if (!b) return;
  renderForm(b, 'completed');
}

function startReading(id){
  const b = books.find(x => x.id === id);
  if (!b) return;
  renderForm(b, 'reading');
}

function markDnf(id){
  const b = books.find(x => x.id === id);
  if (!b) return;
  renderForm(b, 'dnf');
}

async function retryReading(id){
  const idx = books.findIndex(x => x.id === id);
  if (idx === -1) return;
  const history = (books[idx].history ? books[idx].history.slice() : []);
  history.push({ status: 'reading', date: new Date().toISOString().slice(0, 10) });
  books[idx] = Object.assign({}, books[idx], { status: 'reading', history: history });
  await saveBooks();
  if (currentLibrary !== 'reading'){
    currentLibrary = 'reading';
    document.querySelectorAll('.lib-pill').forEach(p => p.classList.toggle('active', p.dataset.status === currentLibrary));
    updateAddButtonLabel();
  }
  render();
  openDetail(id);
}

async function rereadBook(id){
  const idx = books.findIndex(x => x.id === id);
  if (idx === -1) return;
  const history = (books[idx].history ? books[idx].history.slice() : []);
  history.push({ status: 'reading', date: new Date().toISOString().slice(0, 10), label: 'Marked as reread' });
  books[idx] = Object.assign({}, books[idx], { status: 'reading', history: history });
  await saveBooks();
  if (currentLibrary !== 'reading'){
    currentLibrary = 'reading';
    document.querySelectorAll('.lib-pill').forEach(p => p.classList.toggle('active', p.dataset.status === currentLibrary));
    updateAddButtonLabel();
  }
  render();
  openDetail(id);
}

function closeOverlay(){
  document.getElementById('overlay').classList.remove('open');
}

document.getElementById('overlay').addEventListener('click', (e) => {
  if (e.target.id === 'overlay') closeOverlay();
});
document.addEventListener('keydown', (e) => {
  if (e.key !== 'Escape') return;
  const confirmOpen = document.getElementById('confirmOverlay').classList.contains('open');
  if (confirmOpen) closeConfirm();
  else closeOverlay();
});

function confirmDelete(id){
  const b = books.find(x => x.id === id);
  if (!b) return;
  const box = document.getElementById('confirmBox');
  box.innerHTML =
    '<h3>Remove this book?</h3>' +
    '<p>"'+escapeHtml(b.title)+'" will be taken off your shelf. This can’t be undone.</p>' +
    '<div class="confirm-actions">' +
      '<button class="btn-no" id="confirmNo">No, keep it</button>' +
      '<button class="btn-yes" id="confirmYes">Yes, remove</button>' +
    '</div>';
  document.getElementById('confirmOverlay').classList.add('open');
  document.getElementById('confirmNo').onclick = closeConfirm;
  document.getElementById('confirmYes').onclick = () => {
    closeConfirm();
    deleteBook(id);
  };
}

function closeConfirm(){
  document.getElementById('confirmOverlay').classList.remove('open');
}

document.getElementById('confirmOverlay').addEventListener('click', (e) => {
  if (e.target.id === 'confirmOverlay') closeConfirm();
});

function deleteBook(id){
  books = books.filter(b => b.id !== id);
  saveBooks();
  closeOverlay();
  render();
}

function openAddForm(){
  editingId = null;
  renderForm(null);
}

function openEditForm(id){
  editingId = id;
  const b = books.find(x => x.id === id);
  renderForm(b);
}

function renderForm(existing, forceStatus){
  const overlay = document.getElementById('overlay');
  const spread = document.getElementById('bookSpread');
  const b = existing || { title:'', author:'', genre:'', rating:0, spice:null, review:'', dateFinished:'', color:'', series:null, seriesOrder:null, ownsHardCopy:false, pages:null, publisher:'', publishYear:null, format:null };
  const formStatus = forceStatus || (existing ? (existing.status || 'completed') : currentLibrary);
  const justMoved = !!forceStatus && existing && existing.status !== forceStatus;
  const isMinimalTransition = justMoved && (formStatus === 'dnf' || (formStatus === 'completed' && existing.status !== 'reading'));
  const isMediumTransition = justMoved && formStatus === 'completed' && existing.status === 'reading';
  const isReadingTransition = justMoved && formStatus === 'reading';
  const meta = isMinimalTransition ? Object.assign({}, STATUS_META[formStatus], { showRating:false, showDate:false, showSpice:false })
    : isMediumTransition ? Object.assign({}, STATUS_META[formStatus], { showDate:false })
    : STATUS_META[formStatus];
  const TRANSITION_HEADINGS = { completed: 'Mark as Finished', reading: 'Start Reading', dnf: 'Mark as Did Not Finish', tbr: 'Move Back to TBR' };

  const genreOptions = ['Fiction','Fantasy','Sci-Fi','Romance','Mystery/Thriller','Nonfiction','Memoir','Historical Fiction','Horror','Young Adult','Poetry','Classic','Other'];
  const seriesDatalist = '<datalist id="seriesList">' + allSeriesNames().map(s => '<option value="'+escapeHtml(s)+'">').join('') + '</datalist>';

  spread.classList.add('no-spine');
  const formTitle = justMoved ? TRANSITION_HEADINGS[formStatus] : (existing ? 'Edit book' : meta.formTitleNew);
  const defaultDateFinished = justMoved && !b.dateFinished ? new Date().toISOString().slice(0, 10) : (b.dateFinished || '');
  const ratingDateFields = !meta.showDate && !meta.showRating ? '' :
    !meta.showRating ?
      '<div><label>'+meta.dateLabel+'</label><input type="date" id="f_date" value="'+escapeHtml(defaultDateFinished)+'"></div>'
    :
    '<div class="two-col">' +
      '<div><label>Your rating <span style="text-transform:none;font-weight:600;color:var(--ink-soft);">(tap left/right half of a star for half ratings)</span></label><div class="star-picker" id="f_stars"></div><span id="f_stars_readout" style="font-size:12px;color:var(--ink-soft);font-weight:600;display:block;margin-top:4px;"></span></div>' +
      (meta.showDate ? '<div><label>'+meta.dateLabel+'</label><input type="date" id="f_date" value="'+escapeHtml(defaultDateFinished)+'"></div>' : '') +
    '</div>';
  const reviewLabel = meta.reviewLabel;
  const reviewPlaceholder = meta.reviewPlaceholder;
  const spiceField = !meta.showSpice ? '' :
    '<div>' +
      '<label>Spice level <span class="spice-none-toggle" id="f_spice_toggle">'+((b.spice===null||b.spice===undefined)?'set a level':'mark not applicable')+'</span></label>' +
      '<div class="spice-picker" id="f_spice" style="'+((b.spice===null||b.spice===undefined)?'display:none;':'')+'"></div>' +
    '</div>';
  const submitLabel = justMoved ? ('Save & ' + TRANSITION_HEADINGS[formStatus].toLowerCase()) : (existing ? 'Save changes' : meta.submitLabelNew);

  spread.innerHTML = isMinimalTransition ?
    '<button class="close-x" id="closeBtn" aria-label="Close">×</button>' +
    '<div class="page left" style="grid-column:1 / -1;">' +
      '<h2 class="book-title">'+formTitle+'</h2>' +
      '<p class="book-author" style="margin-top:-4px;">'+escapeHtml(b.title)+'</p>' +
      '<div class="form-grid">' +
        '<div><label>'+reviewLabel+'</label><textarea id="f_review" placeholder="'+reviewPlaceholder+'" autofocus>'+escapeHtml(b.review)+'</textarea></div>' +
        '<div class="form-error" id="f_error" style="display:none;"></div>' +
        '<button class="form-submit" id="f_submit">'+submitLabel+'</button>' +
      '</div>' +
    '</div>'
    : isMediumTransition ?
    '<button class="close-x" id="closeBtn" aria-label="Close">×</button>' +
    '<div class="page left" style="grid-column:1 / -1;">' +
      '<h2 class="book-title">'+formTitle+'</h2>' +
      '<p class="book-author" style="margin-top:-4px;">'+escapeHtml(b.title)+'</p>' +
      '<div class="form-grid">' +
        ratingDateFields +
        spiceField +
        '<div><label>'+reviewLabel+'</label><textarea id="f_review" placeholder="'+reviewPlaceholder+'">'+escapeHtml(b.review)+'</textarea></div>' +
        '<div class="form-error" id="f_error" style="display:none;"></div>' +
        '<button class="form-submit" id="f_submit">'+submitLabel+'</button>' +
      '</div>' +
    '</div>'
    : isReadingTransition ?
    '<button class="close-x" id="closeBtn" aria-label="Close">×</button>' +
    '<div class="page left" style="grid-column:1 / -1;">' +
      '<h2 class="book-title">'+formTitle+'</h2>' +
      '<p class="book-author" style="margin-top:-4px;">'+escapeHtml(b.title)+'</p>' +
      '<div class="form-grid">' +
        '<div><label>Format</label><div class="format-picker" id="f_format"></div></div>' +
        '<div style="display:flex;align-items:center;gap:8px;">' +
          '<input type="checkbox" id="f_hardcopy" style="width:20px;height:20px;accent-color:var(--coral);" '+(b.ownsHardCopy?'checked':'')+'>' +
          '<label for="f_hardcopy" style="margin:0;text-transform:none;font-size:14px;color:var(--ink);">I own a hard copy of this book</label>' +
        '</div>' +
        '<div class="form-error" id="f_error" style="display:none;"></div>' +
        '<button class="form-submit" id="f_submit">'+submitLabel+'</button>' +
      '</div>' +
    '</div>'
    :
    '<button class="close-x" id="closeBtn" aria-label="Close">×</button>' +
    '<div class="page left" style="grid-column:1 / -1;">' +
      '<h2 class="book-title">'+formTitle+'</h2>' +
      '<div class="form-grid">' +
        '<div><label>Title</label><input type="text" id="f_title" value="'+escapeHtml(b.title)+'" placeholder="a book title"></div>' +
        '<div class="two-col">' +
          '<div><label>Author</label><input type="text" id="f_author" value="'+escapeHtml(b.author)+'" placeholder="Author name"></div>' +
          '<div><label>Genre</label><select id="f_genre">' +
            '<option value="">Choose a genre</option>' +
            genreOptions.map(g => '<option value="'+g+'"'+(b.genre===g?' selected':'')+'>'+g+'</option>').join('') +
          '</select></div>' +
        '</div>' +
        '<div>' +
          '<button type="button" id="f_lookup_btn" style="background:var(--sun);color:#7A4E00;border:none;font-family:Quicksand, sans-serif;font-weight:700;font-size:12px;padding:8px 16px;border-radius:16px;cursor:pointer;">Autofill page count, publisher &amp; genre</button>' +
          '<span id="f_lookup_status" style="font-size:12px;color:var(--ink-soft);margin-left:8px;"></span>' +
        '</div>' +
        ratingDateFields +
        '<div class="two-col">' +
          '<div><label>Page count <span style="text-transform:none;font-weight:600;color:var(--ink-soft);">(sets spine thickness)</span></label><input type="text" inputmode="numeric" id="f_pages" value="'+(b.pages||'')+'" placeholder="e.g. 320"></div>' +
          '<div><label>Publish year</label><input type="text" inputmode="numeric" id="f_publish_year" value="'+(b.publishYear||'')+'" placeholder="e.g. 2011"></div>' +
        '</div>' +
        '<div><label>Publisher</label><input type="text" id="f_publisher" value="'+escapeHtml(b.publisher||'')+'" placeholder="e.g. Tor Books"></div>' +
        spiceField +
        '<div>' +
          '<label>Series <span class="spice-none-toggle" id="f_series_toggle">'+(b.series?'remove from series':'part of a series?')+'</span></label>' +
          '<div class="two-col" id="f_series_fields" style="'+(b.series?'':'display:none;')+'">' +
            '<input type="text" id="f_series_name" list="seriesList" value="'+escapeHtml(b.series||'')+'" placeholder="Series name">' +
            '<input type="number" id="f_series_order" min="1" value="'+(b.seriesOrder||'')+'" placeholder="Book # in series">' +
          '</div>' +
          seriesDatalist +
        '</div>' +
        '<div><label>Spine color</label><div class="color-picker" id="f_colors"></div></div>' +
        '<div><label>Format</label><div class="format-picker" id="f_format"></div></div>' +
        '<div style="display:flex;align-items:center;gap:8px;">' +
          '<input type="checkbox" id="f_hardcopy" style="width:20px;height:20px;accent-color:var(--coral);" '+(b.ownsHardCopy?'checked':'')+'>' +
          '<label for="f_hardcopy" style="margin:0;text-transform:none;font-size:14px;color:var(--ink);">I own a hard copy of this book</label>' +
        '</div>' +
        '<div><label>'+reviewLabel+'</label><textarea id="f_review" placeholder="'+reviewPlaceholder+'">'+escapeHtml(b.review)+'</textarea></div>' +
        '<div class="form-error" id="f_error" style="display:none;"></div>' +
        '<button class="form-submit" id="f_submit">'+submitLabel+'</button>' +
      '</div>' +
    '</div>';

  let rating = b.rating || 0;
  const starWrap = document.getElementById('f_stars');
  function drawStars(){
    if (!starWrap) return;
    starWrap.innerHTML = '';
    for (let i = 1; i <= 5; i++){
      const diff = rating - (i - 1);
      const fillPct = diff >= 1 ? 100 : (diff >= 0.5 ? 50 : 0);
      const cell = document.createElement('span');
      cell.style.position = 'relative';
      cell.style.display = 'inline-block';
      cell.style.cursor = 'pointer';
      cell.innerHTML =
        '<span class="star-bg">☆</span>' +
        '<span class="star-fg" style="width:'+fillPct+'%;">★</span>' +
        '<span style="position:absolute;top:0;left:0;width:50%;height:100%;"></span>' +
        '<span style="position:absolute;top:0;right:0;width:50%;height:100%;"></span>';
      const leftZone = cell.children[2];
      const rightZone = cell.children[3];
      leftZone.onclick = () => { const v = i - 0.5; rating = (rating === v) ? 0 : v; drawStars(); };
      rightZone.onclick = () => { rating = (rating === i) ? 0 : i; drawStars(); };
      starWrap.appendChild(cell);
    }
    const readout = document.getElementById('f_stars_readout');
    if (readout) readout.textContent = rating ? rating + ' of 5' : 'Not rated';
  }
  drawStars();

  let spiceVal = (b.spice === null || b.spice === undefined) ? null : b.spice;
  const spiceWrap = document.getElementById('f_spice');
  function drawSpice(){
    if (!spiceWrap) return;
    spiceWrap.innerHTML = '';
    const level = spiceVal || 0;
    for (let i = 1; i <= 5; i++){
      const s = document.createElement('span');
      s.textContent = '🌶️';
      s.className = i <= level ? 'on' : '';
      s.onclick = () => { spiceVal = (spiceVal === i) ? 0 : i; drawSpice(); };
      spiceWrap.appendChild(s);
    }
  }
  drawSpice();
  const spiceToggleEl = document.getElementById('f_spice_toggle');
  if (spiceToggleEl) spiceToggleEl.onclick = () => {
    if (spiceVal === null){
      spiceVal = 0;
      spiceWrap.style.display = 'flex';
      spiceToggleEl.textContent = 'mark not applicable';
    } else {
      spiceVal = null;
      spiceWrap.style.display = 'none';
      spiceToggleEl.textContent = 'set a level';
    }
  };

  const seriesToggleEl = document.getElementById('f_series_toggle');
  if (seriesToggleEl) seriesToggleEl.onclick = () => {
    const fields = document.getElementById('f_series_fields');
    const toggle = document.getElementById('f_series_toggle');
    const showing = fields.style.display !== 'none';
    if (showing){
      fields.style.display = 'none';
      document.getElementById('f_series_name').value = '';
      document.getElementById('f_series_order').value = '';
      toggle.textContent = 'part of a series?';
    } else {
      fields.style.display = 'grid';
      toggle.textContent = 'remove from series';
    }
  };

function guessGenre(subjects){
  if (!subjects || !subjects.length) return null;
  const text = subjects.join(' | ').toLowerCase();
  const rules = [
    [/fantasy/, 'Fantasy'],
    [/science fiction|sci-fi/, 'Sci-Fi'],
    [/romance/, 'Romance'],
    [/mystery|detective|thriller|crime/, 'Mystery/Thriller'],
    [/horror/, 'Horror'],
    [/young adult|juvenile fiction|teen/, 'Young Adult'],
    [/poetry|poems/, 'Poetry'],
    [/memoir|autobiograph/, 'Memoir'],
    [/historical fiction/, 'Historical Fiction'],
    [/classic/, 'Classic']
  ];
  for (const rule of rules){
    if (rule[0].test(text)) return rule[1];
  }
  if (/fiction/.test(text)) return 'Fiction';
  if (/biography|history|science|business|self-help|psychology|philosophy|essay/.test(text)) return 'Nonfiction';
  return null;
}

const lookupBtnEl = document.getElementById('f_lookup_btn');
if (lookupBtnEl) lookupBtnEl.onclick = async () => {
    const titleVal = document.getElementById('f_title').value.trim();
    const authorVal = document.getElementById('f_author').value.trim();
    const statusEl = document.getElementById('f_lookup_status');
    if (!titleVal){
      statusEl.textContent = 'Enter a title first.';
      return;
    }
    statusEl.textContent = 'Searching Open Library...';
    try {
      let url = 'https://openlibrary.org/search.json?title=' + encodeURIComponent(titleVal);
      if (authorVal) url += '&author=' + encodeURIComponent(authorVal);
      url += '&fields=title,author_name,first_publish_year,number_of_pages_median,publisher,subject&limit=1';
      const res = await fetch(url);
      if (!res.ok) throw new Error('bad response');
      const data = await res.json();
      const doc = data.docs && data.docs[0];
      if (!doc){
        statusEl.textContent = 'No match found — enter details manually.';
        return;
      }
      let filled = [];
      if (doc.number_of_pages_median){
        document.getElementById('f_pages').value = doc.number_of_pages_median;
        filled.push('pages');
      }
      if (doc.first_publish_year){
        document.getElementById('f_publish_year').value = doc.first_publish_year;
        filled.push('publish year');
      }
      if (doc.publisher && doc.publisher.length){
        document.getElementById('f_publisher').value = doc.publisher[0];
        filled.push('publisher');
      }
      const genreSel = document.getElementById('f_genre');
      const guessed = guessGenre(doc.subject);
      if (guessed && !genreSel.value){
        genreSel.value = guessed;
        filled.push('genre (best guess)');
      }
      statusEl.textContent = filled.length ? ('Filled in ' + filled.join(', ') + '.') : 'Found the book, but no extra details were available.';
    } catch (err) {
      statusEl.textContent = 'Could not reach Open Library — enter details manually.';
    }
  };

  let colorVal = b.color || '';
  const colorWrap = document.getElementById('f_colors');
  if (colorWrap){
    SPINE_COLORS.forEach(c => {
      const sw = document.createElement('div');
      sw.className = 'swatch' + (colorVal === c.hex ? ' on' : '');
      sw.style.background = c.hex;
      sw.title = c.name;
      sw.onclick = () => {
        colorVal = c.hex;
        colorWrap.querySelectorAll('.swatch').forEach(x => x.classList.remove('on'));
        sw.classList.add('on');
      };
      colorWrap.appendChild(sw);
    });
  }

  let formatVal = b.format || '';
  const formatWrap = document.getElementById('f_format');
  const FORMAT_OPTIONS = [
    { key: 'book', label: '📕 Book' },
    { key: 'ebook', label: '📱 Ebook' },
    { key: 'audiobook', label: '🎧 Audiobook' }
  ];
  if (formatWrap){
    FORMAT_OPTIONS.forEach(o => {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.textContent = o.label;
      btn.className = 'format-option' + (formatVal === o.key ? ' on' : '');
      btn.onclick = () => {
        formatVal = (formatVal === o.key) ? '' : o.key;
        formatWrap.querySelectorAll('.format-option').forEach(x => x.classList.remove('on'));
        if (formatVal) btn.classList.add('on');
      };
      formatWrap.appendChild(btn);
    });
  }

  overlay.classList.add('open');
  document.getElementById('closeBtn').onclick = closeOverlay;

  document.getElementById('f_submit').onclick = async () => {
    const titleEl = document.getElementById('f_title');
    const authorEl = document.getElementById('f_author');
    const genreEl2 = document.getElementById('f_genre');
    const title = titleEl ? titleEl.value.trim() : (b.title || '');
    const author = authorEl ? authorEl.value.trim() : (b.author || '');
    const genre = genreEl2 ? genreEl2.value : (b.genre || '');
    const dateFinishedEl = document.getElementById('f_date');
    const dateFinished = dateFinishedEl ? dateFinishedEl.value : ((isMinimalTransition || isMediumTransition) ? new Date().toISOString().slice(0, 10) : (b.dateFinished || ''));
    const pagesEl = document.getElementById('f_pages');
    const pagesRaw = pagesEl ? pagesEl.value.trim() : (b.pages ? String(b.pages) : '');
    const publishYearEl = document.getElementById('f_publish_year');
    const publishYearRaw = publishYearEl ? publishYearEl.value.trim() : (b.publishYear ? String(b.publishYear) : '');
    const publisherEl = document.getElementById('f_publisher');
    const publisher = publisherEl ? publisherEl.value.trim() : (b.publisher || '');
    const reviewEl = document.getElementById('f_review');
    const review = reviewEl ? reviewEl.value.trim() : (b.review || '');
    const hardcopyEl = document.getElementById('f_hardcopy');
    const ownsHardCopy = hardcopyEl ? hardcopyEl.checked : !!b.ownsHardCopy;
    const errEl = document.getElementById('f_error');
    const seriesFieldsEl = document.getElementById('f_series_fields');
    const seriesFieldsShown = seriesFieldsEl ? seriesFieldsEl.style.display !== 'none' : !!b.series;
    const seriesName = seriesFieldsShown ? (document.getElementById('f_series_name') ? document.getElementById('f_series_name').value.trim() : (b.series || '')) : '';
    const seriesOrderRaw = seriesFieldsShown ? (document.getElementById('f_series_order') ? document.getElementById('f_series_order').value : (b.seriesOrder || '')) : '';

    if (!title){
      errEl.textContent = 'Give the book a title before saving.';
      errEl.style.display = 'block';
      return;
    }

    const newKey = bookKey({ title, author });
    const isDupe = books.some(x => bookKey(x) === newKey && (!existing || x.id !== existing.id));
    if (isDupe){
      errEl.textContent = 'This book is already in your library.';
      errEl.style.display = 'block';
      return;
    }

    const newStatus = forceStatus || (existing ? (existing.status || 'completed') : currentLibrary);
    const oldStatus = existing ? (existing.status || 'completed') : null;
    const history = existing ? (existing.history ? existing.history.slice() : []) : [];
    if (!existing || oldStatus !== newStatus){
      history.push({ status: newStatus, date: new Date().toISOString().slice(0, 10) });
    }

    const bookData = {
      id: existing ? existing.id : Date.now(),
      title, author, genre,
      rating: rating || null,
      spice: spiceVal,
      review, dateFinished,
      color: colorVal,
      series: seriesName || null,
      seriesOrder: seriesOrderRaw ? parseInt(seriesOrderRaw) : null,
      ownsHardCopy,
      format: formatVal || null,
      pages: pagesRaw ? parseInt(pagesRaw) : null,
      publisher: publisher || null,
      publishYear: publishYearRaw ? parseInt(publishYearRaw) : null,
      status: newStatus,
      dateAdded: existing ? (existing.dateAdded || existing.dateFinished || null) : (dateFinished || new Date().toISOString().slice(0, 10)),
      history: history
    };

    if (existing){
      const idx = books.findIndex(x => x.id === existing.id);
      books[idx] = bookData;
    } else {
      books.push(bookData);
    }
    await saveBooks();
    if (bookData.status !== currentLibrary){
      currentLibrary = bookData.status;
      document.querySelectorAll('.lib-pill').forEach(p => p.classList.toggle('active', p.dataset.status === currentLibrary));
      updateAddButtonLabel();
    }
    render();
    openDetail(bookData.id);
  };
}

document.getElementById('openAddBtn').addEventListener('click', openAddForm);

function updateAddButtonLabel(){
  document.getElementById('openAddBtn').textContent = STATUS_META[currentLibrary].addBtnLabel;
}

function switchLibrary(status){
  if (status === currentLibrary) return;
  currentLibrary = status;
  document.querySelectorAll('.lib-pill').forEach(p => p.classList.toggle('active', p.dataset.status === status));
  updateAddButtonLabel();
  currentFilter.search = '';
  currentFilter.genre = '';
  document.getElementById('searchInput').value = '';
  render();
}

document.querySelectorAll('.lib-pill').forEach(p => {
  p.addEventListener('click', () => switchLibrary(p.dataset.status));
});

updateAddButtonLabel();

function showIoStatus(msg){
  const el = document.getElementById('ioStatus');
  el.textContent = msg;
  clearTimeout(showIoStatus._t);
  showIoStatus._t = setTimeout(() => { el.textContent = ''; }, 5000);
}

function bookKey(b){
  return (b.title || '').trim().toLowerCase() + '|' + (b.author || '').trim().toLowerCase();
}

document.getElementById('exportBtn').addEventListener('click', () => {
  if (books.length === 0){
    showIoStatus('Your shelf is empty — nothing to export yet.');
    return;
  }
  const seen = new Set();
  const deduped = [];
  books.forEach(b => {
    const key = bookKey(b);
    if (seen.has(key)) return;
    seen.add(key);
    deduped.push(b);
  });
  const blob = new Blob([JSON.stringify(deduped, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  const stamp = new Date().toISOString().slice(0, 10);
  a.href = url;
  a.download = 'reading-library-' + stamp + '.json';
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
  const skipped = books.length - deduped.length;
  showIoStatus('Exported ' + deduped.length + ' book' + (deduped.length === 1 ? '' : 's') + (skipped ? ' (' + skipped + ' duplicate' + (skipped === 1 ? '' : 's') + ' skipped)' : '') + '.');
});

document.getElementById('importBtn').addEventListener('click', () => {
  document.getElementById('importFile').click();
});

document.getElementById('importFile').addEventListener('change', (e) => {
  const file = e.target.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = async () => {
    try {
      const imported = JSON.parse(reader.result);
      if (!Array.isArray(imported)) throw new Error('not an array');
      const existingIds = new Set(books.map(b => b.id));
      const existingKeys = new Set(books.map(bookKey));
      let added = 0;
      let skippedDupes = 0;
      imported.forEach(item => {
        if (!item || typeof item.title !== 'string' || !item.title.trim()) return;
        const key = bookKey(item);
        if (existingKeys.has(key)){
          skippedDupes++;
          return;
        }
        existingKeys.add(key);
        let id = item.id;
        if (id == null || existingIds.has(id)) id = Date.now() + Math.floor(Math.random() * 100000);
        existingIds.add(id);
        const importStatus = item.status || 'completed';
        const importDateAdded = item.dateAdded || item.dateFinished || null;
        const importHistory = item.history && item.history.length ? item.history : [{ status: importStatus, date: importDateAdded || new Date().toISOString().slice(0, 10) }];
        books.push(Object.assign({
          status: importStatus,
          dateAdded: importDateAdded,
          history: importHistory
        }, item, { id, status: importStatus, dateAdded: importDateAdded, history: importHistory }));
        added++;
      });
      await saveBooks();
      render();
      showIoStatus('Imported ' + added + ' book' + (added === 1 ? '' : 's') + (skippedDupes ? ' (' + skippedDupes + ' duplicate' + (skippedDupes === 1 ? '' : 's') + ' skipped)' : '') + '.');
    } catch (err) {
      showIoStatus('That file didn’t look like a valid export — nothing was imported.');
    }
    e.target.value = '';
  };
  reader.readAsText(file);
});

document.getElementById('searchInput').addEventListener('input', (e) => {
  currentFilter.search = e.target.value;
  render();
});
document.getElementById('genreFilter').addEventListener('change', (e) => {
  currentFilter.genre = e.target.value;
  render();
});
document.getElementById('sortSelect').addEventListener('change', (e) => {
  currentFilter.sort = e.target.value;
  render();
});

let resizeTimer = null;
window.addEventListener('resize', () => {
  clearTimeout(resizeTimer);
  resizeTimer = setTimeout(() => {
    if (view_isOverlayOpen()) return;
    render();
  }, 150);
});
function view_isOverlayOpen(){
  const overlay = document.getElementById('overlay');
  return overlay && overlay.classList.contains('open');
}

loadBooks();
