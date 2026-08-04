/* =====================================================
   Firebase — sincronização entre aparelhos (Paulo & Julia)
   Se a conexão falhar, o app continua funcionando 100%
   no localStorage deste navegador (modo offline).
===================================================== */
import { initializeApp } from "https://www.gstatic.com/firebasejs/12.17.0/firebase-app.js";
import { getAuth, signInAnonymously, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/12.17.0/firebase-auth.js";
import {
  getFirestore, doc, getDoc, getDocs, collection,
  setDoc, updateDoc, deleteDoc, deleteField, onSnapshot, writeBatch
} from "https://www.gstatic.com/firebasejs/12.17.0/firebase-firestore.js";

const firebaseConfig = {
  apiKey: "AIzaSyCTKfnyVSJnU6B6mB0iir0LTYCTtljffIs",
  authDomain: "cinema-paulo-julia.firebaseapp.com",
  projectId: "cinema-paulo-julia",
  storageBucket: "cinema-paulo-julia.firebasestorage.app",
  messagingSenderId: "716131900055",
  appId: "1:716131900055:web:07203929895f20d68327d2"
};
const fbApp = initializeApp(firebaseConfig);
const fbAuth = getAuth(fbApp);
const db = getFirestore(fbApp);
const roletaDocRef = doc(db, 'sync', 'roleta');
const diarioColRef = collection(db, 'diario');
const watchlistColRef = collection(db, 'watchlist');
let cloudEnabled = false;

/* =====================================================
   DADOS — Vencedores do Oscar (para a Roleta)
   Histórico completo mantido para preservar os IDs
   originais; o filtro pra 1970+ acontece logo abaixo.
===================================================== */
const ALL_OSCAR_WINNERS = [
  {y:"1927/28", t:"Wings"},
  {y:"1928/29", t:"The Broadway Melody"},
  {y:"1929/30", t:"All Quiet on the Western Front"},
  {y:"1930/31", t:"Cimarron"},
  {y:"1931/32", t:"Grand Hotel"},
  {y:"1932/33", t:"Cavalcade"},
  {y:"1934", t:"It Happened One Night"},
  {y:"1935", t:"Mutiny on the Bounty"},
  {y:"1936", t:"The Great Ziegfeld"},
  {y:"1937", t:"The Life of Emile Zola"},
  {y:"1938", t:"You Can't Take It with You"},
  {y:"1939", t:"Gone with the Wind"},
  {y:"1940", t:"Rebecca"},
  {y:"1941", t:"How Green Was My Valley"},
  {y:"1942", t:"Mrs. Miniver"},
  {y:"1943", t:"Casablanca"},
  {y:"1944", t:"Going My Way"},
  {y:"1945", t:"The Lost Weekend"},
  {y:"1946", t:"The Best Years of Our Lives"},
  {y:"1947", t:"Gentleman's Agreement"},
  {y:"1948", t:"Hamlet"},
  {y:"1949", t:"All the King's Men"},
  {y:"1950", t:"All About Eve"},
  {y:"1951", t:"An American in Paris"},
  {y:"1952", t:"The Greatest Show on Earth"},
  {y:"1953", t:"From Here to Eternity"},
  {y:"1954", t:"On the Waterfront"},
  {y:"1955", t:"Marty"},
  {y:"1956", t:"Around the World in 80 Days"},
  {y:"1957", t:"The Bridge on the River Kwai"},
  {y:"1958", t:"Gigi"},
  {y:"1959", t:"Ben-Hur"},
  {y:"1960", t:"The Apartment"},
  {y:"1961", t:"West Side Story"},
  {y:"1962", t:"Lawrence of Arabia"},
  {y:"1963", t:"Tom Jones"},
  {y:"1964", t:"My Fair Lady"},
  {y:"1965", t:"The Sound of Music"},
  {y:"1966", t:"A Man for All Seasons"},
  {y:"1967", t:"In the Heat of the Night"},
  {y:"1968", t:"Oliver!"},
  {y:"1969", t:"Midnight Cowboy"},
  {y:"1970", t:"Patton"},
  {y:"1971", t:"The French Connection"},
  {y:"1972", t:"The Godfather"},
  {y:"1973", t:"The Sting"},
  {y:"1974", t:"The Godfather Part II"},
  {y:"1975", t:"One Flew Over the Cuckoo's Nest"},
  {y:"1976", t:"Rocky"},
  {y:"1977", t:"Annie Hall"},
  {y:"1978", t:"The Deer Hunter"},
  {y:"1979", t:"Kramer vs. Kramer"},
  {y:"1980", t:"Ordinary People"},
  {y:"1981", t:"Chariots of Fire"},
  {y:"1982", t:"Gandhi"},
  {y:"1983", t:"Terms of Endearment"},
  {y:"1984", t:"Amadeus"},
  {y:"1985", t:"Out of Africa"},
  {y:"1986", t:"Platoon"},
  {y:"1987", t:"The Last Emperor"},
  {y:"1988", t:"Rain Man"},
  {y:"1989", t:"Driving Miss Daisy"},
  {y:"1990", t:"Dances with Wolves"},
  {y:"1991", t:"The Silence of the Lambs"},
  {y:"1992", t:"Unforgiven"},
  {y:"1993", t:"Schindler's List"},
  {y:"1994", t:"Forrest Gump"},
  {y:"1995", t:"Braveheart"},
  {y:"1996", t:"The English Patient"},
  {y:"1997", t:"Titanic"},
  {y:"1998", t:"Shakespeare in Love"},
  {y:"1999", t:"American Beauty"},
  {y:"2000", t:"Gladiator"},
  {y:"2001", t:"A Beautiful Mind"},
  {y:"2002", t:"Chicago"},
  {y:"2003", t:"The Lord of the Rings: The Return of the King"},
  {y:"2004", t:"Million Dollar Baby"},
  {y:"2005", t:"Crash"},
  {y:"2006", t:"The Departed"},
  {y:"2007", t:"No Country for Old Men"},
  {y:"2008", t:"Slumdog Millionaire"},
  {y:"2009", t:"The Hurt Locker"},
  {y:"2010", t:"The King's Speech"},
  {y:"2011", t:"The Artist"},
  {y:"2012", t:"Argo"},
  {y:"2013", t:"12 Years a Slave"},
  {y:"2014", t:"Birdman"},
  {y:"2015", t:"Spotlight"},
  {y:"2016", t:"Moonlight"},
  {y:"2017", t:"The Shape of Water"},
  {y:"2018", t:"Green Book"},
  {y:"2019", t:"Parasite"},
  {y:"2020", t:"Nomadland"},
  {y:"2021", t:"CODA"},
  {y:"2022", t:"Everything Everywhere All at Once"},
  {y:"2023", t:"Oppenheimer"},
  {y:"2024", t:"Anora"},
  {y:"2025", t:"One Battle After Another"}
].map((m,i)=>({...m, id:i}));

// A roleta só sorteia de 1970 pra frente — os IDs originais são preservados
// (mesmo índice do array histórico completo), então avaliações antigas
// salvas no navegador continuam batendo com o filme certo.
const MOVIES = ALL_OSCAR_WINNERS.filter(m => parseInt(String(m.y).slice(0,4), 10) >= 1970);

const DECADE_COLORS = {1970:'#ffcc4d', 1980:'#ff3fb0', 1990:'#8b5cf6', 2000:'#2fe6d1', 2010:'#5eb8ff', 2020:'#ff7a59'};
function decadeOf(m){ return Math.floor(parseInt(String(m.y).slice(0,4),10)/10)*10; }

/* =====================================================
   Helpers gerais
===================================================== */
function escapeHtml(str){
  const d = document.createElement('div');
  d.textContent = str;
  return d.innerHTML;
}
function truncate(str, max){
  if(!str) return '';
  if(str.length <= max) return str.trim();
  return str.slice(0, max).replace(/\s+\S*$/, '').trim() + '…';
}
function clampRating(v){
  if(v === '' || v === null || v === undefined) return null;
  let n = parseFloat(v);
  if(isNaN(n)) return null;
  n = Math.max(0, Math.min(10, n));
  return n;
}
function formatNum(n){
  if(n===null || n===undefined || isNaN(n)) return '—';
  const rounded = Math.round(n*100)/100;
  return String(rounded).replace('.', ',');
}
const posterPlaceholderHTML = `<div class="r-poster-placeholder">🎬</div>`;

/* =====================================================
   Categorias de filme (usadas no Diário e na watchlist)
===================================================== */
const MOVIE_GENRES = [
  {id:'acao', emoji:'🎬', label:'Ação', color:'#ff3fb0'},
  {id:'aventura', emoji:'🤠', label:'Aventura', color:'#ff9d4d'},
  {id:'comedia', emoji:'😂', label:'Comédia', color:'#ffe14d'},
  {id:'drama', emoji:'🎭', label:'Drama', color:'#8b5cf6'},
  {id:'terror', emoji:'👻', label:'Terror', color:'#ff4d4d'},
  {id:'suspense', emoji:'🔪', label:'Suspense', color:'#a855f7'},
  {id:'ficcao', emoji:'🚀', label:'Ficção Científica', color:'#2fe6d1'},
  {id:'fantasia', emoji:'🐉', label:'Fantasia', color:'#5eb8ff'},
  {id:'romance', emoji:'💕', label:'Romance', color:'#ff6fa8'},
  {id:'animacao', emoji:'🎨', label:'Animação', color:'#4dff88'},
  {id:'documentario', emoji:'📽️', label:'Documentário', color:'#94a3b8'},
  {id:'musical', emoji:'🎵', label:'Musical', color:'#ffcc4d'},
  {id:'biografia', emoji:'📖', label:'Biografia', color:'#b08968'},
  {id:'crime', emoji:'🕵️', label:'Crime', color:'#9f1239'},
  {id:'guerra', emoji:'🪖', label:'Guerra', color:'#7c8a4a'},
];
function genreById(id){ return MOVIE_GENRES.find(g => g.id === id) || null; }
// Lê os gêneros de um filme já normalizados em array — compatível com
// registros antigos que ainda tinham só "genre" (uma categoria só).
function entryGenres(e){
  if(!e) return [];
  if(Array.isArray(e.genres)) return e.genres.filter(Boolean);
  if(e.genre) return [e.genre];
  return [];
}
function genreChipsHtml(genreIds){
  return genreIds.map(genreById).filter(Boolean).map(g =>
    `<span class="m-genre-chip" style="background:${g.color}26; color:${g.color};">${g.emoji} ${escapeHtml(g.label)}</span>`
  ).join('');
}

// Fábrica de dropdown de categoria (usado como seletor em modais e como
// filtro em listas — funciona igual em qualquer dispositivo, sem
// depender de scroll horizontal por gesto).
function createGenreDropdown(mountEl, opts){
  const { allLabel, onSelect } = opts;
  mountEl.innerHTML = `
    <div class="genre-dropdown">
      <button type="button" class="genre-dropdown-btn">
        <span class="gd-label">${escapeHtml(allLabel)}</span>
        <span class="gd-arrow">▾</span>
      </button>
      <div class="genre-dropdown-menu"></div>
    </div>`;
  const root = mountEl.querySelector('.genre-dropdown');
  const btn = root.querySelector('.genre-dropdown-btn');
  const labelEl = root.querySelector('.gd-label');
  const menu = root.querySelector('.genre-dropdown-menu');
  let value = null;

  const allOpt = document.createElement('div');
  allOpt.className = 'gd-option';
  allOpt.dataset.genre = '';
  allOpt.textContent = allLabel;
  menu.appendChild(allOpt);
  MOVIE_GENRES.forEach(g=>{
    const opt = document.createElement('div');
    opt.className = 'gd-option';
    opt.dataset.genre = g.id;
    opt.innerHTML = `<span class="gd-dot" style="background:${g.color}"></span>${g.emoji} ${escapeHtml(g.label)}`;
    menu.appendChild(opt);
  });
  function setValue(v){
    value = v || null;
    const g = genreById(value);
    labelEl.textContent = g ? (g.emoji + ' ' + g.label) : allLabel;
    labelEl.style.color = g ? g.color : '';
    [...menu.children].forEach(opt=>{
      const active = (opt.dataset.genre || '') === (value || '');
      opt.classList.toggle('active', active);
      const og = genreById(opt.dataset.genre);
      if(active && og){
        opt.style.background = og.color + '29';
        opt.style.color = og.color;
      } else {
        opt.style.background = '';
        opt.style.color = '';
      }
    });
  }
  [...menu.children].forEach(opt=>{
    opt.addEventListener('click', (ev)=>{
      ev.stopPropagation();
      setValue(opt.dataset.genre || null);
      root.classList.remove('open');
      if(onSelect) onSelect(value);
    });
  });
  btn.addEventListener('click', (ev)=>{
    ev.stopPropagation();
    document.querySelectorAll('.genre-dropdown.open').forEach(d=>{ if(d!==root) d.classList.remove('open'); });
    root.classList.toggle('open');
  });
  setValue(null);
  return { setValue, getValue: ()=>value, close: ()=> root.classList.remove('open') };
}

// Variante multi-seleção do dropdown de categoria — usada nos modais de
// adicionar/editar filme, pra poder marcar mais de um gênero (ex: Comédia
// + Romance). O menu fica aberto entre um clique e outro pra dar pra
// marcar vários de uma vez; fecha só ao clicar fora ou no botão.
function createGenreMultiPicker(mountEl, opts){
  const { emptyLabel } = opts;
  mountEl.innerHTML = `
    <div class="genre-dropdown">
      <button type="button" class="genre-dropdown-btn">
        <span class="gd-label">${escapeHtml(emptyLabel)}</span>
        <span class="gd-arrow">▾</span>
      </button>
      <div class="genre-dropdown-menu"></div>
    </div>`;
  const root = mountEl.querySelector('.genre-dropdown');
  const btn = root.querySelector('.genre-dropdown-btn');
  const labelEl = root.querySelector('.gd-label');
  const menu = root.querySelector('.genre-dropdown-menu');
  let values = [];

  MOVIE_GENRES.forEach(g=>{
    const opt = document.createElement('div');
    opt.className = 'gd-option';
    opt.dataset.genre = g.id;
    opt.innerHTML = `<span class="gd-dot" style="background:${g.color}"></span>${g.emoji} ${escapeHtml(g.label)}`;
    menu.appendChild(opt);
  });

  function refresh(){
    const genres = values.map(genreById).filter(Boolean);
    if(!genres.length){
      labelEl.textContent = emptyLabel;
      labelEl.style.color = '';
    } else if(genres.length === 1){
      labelEl.textContent = genres[0].emoji + ' ' + genres[0].label;
      labelEl.style.color = genres[0].color;
    } else {
      labelEl.textContent = genres.map(g=>g.emoji).join(' ') + ' ' + genres.length + ' categorias';
      labelEl.style.color = genres[0].color;
    }
    [...menu.children].forEach(opt=>{
      const active = values.includes(opt.dataset.genre);
      opt.classList.toggle('active', active);
      const og = genreById(opt.dataset.genre);
      if(active && og){
        opt.style.background = og.color + '29';
        opt.style.color = og.color;
      } else {
        opt.style.background = '';
        opt.style.color = '';
      }
    });
  }
  function setValues(arr){
    values = Array.isArray(arr) ? arr.filter(Boolean) : [];
    refresh();
  }
  [...menu.children].forEach(opt=>{
    opt.addEventListener('click', (ev)=>{
      ev.stopPropagation();
      const id = opt.dataset.genre;
      if(values.includes(id)) values = values.filter(v => v !== id);
      else values.push(id);
      refresh();
    });
  });
  btn.addEventListener('click', (ev)=>{
    ev.stopPropagation();
    document.querySelectorAll('.genre-dropdown.open').forEach(d=>{ if(d!==root) d.classList.remove('open'); });
    root.classList.toggle('open');
  });
  setValues([]);
  return { setValues, getValues: ()=>values.slice(), close: ()=> root.classList.remove('open') };
}

document.addEventListener('click', ()=>{
  document.querySelectorAll('.genre-dropdown.open').forEach(d=> d.classList.remove('open'));
});
document.addEventListener('keydown', (e)=>{
  if(e.key === 'Escape'){
    document.querySelectorAll('.genre-dropdown.open').forEach(d=> d.classList.remove('open'));
  }
});

/* =====================================================
   Som (sintetizado via Web Audio — sem arquivos externos)
===================================================== */
const SOUND_KEY = 'cinema-pj-sound';
let soundOn = localStorage.getItem(SOUND_KEY) !== 'off';
let audioCtx = null;

function ensureAudioCtx(){
  const AC = window.AudioContext || window.webkitAudioContext;
  if(!AC) return null;
  if(!audioCtx) audioCtx = new AC();
  if(audioCtx.state === 'suspended') audioCtx.resume();
  return audioCtx;
}
function playTone(freq, duration, opts){
  if(!soundOn) return;
  const ctx = ensureAudioCtx();
  if(!ctx) return;
  const o = ctx.createOscillator();
  const g = ctx.createGain();
  o.type = (opts && opts.type) || 'sine';
  o.frequency.value = freq;
  const vol = (opts && opts.vol) || 0.08;
  const now = ctx.currentTime;
  g.gain.setValueAtTime(0, now);
  g.gain.linearRampToValueAtTime(vol, now + 0.008);
  g.gain.exponentialRampToValueAtTime(0.0001, now + duration);
  o.connect(g);
  g.connect(ctx.destination);
  o.start(now);
  o.stop(now + duration + 0.03);
}
function playTick(){ playTone(1100, 0.045, {type:'square', vol:0.05}); }
function playClick(){ playTone(700, 0.05, {type:'sine', vol:0.04}); }
function playChime(){
  if(!soundOn) return;
  [523.25, 659.25, 783.99, 1046.5].forEach((freq, i)=>{
    setTimeout(()=> playTone(freq, 0.35, {type:'triangle', vol:0.07}), i*90);
  });
}
// Agenda "tiques" com intervalo crescente, imitando a desaceleração da roleta.
function scheduleTicks(totalDuration){
  let elapsed = 0;
  let interval = 55;
  function tick(){
    if(elapsed >= totalDuration) return;
    playTick();
    interval *= 1.055;
    elapsed += interval;
    setTimeout(tick, interval);
  }
  setTimeout(tick, interval);
}

/* =====================================================
   Persistência da Roleta (localStorage)
===================================================== */
const STORAGE_KEY = "oscar-roleta-dados";
const OLD_STORAGE_KEY = "oscar-roleta-assistidos"; // versão anterior, só com watched

function loadData(){
  try{
    const raw = localStorage.getItem(STORAGE_KEY);
    if(raw) return JSON.parse(raw);
  }catch(e){}
  try{
    const old = JSON.parse(localStorage.getItem(OLD_STORAGE_KEY) || "[]");
    const migrated = {};
    old.forEach(id => { migrated[id] = { watched:true, paulo:null, julia:null }; });
    return migrated;
  }catch(e){ return {}; }
}
function saveData(changedId){
  localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  if(!cloudEnabled) return;
  if(changedId === undefined){
    setDoc(roletaDocRef, { watched: data }).catch(err => logCloudError('Falha ao sincronizar roleta', err));
  } else {
    const value = data[changedId] !== undefined ? data[changedId] : deleteField();
    updateDoc(roletaDocRef, { [`watched.${changedId}`]: value }).catch(err => logCloudError('Falha ao sincronizar filme', err));
  }
}
let data = loadData();

function isWatched(id){ return !!(data[id] && data[id].watched); }
function getRating(id, who){ return data[id] ? data[id][who] : null; }
function watchedCount(){ return MOVIES.filter(m => isWatched(m.id)).length; }

/* =====================================================
   Cache de capas/sinopses via Wikipédia (compartilhado
   pela Roleta e pelo Diário)
===================================================== */
const WIKI_CACHE_KEY = "oscar-roleta-wiki-cache";
let wikiCache = {};
try{ wikiCache = JSON.parse(localStorage.getItem(WIKI_CACHE_KEY) || "{}"); }catch(e){ wikiCache = {}; }
function saveWikiCache(){
  try{ localStorage.setItem(WIKI_CACHE_KEY, JSON.stringify(wikiCache)); }catch(e){}
}

async function fetchFromWiki(lang, title, year){
  const query = year ? `${title} ${year}` : title;
  const url = `https://${lang}.wikipedia.org/w/api.php?action=query&generator=search&gsrsearch=${encodeURIComponent(query)}&gsrlimit=1&prop=extracts%7Cpageimages&exintro=1&explaintext=1&exchars=500&piprop=original&format=json&origin=*`;
  const res = await fetch(url);
  if(!res.ok) throw new Error('wiki http error');
  const json = await res.json();
  const pages = json.query && json.query.pages;
  if(!pages) return null;
  const page = Object.values(pages)[0];
  if(!page || !page.extract || page.extract.length < 20) return null;
  return {
    found:true,
    title: page.title,
    extract: page.extract,
    image: page.original ? page.original.source : null,
    lang
  };
}

async function getMovieInfo(movie){
  if(wikiCache[movie.id]) return wikiCache[movie.id];
  const yearMatch = (movie.y || '').match(/\d{4}/);
  const searchYear = yearMatch ? yearMatch[0] : '';
  let info = null;
  try{ info = await fetchFromWiki('pt', movie.t, searchYear); }catch(e){ info = null; }
  if(!info){
    try{ info = await fetchFromWiki('en', movie.t, searchYear); }catch(e){ info = null; }
  }
  const result = info || { found:false };
  wikiCache[movie.id] = result;
  saveWikiCache();
  return result;
}

function handlePosterError(imgEl){
  imgEl.outerHTML = posterPlaceholderHTML;
}
// exposto no escopo global porque é chamado via atributo onerror="" inline
window.handlePosterError = handlePosterError;

// Carrega o pôster de forma preguiçosa (só busca quando o card entra na tela)
function lazyLoadPoster(wrapEl, movieLike, imgClass){
  const obs = new IntersectionObserver((entries, o)=>{
    entries.forEach(en=>{
      if(!en.isIntersecting) return;
      o.unobserve(en.target);
      getMovieInfo(movieLike).then(info=>{
        if(info && info.found && info.image){
          wrapEl.innerHTML = `<img class="${imgClass}" src="${info.image}" alt="${escapeHtml(movieLike.t)}" loading="lazy" onerror="handlePosterError(this)">`;
        } else {
          wrapEl.innerHTML = posterPlaceholderHTML;
        }
      }).catch(()=>{ wrapEl.innerHTML = posterPlaceholderHTML; });
    });
  }, {rootMargin:'200px'});
  obs.observe(wrapEl);
}

/* =====================================================
   Desenho da roleta
===================================================== */
const canvas = document.getElementById('wheelCanvas');
const ctx = canvas.getContext('2d');
const wheelWrap = document.getElementById('wheelWrap');
const wheelHalo = document.getElementById('wheelHalo');
const N = MOVIES.length;
const segAngle = (Math.PI*2)/N;

const COLOR_A = '#4c1d95';
const COLOR_B = '#831859';

function drawWheel(){
  const size = wheelWrap.clientWidth || 340;
  if(!size) return;
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  canvas.width = size*dpr;
  canvas.height = size*dpr;
  canvas.style.width = size+'px';
  canvas.style.height = size+'px';
  ctx.setTransform(dpr,0,0,dpr,0,0);
  const r = size/2;
  ctx.clearRect(0,0,size,size);

  for(let i=0;i<N;i++){
    const start = -Math.PI/2 + i*segAngle;
    const end = start + segAngle;
    ctx.beginPath();
    ctx.moveTo(r,r);
    ctx.arc(r,r,r,start,end);
    ctx.closePath();
    ctx.fillStyle = i%2===0 ? COLOR_A : COLOR_B;
    ctx.fill();
    ctx.strokeStyle = 'rgba(255,204,77,0.3)';
    ctx.lineWidth = 1;
    ctx.stroke();

    ctx.save();
    ctx.translate(r,r);
    ctx.rotate(start + segAngle/2);
    ctx.textAlign = 'right';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = '#f5f2ff';
    ctx.font = '600 ' + Math.max(9, r*0.052) + 'px Space Grotesk, sans-serif';
    const label = "'" + MOVIES[i].y.slice(-2);
    ctx.fillText(label, r*0.92, 0);
    ctx.restore();
  }

  ctx.beginPath();
  ctx.arc(r,r,r-1,0,Math.PI*2);
  ctx.strokeStyle = 'rgba(255,204,77,0.55)';
  ctx.lineWidth = 2;
  ctx.stroke();
}
drawWheel();
window.addEventListener('resize', ()=>{ drawWheel(); });

/* =====================================================
   Confete no resultado
===================================================== */
const CONFETTI_COLORS = ['#ffcc4d','#ff3fb0','#8b5cf6','#2fe6d1'];
function burstConfetti(originEl){
  const rect = originEl.getBoundingClientRect();
  const cx = rect.left + rect.width/2;
  const cy = rect.top + rect.height/2;
  for(let i=0;i<26;i++){
    const p = document.createElement('div');
    p.className = 'confetti-piece';
    const angle = Math.random()*Math.PI*2;
    const dist = 90 + Math.random()*140;
    p.style.left = cx+'px';
    p.style.top = cy+'px';
    p.style.background = CONFETTI_COLORS[i % CONFETTI_COLORS.length];
    p.style.setProperty('--dx', Math.cos(angle)*dist + 'px');
    p.style.setProperty('--dy', Math.sin(angle)*dist + 'px');
    p.style.setProperty('--rot', (Math.random()*520-260) + 'deg');
    document.body.appendChild(p);
    setTimeout(()=> p.remove(), 950);
  }
}

function flareBurst(originEl){
  const rect = originEl.getBoundingClientRect();
  const el = document.createElement('div');
  el.className = 'flare-burst';
  el.style.left = (rect.left + rect.width/2) + 'px';
  el.style.top = (rect.top + rect.height/2) + 'px';
  document.body.appendChild(el);
  setTimeout(()=> el.remove(), 700);
}

// Partículas saindo da foto do casal no topo (decorativo)
(function initHeroParticles(){
  const container = document.getElementById('heroParticles');
  if(!container) return;
  const colors = ['#ffcc4d', '#ff3fb0', '#2fe6d1', '#8b5cf6'];
  for(let i=0;i<10;i++){
    const p = document.createElement('div');
    p.className = 'hero-particle';
    const angle = Math.random()*Math.PI*2;
    const dist = 34 + Math.random()*46;
    p.style.left = (50 + Math.cos(angle)*18) + '%';
    p.style.top = (50 + Math.sin(angle)*18) + '%';
    p.style.setProperty('--px', Math.cos(angle)*dist + 'px');
    p.style.setProperty('--py', Math.sin(angle)*dist + 'px');
    p.style.color = colors[i % colors.length];
    p.style.background = colors[i % colors.length];
    p.style.animationDelay = (Math.random()*3) + 's';
    p.style.animationDuration = (2.4 + Math.random()*1.8) + 's';
    container.appendChild(p);
  }
})();

// Partículas da tela de abertura (mesmo visual das da foto no topo)
(function initSplashParticles(){
  const container = document.getElementById('splashParticles');
  if(!container) return;
  const colors = ['#ffcc4d', '#ff3fb0', '#2fe6d1', '#8b5cf6'];
  for(let i=0;i<10;i++){
    const p = document.createElement('div');
    p.className = 'hero-particle';
    const angle = Math.random()*Math.PI*2;
    const dist = 34 + Math.random()*46;
    p.style.left = (50 + Math.cos(angle)*18) + '%';
    p.style.top = (50 + Math.sin(angle)*18) + '%';
    p.style.setProperty('--px', Math.cos(angle)*dist + 'px');
    p.style.setProperty('--py', Math.sin(angle)*dist + 'px');
    p.style.color = colors[i % colors.length];
    p.style.background = colors[i % colors.length];
    p.style.animationDelay = (Math.random()*3) + 's';
    p.style.animationDuration = (2.4 + Math.random()*1.8) + 's';
    container.appendChild(p);
  }
})();

// Esconde a tela de abertura depois que a página carregar de verdade,
// com um tempo mínimo pra animação não "piscar" em conexões rápidas.
(function initSplashScreen(){
  const splash = document.getElementById('splashScreen');
  if(!splash) return;
  const MIN_SPLASH_MS = 2000; // tempo pra animação da foto respirar antes de sumir

  const startedAt = Date.now();
  let hidden = false;
  function hideSplash(){
    if(hidden) return;
    hidden = true;
    const elapsed = Date.now() - startedAt;
    const wait = Math.max(0, MIN_SPLASH_MS - elapsed);
    setTimeout(()=>{
      splash.classList.add('hide');
      setTimeout(()=> splash.remove(), 750);
    }, wait);
  }
  if(document.readyState === 'complete'){
    hideSplash();
  } else {
    window.addEventListener('load', hideSplash);
    setTimeout(hideSplash, 5000); // segurança: nunca trava mais que isso
  }
})();

// Partículas ambiente sutis no fundo (decorativo, não interativo)
(function initSparkles(){
  const container = document.getElementById('sparkles');
  const colors = ['#ffcc4d', '#ff3fb0', '#2fe6d1', '#8b5cf6'];
  for(let i=0;i<14;i++){
    const s = document.createElement('div');
    s.className = 'sparkle';
    s.style.left = Math.random()*100 + '%';
    s.style.top = Math.random()*100 + '%';
    s.style.color = colors[i % colors.length];
    s.style.background = colors[i % colors.length];
    s.style.animationDelay = (Math.random()*4) + 's';
    s.style.animationDuration = (3 + Math.random()*3) + 's';
    container.appendChild(s);
  }
})();

/* =====================================================
   Lógica de giro
===================================================== */
let currentRotation = 0;
let spinning = false;
const spinBtn = document.getElementById('spinBtn');
const resultCard = document.getElementById('resultCard');
const rYear = document.getElementById('rYear');
const rTitle = document.getElementById('rTitle');
const rTag = document.getElementById('rTag');
const rActions = document.getElementById('rActions');
const rMark = document.getElementById('rMark');
const hubEl = document.querySelector('.hub');
const onlyPendingToggle = document.getElementById('onlyPendingToggle');
const pendingHint = document.getElementById('pendingHint');

let currentPick = null;

function spin(){
  if(spinning) return;
  spinning = true;
  spinBtn.disabled = true;
  resultCard.classList.remove('show');
  wheelHalo.classList.add('spinning');
  scheduleTicks(4600);

  const pending = MOVIES.filter(m => !isWatched(m.id));
  const usePending = onlyPendingToggle.checked && pending.length > 0;
  pendingHint.style.display = (onlyPendingToggle.checked && pending.length === 0) ? 'block' : 'none';
  const pool = usePending ? pending : MOVIES;
  const picked = pool[Math.floor(Math.random()*pool.length)];
  const targetIndex = MOVIES.findIndex(m => m.id === picked.id);

  const segCenterDeg = (targetIndex*segAngle + segAngle/2) * (180/Math.PI);
  const targetMod = ((360 - segCenterDeg) % 360 + 360) % 360;
  const extraSpins = 7 + Math.floor(Math.random()*3); // 7-9 voltas
  const curMod = ((currentRotation % 360) + 360) % 360;
  const delta = ((targetMod - curMod) + 360) % 360;
  currentRotation = currentRotation + extraSpins*360 + delta;

  wheelWrap.style.transform = `rotate(${currentRotation}deg)`;

  const onEnd = ()=>{
    wheelWrap.removeEventListener('transitionend', onEnd);
    spinning = false;
    spinBtn.disabled = false;
    wheelHalo.classList.remove('spinning');
    showResult(targetIndex);
    burstConfetti(hubEl);
    flareBurst(hubEl);
    playChime();
    if(navigator.vibrate) navigator.vibrate([30,40,70]);
  };
  wheelWrap.addEventListener('transitionend', onEnd);
}

function showResult(idx, opts){
  const withMedia = !opts || opts.withMedia !== false;
  const m = MOVIES[idx];
  currentPick = m;
  rYear.textContent = 'Oscar ' + m.y;
  rTitle.textContent = m.t;
  const done = isWatched(m.id);
  if(done){
    const p = getRating(m.id,'paulo');
    const j = getRating(m.id,'julia');
    const pTxt = p===null || p===undefined ? '—' : p;
    const jTxt = j===null || j===undefined ? '—' : j;
    rTag.textContent = `Já assistido — Paulo ${pTxt} · Julia ${jTxt}`;
  } else {
    rTag.textContent = 'Ainda não assistido — bora marcar a sessão?';
  }
  rActions.style.display = 'flex';
  rMark.classList.toggle('is-done', done);
  rMark.textContent = done ? 'Editar avaliação' : 'Marcar como assistido';
  requestAnimationFrame(()=> resultCard.classList.add('show'));
  if(withMedia) renderMedia(m);
}

spinBtn.addEventListener('click', spin);

rMark.addEventListener('click', ()=>{
  if(!currentPick) return;
  openRatingForOscarMovie(currentPick.id);
});

/* =====================================================
   FAB flutuante (mobile): rola pro topo e gira de novo
===================================================== */
const fabSpin = document.getElementById('fabSpin');
const stageEl = document.querySelector('.stage');
window.addEventListener('scroll', ()=>{
  if(activeTab !== 'roleta'){ fabSpin.classList.remove('visible'); return; }
  const trigger = stageEl.offsetTop + stageEl.offsetHeight;
  fabSpin.classList.toggle('visible', window.scrollY > trigger);
}, {passive:true});
fabSpin.addEventListener('click', ()=>{
  playClick();
  window.scrollTo({top:0, behavior:'smooth'});
  setTimeout(()=>{ if(!spinning) spin(); }, 450);
});

/* =====================================================
   Chips de década (lista da Roleta)
===================================================== */
const decadeRow = document.getElementById('decadeRow');
let activeDecade = null;
Object.keys(DECADE_COLORS).forEach(dec=>{
  const chip = document.createElement('div');
  chip.className = 'decade-chip';
  chip.textContent = dec + 's';
  chip.dataset.decade = dec;
  chip.addEventListener('click', ()=>{
    activeDecade = activeDecade === dec ? null : dec;
    updateDecadeChips();
    renderGrid();
  });
  decadeRow.appendChild(chip);
});
function updateDecadeChips(){
  [...decadeRow.children].forEach(chip=>{
    const on = chip.dataset.decade === activeDecade;
    chip.classList.toggle('active', on);
    chip.style.background = on ? DECADE_COLORS[chip.dataset.decade] : '';
  });
}

/* =====================================================
   Lista completa da Roleta
===================================================== */
const grid = document.getElementById('movieGrid');
const emptyState = document.getElementById('emptyState');
const searchInput = document.getElementById('searchInput');
const filterPending = document.getElementById('filterPending');
const filterDone = document.getElementById('filterDone');
let activeFilter = null; // null | 'pending' | 'done'

function renderGrid(){
  const q = searchInput.value.trim().toLowerCase();
  grid.innerHTML = '';
  let shown = 0;

  MOVIES.forEach(m=>{
    const done = isWatched(m.id);
    if(activeFilter === 'pending' && done) return;
    if(activeFilter === 'done' && !done) return;
    if(activeDecade && String(decadeOf(m)) !== activeDecade) return;
    if(q && !(m.t.toLowerCase().includes(q) || m.y.includes(q))) return;

    shown++;
    const p = getRating(m.id,'paulo');
    const j = getRating(m.id,'julia');
    const chips = done ? `
      <div class="m-ratings">
        ${p!==null && p!==undefined ? `<span class="m-rate-chip p">P ${p}</span>` : ''}
        ${j!==null && j!==undefined ? `<span class="m-rate-chip j">J ${j}</span>` : ''}
      </div>` : '';

    const card = document.createElement('div');
    card.className = 'movie-card' + (done ? ' done' : '');
    card.style.borderLeftColor = DECADE_COLORS[decadeOf(m)];
    card.innerHTML = `
      <div class="m-poster"><div class="skeleton-poster"></div></div>
      <div class="m-check">${done ? '✓' : ''}</div>
      <div class="m-year">${m.y}</div>
      <div class="m-info">
        <div class="m-title">${m.t}</div>
      </div>
      ${chips}
    `;
    card.addEventListener('click', ()=> openRatingForOscarMovie(m.id));
    grid.appendChild(card);
    lazyLoadPoster(card.querySelector('.m-poster'), m, 'm-poster-img');
  });

  emptyState.style.display = shown===0 ? 'block' : 'none';
}

function updateProgress(){
  const count = watchedCount();
  document.getElementById('prog-count').textContent = count;
  document.getElementById('prog-total-num').textContent = N;
  const pct = (count / N) * 100;
  document.getElementById('prog-fill').style.width = pct + '%';
}

/* =====================================================
   Avaliar filme do Oscar — abre o mesmo modal do Diário, com
   nota, opinião e categoria, em vez do antigo modal simplificado.
   Se já existe um registro do Diário ligado a esse filme, edita
   ele; senão cria um novo já com título e capa preenchidos.
===================================================== */
function openRatingForOscarMovie(movieId){
  const movie = ALL_OSCAR_WINNERS[movieId];
  const existingEntry = diario.find(e => e.oscarId === movieId);
  if(existingEntry){
    openDiarioModal(existingEntry);
  } else {
    const existingRating = data[movieId] || {};
    openDiarioModal(null, {
      title: movie.t,
      oscarId: movieId,
      y: movie.y,
      notaPaulo: existingRating.paulo,
      notaJulia: existingRating.julia
    });
  }
}

const skeletonHTML = `
  <div class="r-poster-wrap"><div class="skeleton-poster"></div></div>
  <div class="r-synopsis">
    <div class="skeleton-line" style="width:96%"></div>
    <div class="skeleton-line" style="width:88%"></div>
    <div class="skeleton-line" style="width:64%"></div>
  </div>`;

function renderMedia(movie){
  const wrap = document.getElementById('rMedia');
  wrap.innerHTML = skeletonHTML;

  getMovieInfo(movie).then(info=>{
    if(!currentPick || currentPick.id !== movie.id) return;

    if(info && info.found){
      wrap.innerHTML = `
        <div class="r-poster-wrap">
          ${info.image ? `<img class="r-poster" src="${info.image}" alt="${escapeHtml(movie.t)}" loading="lazy" onerror="handlePosterError(this)">` : posterPlaceholderHTML}
        </div>
        <div class="r-synopsis">
          <p>${escapeHtml(truncate(info.extract, 340))}</p>
          <span class="r-wiki-credit">Sinopse via Wikipédia (${info.lang === 'pt' ? 'PT' : 'EN'})</span>
        </div>`;
    } else {
      const q = encodeURIComponent(movie.t + ' ' + movie.y + ' filme sinopse');
      wrap.innerHTML = `
        <div class="r-poster-wrap">${posterPlaceholderHTML}</div>
        <div class="r-synopsis">
          <p class="r-no-info">Não encontramos a capa e a sinopse automaticamente dessa vez.</p>
          <a class="r-wiki-link" href="https://www.google.com/search?q=${q}" target="_blank" rel="noopener">Buscar "${escapeHtml(movie.t)}"</a>
        </div>`;
    }
  }).catch(()=>{
    if(!currentPick || currentPick.id !== movie.id) return;
    const q = encodeURIComponent(movie.t + ' ' + movie.y + ' filme sinopse');
    wrap.innerHTML = `
      <div class="r-poster-wrap">${posterPlaceholderHTML}</div>
      <div class="r-synopsis">
        <p class="r-no-info">Sem conexão pra buscar a capa agora. Confira a lista de qualquer forma!</p>
        <a class="r-wiki-link" href="https://www.google.com/search?q=${q}" target="_blank" rel="noopener">Buscar "${escapeHtml(movie.t)}"</a>
      </div>`;
  });
}

searchInput.addEventListener('input', renderGrid);
filterPending.addEventListener('click', ()=>{
  activeFilter = activeFilter === 'pending' ? null : 'pending';
  filterPending.classList.toggle('active', activeFilter==='pending');
  filterDone.classList.remove('active');
  renderGrid();
});
filterDone.addEventListener('click', ()=>{
  activeFilter = activeFilter === 'done' ? null : 'done';
  filterDone.classList.toggle('active', activeFilter==='done');
  filterPending.classList.remove('active');
  renderGrid();
});

/* =====================================================
   DIÁRIO — dados iniciais (importados da planilha)
===================================================== */
const SEED_DIARIO = [
  {id:'d1', title:'A Empregada', where:'Cinema', notaPaulo:8, notaJulia:8, obs:'Primeiro filme que assistimos juntos no cinema. Muito legal, ótimo filme, porém nada espetacular.', addedAt:1},
  {id:'d2', title:'POV: Presença Maligna', where:'Cinema', notaPaulo:3, notaJulia:2, obs:'Filme bem ruim, dava vontade de sair da sala de cinema.', addedAt:2},
  {id:'d3', title:'Devoradores de Estrelas', where:'Cinema', notaPaulo:9, notaJulia:10, obs:'Filme muito bom e muito bem feito, leve. A Julia chorou. Muito legal.', addedAt:3},
  {id:'d4', title:'Obsessão', where:'Cinema', notaPaulo:9.5, notaJulia:10, obs:'Filme de terror excelente, incrível — nos surpreendemos muito e ficamos aterrorizados. Quase perfeito.', addedAt:4},
  {id:'d5', title:'A Hora do Mal', where:'Casa', notaPaulo:7.5, notaJulia:null, obs:'Julia dormiu no meio do filme e não se lembra, por isso não deu nota. Para o Paulo: filme bom e interessante, mas nada de mais — não aterrorizou e o plot era muito previsível.', addedAt:5},
  {id:'d6', title:'Acompanhante Perfeita', where:'Casa', notaPaulo:7.5, notaJulia:7, obs:'Filme legal, interessante e diferente, porém bem previsível — depois do meio já se sabe o que vai acontecer. Nada muito surpreendente.', addedAt:6},
  {id:'d7', title:'Refém do Medo', where:'Casa', notaPaulo:6.5, notaJulia:6.5, obs:'Filme legalzinho, mas muito parado e nada assustador. Um filme bem ok.', addedAt:7},
  {id:'d8', title:'Talk to Me', where:'Casa', notaPaulo:8, notaJulia:7.5, obs:'Filme de terror bom, aterroriza e tem cenas fortes, mas os personagens não são muito interessantes e não têm muito desenvolvimento. Um filme ok.', addedAt:8},
  {id:'d9', title:'Michael', where:'Cinema', notaPaulo:8.5, notaJulia:8.5, obs:'Filme bom, bonito e bem atuado, porém não retrata a história com muita fidelidade.', addedAt:9},
  {id:'d10', title:'Eternidade', where:'Casa', notaPaulo:null, notaJulia:8, obs:'Paulo dormiu o filme inteiro, então não deu nota. Julia: filme bom e leve de assistir, não é romance água-com-açúcar de adolescente — achou diferente e legal, mas o final ficou meio sem sentido (opinião pessoal dela).', addedAt:10},
  {id:'d11', title:'A Origem', where:'Casa', notaPaulo:9.5, notaJulia:10, obs:'Filme muito bom, muito maluco e muito bem dirigido. Parece confuso, mas no final tudo se encaixa. História muito boa.', addedAt:11},
  {id:'d12', title:'Odisseia', where:'Cinema', notaPaulo:10, notaJulia:10, obs:'Filme perfeito: história muito boa, muito bem dirigido, muito bem filmado e bonito, efeitos sonoros incríveis, trilha sonora incrível, roteiro perfeito, personagens bons e o protagonista muito bom. Filme foda.', addedAt:12},
  {id:'d13', title:'Cisne Negro', where:null, notaPaulo:8.5, notaJulia:9, obs:'Ótimo filme, brinca com a realidade — você não sabe o que é real ou não. Atuação muito boa, trilha sonora boa, muito bonito e gostoso de assistir.', addedAt:13},
  {id:'d14', title:'A Lista de Schindler', where:null, notaPaulo:9, notaJulia:8.5, obs:'Filme muito triste e pesado, mas bonito ao mesmo tempo. Retrata bem a história real. Por ser antigo e longo, acaba ficando meio parado em boa parte do filme.', addedAt:14}
];

const DIARIO_STORAGE_KEY = "cinema-pj-diario";

function loadDiario(){
  try{
    const raw = localStorage.getItem(DIARIO_STORAGE_KEY);
    if(raw) return JSON.parse(raw);
  }catch(e){}
  const seeded = SEED_DIARIO.map(e=>({...e}));
  try{ localStorage.setItem(DIARIO_STORAGE_KEY, JSON.stringify(seeded)); }catch(e){}
  return seeded;
}
function saveDiarioLocal(){
  localStorage.setItem(DIARIO_STORAGE_KEY, JSON.stringify(diario));
}
let diario = loadDiario();

function computeMedia(e){
  const p = e.notaPaulo, j = e.notaJulia;
  if(p!=null && j!=null) return (p+j)/2;
  if(p!=null) return p;
  if(j!=null) return j;
  return null;
}

function sortDiario(list, mode){
  const arr = [...list];
  switch(mode){
    case 'recent': arr.sort((a,b)=> b.addedAt - a.addedAt); break;
    case 'oldest': arr.sort((a,b)=> a.addedAt - b.addedAt); break;
    case 'best': arr.sort((a,b)=> (computeMedia(b) === null ? -1 : computeMedia(b)) - (computeMedia(a) === null ? -1 : computeMedia(a))); break;
    case 'worst': arr.sort((a,b)=> (computeMedia(a) === null ? 11 : computeMedia(a)) - (computeMedia(b) === null ? 11 : computeMedia(b))); break;
  }
  return arr;
}

/* =====================================================
   Renderização do Diário
===================================================== */
const diarioGrid = document.getElementById('diarioGrid');
const diarioEmpty = document.getElementById('diarioEmpty');
const diarioSearch = document.getElementById('diarioSearch');
let activeDiarioSort = 'recent';

const DIARIO_VIEW_KEY = 'cinema-pj-diario-view';
let diarioView = localStorage.getItem(DIARIO_VIEW_KEY) || 'list';

function primaryGenreColor(e){
  const gs = entryGenres(e).map(genreById).filter(Boolean);
  return gs.length ? gs[0].color : null;
}

function renderDiario(){
  const q = diarioSearch.value.trim().toLowerCase();
  const genreFilter = diarioGenreFilter.getValue();
  const filtered = diario
    .filter(e => !q || e.title.toLowerCase().includes(q))
    .filter(e => !genreFilter || entryGenres(e).includes(genreFilter));
  const sorted = sortDiario(filtered, activeDiarioSort);
  diarioGrid.className = diarioView === 'mural' ? 'diario-mural' : 'movie-grid';
  diarioGrid.innerHTML = '';

  sorted.forEach(e=>{
    const genresHtml = genreChipsHtml(entryGenres(e));
    const media = computeMedia(e);
    const color = primaryGenreColor(e);
    const card = document.createElement('div');

    if(diarioView === 'mural'){
      card.className = 'mural-card';
      card.innerHTML = `
        <div class="mural-poster"><div class="skeleton-poster"></div></div>
        ${media!=null ? `<div class="mural-media-badge">${formatNum(media)}</div>` : ''}
        <div class="mural-overlay">${color ? `<span class="mural-dot" style="background:${color}"></span>` : ''}${escapeHtml(e.title)}</div>
      `;
      card.addEventListener('click', ()=> openDiarioModal(e));
      diarioGrid.appendChild(card);
      const muralPosterEl = card.querySelector('.mural-poster');
      if(e.poster){
        muralPosterEl.innerHTML = `<img src="${e.poster}" alt="${escapeHtml(e.title)}" loading="lazy">`;
      } else {
        lazyLoadPoster(muralPosterEl, {id:e.id, t:e.title, y:''}, '');
      }
      return;
    }

    card.className = 'movie-card' + (genresHtml ? ' mc-stacked' : '');
    if(color) card.style.borderLeftColor = color;
    card.innerHTML = `
      <div class="mc-main">
      <div class="m-poster">${e.poster ? '' : '<div class="skeleton-poster"></div>'}</div>
      <div class="m-info">
        <div class="m-title">${escapeHtml(e.title)}</div>
      </div>
      <div class="m-ratings">
        ${media!=null ? `<span class="m-media-badge">${formatNum(media)}</span>` : ''}
        <div class="m-rate-sub">
          ${e.notaPaulo!=null ? `<span class="m-rate-chip p">P ${formatNum(e.notaPaulo)}</span>` : ''}
          ${e.notaJulia!=null ? `<span class="m-rate-chip j">J ${formatNum(e.notaJulia)}</span>` : ''}
        </div>
      </div>
      </div>
      ${genresHtml ? `<div class="mc-genres">${genresHtml}</div>` : ''}
    `;
    card.addEventListener('click', ()=> openDiarioModal(e));
    diarioGrid.appendChild(card);
    const posterEl = card.querySelector('.m-poster');
    if(e.poster){
      posterEl.innerHTML = `<img class="m-poster-img" src="${e.poster}" alt="${escapeHtml(e.title)}" loading="lazy">`;
    } else {
      lazyLoadPoster(posterEl, {id:e.id, t:e.title, y:''}, 'm-poster-img');
    }
  });

  diarioEmpty.style.display = sorted.length===0 ? 'block' : 'none';
}

const diarioViewToggle = document.getElementById('diarioViewToggle');
function updateDiarioViewToggle(){
  [...diarioViewToggle.children].forEach(btn=>{
    btn.classList.toggle('active', btn.dataset.view === diarioView);
  });
}
diarioViewToggle.addEventListener('click', (ev)=>{
  const btn = ev.target.closest('.view-toggle-btn');
  if(!btn) return;
  playClick();
  diarioView = btn.dataset.view;
  localStorage.setItem(DIARIO_VIEW_KEY, diarioView);
  updateDiarioViewToggle();
  renderDiario();
});
updateDiarioViewToggle();

function updateDiarioStats(){
  document.getElementById('dTotal').textContent = diario.length;
  const pRatings = diario.map(e=>e.notaPaulo).filter(n=>n!=null);
  const jRatings = diario.map(e=>e.notaJulia).filter(n=>n!=null);
  const avgP = pRatings.length ? pRatings.reduce((a,b)=>a+b,0)/pRatings.length : null;
  const avgJ = jRatings.length ? jRatings.reduce((a,b)=>a+b,0)/jRatings.length : null;
  document.getElementById('dAvgPaulo').textContent = formatNum(avgP);
  document.getElementById('dAvgJulia').textContent = formatNum(avgJ);
}

document.querySelectorAll('#diarioSortRow .toggle-chip').forEach(chip=>{
  chip.addEventListener('click', ()=>{
    document.querySelectorAll('#diarioSortRow .toggle-chip').forEach(c=>c.classList.remove('active'));
    chip.classList.add('active');
    activeDiarioSort = chip.dataset.sort;
    renderDiario();
  });
});
diarioSearch.addEventListener('input', renderDiario);

const diarioGenreFilter = createGenreDropdown(document.getElementById('diarioGenreFilterRow'), {
  allLabel: 'Todos os gêneros',
  onSelect: ()=> renderDiario()
});

/* =====================================================
   Modal de adicionar/editar filme do Diário
===================================================== */
const diarioModalOverlay = document.getElementById('diarioModalOverlay');
const diarioModalEyebrow = document.getElementById('diarioModalEyebrow');
const diarioTitleInput = document.getElementById('diarioTitleInput');
const whereCinemaChip = document.getElementById('whereCinema');
const whereCasaChip = document.getElementById('whereCasa');
const diarioRatePaulo = document.getElementById('diarioRatePaulo');
const diarioRateJulia = document.getElementById('diarioRateJulia');
const diarioObsInput = document.getElementById('diarioObsInput');
const diarioModalSave = document.getElementById('diarioModalSave');
const diarioModalRemove = document.getElementById('diarioModalRemove');
const diarioModalClose = document.getElementById('diarioModalClose');
const addMovieBtn = document.getElementById('addMovieBtn');
const diarioPosterPreview = document.getElementById('diarioPosterPreview');
const diarioPosterFile = document.getElementById('diarioPosterFile');
const diarioPosterClear = document.getElementById('diarioPosterClear');

let diarioEditId = null;
let selectedWhere = null;
let convertingWatchlistId = null; // id do item da watchlist sendo convertido pro Diário, se houver
let currentDiarioOscarId = null; // id do filme do Oscar (0-97) sendo avaliado, se houver

// Redimensiona e comprime a imagem escolhida antes de guardar (evita
// estourar o limite de tamanho de documento do Firestore).
function readAndCompressImage(file){
  return new Promise((resolve, reject)=>{
    const reader = new FileReader();
    reader.onerror = () => reject(reader.error);
    reader.onload = () => {
      const img = new Image();
      img.onerror = reject;
      img.onload = () => {
        const maxDim = 640;
        let { width, height } = img;
        if(width > height && width > maxDim){ height = Math.round(height * maxDim/width); width = maxDim; }
        else if(height >= width && height > maxDim){ width = Math.round(width * maxDim/height); height = maxDim; }
        const canvas = document.createElement('canvas');
        canvas.width = width; canvas.height = height;
        canvas.getContext('2d').drawImage(img, 0, 0, width, height);
        resolve(canvas.toDataURL('image/jpeg', 0.75));
      };
      img.src = reader.result;
    };
    reader.readAsDataURL(file);
  });
}

// Fábrica reutilizável de "escolher/trocar capa" (usada no Diário e na watchlist)
function setupPosterPicker(previewEl, fileInputEl, clearBtnEl){
  const state = { pending: undefined };
  function render(entry){
    previewEl.innerHTML = '<div class="skeleton-poster"></div>';
    if(entry && entry.poster){
      previewEl.innerHTML = `<img src="${entry.poster}" alt="">`;
      clearBtnEl.style.display = 'block';
    } else if(entry){
      clearBtnEl.style.display = 'none';
      lazyLoadPoster(previewEl, {id:entry.id, t:entry.title, y:entry.y || ''}, '');
    } else {
      previewEl.innerHTML = posterPlaceholderHTML;
      clearBtnEl.style.display = 'none';
    }
  }
  fileInputEl.addEventListener('change', async ()=>{
    const file = fileInputEl.files && fileInputEl.files[0];
    if(!file) return;
    try{
      const dataUrl = await readAndCompressImage(file);
      state.pending = dataUrl;
      previewEl.innerHTML = `<img src="${dataUrl}" alt="">`;
      clearBtnEl.style.display = 'block';
    }catch(err){
      console.warn('Falha ao processar imagem:', err);
    }
    fileInputEl.value = '';
  });
  clearBtnEl.addEventListener('click', ()=>{
    state.pending = null;
    previewEl.innerHTML = posterPlaceholderHTML;
    clearBtnEl.style.display = 'none';
  });
  return { render, state };
}
const diarioPoster = setupPosterPicker(diarioPosterPreview, diarioPosterFile, diarioPosterClear);

function updateWhereChips(){
  whereCinemaChip.classList.toggle('active', selectedWhere === 'Cinema');
  whereCasaChip.classList.toggle('active', selectedWhere === 'Casa');
}
whereCinemaChip.addEventListener('click', ()=>{ selectedWhere = selectedWhere === 'Cinema' ? null : 'Cinema'; updateWhereChips(); });
whereCasaChip.addEventListener('click', ()=>{ selectedWhere = selectedWhere === 'Casa' ? null : 'Casa'; updateWhereChips(); });

const diarioGenrePicker = createGenreMultiPicker(document.getElementById('diarioGenreRow'), {
  emptyLabel: 'Sem categoria'
});

function openDiarioModal(entry, prefill){
  diarioEditId = entry ? entry.id : null;
  currentDiarioOscarId = entry ? (entry.oscarId ?? null) : ((prefill && prefill.oscarId != null) ? prefill.oscarId : null);
  diarioModalEyebrow.textContent = entry ? 'Editar filme' : 'Novo filme';
  diarioTitleInput.value = entry ? entry.title : ((prefill && prefill.title) || '');
  selectedWhere = entry ? entry.where : null;
  updateWhereChips();
  diarioGenrePicker.setValues(entry ? entryGenres(entry) : ((prefill && prefill.genres) || []));
  diarioRatePaulo.value = (entry && entry.notaPaulo!=null) ? entry.notaPaulo : ((prefill && prefill.notaPaulo!=null) ? prefill.notaPaulo : '');
  diarioRateJulia.value = (entry && entry.notaJulia!=null) ? entry.notaJulia : ((prefill && prefill.notaJulia!=null) ? prefill.notaJulia : '');
  diarioObsInput.value = entry ? (entry.obs || '') : '';
  diarioModalRemove.style.display = entry ? 'block' : 'none';
  diarioModalOverlay.classList.add('open');
  if(entry){
    diarioPoster.state.pending = undefined;
    diarioPoster.render(entry);
  } else if(prefill && prefill.poster){
    diarioPoster.state.pending = prefill.poster;
    diarioPoster.render({ poster: prefill.poster });
  } else if(prefill && prefill.oscarId != null){
    // Sem capa própria ainda: tenta reaproveitar a capa já buscada pela
    // roleta pra esse mesmo filme (mesmo id no cache da Wikipédia).
    diarioPoster.state.pending = undefined;
    diarioPoster.render({ id: prefill.oscarId, title: prefill.title, y: prefill.y || '' });
  } else {
    diarioPoster.state.pending = undefined;
    diarioPoster.render(null);
  }
  setTimeout(()=> diarioTitleInput.focus(), 150);
}
function closeDiarioModal(){
  diarioModalOverlay.classList.remove('open');
  diarioEditId = null;
  convertingWatchlistId = null;
  currentDiarioOscarId = null;
}

addMovieBtn.addEventListener('click', ()=>{ playClick(); openDiarioModal(null); });

diarioModalSave.addEventListener('click', ()=>{
  const title = diarioTitleInput.value.trim();
  if(!title){ diarioTitleInput.focus(); return; }
  playClick();
  const p = clampRating(diarioRatePaulo.value);
  const j = clampRating(diarioRateJulia.value);
  const obs = diarioObsInput.value.trim();
  const genres = diarioGenrePicker.getValues();
  const wasNewEntry = !diarioEditId;

  let entryId = diarioEditId;
  let addedAt = Date.now();
  const pendingPoster = diarioPoster.state.pending;
  let poster = pendingPoster !== undefined ? pendingPoster : null;
  if(entryId){
    const entry = diario.find(e => e.id === entryId);
    addedAt = entry ? entry.addedAt : Date.now();
    if(pendingPoster === undefined) poster = entry ? (entry.poster || null) : null;
    if(entry && entry.title !== title){
      delete wikiCache[entry.id];
      saveWikiCache();
    }
    entry.title = title;
    entry.where = selectedWhere;
    entry.notaPaulo = p;
    entry.notaJulia = j;
    entry.obs = obs;
    entry.poster = poster;
    entry.genres = genres;
    entry.oscarId = currentDiarioOscarId;
  } else {
    entryId = 'd'+Date.now();
    diario.push({ id:entryId, title, where:selectedWhere, notaPaulo:p, notaJulia:j, obs, addedAt, poster, genres, oscarId:currentDiarioOscarId });
  }
  saveDiarioLocal();

  if(wasNewEntry){
    burstConfetti(diarioModalSave);
    flareBurst(diarioModalSave);
    playChime();
    if(navigator.vibrate) navigator.vibrate([30,40,70]);
  }

  const finishedConvertingId = convertingWatchlistId;
  const linkedOscarId = currentDiarioOscarId;
  closeDiarioModal();
  renderDiario();
  updateDiarioStats();

  if(cloudEnabled){
    setDoc(doc(diarioColRef, entryId), { title, where:selectedWhere, notaPaulo:p, notaJulia:j, obs, addedAt, poster, genres, oscarId:linkedOscarId })
      .catch(err => logCloudError('Falha ao sincronizar filme do diário', err));
  }

  if(finishedConvertingId){
    removeWatchlistEntry(finishedConvertingId);
  }

  // Filme do Oscar avaliado por aqui: mantém a Roleta em sincronia
  // (progresso, lista de assistidos, "só pendentes").
  if(linkedOscarId != null){
    data[linkedOscarId] = { watched:true, paulo:p, julia:j };
    saveData(linkedOscarId);
    renderGrid();
    updateProgress();
    if(currentPick && currentPick.id === linkedOscarId){
      showResult(MOVIES.findIndex(m => m.id === linkedOscarId), {withMedia:false});
    }
  }
});

diarioModalRemove.addEventListener('click', ()=>{
  if(!diarioEditId) return;
  const removedId = diarioEditId;
  const removedEntry = diario.find(e => e.id === removedId);
  const removedOscarId = removedEntry ? (removedEntry.oscarId ?? null) : null;
  diario = diario.filter(e => e.id !== removedId);
  delete wikiCache[removedId];
  saveWikiCache();
  saveDiarioLocal();
  closeDiarioModal();
  renderDiario();
  updateDiarioStats();

  if(cloudEnabled){
    deleteDoc(doc(diarioColRef, removedId)).catch(err => logCloudError('Falha ao remover filme no servidor', err));
  }

  if(removedOscarId != null){
    delete data[removedOscarId];
    saveData(removedOscarId);
    renderGrid();
    updateProgress();
    if(currentPick && currentPick.id === removedOscarId){
      showResult(MOVIES.findIndex(m => m.id === removedOscarId), {withMedia:false});
    }
  }
});

diarioModalClose.addEventListener('click', closeDiarioModal);
diarioModalOverlay.addEventListener('click', (e)=>{ if(e.target === diarioModalOverlay) closeDiarioModal(); });

/* =====================================================
   QUERO VER — filmes indicados que ainda não assistiram
===================================================== */
const WATCHLIST_STORAGE_KEY = 'cinema-pj-watchlist';

function loadWatchlist(){
  try{
    const raw = localStorage.getItem(WATCHLIST_STORAGE_KEY);
    if(raw) return JSON.parse(raw);
  }catch(e){}
  return [];
}
function saveWatchlistLocal(){
  localStorage.setItem(WATCHLIST_STORAGE_KEY, JSON.stringify(watchlist));
}
let watchlist = loadWatchlist();

const watchlistGrid = document.getElementById('watchlistGrid');
const watchlistEmpty = document.getElementById('watchlistEmpty');
const watchlistSearch = document.getElementById('watchlistSearch');
const addWatchlistBtn = document.getElementById('addWatchlistBtn');
const watchlistModalOverlay = document.getElementById('watchlistModalOverlay');
const watchlistModalEyebrow = document.getElementById('watchlistModalEyebrow');
const watchlistTitleInput = document.getElementById('watchlistTitleInput');
const watchlistDescInput = document.getElementById('watchlistDescInput');
const watchlistModalSave = document.getElementById('watchlistModalSave');
const watchlistModalRemove = document.getElementById('watchlistModalRemove');
const watchlistModalClose = document.getElementById('watchlistModalClose');
const watchlistMarkWatched = document.getElementById('watchlistMarkWatched');
const watchlistPosterPreview = document.getElementById('watchlistPosterPreview');
const watchlistPosterFile = document.getElementById('watchlistPosterFile');
const watchlistPosterClear = document.getElementById('watchlistPosterClear');
const watchlistPoster = setupPosterPicker(watchlistPosterPreview, watchlistPosterFile, watchlistPosterClear);
const watchlistGenreRow = document.getElementById('watchlistGenreRow');
const watchlistGenreFilterRow = document.getElementById('watchlistGenreFilterRow');

let watchlistEditId = null;

// Seletor de categoria dentro do modal (múltipla escolha, opcional)
const watchlistGenrePicker = createGenreMultiPicker(watchlistGenreRow, {
  emptyLabel: 'Sem categoria'
});

// Dropdown de filtro por categoria na lista ("mood do dia")
const watchlistGenreFilter = createGenreDropdown(watchlistGenreFilterRow, {
  allLabel: 'Todos os gêneros',
  onSelect: ()=> renderWatchlist()
});

function renderWatchlist(){
  const q = watchlistSearch.value.trim().toLowerCase();
  const filtered = watchlist
    .filter(e => !q || e.title.toLowerCase().includes(q))
    .filter(e => { const g = watchlistGenreFilter.getValue(); return !g || entryGenres(e).includes(g); })
    .sort((a,b) => b.addedAt - a.addedAt);
  watchlistGrid.innerHTML = '';

  filtered.forEach(e=>{
    const genresHtml = genreChipsHtml(entryGenres(e));
    const color = primaryGenreColor(e);
    const card = document.createElement('div');
    card.className = 'movie-card';
    if(color) card.style.borderLeftColor = color;
    card.innerHTML = `
      <div class="m-poster">${e.poster ? '' : '<div class="skeleton-poster"></div>'}</div>
      <div class="m-info">
        <div class="m-title">${escapeHtml(e.title)}</div>
        ${genresHtml ? `<div class="m-genres-inline">${genresHtml}</div>` : ''}
      </div>
    `;
    card.addEventListener('click', ()=> openWatchlistModal(e));
    watchlistGrid.appendChild(card);
    const posterEl = card.querySelector('.m-poster');
    if(e.poster){
      posterEl.innerHTML = `<img class="m-poster-img" src="${e.poster}" alt="${escapeHtml(e.title)}" loading="lazy">`;
    } else {
      lazyLoadPoster(posterEl, {id:e.id, t:e.title, y:''}, 'm-poster-img');
    }
  });

  watchlistEmpty.style.display = filtered.length===0 ? 'block' : 'none';
  if(typeof rouletteMode !== 'undefined' && rouletteMode === 'watchlist'){ renderWatchlistRoulette(); }
}
function updateWatchlistStats(){
  document.getElementById('wTotal').textContent = watchlist.length;
}

function openWatchlistModal(entry){
  watchlistEditId = entry ? entry.id : null;
  watchlistModalEyebrow.textContent = entry ? 'Editar item' : 'Novo filme pra ver';
  watchlistTitleInput.value = entry ? entry.title : '';
  watchlistDescInput.value = entry ? (entry.description || '') : '';
  watchlistGenrePicker.setValues(entry ? entryGenres(entry) : []);
  watchlistModalRemove.style.display = entry ? 'block' : 'none';
  watchlistMarkWatched.style.display = entry ? 'block' : 'none';
  watchlistModalOverlay.classList.add('open');
  watchlistPoster.state.pending = undefined;
  watchlistPoster.render(entry);
  setTimeout(()=> watchlistTitleInput.focus(), 150);
}
function closeWatchlistModal(){
  watchlistModalOverlay.classList.remove('open');
  watchlistEditId = null;
}

addWatchlistBtn.addEventListener('click', ()=>{ playClick(); openWatchlistModal(null); });

watchlistModalSave.addEventListener('click', ()=>{
  const title = watchlistTitleInput.value.trim();
  if(!title){ watchlistTitleInput.focus(); return; }
  playClick();
  const description = watchlistDescInput.value.trim();
  const genres = watchlistGenrePicker.getValues();

  let entryId = watchlistEditId;
  let addedAt = Date.now();
  const pendingPoster = watchlistPoster.state.pending;
  let poster = pendingPoster !== undefined ? pendingPoster : null;
  if(entryId){
    const entry = watchlist.find(e => e.id === entryId);
    addedAt = entry ? entry.addedAt : Date.now();
    if(pendingPoster === undefined) poster = entry ? (entry.poster || null) : null;
    if(entry && entry.title !== title){
      delete wikiCache[entry.id];
      saveWikiCache();
    }
    entry.title = title;
    entry.description = description;
    entry.poster = poster;
    entry.genres = genres;
  } else {
    entryId = 'w'+Date.now();
    watchlist.push({ id:entryId, title, description, addedAt, poster, genres });
  }
  saveWatchlistLocal();
  closeWatchlistModal();
  renderWatchlist();
  updateWatchlistStats();

  if(cloudEnabled){
    setDoc(doc(watchlistColRef, entryId), { title, description, addedAt, poster, genres })
      .catch(err => logCloudError('Falha ao sincronizar item da watchlist', err));
  }
});

function removeWatchlistEntry(id){
  watchlist = watchlist.filter(e => e.id !== id);
  delete wikiCache[id];
  saveWikiCache();
  saveWatchlistLocal();
  renderWatchlist();
  updateWatchlistStats();
  if(cloudEnabled){
    deleteDoc(doc(watchlistColRef, id)).catch(err => logCloudError('Falha ao remover item no servidor', err));
  }
}

watchlistModalRemove.addEventListener('click', ()=>{
  if(!watchlistEditId) return;
  removeWatchlistEntry(watchlistEditId);
  closeWatchlistModal();
});

watchlistMarkWatched.addEventListener('click', ()=>{
  if(!watchlistEditId) return;
  const entry = watchlist.find(e => e.id === watchlistEditId);
  if(!entry) return;
  playClick();
  convertingWatchlistId = entry.id;
  closeWatchlistModal();
  openDiarioModal(null, { title: entry.title, poster: entry.poster, genres: entryGenres(entry) });
});

watchlistModalClose.addEventListener('click', closeWatchlistModal);
watchlistModalOverlay.addEventListener('click', (e)=>{ if(e.target === watchlistModalOverlay) closeWatchlistModal(); });
watchlistSearch.addEventListener('input', renderWatchlist);

document.addEventListener('keydown', (e)=>{
  if(e.key !== 'Escape') return;
  if(diarioModalOverlay.classList.contains('open')) closeDiarioModal();
  if(watchlistModalOverlay.classList.contains('open')) closeWatchlistModal();
});

/* =====================================================
   ROLETA — alternância entre modo Oscar e modo "Nossa lista"
===================================================== */
const rouletteModeBtns = document.querySelectorAll('#rouletteModeSwitch .mode-btn');
const oscarRouletteMode = document.getElementById('oscarRouletteMode');
const watchlistRouletteMode = document.getElementById('watchlistRouletteMode');
let rouletteMode = 'oscar';

function setRouletteMode(mode){
  rouletteMode = mode;
  rouletteModeBtns.forEach(b => b.classList.toggle('active', b.dataset.mode === mode));
  oscarRouletteMode.hidden = mode !== 'oscar';
  watchlistRouletteMode.hidden = mode !== 'watchlist';
  if(mode === 'watchlist'){
    renderWatchlistRoulette();
  } else {
    requestAnimationFrame(()=> drawWheel());
  }
}
rouletteModeBtns.forEach(b => b.addEventListener('click', ()=>{ playClick(); setRouletteMode(b.dataset.mode); }));
setRouletteMode('oscar');

/* =====================================================
   ROLETA "NOSSA LISTA" — sorteia entre itens da watchlist,
   filtrando por um ou mais gêneros escolhidos na hora.
===================================================== */
const wrGenreChipsEl = document.getElementById('wrGenreChips');
const wrPoolHint = document.getElementById('wrPoolHint');
const wrHasItems = document.getElementById('wrHasItems');
const wrEmptyState = document.getElementById('wrEmptyState');
const wrWheelCanvas = document.getElementById('wrWheelCanvas');
const wrWheelCtx = wrWheelCanvas.getContext('2d');
const wrWheelWrap = document.getElementById('wrWheelWrap');
const wrWheelHalo = document.getElementById('wrWheelHalo');
const wrSpinBtn = document.getElementById('wrSpinBtn');
const wrResultCard = document.getElementById('wrResultCard');
const wrGenreTag = document.getElementById('wrGenreTag');
const wrTitle = document.getElementById('wrTitle');
const wrMedia = document.getElementById('wrMedia');
const wrActions = document.getElementById('wrActions');
const wrMarkWatched = document.getElementById('wrMarkWatched');
const wrSpinAgain = document.getElementById('wrSpinAgain');
const wrHub = watchlistRouletteMode.querySelector('.hub');

let wrSelectedGenres = new Set();
let wrPool = [];
let wrCurrentRotation = 0;
let wrSpinning = false;
let wrCurrentPick = null;

MOVIE_GENRES.forEach(g=>{
  const chip = document.createElement('div');
  chip.className = 'toggle-chip';
  chip.textContent = g.emoji + ' ' + g.label;
  chip.dataset.genre = g.id;
  chip.addEventListener('click', ()=>{
    if(wrSelectedGenres.has(g.id)) wrSelectedGenres.delete(g.id);
    else wrSelectedGenres.add(g.id);
    chip.classList.toggle('active');
    if(chip.classList.contains('active')){
      chip.style.background = g.color + '29';
      chip.style.borderColor = g.color;
      chip.style.color = g.color;
    } else {
      chip.style.background = '';
      chip.style.borderColor = '';
      chip.style.color = '';
    }
    renderWatchlistRoulette();
  });
  wrGenreChipsEl.appendChild(chip);
});

function getWatchlistPool(){
  if(wrSelectedGenres.size === 0) return watchlist.slice();
  return watchlist.filter(e => entryGenres(e).some(g => wrSelectedGenres.has(g)));
}

function renderWatchlistRoulette(){
  wrPool = getWatchlistPool();
  const total = watchlist.length;
  if(wrSelectedGenres.size === 0){
    wrPoolHint.textContent = total ? `${total} filme${total===1?'':'s'} na roleta` : '';
  } else {
    wrPoolHint.textContent = `${wrPool.length} filme${wrPool.length===1?'':'s'} com essas categorias`;
  }
  const hasItems = wrPool.length > 0;
  wrHasItems.hidden = !hasItems;
  wrEmptyState.style.display = hasItems ? 'none' : 'block';
  if(hasItems) drawWatchlistWheel();
}

const WR_NEUTRAL_A = '#4c1d95';
const WR_NEUTRAL_B = '#831859';

function drawWatchlistWheel(){
  const size = wrWheelWrap.clientWidth || 340;
  if(!size) return;
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  wrWheelCanvas.width = size*dpr;
  wrWheelCanvas.height = size*dpr;
  wrWheelCanvas.style.width = size+'px';
  wrWheelCanvas.style.height = size+'px';
  wrWheelCtx.setTransform(dpr,0,0,dpr,0,0);
  const r = size/2;
  wrWheelCtx.clearRect(0,0,size,size);

  const n = wrPool.length || 1;
  const angle = (Math.PI*2)/n;
  for(let i=0;i<n;i++){
    const start = -Math.PI/2 + i*angle;
    const end = start + angle;
    const item = wrPool[i];
    const itemGenres = item ? entryGenres(item) : [];
    const g = itemGenres.length ? genreById(itemGenres[0]) : null;
    wrWheelCtx.beginPath();
    wrWheelCtx.moveTo(r,r);
    wrWheelCtx.arc(r,r,r,start,end);
    wrWheelCtx.closePath();
    wrWheelCtx.fillStyle = g ? g.color : (i%2===0 ? WR_NEUTRAL_A : WR_NEUTRAL_B);
    wrWheelCtx.globalAlpha = g ? 0.82 : 1;
    wrWheelCtx.fill();
    wrWheelCtx.globalAlpha = 1;
    wrWheelCtx.strokeStyle = 'rgba(255,255,255,0.25)';
    wrWheelCtx.lineWidth = 1;
    wrWheelCtx.stroke();
  }

  wrWheelCtx.beginPath();
  wrWheelCtx.arc(r,r,r-1,0,Math.PI*2);
  wrWheelCtx.strokeStyle = 'rgba(255,204,77,0.55)';
  wrWheelCtx.lineWidth = 2;
  wrWheelCtx.stroke();
}
window.addEventListener('resize', ()=>{ if(rouletteMode === 'watchlist' && wrPool.length) drawWatchlistWheel(); });

function spinWatchlistWheel(){
  if(wrSpinning || wrPool.length === 0) return;
  wrSpinning = true;
  wrSpinBtn.disabled = true;
  wrResultCard.classList.remove('show');
  wrWheelHalo.classList.add('spinning');
  scheduleTicks(4600);

  const targetIndex = Math.floor(Math.random()*wrPool.length);
  const n = wrPool.length;
  const angle = (Math.PI*2)/n;
  const segCenterDeg = (targetIndex*angle + angle/2) * (180/Math.PI);
  const targetMod = ((360 - segCenterDeg) % 360 + 360) % 360;
  const extraSpins = 7 + Math.floor(Math.random()*3);
  const curMod = ((wrCurrentRotation % 360) + 360) % 360;
  const delta = ((targetMod - curMod) + 360) % 360;
  wrCurrentRotation = wrCurrentRotation + extraSpins*360 + delta;
  wrWheelWrap.style.transform = `rotate(${wrCurrentRotation}deg)`;

  const onEnd = ()=>{
    wrWheelWrap.removeEventListener('transitionend', onEnd);
    wrSpinning = false;
    wrSpinBtn.disabled = false;
    wrWheelHalo.classList.remove('spinning');
    showWatchlistResult(wrPool[targetIndex]);
    burstConfetti(wrHub);
    flareBurst(wrHub);
    playChime();
    if(navigator.vibrate) navigator.vibrate([30,40,70]);
  };
  wrWheelWrap.addEventListener('transitionend', onEnd);
}

function showWatchlistResult(item){
  wrCurrentPick = item;
  const genresHtml = genreChipsHtml(entryGenres(item));
  wrGenreTag.innerHTML = genresHtml || '<span class="m-genre-chip" style="background:rgba(255,255,255,.08); color:var(--muted);">Sem categoria</span>';
  wrTitle.textContent = item.title;
  wrActions.style.display = 'flex';

  const posterHtml = item.poster
    ? `<div class="r-poster-wrap"><img class="r-poster" src="${item.poster}" alt="${escapeHtml(item.title)}"></div>`
    : `<div class="r-poster-wrap">${posterPlaceholderHTML}</div>`;
  const descHtml = item.description
    ? `<p>${escapeHtml(item.description)}</p>`
    : `<p class="r-no-info">Sem descrição guardada pra esse aqui.</p>`;
  wrMedia.innerHTML = `${posterHtml}<div class="r-synopsis">${descHtml}</div>`;

  requestAnimationFrame(()=> wrResultCard.classList.add('show'));
}

wrSpinBtn.addEventListener('click', spinWatchlistWheel);
wrSpinAgain.addEventListener('click', ()=>{ playClick(); spinWatchlistWheel(); });
wrMarkWatched.addEventListener('click', ()=>{
  if(!wrCurrentPick) return;
  playClick();
  convertingWatchlistId = wrCurrentPick.id;
  openDiarioModal(null, { title: wrCurrentPick.title, poster: wrCurrentPick.poster, genres: entryGenres(wrCurrentPick) });
});

/* =====================================================
   NÓS — perfil do casal (estatísticas derivadas do Diário)
===================================================== */
function computeProfileStats(){
  const total = diario.length;

  const allRatings = [];
  diario.forEach(e=>{
    if(e.notaPaulo!=null) allRatings.push(e.notaPaulo);
    if(e.notaJulia!=null) allRatings.push(e.notaJulia);
  });
  const avgCasal = allRatings.length ? allRatings.reduce((a,b)=>a+b,0)/allRatings.length : null;

  const genreCounts = {};
  diario.forEach(e=>{ entryGenres(e).forEach(gid=>{ genreCounts[gid] = (genreCounts[gid]||0) + 1; }); });
  const genreRanking = Object.entries(genreCounts)
    .map(([id,count]) => ({ genre:genreById(id), count }))
    .filter(g => g.genre)
    .sort((a,b) => b.count - a.count);

  const pRatings = diario.map(e=>e.notaPaulo).filter(n=>n!=null);
  const jRatings = diario.map(e=>e.notaJulia).filter(n=>n!=null);
  const avgP = pRatings.length ? pRatings.reduce((a,b)=>a+b,0)/pRatings.length : null;
  const avgJ = jRatings.length ? jRatings.reduce((a,b)=>a+b,0)/jRatings.length : null;
  let critico = '—';
  if(avgP!=null && avgJ!=null){
    if(Math.abs(avgP - avgJ) < 0.05) critico = 'Empate';
    else critico = avgP < avgJ ? 'Paulo' : 'Julia';
  }

  const top5 = diario
    .map(e => ({ e, media: computeMedia(e) }))
    .filter(x => x.media != null)
    .sort((a,b) => b.media - a.media)
    .slice(0,5);

  const clashes = diario
    .filter(e => e.notaPaulo!=null && e.notaJulia!=null)
    .map(e => ({ e, gap: Math.abs(e.notaPaulo - e.notaJulia) }))
    .filter(x => x.gap > 0)
    .sort((a,b) => b.gap - a.gap)
    .slice(0,3);

  return { total, avgCasal, genreRanking, critico, top5, clashes };
}

// Sobe um número de 0 até o valor final, de forma suave.
function animateNumberTo(el, target){
  const start = 0;
  const duration = 700;
  const startTime = performance.now();
  function step(now){
    const t = Math.min(1, (now - startTime) / duration);
    const eased = 1 - Math.pow(1 - t, 3);
    el.textContent = Math.round(start + (target - start) * eased);
    if(t < 1) requestAnimationFrame(step);
  }
  requestAnimationFrame(step);
}

function renderProfile(){
  const stats = computeProfileStats();

  animateNumberTo(document.getElementById('pTotal'), stats.total);
  document.getElementById('pAvg').textContent = formatNum(stats.avgCasal);
  const topGenre = stats.genreRanking[0];
  document.getElementById('pTopGenre').textContent = topGenre ? (topGenre.genre.emoji + ' ' + topGenre.genre.label) : '—';
  document.getElementById('pCritico').textContent = stats.critico;

  const topList = document.getElementById('profileTopList');
  topList.innerHTML = '';
  if(!stats.top5.length){
    topList.innerHTML = '<div class="profile-empty">Avaliem alguns filmes no Diário pra ver o ranking aqui.</div>';
  } else {
    stats.top5.forEach((x,i)=>{
      const row = document.createElement('div');
      row.className = 'profile-rank-row';
      row.style.animationDelay = (i*0.06)+'s';
      row.innerHTML = `
        <div class="rank-num rank-${i+1}">${i+1}</div>
        <div class="m-poster">${x.e.poster ? '' : '<div class="skeleton-poster"></div>'}</div>
        <div class="m-info"><div class="m-title">${escapeHtml(x.e.title)}</div></div>
        <div class="m-ratings">
          <span class="m-media-badge">${formatNum(x.media)}</span>
          <div class="m-rate-sub">
            ${x.e.notaPaulo!=null ? `<span class="m-rate-chip p">P ${formatNum(x.e.notaPaulo)}</span>` : ''}
            ${x.e.notaJulia!=null ? `<span class="m-rate-chip j">J ${formatNum(x.e.notaJulia)}</span>` : ''}
          </div>
        </div>
      `;
      topList.appendChild(row);
      const posterEl = row.querySelector('.m-poster');
      if(x.e.poster){
        posterEl.innerHTML = `<img class="m-poster-img" src="${x.e.poster}" alt="${escapeHtml(x.e.title)}" loading="lazy">`;
      } else {
        lazyLoadPoster(posterEl, {id:x.e.id, t:x.e.title, y:''}, 'm-poster-img');
      }
    });
  }

  const clashList = document.getElementById('profileClashList');
  clashList.innerHTML = '';
  if(!stats.clashes.length){
    clashList.innerHTML = '<div class="profile-empty">Ainda não tem filme com nota dos dois pra comparar.</div>';
  } else {
    stats.clashes.forEach((x,i)=>{
      const row = document.createElement('div');
      row.className = 'profile-clash-row';
      row.style.animationDelay = (i*0.06)+'s';
      row.innerHTML = `
        <div class="m-poster">${x.e.poster ? '' : '<div class="skeleton-poster"></div>'}</div>
        <div class="m-info">
          <div class="m-title">${escapeHtml(x.e.title)}</div>
          <div class="clash-ratings">P ${formatNum(x.e.notaPaulo)} · J ${formatNum(x.e.notaJulia)}</div>
        </div>
        <div class="clash-gap">${formatNum(x.gap)}</div>
      `;
      clashList.appendChild(row);
      const posterEl = row.querySelector('.m-poster');
      if(x.e.poster){
        posterEl.innerHTML = `<img class="m-poster-img" src="${x.e.poster}" alt="${escapeHtml(x.e.title)}" loading="lazy">`;
      } else {
        lazyLoadPoster(posterEl, {id:x.e.id, t:x.e.title, y:''}, 'm-poster-img');
      }
    });
  }

  const genreBars = document.getElementById('profileGenreBars');
  genreBars.innerHTML = '';
  if(!stats.genreRanking.length){
    genreBars.innerHTML = '<div class="profile-empty">Marquem a categoria dos filmes no Diário pra ver a distribuição aqui.</div>';
  } else {
    const max = stats.genreRanking[0].count;
    stats.genreRanking.forEach((g,i)=>{
      const row = document.createElement('div');
      row.className = 'genre-bar-row';
      row.style.animationDelay = (i*0.04)+'s';
      row.innerHTML = `
        <div class="genre-bar-label">${g.genre.emoji} ${escapeHtml(g.genre.label)}</div>
        <div class="genre-bar-track"><div class="genre-bar-fill" style="width:0%; background:${g.genre.color};"></div></div>
        <div class="genre-bar-count">${g.count}</div>
      `;
      genreBars.appendChild(row);
      const fill = row.querySelector('.genre-bar-fill');
      requestAnimationFrame(()=>{ fill.style.width = (g.count / max * 100) + '%'; });
    });
  }
}

/* =====================================================
   Troca de abas
===================================================== */
const tabBtns = document.querySelectorAll('.tab-btn');
const panels = {
  diario: document.getElementById('panel-diario'),
  watchlist: document.getElementById('panel-watchlist'),
  roleta: document.getElementById('panel-roleta'),
  perfil: document.getElementById('panel-perfil')
};
const ACTIVE_TAB_KEY = 'oscar-roleta-active-tab';
let activeTab = localStorage.getItem(ACTIVE_TAB_KEY) || 'diario';

function setActiveTab(tab){
  activeTab = tab;
  tabBtns.forEach(b => b.classList.toggle('active', b.dataset.tab === tab));
  Object.entries(panels).forEach(([name, el]) => { el.hidden = name !== tab; });
  localStorage.setItem(ACTIVE_TAB_KEY, tab);
  if(tab !== 'roleta'){ fabSpin.classList.remove('visible'); }
  else { requestAnimationFrame(()=> drawWheel()); }
  if(tab === 'perfil'){ renderProfile(); }
}
tabBtns.forEach(b => b.addEventListener('click', ()=>{ playClick(); setActiveTab(b.dataset.tab); }));

const soundToggle = document.getElementById('soundToggle');
function updateSoundToggle(){ soundToggle.textContent = soundOn ? '🔊' : '🔇'; }
updateSoundToggle();
soundToggle.addEventListener('click', ()=>{
  soundOn = !soundOn;
  localStorage.setItem(SOUND_KEY, soundOn ? 'on' : 'off');
  updateSoundToggle();
  if(soundOn) playClick();
});
setActiveTab(activeTab);

/* =====================================================
   Sincronização em nuvem (Firestore)
   Faz login anônimo, semeia o banco na primeira vez que
   alguém abrir o app, e escuta mudanças em tempo real.
   Se qualquer etapa falhar, o app segue 100% no localStorage.
===================================================== */
const cloudStatusEl = document.getElementById('cloudStatus');

function setCloudStatus(text, cls){
  cloudStatusEl.textContent = text;
  cloudStatusEl.classList.remove('cloud-on', 'cloud-off');
  if(cls) cloudStatusEl.classList.add(cls);
}

// Avisa visualmente quando uma gravação na nuvem falha (ex: regra do
// Firestore bloqueando), pra não passar batido sem abrir o console.
let cloudToastTimer = null;
function showCloudError(msg){
  let el = document.getElementById('cloudToast');
  if(!el){
    el = document.createElement('div');
    el.id = 'cloudToast';
    el.className = 'cloud-toast';
    document.body.appendChild(el);
  }
  el.textContent = '⚠️ ' + msg;
  el.classList.add('show');
  clearTimeout(cloudToastTimer);
  cloudToastTimer = setTimeout(()=> el.classList.remove('show'), 5000);
}
function logCloudError(action, err){
  console.warn(action, err);
  showCloudError('Não sincronizou com a nuvem (' + action.replace(/^Falha ao /, '') + '). Só salvou neste aparelho por enquanto.');
}

async function initCloudSync(){
  try{
    await new Promise((resolve, reject)=>{
      const unsub = onAuthStateChanged(fbAuth, (user)=>{
        if(user){ unsub(); resolve(user); }
      }, reject);
      signInAnonymously(fbAuth).catch(reject);
    });
  }catch(err){
    console.warn('Falha na autenticação com o Firebase, usando modo local.', err);
    cloudEnabled = false;
    setCloudStatus('📴 Modo local (só neste aparelho)', 'cloud-off');
    return;
  }

  // Cada coleção sincroniza de forma independente: se uma falhar (ex: regra
  // do Firestore faltando pra ela), as outras continuam funcionando normal.
  let successCount = 0;

  try{
    const roletaSnap = await getDoc(roletaDocRef);
    if(!roletaSnap.exists()){
      await setDoc(roletaDocRef, { watched: data });
    }
    onSnapshot(roletaDocRef, (snap)=>{
      const remote = snap.data();
      if(!remote) return;
      data = remote.watched || {};
      try{ localStorage.setItem(STORAGE_KEY, JSON.stringify(data)); }catch(e){}
      renderGrid();
      updateProgress();
      if(currentPick){
        const idx = MOVIES.findIndex(m => m.id === currentPick.id);
        if(idx > -1) showResult(idx, {withMedia:false});
      }
    });
    successCount++;
  }catch(err){
    console.warn('Falha ao sincronizar a roleta (seguindo local só pra essa parte):', err);
  }

  try{
    const diarioSnap = await getDocs(diarioColRef);
    if(diarioSnap.empty){
      const batch = writeBatch(db);
      diario.forEach(e=>{
        const { id, ...rest } = e;
        batch.set(doc(diarioColRef, id), rest);
      });
      await batch.commit();
    }
    onSnapshot(diarioColRef, (snap)=>{
      diario = snap.docs.map(d => ({ id:d.id, ...d.data() }));
      try{ localStorage.setItem(DIARIO_STORAGE_KEY, JSON.stringify(diario)); }catch(e){}
      renderDiario();
      updateDiarioStats();
    });
    successCount++;
  }catch(err){
    console.warn('Falha ao sincronizar o diário (seguindo local só pra essa parte):', err);
  }

  try{
    const watchlistSnap = await getDocs(watchlistColRef);
    if(watchlistSnap.empty && watchlist.length){
      const batch = writeBatch(db);
      watchlist.forEach(e=>{
        const { id, ...rest } = e;
        batch.set(doc(watchlistColRef, id), rest);
      });
      await batch.commit();
    }
    onSnapshot(watchlistColRef, (snap)=>{
      watchlist = snap.docs.map(d => ({ id:d.id, ...d.data() }));
      try{ localStorage.setItem(WATCHLIST_STORAGE_KEY, JSON.stringify(watchlist)); }catch(e){}
      renderWatchlist();
      updateWatchlistStats();
    });
    successCount++;
  }catch(err){
    console.warn('Falha ao sincronizar a watchlist (seguindo local só pra essa parte):', err);
  }

  cloudEnabled = successCount > 0;
  if(successCount === 3){
    setCloudStatus('☁️ Sincronizado entre aparelhos', 'cloud-on');
  } else if(successCount > 0){
    setCloudStatus('☁️ Sincronizado parcialmente — veja o console', 'cloud-off');
    showCloudError('Uma parte não sincronizou com a nuvem — confira se as regras do Firestore foram publicadas.');
  } else {
    setCloudStatus('📴 Modo local (só neste aparelho)', 'cloud-off');
  }
}

/* =====================================================
   Inicialização
===================================================== */
renderGrid();
updateProgress();
renderDiario();
updateDiarioStats();
renderWatchlist();
updateWatchlistStats();
initCloudSync();
