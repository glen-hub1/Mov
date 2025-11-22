// GLEN MOVIES - main logic
const API = 'https://movieapi.giftedtech.co.ke/api';

// Elements
const searchInput = document.getElementById('searchInput');
const trendingEl = document.getElementById('trending');
const popularEl = document.getElementById('popular');
const latestEl = document.getElementById('latest');
const moviesEl = document.getElementById('movies');
const categoryList = document.getElementById('categoryList');
const continueList = document.getElementById('continueList');
const downloadsList = document.getElementById('downloadsList');

const popup = document.getElementById('moviePopup');
const closePopup = document.getElementById('closePopup');
const popupCover = document.getElementById('popupCover');
const popupTitle = document.getElementById('popupTitle');
const popupDesc = document.getElementById('popupDesc');
const popupGenres = document.getElementById('popupGenres');
const popupRating = document.getElementById('popupRating');
const downloadList = document.getElementById('downloadList');
const trailerWrap = document.getElementById('trailerWrap');
const trailerVideo = document.getElementById('trailerVideo');
const addContinueBtn = document.getElementById('addContinue');
const downloadAllBtn = document.getElementById('downloadAll');

const unlockPremiumBtn = document.getElementById('unlockPremium');
const revokePremiumBtn = document.getElementById('revokePremium');
const premiumNote = document.getElementById('premiumNote');

let currentMovie = null;

// ---------- Premium handling ----------
function isPremium(){ return localStorage.getItem('glen_premium') === 'true'; }
function setPremium(v){ localStorage.setItem('glen_premium', v ? 'true' : 'false'); updatePremiumUI(); }
function updatePremiumUI(){
  if(isPremium()){ unlockPremiumBtn.classList.add('hidden'); revokePremiumBtn.classList.remove('hidden'); premiumNote.textContent = 'Premium active'; }
  else{ unlockPremiumBtn.classList.remove('hidden'); revokePremiumBtn.classList.add('hidden'); premiumNote.textContent = 'Unlock HD downloads & trailers'; }
}
unlockPremiumBtn.onclick = ()=> setPremium(true);
revokePremiumBtn.onclick = ()=> setPremium(false);
updatePremiumUI();

// ---------- Utility: create movie card ----------
function makeCard(item){
  const card = document.createElement('div');
  card.className = 'movie-card';
  card.innerHTML = `\
    <img src="${item.thumbnail || item.cover?.url || ''}" alt="${item.title}"/>\
    <div class="movie-title">${item.title}</div>`;
  card.onclick = ()=> openMovie(item.subjectId || item.subjectId || item.subjectId);
  return card;
}

// ---------- Fetch sample lists ----------
async function searchAPI(query){
  const res = await fetch(`${API}/search/${encodeURIComponent(query)}`);
  const j = await res.json();
  return j.results?.items || [];
}

async function loadInitial(){
  // populate sections with example queries (hacky but works)
  const t = await searchAPI('Avengers');
  const p = await searchAPI('Batman');
  const l = await searchAPI('2024');

  fillGrid(trendingEl, t.slice(0,8));
  fillGrid(popularEl, p.slice(0,8));
  fillGrid(latestEl, l.slice(0,8));

  // build categories from combined genres
  const all = [...t,...p,...l];
  buildCategories(all);
}

function fillGrid(container, items){ container.innerHTML=''; items.forEach(it=>container.appendChild(makeCard(it))); }

// ---------- Categories ----------
function buildCategories(items){
  const genres = new Set();
  items.forEach(i=>{ if(i.genre) i.genre.split(',').forEach(g=>genres.add(g.trim())); });
  categoryList.innerHTML='';
  Array.from(genres).sort().forEach(g=>{
    const btn = document.createElement('button'); btn.textContent = g || 'Other';
    btn.onclick = ()=> filterByCategory(g);
    categoryList.appendChild(btn);
  });
}

async function filterByCategory(cat){
  // quick search by category name
  const results = await searchAPI(cat);
  moviesEl.innerHTML=''; fillGrid(moviesEl, results.slice(0,24));
}

// ---------- Search ----------
let searchTimer=null;
searchInput.addEventListener('input', ()=>{
  clearTimeout(searchTimer);
  const q = searchInput.value.trim();
  if(q.length<2) return;
  searchTimer = setTimeout(async ()=>{
    const res = await searchAPI(q);
    moviesEl.innerHTML=''; fillGrid(moviesEl, res.slice(0,24));
  }, 350);
});

// ---------- Open movie & populate popup ----------
async function openMovie(id){
  try{
    const infoRes = await fetch(`${API}/info/${id}`);
    const info = await infoRes.json();
    const m = info.results.subject;
    currentMovie = m;

    popupCover.src = m.thumbnail || m.cover?.url || '';
    popupTitle.textContent = m.title;
    popupDesc.textContent = m.description || m.postTitle || '';
    popupGenres.textContent = m.genre || '';
    popupRating.textContent = m.imdbRatingValue || 'N/A';

    // trailer
    if(m.trailer && isPremium()){
      trailerWrap.classList.remove('hidden');
      trailerVideo.src = m.trailer.videoAddress?.url || '';
      trailerVideo.play().catch(()=>{});
    } else {
      trailerWrap.classList.add('hidden');
      trailerVideo.pause(); trailerVideo.src='';
    }

    // download sources
    downloadList.innerHTML = 'Loading...';
    const srcRes = await fetch(`${API}/sources/${id}`);
    const srcJ = await srcRes.json();
    const sources = srcJ.results || [];
    downloadList.innerHTML = '';
    sources.forEach(s=>{
      // gate 720p for non-premium
      if(s.quality==='720p' && !isPremium()) return;
      const a = document.createElement('a'); a.href = s.download_url; a.target='_blank';
      a.textContent = `${s.quality} — ${Math.round((s.size||0)/1024/1024)}MB`;
      downloadList.appendChild(a);
    });

    // show popup
    popup.classList.remove('hidden');

  }catch(e){ console.error(e); alert('Failed to load movie info'); }
}
closePopup.onclick = ()=> popup.classList.add('hidden');

// ---------- Continue Watching ----------
function getContinue(){ try{ return JSON.parse(localStorage.getItem('glen_continue')||'[]'); }catch(e){return[]} }
function saveContinue(list){ localStorage.setItem('glen_continue', JSON.stringify(list)); renderContinue(); }

function addToContinue(movie){
  const list = getContinue();
  // store minimal info
  const entry = { id: movie.subjectId, title: movie.title, thumbnail: movie.thumbnail, ts: Date.now() };
  // dedupe and keep latest first
  const filtered = [entry].concat(list.filter(x=>x.id!==entry.id)).slice(0,10);
  saveContinue(filtered);
}

function renderContinue(){
  const list = getContinue();
  continueList.innerHTML='';
  list.forEach(it=>{
    const el = document.createElement('div'); el.className='item'; el.textContent = it.title;
    el.onclick = ()=> openMovie(it.id);
    continueList.appendChild(el);
  });
}
addContinueBtn.onclick = ()=>{ if(currentMovie) addToContinue(currentMovie); };
renderContinue();

// ---------- Downloads manager (sidebar) ----------
function addDownloadEntry(text, url){
  const el = document.createElement('div'); el.className='item'; el.textContent = text;
  el.onclick = ()=> window.open(url,'_blank');
  downloadsList.prepend(el);
}

downloadAllBtn.onclick = async ()=>{
  if(!currentMovie) return;
  const srcRes = await fetch(`${API}/sources/${currentMovie.subjectId}`);
  const srcJ = await srcRes.json();
  (srcJ.results||[]).forEach(s=>{
    if(s.quality==='720p' && !isPremium()) return;
    addDownloadEntry(`${currentMovie.title} — ${s.quality}`, s.download_url);
  });
}

// ---------- Persist some simple state & initial load ----------
window.addEventListener('load', ()=>{ loadInitial(); renderContinue(); updatePremiumUI(); });

// ---------- Small helper: initial sample load ----------
async function loadInitial(){
  try{
    const t = await searchAPI('Action');
    const p = await searchAPI('Drama');
    const l = await searchAPI('Comedy');
    fillGrid(trendingEl, t.slice(0,8));
    fillGrid(popularEl, p.slice(0,8));
    fillGrid(latestEl, l.slice(0,8));
    buildCategories([...t,...p,...l]);
  }catch(e){console.error(e)}
}

// theme toggle
const modeToggle = document.getElementById('modeToggle');
modeToggle.onclick = ()=> document.body.classList.toggle('light');

// Chatbot open/close handled in chatbot.js for clarity
