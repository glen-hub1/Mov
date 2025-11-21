// Glen Movies - Public Domain (client-side)
// Uses Internet Archive advancedsearch + metadata endpoints
// No API key required for public queries.

const gallery = document.getElementById('gallery');
const searchInput = document.getElementById('searchInput');
const searchBtn = document.getElementById('searchBtn');
const loadMoreBtn = document.getElementById('loadMore');
const filters = document.querySelectorAll('.filter');
const darkToggle = document.getElementById('darkToggle');

const modal = document.getElementById('playerModal');
const playerVideo = document.getElementById('playerVideo');
const playerTitle = document.getElementById('playerTitle');
const playerDesc = document.getElementById('playerDesc');
const downloadBtn = document.getElementById('downloadBtn');
const sourceBtn = document.getElementById('sourceBtn');
const closePlayer = document.getElementById('closePlayer');

let page = 1;
let rows = 12;
let queryExtra = ''; // set by filters
let lastQuery = '';
let loading = false;

function makeCard(item){
  const div = document.createElement('div');
  div.className = 'card';
  // pick thumbnail: use item.cover or build thumbnail URL
  const thumb = item.image || (item.identifier ? `https://archive.org/services/img/${item.identifier}` : '');
  div.innerHTML = `
    <img class="poster" src="${thumb}" alt="${escapeHtml(item.title || 'Untitled')}" loading="lazy" />
    <div class="card-body">
      <div class="title">${escapeHtml(item.title || item.identifier)}</div>
      <div class="meta">${escapeHtml(item.creator || '')} ${item.year ? ' · ' + item.year : ''}</div>
    </div>
  `;
  // click to open player — need metadata fetch to get files
  div.addEventListener('click', () => openPlayer(item.identifier, item.title, item.description));
  return div;
}

function escapeHtml(s){
  if(!s) return '';
  return s.replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;');
}

async function searchIA(q, pageNum = 1){
  loading = true;
  loadMoreBtn.disabled = true;
  if(pageNum === 1) gallery.innerHTML = '';
  const safeQ = encodeURIComponent(q);
  // use advancedsearch: query for mediatype:movies and subject public domain OR other extra
  const searchUrl = `https://archive.org/advancedsearch.php?q=${safeQ}+AND+mediatype:(movies)&fl[]=identifier, title, creator, year, description&sort[]=downloads+desc&rows=${rows}&page=${pageNum}&output=json`;
  try{
    const res = await fetch(searchUrl);
    const data = await res.json();
    const docs = data.response.docs || [];
    // render placeholder cards quickly, then fetch metadata when user clicks
    docs.forEach(d => {
      gallery.appendChild(makeCard(d));
    });
    // If fewer results hide load more
    const numFound = data.response.numFound || 0;
    const start = data.response.start || 0;
    if(start + rows >= numFound){
      loadMoreBtn.style.display = 'none';
    } else {
      loadMoreBtn.style.display = 'block';
      loadMoreBtn.disabled = false;
    }
  }catch(err){
    console.error('Search failed', err);
    gallery.innerHTML = `<div style="padding:18px;color:var(--muted)">Search failed. Try again or check your connection.</div>`;
  } finally {
    loading = false;
  }
}

async function openPlayer(identifier, title='Unknown', description=''){
  // fetch metadata to get list of files & choose best mp4/webm
  modal.setAttribute('aria-hidden', 'false');
  playerTitle.textContent = title || identifier;
  playerDesc.textContent = description || '';
  playerVideo.pause();
  playerVideo.removeAttribute('src');
  playerVideo.load();

  const metaUrl = `https://archive.org/metadata/${identifier}`;
  try{
    const r = await fetch(metaUrl);
    const j = await r.json();
    const files = j.files || [];
    // choose candidate: prefer mp4, then webm, then ogv
    const priority = ['mp4','webm','ogv','ogg'];
    let chosen = null;
    for(const ext of priority){
      chosen = files.find(f => f.name && f.name.toLowerCase().endsWith('.' + ext));
      if(chosen) break;
    }
    // fallback: first file with format 'MPEG4' or includes 'VBR' etc
    if(!chosen){
      chosen = files.find(f => f.format && /video/i.test(f.format));
    }
    if(!chosen){
      // no direct file found: try to find 'hls' or 'stream' links or show source page
      downloadBtn.style.display = 'none';
      playerVideo.poster = `https://archive.org/services/img/${identifier}`;
      playerDesc.textContent += '\n\nNo direct playable file found in metadata. Open source page.';
      sourceBtn.href = `https://archive.org/details/${identifier}`;
      sourceBtn.style.display = 'inline-block';
      return;
    }
    const filename = chosen.name;
    const fileUrl = `https://archive.org/download/${identifier}/${encodeURIComponent(filename)}`;
    // set player source
    playerVideo.src = fileUrl;
    playerVideo.setAttribute('controls','');
    playerVideo.play().catch(()=>{ /* autoplay blocked — fine */});
    // download link & source link
    downloadBtn.href = fileUrl;
    downloadBtn.style.display = 'inline-block';
    sourceBtn.href = `https://archive.org/details/${identifier}`;
    sourceBtn.style.display = 'inline-block';
  }catch(err){
    console.error('metadata error', err);
    playerDesc.textContent = 'Could not load video metadata. Open source page for details.';
    downloadBtn.style.display = 'none';
    sourceBtn.href = `https://archive.org/details/${identifier}`;
    sourceBtn.style.display = 'inline-block';
  }
}

closePlayer.addEventListener('click', () => {
  playerVideo.pause();
  playerVideo.removeAttribute('src');
  playerVideo.load();
  modal.setAttribute('aria-hidden', 'true');
});

// Search interactions
searchBtn.addEventListener('click', () => {
  page = 1;
  lastQuery = (searchInput.value || '').trim();
  const q = buildQuery(lastQuery);
  searchIA(q, page);
});
searchInput.addEventListener('keydown', (e) => {
  if(e.key === 'Enter') searchBtn.click();
});

// Load more
loadMoreBtn.addEventListener('click', () => {
  if(loading) return;
  page += 1;
  const q = buildQuery(lastQuery);
  searchIA(q, page);
});

// Filters
filters.forEach(f=>{
  f.addEventListener('click', ()=>{
    filters.forEach(x=>x.classList.remove('active'));
    f.classList.add('active');
    page = 1;
    lastQuery = '';
    queryExtra = f.dataset.q || '';
    const q = buildQuery('');
    searchIA(q, page);
  });
});

// dark mode toggle (simple)
darkToggle.addEventListener('click', ()=>{
  const pressed = darkToggle.getAttribute('aria-pressed') === 'true';
  darkToggle.setAttribute('aria-pressed', String(!pressed));
  if(!pressed){
    document.documentElement.style.setProperty('--bg','#f7f9fc');
    document.documentElement.style.setProperty('--card','#ffffff');
    document.documentElement.style.setProperty('--muted','#475569');
    document.documentElement.style.setProperty('--accent','#0ea5e9');
    document.body.style.color='#0b1220';
  } else {
    // reset to default dark
    document.documentElement.style.removeProperty('--bg');
    document.documentElement.style.removeProperty('--card');
    document.documentElement.style.removeProperty('--muted');
    document.documentElement.style.removeProperty('--accent');
    document.body.style.color='';
  }
});

// Build query for IA advanced search
function buildQuery(q){
  // base: public domain OR subject:public domain
  const userPart = q ? `title:(${quoteIfNeeded(q)}) OR description:(${quoteIfNeeded(q)}) OR creator:(${quoteIfNeeded(q)})` : '';
  const extra = queryExtra ? `AND ${queryExtra}` : '';
  // Limit to items that likely contain full movies: subject:public domain OR "public domain"
  // Use parentheses and URL encode later in fetch call
  let final = '';
  if(userPart){
    final = `(${userPart}) AND (subject:(\"public domain\") OR subject:(\"public-domain\") OR subject:(public)) ${extra}`;
  } else {
    final = `(subject:(\"public domain\") OR subject:(\"public-domain\") OR subject:(public)) ${extra}`;
  }
  // Advanced search expects + or space separated; later used in encodeURIComponent
  return final;
}

function quoteIfNeeded(s){
  if(/\s/.test(s)) return `"${s}"`;
  return s;
}

// Initial load: trending public domain movies (most downloaded)
(function init(){
  lastQuery = '';
  queryExtra = '';
  const base = buildQuery('');
  searchIA(base, page);
})();
