/* GlenMovies — MovieBox PRO style (legal public-domain)
   Features: hero slider, rows, modal player (+download), trailer popup,
   left sidebar nav, simple login (localStorage), recommendations, load more.
*/

// ---------- curated catalog (identifiers on archive.org) ----------
const CATALOG = [
  // identifier, title, category, year, optional youtube trailer id
  { id: "night_of_the_living_dead", title: "Night of the Living Dead", category: "horror", year: 1968, trailer: "" },
  { id: "plan_9_from_outer_space", title: "Plan 9 from Outer Space", category: "action", year: 1959, trailer: "" },
  { id: "the_general", title: "The General (1926)", category: "action", year: 1926, trailer: "" },
  { id: "his_girl_friday", title: "His Girl Friday", category: "drama", year: 1940, trailer: "" },
  { id: "sherlock_holmes_1939", title: "Sherlock Holmes (1939)", category: "drama", year: 1939, trailer: "" },
  { id: "charlie_chaplin_the_gold_rush", title: "The Gold Rush (Chaplin)", category: "comedy", year: 1925, trailer: "" },
  { id: "nosferatu_1922", title: "Nosferatu", category: "horror", year: 1922, trailer: "" },
  { id: "metropolis_1927", title: "Metropolis", category: "drama", year: 1927, trailer: "" },
  { id: "the_battle_of_ankarah", title: "Sample Public Movie A", category: "action", year: 1935, trailer: "" }, // placeholder
  // add more identifiers you trust or manually curate
];

// ---------- small runtime state ----------
let curated = [...CATALOG]; // will expand via load more
let heroIndex = 0;
let heroInterval = null;
const PER_PAGE = 12;
let loadedAllCount = curated.length; // for 'load more' simulation

// ---------- helpers ----------
const qs = s => document.querySelector(s);
const qsa = s => Array.from(document.querySelectorAll(s));
const servicesImg = id => `https://archive.org/services/img/${id}`;
const detailsPage = id => `https://archive.org/details/${id}`;
const metadataUrl = id => `https://archive.org/metadata/${id}`;

// ---------- UI refs ----------
const heroSlides = qs("#heroSlides");
const trendingRow = qs("#trendingRow");
const actionRow = qs("#actionRow");
const dramaRow = qs("#dramaRow");
const horrorRow = qs("#horrorRow");
const comedyRow = qs("#comedyRow");
const allGrid = qs("#allGrid");
const playerModal = qs("#playerModal");
const playerVideo = qs("#playerVideo");
const playerTitle = qs("#playerTitle");
const playerDesc = qs("#playerDesc");
const playerMeta = qs("#playerMeta");
const downloadBtn = qs("#downloadBtn");
const recommendRow = qs("#recommendRow");
const trailerModal = qs("#trailerModal");
const trailerFrame = qs("#trailerFrame");
const loginModal = qs("#loginModal");

// ---------- build hero from first few movies ----------
function buildHero() {
  heroSlides.innerHTML = "";
  const featured = curated.slice(0, 5);
  featured.forEach((m, i) => {
    const div = document.createElement("div");
    div.className = "hero-slide";
    div.style.backgroundImage = `url('${servicesImg(m.id)}')`;
    div.innerHTML = `<div class="hero-overlay">
      <h1>${m.title}</h1>
      <p class="muted">${m.year} • ${m.category}</p>
      <div style="margin-top:8px"><button class="accent hero-play" data-id="${m.id}">Play</button> <a href="${detailsPage(m.id)}" target="_blank" class="ghost">Open on Archive</a></div>
    </div>`;
    heroSlides.appendChild(div);
  });
  setHeroPosition(0);
  if(heroInterval) clearInterval(heroInterval);
  heroInterval = setInterval(()=> nextHero(), 6000);
}

function setHeroPosition(idx){
  heroIndex = idx % heroSlides.children.length;
  heroSlides.style.transform = `translateX(-${heroIndex * 100}%)`;
}

// hero controls
qs("#prevHero").addEventListener("click", ()=> setHeroPosition((heroIndex-1+heroSlides.children.length)%heroSlides.children.length));
qs("#nextHero").addEventListener("click", ()=> nextHero());
function nextHero(){ setHeroPosition((heroIndex+1)%heroSlides.children.length); }

// ---------- populate rows ----------
async function populateAll() {
  trendingRow.innerHTML = ""; actionRow.innerHTML = ""; dramaRow.innerHTML = ""; horrorRow.innerHTML = ""; comedyRow.innerHTML = ""; allGrid.innerHTML = "";
  for(const m of curated){
    // poster (services img usually exists) — use placeholder if needed
    const poster = servicesImg(m.id);
    const card = buildPosterCard(m, poster);
    // append to category rows
    trendingRow.appendChild(card.cloneNode(true));
    if(m.category === "action") actionRow.appendChild(card.cloneNode(true));
    if(m.category === "drama") dramaRow.appendChild(card.cloneNode(true));
    if(m.category === "horror") horrorRow.appendChild(card.cloneNode(true));
    if(m.category === "comedy") comedyRow.appendChild(card.cloneNode(true));
    allGrid.appendChild(card);
  }
  // wire play buttons (dynamic elements)
  qsa(".poster").forEach(el=>{
    el.addEventListener("click", ()=> openPlayer(el.dataset.id));
  });
  qsa(".hero-play").forEach(b=>{
    b.addEventListener("click", ()=> openPlayer(b.dataset.id));
  });
}

function buildPosterCard(m, poster){
  const wrapper = document.createElement("div");
  wrapper.className = "posterWrap";
  wrapper.innerHTML = `<img class="poster" src="${poster}" alt="${m.title}" loading="lazy" data-id="${m.id}"><div style="margin-top:6px;font-size:14px">${m.title}</div>`;
  return wrapper;
}

// ---------- open player: fetch metadata to find playable file ----------
async function openPlayer(id){
  playerModal.setAttribute("aria-hidden", "false");
  playerTitle.textContent = "Loading...";
  playerMeta.textContent = "";
  playerDesc.textContent = "";
  playerVideo.pause();
  playerVideo.removeAttribute("src");
  downloadBtn.style.display = "none";
  recommendRow.innerHTML = "";
  // find catalog item for meta
  const metaItem = curated.find(x=>x.id===id) || { title:id, category:"" };
  playerTitle.textContent = metaItem.title || id;
  playerMeta.textContent = `${metaItem.year || ""} • ${metaItem.category || ""}`;
  // fetch archive metadata for files & description
  try{
    const r = await fetch(metadataUrl(id));
    const j = await r.json();
    const files = j.files || [];
    const desc = j.metadata && (j.metadata.description || j.metadata.Description || "");
    if(desc) playerDesc.textContent = desc;
    // choose video file: prefer mp4/webm
    const priority = ['mp4','webm','ogg','ogv'];
    let chosen = null;
    for(const ext of priority){
      chosen = files.find(f => f.name && f.name.toLowerCase().endsWith('.' + ext));
      if(chosen) break;
    }
    if(!chosen){
      chosen = files.find(f => f.format && /video/i.test(f.format));
    }
    if(chosen){
      const filename = chosen.name;
      const fileUrl = `https://archive.org/download/${id}/${encodeURIComponent(filename)}`;
      playerVideo.src = fileUrl;
      playerVideo.play().catch(()=>{});
      downloadBtn.href = fileUrl;
      downloadBtn.style.display = 'inline-block';
    } else {
      playerDesc.textContent += "\n\nNo direct mp4/webm found. Open details page for playback options.";
      downloadBtn.href = detailsPage(id);
      downloadBtn.textContent = "Open on Archive";
      downloadBtn.style.display = 'inline-block';
    }
  }catch(err){
    console.error("metadata", err);
    playerDesc.textContent = "Could not load video metadata. Try opening Archive page.";
    downloadBtn.href = detailsPage(id);
    downloadBtn.textContent = "Open on Archive";
    downloadBtn.style.display = 'inline-block';
  }
  // build recommendations (category-based)
  buildRecommendations(metaItem.category, id);
}

// close player
qs("#closePlayer").addEventListener("click", ()=> {
  playerModal.setAttribute("aria-hidden","true");
  playerVideo.pause();
  playerVideo.removeAttribute("src");
});

// build recommendations — simple: same category, random
function buildRecommendations(category, excludeId){
  recommendRow.innerHTML = "";
  const candidates = curated.filter(x=>x.category===category && x.id !== excludeId);
  const picks = candidates.slice(0,6);
  for(const p of picks){
    const el = document.createElement("img");
    el.className = "poster";
    el.src = servicesImg(p.id);
    el.title = p.title;
    el.dataset.id = p.id;
    el.addEventListener("click", ()=> openPlayer(p.id));
    recommendRow.appendChild(el);
  }
}

// ---------- trailer popup ----------
qs("#openTrailer").addEventListener("click", ()=>{
  const id = playerTitle.textContent;
  // find trailer in curated
  const item = curated.find(x=>x.title === id) || curated.find(x=>x.id===id);
  if(!item || !item.trailer){
    // no trailer
    alert("No trailer available for this movie.");
    return;
  }
  trailerFrame.innerHTML = `<iframe src="https://www.youtube.com/embed/${item.trailer}?autoplay=1" allow="autoplay; encrypted-media" allowfullscreen></iframe>`;
  trailerModal.setAttribute("aria-hidden","false");
});
qs("#closeTrailer").addEventListener("click", ()=> {
  trailerFrame.innerHTML = "";
  trailerModal.setAttribute("aria-hidden","true");
});

// ---------- simple login (client-side mock) ----------
qs("#openLogin").addEventListener("click", ()=> loginModal.setAttribute("aria-hidden","false"));
qs("#closeLogin").addEventListener("click", ()=> loginModal.setAttribute("aria-hidden","true"));

qs("#signUpBtn").addEventListener("click", ()=>{
  const email = qs("#emailInput").value.trim();
  const name = qs("#nameInput").value.trim() || email.split('@')[0];
  if(!email){ alert("Enter email"); return; }
  const users = JSON.parse(localStorage.getItem("glen_users")||"{}");
  users[email] = { name, email, list: [] };
  localStorage.setItem("glen_users", JSON.stringify(users));
  localStorage.setItem("glen_user", email);
  alert("Signed up (demo).");
  loginModal.setAttribute("aria-hidden","true");
});
qs("#signInBtn").addEventListener("click", ()=>{
  const email = qs("#emailInput").value.trim();
  const users = JSON.parse(localStorage.getItem("glen_users")||"{}");
  if(users[email]){ localStorage.setItem("glen_user", email); alert("Signed in"); loginModal.setAttribute("aria-hidden","true"); } else alert("User not found. Sign up first.");
});

// MyList (simple)
qs("#myListBtn").addEventListener("click", ()=>{
  const email = localStorage.getItem("glen_user");
  if(!email){ alert("Sign in first."); return; }
  const users = JSON.parse(localStorage.getItem("glen_users")||"{}");
  const me = users[email];
  if(!me || !me.list || me.list.length===0){ alert("Your list is empty."); return; }
  // show as a quick popup list
  alert("My List:\n" + me.list.map(i=>i.title||i).join("\n"));
});
qs("#addToList").addEventListener("click", ()=>{
  const email = localStorage.getItem("glen_user");
  if(!email){ alert("Sign in to save to My List."); return; }
  const users = JSON.parse(localStorage.getItem("glen_users")||"{}");
  const me = users[email] || { name: email.split('@')[0], email, list: [] };
  const id = playerTitle.textContent;
  const item = curated.find(x=>x.title===id) || curated.find(x=>x.id===id);
  if(item && !me.list.find(x=>x.id===item.id)){ me.list.push(item); users[email] = me; localStorage.setItem("glen_users", JSON.stringify(users)); alert("Added to My List."); } else alert("Already in list or unknown item.");
});

// ---------- search -->
qs("#searchBtn").addEventListener("click", doSearch);
qs("#searchInput").addEventListener("keydown", (e)=>{ if(e.key === "Enter") doSearch(); });
function doSearch(){
  const q = qs("#searchInput").value.trim().toLowerCase();
  if(!q) { populateAll(); return; }
  const filtered = curated.filter(x => (x.title + " " + (x.category||"") + " " + (x.year||"")).toLowerCase().includes(q));
  trendingRow.innerHTML = ""; actionRow.innerHTML = ""; dramaRow.innerHTML = ""; horrorRow.innerHTML = ""; comedyRow.innerHTML = ""; allGrid.innerHTML = "";
  for(const m of filtered){
    const poster = servicesImg(m.id);
    const card = buildPosterCard(m, poster);
    trendingRow.appendChild(card.cloneNode(true));
    if(m.category === "action") actionRow.appendChild(card.cloneNode(true));
    if(m.category === "drama") dramaRow.appendChild(card.cloneNode(true));
    if(m.category === "horror") horrorRow.appendChild(card.cloneNode(true));
    if(m.category === "comedy") comedyRow.appendChild(card);
    allGrid.appendChild(card);
  }
  qsa(".poster").forEach(el=>el.addEventListener("click", ()=> openPlayer(el.dataset.id)));
}

// ---------- sidebar nav -->
qsa(".nav-btn").forEach(b=>{
  b.addEventListener("click", ()=>{
    qsa(".nav-btn").forEach(x=>x.classList.remove("active"));
    b.classList.add("active");
    const section = b.dataset.section;
    // scroll to section
    const map = { trending: "#row-trending", action: "#row-action", drama: "#row-drama", horror: "#row-horror", comedy: "#row-comedy", all: "#row-all" };
    const el = qs(map[section]);
    if(el) el.scrollIntoView({behavior:"smooth", block:"start"});
  });
});

// hamburger / responsive
qs("#hamburger").addEventListener("click", ()=> {
  const sb = qs("#sidebar");
  if(sb.style.display === "none") sb.style.display = "flex"; else sb.style.display = "none";
});
qs("#toggleSidebar").addEventListener("click", ()=> {
  const sb = qs("#sidebar");
  if(sb.style.width === "72px"){ sb.style.width = "210px"; } else sb.style.width = "72px";
});

// dark toggle (simple inversion)
qs("#darkToggle").addEventListener("click", ()=>{
  document.body.classList.toggle("light-mode");
  // quick color swap (left minimal)
  if(document.body.classList.contains("light-mode")){
    document.documentElement.style.setProperty('--bg', '#f7f9fc');
    document.documentElement.style.setProperty('--card', '#ffffff');
    document.documentElement.style.setProperty('--muted', '#475569');
    document.body.style.color = '#0b1220';
  } else {
    document.documentElement.style.removeProperty('--bg');
    document.documentElement.style.removeProperty('--card');
    document.documentElement.style.removeProperty('--muted');
    document.body.style.color = '';
  }
});

// ---------- load more (simulate by repeating catalog or you can expand curated list) ----------
qs("#loadMore").addEventListener("click", ()=>{
  // in a real app you'd fetch more curated IDs; here we clone existing items with suffix to simulate
  const toAdd = curated.slice(0,6).map((x,i)=> ({...x, id: x.id + "_more_" + (loadedAllCount + i + 1), title: x.title + " (More)", year: x.year}));
  curated = curated.concat(toAdd);
  loadedAllCount = curated.length;
  populateAll();
});

// ---------- initial render ----------
(function init(){
  // ensure poster service URLs available — we populate UI using curated list
  buildHero();
  populateAll();
})();
