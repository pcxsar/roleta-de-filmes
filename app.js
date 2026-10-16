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
const favoritosColRef = collection(db, 'favoritos');
let cloudEnabled = false;
// Abrir com "?offline" na URL desliga a nuvem: útil pra testar mudanças
// sem mexer nos dados de verdade (tudo fica só neste navegador).
const OFFLINE_MODE = new URLSearchParams(location.search).has('offline');

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
/* Aviso com "Desfazer" (remover/mover filme). Some sozinho em 6s;
   só um por vez — um novo substitui o anterior (que fica valendo). */
let undoToastTimer = null;
function showUndoToast(message, onUndo){
  let el = document.getElementById('undoToast');
  if(!el){
    el = document.createElement('div');
    el.id = 'undoToast';
    el.className = 'undo-toast';
    el.setAttribute('role', 'status');
    document.body.appendChild(el);
  }
  el.innerHTML = `
    <span class="undo-msg">${escapeHtml(message)}</span>
    <button type="button" class="undo-btn">${iconHtml('rotate-ccw')} Desfazer</button>
    <span class="undo-progress"></span>`;
  const hide = ()=>{ el.classList.remove('show'); clearTimeout(undoToastTimer); };
  el.querySelector('.undo-btn').addEventListener('click', ()=>{
    hide();
    playClick();
    onUndo();
  }, { once: true });
  clearTimeout(undoToastTimer);
  el.classList.remove('show');
  void el.offsetWidth; // reinicia a barrinha de tempo
  el.classList.add('show');
  undoToastTimer = setTimeout(hide, 6000);
}

// Dados mínimos pra buscar capa/sinopse de um registro do Diário/Watchlist
function lookupOf(e){
  return { id: e.id, t: e.title, y: e.year || '', tmdbId: e.tmdbId || null };
}
function iconHtml(name, cls){
  return `<svg class="icon${cls ? ' '+cls : ''}"><use href="#i-${name}"/></svg>`;
}
const posterPlaceholderHTML = `<div class="r-poster-placeholder">${iconHtml('clapperboard')}</div>`;

/* =====================================================
   Categorias de filme (usadas no Diário e na watchlist)
===================================================== */
const MOVIE_GENRES = [
  {id:'acao', icon:'swords', label:'Ação', color:'#ff3fb0'},
  {id:'aventura', icon:'compass', label:'Aventura', color:'#ff9d4d'},
  {id:'comedia', icon:'laugh', label:'Comédia', color:'#ffe14d'},
  {id:'drama', icon:'drama', label:'Drama', color:'#8b5cf6'},
  {id:'terror', icon:'ghost', label:'Terror', color:'#ff4d4d'},
  {id:'suspense', icon:'eye', label:'Suspense', color:'#a855f7'},
  {id:'ficcao', icon:'rocket', label:'Ficção Científica', color:'#2fe6d1'},
  {id:'fantasia', icon:'wand-2', label:'Fantasia', color:'#5eb8ff'},
  {id:'romance', icon:'heart', label:'Romance', color:'#ff6fa8'},
  {id:'animacao', icon:'palette', label:'Animação', color:'#4dff88'},
  {id:'documentario', icon:'camera', label:'Documentário', color:'#94a3b8'},
  {id:'musical', icon:'music', label:'Musical', color:'#ffcc4d'},
  {id:'biografia', icon:'book-open', label:'Biografia', color:'#b08968'},
  {id:'crime', icon:'fingerprint', label:'Crime', color:'#9f1239'},
  {id:'guerra', icon:'shield', label:'Guerra', color:'#7c8a4a'},
];
function genreById(id){ return MOVIE_GENRES.find(g => g.id === id) || null; }
// Lê os gêneros de um filme já normalizados em array — compatível com
// registros antigos que ainda tinham só "genre" (uma categoria só).
// Normaliza título pra comparação (ignora espaços extras, maiúsculas e acentos)
function normalizeTitle(t){
  return (t || '').trim().toLowerCase().normalize('NFD').replace(/\p{Diacritic}/gu, '');
}

function entryGenres(e){
  if(!e) return [];
  if(Array.isArray(e.genres)) return e.genres.filter(Boolean);
  if(e.genre) return [e.genre];
  return [];
}
function genreChipsHtml(genreIds){
  return genreIds.map(genreById).filter(Boolean).map(g =>
    `<span class="m-genre-chip" style="background:${g.color}26; color:${g.color};">${iconHtml(g.icon)} ${escapeHtml(g.label)}</span>`
  ).join('');
}

// Fábrica de dropdown de categoria (usado como seletor em modais e como
// filtro em listas — funciona igual em qualquer dispositivo, sem
// depender de scroll horizontal por gesto).
function createGenreDropdown(mountEl, opts){
  const { allLabel, onSelect } = opts;
  // Texto do botão quando nada está escolhido (pode ser mais curto que a
  // opção "todos" do menu, pra caber na barra de filtros do celular).
  const buttonLabel = opts.buttonLabel || allLabel;
  mountEl.innerHTML = `
    <div class="genre-dropdown">
      <button type="button" class="genre-dropdown-btn">
        <span class="gd-label">${escapeHtml(buttonLabel)}</span>
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
    opt.innerHTML = `<span class="gd-dot" style="background:${g.color}"></span>${iconHtml(g.icon)} ${escapeHtml(g.label)}`;
    menu.appendChild(opt);
  });
  function setValue(v){
    value = v || null;
    const g = genreById(value);
    labelEl.innerHTML = g ? (iconHtml(g.icon) + ' ' + escapeHtml(g.label)) : (iconHtml('layout-grid') + ' ' + escapeHtml(buttonLabel));
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
    opt.innerHTML = `<span class="gd-dot" style="background:${g.color}"></span>${iconHtml(g.icon)} ${escapeHtml(g.label)}`;
    menu.appendChild(opt);
  });

  function refresh(){
    const genres = values.map(genreById).filter(Boolean);
    if(!genres.length){
      labelEl.textContent = emptyLabel;
      labelEl.style.color = '';
    } else if(genres.length === 1){
      labelEl.innerHTML = iconHtml(genres[0].icon) + ' ' + escapeHtml(genres[0].label);
      labelEl.style.color = genres[0].color;
    } else {
      labelEl.innerHTML = genres.map(g=>iconHtml(g.icon)).join(' ') + ' ' + genres.length + ' categorias';
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

// Dropdown simples de opções (ex: ordenação), com o mesmo visual do de
// categoria — substitui fileiras de chips que ocupavam várias linhas.
function createOptionDropdown(mountEl, opts){
  const { options, icon, onSelect } = opts;
  mountEl.innerHTML = `
    <div class="genre-dropdown">
      <button type="button" class="genre-dropdown-btn">
        <span class="gd-label"></span>
        <span class="gd-arrow">▾</span>
      </button>
      <div class="genre-dropdown-menu"></div>
    </div>`;
  const root = mountEl.querySelector('.genre-dropdown');
  const btn = root.querySelector('.genre-dropdown-btn');
  const labelEl = root.querySelector('.gd-label');
  const menu = root.querySelector('.genre-dropdown-menu');
  let value = opts.value || options[0].id;

  options.forEach(o=>{
    const opt = document.createElement('div');
    opt.className = 'gd-option';
    opt.dataset.value = o.id;
    opt.textContent = o.label;
    opt.addEventListener('click', (ev)=>{
      ev.stopPropagation();
      setValue(o.id);
      root.classList.remove('open');
      if(onSelect) onSelect(value);
    });
    menu.appendChild(opt);
  });
  function setValue(v){
    value = v;
    const o = options.find(x => x.id === v) || options[0];
    labelEl.innerHTML = (icon ? iconHtml(icon) + ' ' : '') + escapeHtml(o.label);
    [...menu.children].forEach(el => el.classList.toggle('active', el.dataset.value === v));
  }
  btn.addEventListener('click', (ev)=>{
    ev.stopPropagation();
    document.querySelectorAll('.genre-dropdown.open').forEach(d=>{ if(d!==root) d.classList.remove('open'); });
    root.classList.toggle('open');
  });
  setValue(value);
  return { setValue, getValue: ()=>value };
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
   TMDB — busca de filmes, capas, sinopses e onde assistir.
   A chave é colada pelo casal na tela de Configurações e fica
   guardada na nuvem (config/app), fora do código público.
   Aceita tanto a "Chave da API" (v3) quanto o "Token de
   leitura" (v4, começa com eyJ). Sem chave, tudo continua
   funcionando pela Wikipédia como antes.
===================================================== */
const TMDB_KEY_STORAGE = 'cinema-pj-tmdb-key';
const TMDB_IMG = 'https://image.tmdb.org/t/p/';
let tmdbKey = localStorage.getItem(TMDB_KEY_STORAGE) || '';
const configDocRef = doc(db, 'config', 'app');

function tmdbEnabled(){ return !!tmdbKey; }

async function tmdbFetch(path, params, keyOverride){
  const key = keyOverride || tmdbKey;
  const url = new URL('https://api.themoviedb.org/3' + path);
  Object.entries(params || {}).forEach(([k,v])=>{ if(v !== undefined && v !== null && v !== '') url.searchParams.set(k, v); });
  const headers = { accept: 'application/json' };
  if(key.startsWith('eyJ')) headers.Authorization = 'Bearer ' + key;
  else url.searchParams.set('api_key', key);
  const res = await fetch(url, { headers });
  if(!res.ok) throw new Error('TMDB ' + res.status);
  return res.json();
}

function tmdbPoster(path, size){ return path ? TMDB_IMG + (size || 'w500') + path : null; }
function tmdbYear(r){ return (r && r.release_date || '').slice(0,4); }

// Gêneros do TMDB → categorias do app (os que não têm par ficam de fora)
const TMDB_GENRE_MAP = {
  28:'acao', 12:'aventura', 16:'animacao', 35:'comedia', 80:'crime',
  99:'documentario', 18:'drama', 14:'fantasia', 27:'terror', 10402:'musical',
  9648:'suspense', 53:'suspense', 10749:'romance', 878:'ficcao', 10752:'guerra',
};
function mapTmdbGenres(ids){
  return [...new Set((ids || []).map(id => TMDB_GENRE_MAP[id]).filter(Boolean))];
}

async function tmdbSearch(query, year){
  const params = { query, language:'pt-BR', region:'BR', include_adult:'false' };
  let json = await tmdbFetch('/search/movie', year ? { ...params, year } : params);
  if(year && !(json.results || []).length) json = await tmdbFetch('/search/movie', params);
  return json.results || [];
}

// Onde assistir no Brasil (dados do JustWatch via TMDB). Guarda por 12h
// pra não buscar de novo a cada abertura.
const PROVIDERS_CACHE_KEY = 'cinema-pj-providers';
const PROVIDERS_TTL = 12 * 3600 * 1000;
let providersCache = {};
try{ providersCache = JSON.parse(localStorage.getItem(PROVIDERS_CACHE_KEY) || '{}'); }catch(e){ providersCache = {}; }

async function tmdbProviders(tmdbId){
  const hit = providersCache[tmdbId];
  if(hit && Date.now() - hit.at < PROVIDERS_TTL) return hit.data;
  const json = await tmdbFetch(`/movie/${tmdbId}/watch/providers`);
  const data = (json.results && json.results.BR) || null;
  providersCache[tmdbId] = { at: Date.now(), data };
  try{ localStorage.setItem(PROVIDERS_CACHE_KEY, JSON.stringify(providersCache)); }catch(e){}
  return data;
}

// Descobre o id do TMDB de um filme (direto, se já tiver; senão pela busca
// que também alimenta capa/sinopse) e desenha "onde assistir" no container.
// wrapperEl (opcional) é o bloco inteiro que some quando não há o que mostrar.
async function renderProviders(container, movieLike, wrapperEl){
  const wrap = wrapperEl || container;
  const show = (on)=>{ wrap.style.display = on ? '' : 'none'; };
  if(!tmdbEnabled()){ container.innerHTML = ''; show(false); return; }
  show(true);
  container.innerHTML = '<div class="prov-loading"><div class="skeleton-line" style="width:60%"></div><div class="skeleton-line" style="width:40%"></div></div>';
  const token = (container._provToken = {});
  try{
    let tmdbId = movieLike.tmdbId;
    if(!tmdbId){
      const info = await getMovieInfo(movieLike);
      tmdbId = info && info.tmdbId;
    }
    if(container._provToken !== token) return;
    if(!tmdbId){ container.innerHTML = ''; show(false); return; }
    const data = await tmdbProviders(tmdbId);
    if(container._provToken !== token) return;
    container.innerHTML = providersHtml(data);
  }catch(err){
    if(container._provToken !== token) return;
    container.innerHTML = '<p class="prov-empty">Não deu pra consultar onde assistir agora.</p>';
  }
}

function providersHtml(data){
  const groups = [
    ['flatrate', 'No streaming'],
    ['free', 'Grátis'],
    ['ads', 'Grátis com anúncios'],
    ['rent', 'Aluguel'],
    ['buy', 'Compra'],
  ];
  const seen = new Set();
  const rows = [];
  groups.forEach(([key, label])=>{
    const list = ((data && data[key]) || [])
      .sort((a,b) => a.display_priority - b.display_priority)
      .filter(p => { const k = key + p.provider_id; if(seen.has(k)) return false; seen.add(k); return true; })
      .slice(0, 6);
    if(!list.length) return;
    rows.push(`
      <div class="prov-group">
        <span class="prov-label">${label}</span>
        <div class="prov-list">${list.map(p => `
          <span class="prov-chip" title="${escapeHtml(p.provider_name)}">
            <img src="${TMDB_IMG}w92${p.logo_path}" alt="" loading="lazy">${escapeHtml(p.provider_name)}
          </span>`).join('')}
        </div>
      </div>`);
  });
  if(!rows.length){
    return '<p class="prov-empty">Não está em nenhum streaming no Brasil agora.</p>';
  }
  const link = data && data.link ? `<a class="prov-link" href="${data.link}" target="_blank" rel="noopener">Ver links ↗</a>` : '';
  return rows.join('') + `<div class="prov-credit">Dados do JustWatch ${link}</div>`;
}

/* =====================================================
   Cor da capa — tira a cor mais marcante do pôster pra tingir
   a tela do filme e o resultado da roleta. Se a imagem não
   deixar ler os pixels (CORS) ou for quase cinza, fica o
   visual padrão.
===================================================== */
const posterColorCache = new Map();

function posterColor(src){
  if(!src) return Promise.resolve(null);
  if(posterColorCache.has(src)) return posterColorCache.get(src);
  const job = new Promise((resolve)=>{
    const img = new Image();
    if(!src.startsWith('data:')) img.crossOrigin = 'anonymous';
    img.onload = ()=>{
      try{
        const w = 24, h = 36;
        const canvas = document.createElement('canvas');
        canvas.width = w; canvas.height = h;
        const ctx = canvas.getContext('2d', { willReadFrequently: true });
        ctx.drawImage(img, 0, 0, w, h);
        const px = ctx.getImageData(0, 0, w, h).data;
        // Agrupa por faixa de matiz e pontua por saturação (cores vivas e
        // nem muito escuras nem muito claras pesam mais)
        const buckets = new Map();
        for(let i = 0; i < px.length; i += 4){
          const [hh, s, l] = rgbToHsl(px[i], px[i+1], px[i+2]);
          if(l < .12 || l > .9 || s < .18) continue;
          const score = s * (1 - Math.abs(l - .5) * 1.4);
          const key = Math.round(hh * 18) % 18;
          const b = buckets.get(key) || { score:0, r:0, g:0, b:0 };
          b.score += score; b.r += px[i]*score; b.g += px[i+1]*score; b.b += px[i+2]*score;
          buckets.set(key, b);
        }
        let best = null;
        buckets.forEach(b => { if(!best || b.score > best.score) best = b; });
        if(!best || best.score < 1.5){ resolve(null); return; }
        const [hh, s] = rgbToHsl(best.r/best.score, best.g/best.score, best.b/best.score);
        const hue = Math.round(hh * 360);
        const sat = Math.round(Math.min(.9, Math.max(.5, s)) * 100);
        resolve({
          accent: `hsl(${hue} ${sat}% 66%)`,
          deep: `hsl(${hue} ${Math.round(sat*.75)}% 17%)`,
          glow: `hsl(${hue} ${sat}% 55% / .45)`,
        });
      }catch(e){ resolve(null); } // imagem sem permissão de leitura
    };
    img.onerror = ()=> resolve(null);
    img.src = src;
  });
  posterColorCache.set(src, job);
  return job;
}

function rgbToHsl(r, g, b){
  r /= 255; g /= 255; b /= 255;
  const max = Math.max(r, g, b), min = Math.min(r, g, b);
  const l = (max + min) / 2;
  if(max === min) return [0, 0, l];
  const d = max - min;
  const s = l > .5 ? d / (2 - max - min) : d / (max + min);
  let h;
  if(max === r) h = (g - b) / d + (g < b ? 6 : 0);
  else if(max === g) h = (b - r) / d + 2;
  else h = (r - g) / d + 4;
  return [h / 6, s, l];
}

// Pinta um elemento com a cor da capa (variáveis --tint, --tint-deep, --tint-glow)
function applyTint(el, src){
  if(!el) return;
  const token = (el._tintToken = {});
  if(!src){ clearTint(el); return; }
  posterColor(src).then(c=>{
    if(el._tintToken !== token) return;
    if(!c){ clearTint(el); return; }
    el.style.setProperty('--tint', c.accent);
    el.style.setProperty('--tint-deep', c.deep);
    el.style.setProperty('--tint-glow', c.glow);
    el.classList.add('tinted');
  });
}
function clearTint(el){
  el.classList.remove('tinted');
  el.style.removeProperty('--tint');
  el.style.removeProperty('--tint-deep');
  el.style.removeProperty('--tint-glow');
}

/* =====================================================
   Sugestões enquanto digita o nome do filme: filmes que já
   estão no Diário (quando faz sentido) + resultados do TMDB,
   com capa e ano pra não ter dúvida de qual é qual.
===================================================== */
function attachMovieSuggest(inputEl, listEl, opts){
  const { localItems, onPickLocal, onPickTmdb, onInput } = opts;
  let timer = null;
  let seq = 0;

  function hide(){
    clearTimeout(timer);
    seq++;
    listEl.innerHTML = '';
    listEl.classList.remove('open');
  }

  function addHeader(text){
    const h = document.createElement('div');
    h.className = 'suggest-head';
    h.textContent = text;
    listEl.appendChild(h);
  }
  function addItem({ thumb, title, sub, badge, onPick }){
    const item = document.createElement('button');
    item.type = 'button';
    item.className = 'suggest-item';
    item.innerHTML = `
      <span class="suggest-thumb">${thumb ? `<img src="${thumb}" alt="" loading="lazy" onerror="this.remove()">` : iconHtml('clapperboard')}</span>
      <span class="suggest-text">
        <span class="suggest-title">${escapeHtml(title)}</span>
        ${sub ? `<span class="suggest-sub">${escapeHtml(sub)}</span>` : ''}
      </span>
      ${badge ? `<span class="suggest-media">${badge}</span>` : ''}`;
    item.addEventListener('click', (ev)=>{
      ev.stopPropagation();
      hide();
      onPick();
    });
    listEl.appendChild(item);
  }

  function render(locals, results, loading){
    listEl.innerHTML = '';
    if(locals.length){
      addHeader('No nosso diário');
      locals.forEach(e => addItem({
        thumb: e.poster || null,
        title: e.title,
        sub: e.year || '',
        badge: computeMedia(e) != null ? formatNum(computeMedia(e)) : '',
        onPick: ()=> onPickLocal(e),
      }));
    }
    if(results.length){
      addHeader('Do TMDB');
      results.forEach(r => {
        const year = tmdbYear(r);
        const original = r.original_title && r.original_title !== r.title ? r.original_title : '';
        addItem({
          thumb: tmdbPoster(r.poster_path, 'w92'),
          title: r.title,
          sub: [year, original].filter(Boolean).join(' · '),
          onPick: ()=> onPickTmdb(r),
        });
      });
    }
    if(loading){
      const l = document.createElement('div');
      l.className = 'suggest-loading';
      l.textContent = 'Buscando no TMDB…';
      listEl.appendChild(l);
    }
    listEl.classList.toggle('open', listEl.children.length > 0);
  }

  function update(){
    const raw = inputEl.value.trim();
    const q = normalizeTitle(raw);
    const locals = (localItems && q) ? localItems(q) : [];
    clearTimeout(timer);
    const my = ++seq;
    if(!tmdbEnabled() || raw.length < 2){ render(locals, [], false); return; }
    render(locals, [], true);
    timer = setTimeout(async ()=>{
      try{
        const results = (await tmdbSearch(raw)).slice(0, 6);
        if(my === seq) render(locals, results, false);
      }catch(e){
        if(my === seq) render(locals, [], false);
      }
    }, 320);
  }

  inputEl.addEventListener('input', ()=>{
    if(onInput) onInput();
    update();
  });
  const overlay = inputEl.closest('.modal-overlay');
  if(overlay) overlay.addEventListener('click', (e)=>{ if(!e.target.closest('.suggest-wrap')) hide(); });
  return { hide };
}

// Texto de ajuda embaixo do nome do filme nos formulários
function updateTmdbHints(){
  document.querySelectorAll('.tmdb-hint').forEach(el=>{
    el.innerHTML = tmdbEnabled()
      ? 'Digite e escolha uma sugestão pra puxar capa, ano e sinopse.'
      : 'Quer sugestões com capa automática? <button type="button" class="link-btn" data-open-settings>Ative o TMDB</button>.';
  });
}

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

// Nomes de seção onde a Wikipédia costuma colocar o enredo de verdade
// (o resumo da história), diferente do parágrafo de abertura do artigo
// que só fala nacionalidade/direção/elenco/lançamento.
const WIKI_PLOT_SECTION_NAMES = {
  pt: /^(sinopse|enredo|trama|premissa)$/i,
  en: /^(plot|synopsis|premise)$/i,
};

// Busca a seção de enredo/sinopse de uma página já resolvida e devolve
// só o texto puro (sem links, notas de rodapé, links de "editar" etc).
async function fetchWikiPlot(lang, pageTitle){
  try{
    const secUrl = `https://${lang}.wikipedia.org/w/api.php?action=parse&page=${encodeURIComponent(pageTitle)}&prop=sections&format=json&origin=*`;
    const secRes = await fetch(secUrl);
    if(!secRes.ok) return null;
    const secJson = await secRes.json();
    const sections = (secJson.parse && secJson.parse.sections) || [];
    const pattern = WIKI_PLOT_SECTION_NAMES[lang] || WIKI_PLOT_SECTION_NAMES.en;
    const match = sections.find(s => pattern.test((s.line || '').replace(/<[^>]+>/g, '').trim()));
    if(!match) return null;

    const textUrl = `https://${lang}.wikipedia.org/w/api.php?action=parse&page=${encodeURIComponent(pageTitle)}&section=${match.index}&prop=text&format=json&origin=*`;
    const textRes = await fetch(textUrl);
    if(!textRes.ok) return null;
    const textJson = await textRes.json();
    const html = textJson.parse && textJson.parse.text && textJson.parse.text['*'];
    if(!html) return null;

    const div = document.createElement('div');
    div.innerHTML = html;
    div.querySelectorAll('.mw-editsection, .mw-heading, h2, h3, h4, table, sup, style, script').forEach(el => el.remove());
    const plot = (div.textContent || '').replace(/\s+/g, ' ').trim();
    return plot.length > 20 ? plot : null;
  }catch(e){
    return null;
  }
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

  // O parágrafo de abertura (page.extract) só serve aqui pra confirmar que
  // achamos a página certa — o que mostramos de fato é o enredo/sinopse.
  const plot = await fetchWikiPlot(lang, page.title);

  return {
    found:true,
    title: page.title,
    extract: plot,
    image: page.original ? page.original.source : null,
    lang
  };
}

async function getMovieInfo(movie){
  // Só confia no cache quando ele já tem capa E sinopse de verdade — uma
  // busca que falhou ou não achou algum dos dois não deve ficar presa em
  // cache pra sempre, senão o filme nunca mais mostra isso depois de um
  // primeiro tropeço (rede lenta, página errada casada na Wikipédia, etc).
  const cached = wikiCache[movie.id];
  const yearMatch = String(movie.y || '').match(/\d{4}/);
  const searchYear = yearMatch ? yearMatch[0] : '';

  // Com o TMDB ativado ele tem prioridade (capa oficial, sinopse em PT e o
  // id pra "onde assistir"). Resultados antigos da Wikipédia no cache são
  // trocados na primeira vez que o filme aparece.
  if(tmdbEnabled()){
    if(cached && cached.source === 'tmdb' && (!movie.tmdbId || cached.tmdbId === movie.tmdbId)) return cached;
    try{
      let r = null;
      if(movie.tmdbId){
        r = await tmdbFetch(`/movie/${movie.tmdbId}`, { language:'pt-BR' });
      } else {
        r = (await tmdbSearch(movie.t, searchYear))[0] || null;
      }
      if(r){
        const info = {
          found: true,
          source: 'tmdb',
          title: r.title,
          extract: r.overview || null,
          image: tmdbPoster(r.poster_path),
          tmdbId: r.id,
          year: tmdbYear(r),
          lang: 'tmdb',
        };
        wikiCache[movie.id] = info;
        saveWikiCache();
        return info;
      }
    }catch(e){ /* cai pra Wikipédia */ }
  }

  if(cached && cached.image && cached.extract) return cached;
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

// Partículas da tela de abertura
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

  const notVetoed = m => !isVetoed('o:' + m.id);
  const pending = MOVIES.filter(m => !isWatched(m.id) && notVetoed(m));
  const usePending = onlyPendingToggle.checked && pending.length > 0;
  pendingHint.style.display = (onlyPendingToggle.checked && pending.length === 0) ? 'block' : 'none';
  const allowed = MOVIES.filter(notVetoed);
  const pool = usePending ? pending : (allowed.length ? allowed : MOVIES);
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
  renderVetoUi();
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
// Roleta visível agora (Oscar ou "Nossa lista") — o botão gira a que está na tela
function activeWheelArea(){
  return document.querySelector(rouletteMode === 'watchlist' ? '#slotMachine' : '#oscarRouletteMode .wheel-area');
}
window.addEventListener('scroll', ()=>{
  const wheel = activeTab === 'roleta' ? activeWheelArea() : null;
  if(!wheel || !wheel.offsetParent){ fabSpin.classList.remove('visible'); return; }
  fabSpin.classList.toggle('visible', wheel.getBoundingClientRect().bottom < 0);
}, {passive:true});
fabSpin.addEventListener('click', ()=>{
  playClick();
  const wheel = activeWheelArea();
  window.scrollTo({ top: Math.max(0, wheel.getBoundingClientRect().top + window.scrollY - 90), behavior:'smooth' });
  setTimeout(()=>{
    if(rouletteMode === 'watchlist') spinWatchlistWheel();
    else if(!spinning) spin();
  }, 450);
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
    card.innerHTML = `
      <div class="m-poster"><div class="skeleton-poster"></div></div>
      <div class="m-info">
        <div class="m-title">${escapeHtml(m.t)}</div>
        <div class="m-sub"><span class="m-year" style="color:${DECADE_COLORS[decadeOf(m)]}">${m.y}</span>${done ? `<span class="m-done-tag">${iconHtml('check')} visto</span>` : ''}</div>
      </div>
      ${chips}
    `;
    card.addEventListener('click', ()=> openRatingForOscarMovie(m.id, card));
    grid.appendChild(card);
    const posterEl = card.querySelector('.m-poster');
    const linkedEntry = diario.find(e => e.oscarId === m.id && e.poster);
    if(linkedEntry){
      posterEl.innerHTML = `<img class="m-poster-img" src="${linkedEntry.poster}" alt="${escapeHtml(m.t)}" loading="lazy">`;
    } else {
      lazyLoadPoster(posterEl, m, 'm-poster-img');
    }
  });

  emptyState.style.display = shown===0 ? 'block' : 'none';
}

function updateProgress(){
  const count = watchedCount();
  document.getElementById('prog-count').textContent = count;
  document.getElementById('prog-total-num').textContent = N;
  const pct = (count / N) * 100;
  document.getElementById('prog-fill').style.width = pct + '%';
  document.getElementById('prog-pct').textContent = Math.round(pct) + '%';
}

/* =====================================================
   Avaliar filme do Oscar — abre o mesmo modal do Diário, com
   nota, opinião e categoria, em vez do antigo modal simplificado.
   Se já existe um registro do Diário ligado a esse filme, edita
   ele; senão cria um novo já com título e capa preenchidos.
===================================================== */
function openRatingForOscarMovie(movieId, originEl){
  const movie = ALL_OSCAR_WINNERS[movieId];
  const existingEntry = diario.find(e => e.oscarId === movieId);
  if(existingEntry){
    openMovieView(existingEntry, 'diario', originEl);
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
  renderProviders(document.getElementById('rProviders'), movie);

  // Se já existe um registro no Diário pra esse filme com capa enviada
  // à mão, ela sempre tem prioridade sobre a busca automática — assim a
  // capa nunca some mesmo se a Wikipédia falhar.
  const linkedEntry = diario.find(e => e.oscarId === movie.id && e.poster);
  const customPoster = linkedEntry ? linkedEntry.poster : null;
  const posterHtml = customPoster
    ? `<img class="r-poster" src="${customPoster}" alt="${escapeHtml(movie.t)}" loading="lazy" onerror="handlePosterError(this)">`
    : null;

  applyTint(resultCard, customPoster);
  getMovieInfo(movie).then(info=>{
    if(!currentPick || currentPick.id !== movie.id) return;
    applyTint(resultCard, customPoster || (info && info.found ? info.image : null));

    const finalPosterHtml = posterHtml || ((info && info.found && info.image)
      ? `<img class="r-poster" src="${info.image}" alt="${escapeHtml(movie.t)}" loading="lazy" onerror="handlePosterError(this)">`
      : posterPlaceholderHTML);

    if(info && info.found && info.extract){
      wrap.innerHTML = `
        <div class="r-poster-wrap">${finalPosterHtml}</div>
        <div class="r-synopsis">
          <p>${escapeHtml(truncate(info.extract, 340))}</p>
          <span class="r-wiki-credit">${info.source === 'tmdb' ? 'Sinopse via TMDB' : `Sinopse via Wikipédia (${info.lang === 'pt' ? 'PT' : 'EN'})`}</span>
        </div>`;
    } else {
      const q = encodeURIComponent(movie.t + ' ' + movie.y + ' filme sinopse');
      wrap.innerHTML = `
        <div class="r-poster-wrap">${finalPosterHtml}</div>
        <div class="r-synopsis">
          <p class="r-no-info">Não encontramos a sinopse automaticamente dessa vez.</p>
          <a class="r-wiki-link" href="https://www.google.com/search?q=${q}" target="_blank" rel="noopener">Buscar "${escapeHtml(movie.t)}"</a>
        </div>`;
    }
  }).catch(()=>{
    if(!currentPick || currentPick.id !== movie.id) return;
    const q = encodeURIComponent(movie.t + ' ' + movie.y + ' filme sinopse');
    wrap.innerHTML = `
      <div class="r-poster-wrap">${posterHtml || posterPlaceholderHTML}</div>
      <div class="r-synopsis">
        <p class="r-no-info">Sem conexão pra buscar a sinopse agora. Confira a lista de qualquer forma!</p>
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

function findDuplicateDiario(title, excludeId){
  const norm = normalizeTitle(title);
  if(!norm) return null;
  return diario.find(e => e.id !== excludeId && normalizeTitle(e.title) === norm) || null;
}

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
    case 'custom': arr.sort((a,b)=> (b.order ?? b.addedAt) - (a.order ?? a.addedAt)); break;
  }
  return arr;
}

/* =====================================================
   Reordenar por arraste (usado no Diário e na Watchlist) —
   segura a alça: o card acompanha o dedo/mouse (só visual, via
   transform) enquanto arrasta, e a posição final só é decidida
   e aplicada no DOM quando solta. Evita reordenar o DOM a cada
   pixel durante o arraste, que é o que deixava tudo instável.
===================================================== */
function makeReorderable(gridEl, onDrop){
  let dragEl = null;
  let pointerId = null;
  let startY = 0;
  let lastPointerY = 0;
  let scrollRAF = null;

  function getCards(){
    return [...gridEl.children].filter(c => c.classList.contains('movie-card'));
  }

  function clearDropHints(){
    getCards().forEach(c => c.classList.remove('drop-before', 'drop-after'));
  }

  function findDropTarget(pointerY){
    const cards = getCards().filter(c => c !== dragEl);
    for(const c of cards){
      const r = c.getBoundingClientRect();
      if(pointerY < r.top + r.height/2) return { before: c };
    }
    return { after: cards[cards.length-1] || null };
  }

  function updateDragVisual(){
    if(!dragEl) return;
    dragEl.style.transform = `translateY(${lastPointerY - startY}px)`;
    clearDropHints();
    const target = findDropTarget(lastPointerY);
    if(target.before) target.before.classList.add('drop-before');
    else if(target.after) target.after.classList.add('drop-after');
  }

  // Enquanto arrasta perto do topo ou do rodapé da tela, rola a página
  // sozinha — sem isso, dava pra reordenar só entre os filmes que já
  // cabiam na tela, sem alcançar o resto da lista.
  function autoScrollTick(){
    if(!dragEl){ scrollRAF = null; return; }
    const vh = window.innerHeight;
    const margin = 100;
    const maxSpeed = 16;
    let speed = 0;
    if(lastPointerY < margin){
      speed = -maxSpeed * (1 - Math.max(0, lastPointerY)/margin);
    } else if(lastPointerY > vh - margin){
      speed = maxSpeed * (1 - Math.max(0, vh - lastPointerY)/margin);
    }
    if(speed !== 0){
      window.scrollBy(0, speed);
      updateDragVisual();
    }
    scrollRAF = requestAnimationFrame(autoScrollTick);
  }

  function onMove(e){
    if(!dragEl) return;
    lastPointerY = e.clientY;
    updateDragVisual();
  }

  function onUp(e){
    if(!dragEl) return;
    try{ dragEl.releasePointerCapture(pointerId); }catch(err){}

    const target = findDropTarget(e.clientY);
    if(target.before) gridEl.insertBefore(dragEl, target.before);
    else if(target.after) gridEl.insertBefore(dragEl, target.after.nextSibling);

    clearDropHints();
    dragEl.classList.remove('dragging');
    dragEl.style.transform = '';
    document.removeEventListener('pointermove', onMove);
    document.removeEventListener('pointerup', onUp);
    if(scrollRAF){ cancelAnimationFrame(scrollRAF); scrollRAF = null; }
    const orderedIds = getCards().map(c => c.dataset.entryId);
    dragEl = null;
    onDrop(orderedIds);
  }

  gridEl.addEventListener('pointerdown', (e)=>{
    const handle = e.target.closest('.drag-handle');
    if(!handle) return;
    const card = handle.closest('.movie-card');
    if(!card) return;
    e.preventDefault();
    dragEl = card;
    pointerId = e.pointerId;
    try{ dragEl.setPointerCapture(pointerId); }catch(err){}
    dragEl.classList.add('dragging');
    startY = e.clientY;
    lastPointerY = e.clientY;
    document.addEventListener('pointermove', onMove);
    document.addEventListener('pointerup', onUp);
    scrollRAF = requestAnimationFrame(autoScrollTick);
  });
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
let diarioReorderMode = false;

function primaryGenreColor(e){
  const gs = entryGenres(e).map(genreById).filter(Boolean);
  return gs.length ? gs[0].color : null;
}

function renderDiario(){
  if(diarioReorderMode){
    const sorted = sortDiario(diario, 'custom');
    diarioGrid.className = 'movie-grid';
    diarioGrid.innerHTML = '';
    sorted.forEach(e=>{
      const media = computeMedia(e);
      const card = document.createElement('div');
      card.className = 'movie-card reorder-item';
      card.dataset.entryId = e.id;
      card.innerHTML = `
        <div class="drag-handle">${iconHtml('grip-vertical')}</div>
        <div class="m-poster">${e.poster ? '' : '<div class="skeleton-poster"></div>'}</div>
        <div class="m-info">
          <div class="m-title">${escapeHtml(e.title)}</div>
        </div>
        <div class="m-ratings">
          ${media!=null ? `<span class="m-media-badge">${formatNum(media)}</span>` : ''}
        </div>
      `;
      diarioGrid.appendChild(card);
      const posterEl = card.querySelector('.m-poster');
      if(e.poster){
        posterEl.innerHTML = `<img class="m-poster-img" src="${e.poster}" alt="${escapeHtml(e.title)}" loading="lazy">`;
      } else {
        lazyLoadPoster(posterEl, lookupOf(e), 'm-poster-img');
      }
    });
    diarioEmpty.style.display = sorted.length===0 ? 'block' : 'none';
    return;
  }

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

    const isPerfect = media === 10;

    if(diarioView === 'mural'){
      card.className = 'mural-card' + (isPerfect ? ' perfect-score' : '');
      card.innerHTML = `
        <div class="mural-poster"><div class="skeleton-poster"></div></div>
        ${media!=null ? `<div class="mural-media-badge${isPerfect ? ' perfect' : ''}">${isPerfect ? iconHtml('star')+' ' : ''}${formatNum(media)}</div>` : ''}
        <div class="mural-overlay">${color ? `<span class="mural-dot" style="background:${color}"></span>` : ''}${escapeHtml(e.title)}</div>
      `;
      card.addEventListener('click', ()=> openMovieView(e, 'diario', card));
      diarioGrid.appendChild(card);
      const muralPosterEl = card.querySelector('.mural-poster');
      if(e.poster){
        muralPosterEl.innerHTML = `<img src="${e.poster}" alt="${escapeHtml(e.title)}" loading="lazy">`;
      } else {
        lazyLoadPoster(muralPosterEl, lookupOf(e), '');
      }
      return;
    }

    card.className = 'movie-card' + (isPerfect ? ' perfect-score' : '');
    const whereHtml = e.where ? `<span class="m-where" title="${escapeHtml(e.where)}">${iconHtml(e.where === 'Cinema' ? 'clapperboard' : 'sofa')}</span>` : '';
    card.innerHTML = `
      <div class="m-poster">${e.poster ? '' : '<div class="skeleton-poster"></div>'}</div>
      <div class="m-info">
        <div class="m-title">${escapeHtml(e.title)}</div>
        ${(whereHtml || genresHtml) ? `<div class="m-sub">${whereHtml}${genresHtml}</div>` : ''}
      </div>
      <div class="m-ratings">
        ${media!=null ? `<span class="m-media-badge${isPerfect ? ' perfect' : ''}">${isPerfect ? iconHtml('star')+' ' : ''}${formatNum(media)}</span>` : '<span class="m-media-badge empty">—</span>'}
        <div class="m-rate-sub">
          ${e.notaPaulo!=null ? `<span class="m-rate-chip p">P ${formatNum(e.notaPaulo)}</span>` : ''}
          ${e.notaJulia!=null ? `<span class="m-rate-chip j">J ${formatNum(e.notaJulia)}</span>` : ''}
        </div>
      </div>
    `;
    card.addEventListener('click', ()=> openMovieView(e, 'diario', card));
    diarioGrid.appendChild(card);
    const posterEl = card.querySelector('.m-poster');
    if(e.poster){
      posterEl.innerHTML = `<img class="m-poster-img" src="${e.poster}" alt="${escapeHtml(e.title)}" loading="lazy">`;
    } else {
      lazyLoadPoster(posterEl, lookupOf(e), 'm-poster-img');
    }
  });

  diarioEmpty.style.display = sorted.length===0 ? 'block' : 'none';
}

function finishDiarioReorder(orderedIds){
  const base = Date.now();
  orderedIds.forEach((id, idx)=>{
    const entry = diario.find(x => x.id === id);
    if(entry) entry.order = base - idx;
  });
  saveDiarioLocal();
  if(cloudEnabled){
    orderedIds.forEach(id=>{
      const entry = diario.find(x => x.id === id);
      if(entry) updateDoc(doc(diarioColRef, id), { order: entry.order }).catch(err => logCloudError('Falha ao sincronizar ordem do diário', err));
    });
  }
  activeDiarioSort = 'custom';
  diarioSortDropdown.setValue('custom');
  renderDiario();
}
makeReorderable(diarioGrid, finishDiarioReorder);

const diarioReorderBtn = document.getElementById('diarioReorderBtn');
const diarioReorderHint = document.getElementById('diarioReorderHint');
diarioReorderBtn.addEventListener('click', ()=>{
  playClick();
  diarioReorderMode = !diarioReorderMode;
  diarioReorderBtn.classList.toggle('active', diarioReorderMode);
  diarioReorderBtn.querySelector('span').textContent = diarioReorderMode ? 'Concluir' : 'Ordem';
  diarioReorderHint.classList.toggle('show', diarioReorderMode);
  document.getElementById('diarioSearchWrap').style.display = diarioReorderMode ? 'none' : '';
  document.querySelector('#panel-diario .toolbar-filters').style.visibility = diarioReorderMode ? 'hidden' : '';
  document.getElementById('diarioViewToggle').style.display = diarioReorderMode ? 'none' : '';
  renderDiario();
});

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
  renderHome();
}

const diarioSortDropdown = createOptionDropdown(document.getElementById('diarioSortRow'), {
  icon: 'sort',
  options: [
    {id:'recent', label:'Recentes'},
    {id:'oldest', label:'Mais antigos'},
    {id:'best', label:'Melhores notas'},
    {id:'worst', label:'Piores notas'},
    {id:'custom', label:'Minha ordem'},
  ],
  value: activeDiarioSort,
  onSelect: (v)=>{ activeDiarioSort = v; renderDiario(); }
});
diarioSearch.addEventListener('input', renderDiario);

const diarioGenreFilter = createGenreDropdown(document.getElementById('diarioGenreFilterRow'), {
  allLabel: 'Todos os gêneros',
  buttonLabel: 'Gêneros',
  onSelect: ()=> renderDiario()
});

/* =====================================================
   Modal de adicionar/editar filme do Diário
===================================================== */
const diarioModalOverlay = document.getElementById('diarioModalOverlay');
const diarioModalEyebrow = document.getElementById('diarioModalEyebrow');
const diarioTitleInput = document.getElementById('diarioTitleInput');
const diarioDupWarning = document.getElementById('diarioDupWarning');
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
      lazyLoadPoster(previewEl, {id:entry.id, t:entry.title, y:entry.y || entry.year || '', tmdbId:entry.tmdbId || null}, '');
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

// Decide quais dados do TMDB salvar: os da sugestão escolhida (se o nome
// ainda é o dela), os que o registro já tinha (se o nome não mudou) ou nada.
function resolveTmdbFields(pick, entry, title){
  if(pick && pick.title === title) return { tmdbId: pick.tmdbId ?? null, year: pick.year ?? null, overview: pick.overview ?? null };
  if(entry && entry.title === title) return { tmdbId: entry.tmdbId ?? null, year: entry.year ?? null, overview: entry.overview ?? null };
  return { tmdbId: null, year: null, overview: null };
}
function tmdbPickOf(r){
  return { title: r.title, tmdbId: r.id, year: tmdbYear(r) || null, overview: r.overview || null };
}

let diarioTmdbPick = null;
const diarioSuggest = attachMovieSuggest(diarioTitleInput, document.getElementById('diarioSuggest'), {
  onPickTmdb: (r)=>{
    diarioTitleInput.value = r.title;
    updateDiarioDupWarning();
    diarioTmdbPick = tmdbPickOf(r);
    const poster = tmdbPoster(r.poster_path);
    if(poster){
      diarioPoster.state.pending = poster;
      diarioPoster.render({ poster });
    }
    if(!diarioGenrePicker.getValues().length) diarioGenrePicker.setValues(mapTmdbGenres(r.genre_ids));
  },
});

function openDiarioModal(entry, prefill){
  diarioEditId = entry ? entry.id : null;
  diarioTmdbPick = (!entry && prefill && prefill.tmdb && prefill.tmdb.tmdbId) ? { ...prefill.tmdb, title: prefill.title } : null;
  diarioSuggest.hide();
  currentDiarioOscarId = entry ? (entry.oscarId ?? null) : ((prefill && prefill.oscarId != null) ? prefill.oscarId : null);
  diarioModalEyebrow.textContent = entry ? 'Editar filme' : 'Novo filme';
  diarioTitleInput.value = entry ? entry.title : ((prefill && prefill.title) || '');
  updateDiarioDupWarning();
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

function updateDiarioDupWarning(){
  const dup = findDuplicateDiario(diarioTitleInput.value, diarioEditId);
  diarioDupWarning.style.display = dup ? 'block' : 'none';
}
diarioTitleInput.addEventListener('input', updateDiarioDupWarning);

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
  const existingEntry = entryId ? diario.find(e => e.id === entryId) : null;
  const tmdbFields = resolveTmdbFields(diarioTmdbPick, existingEntry, title);
  if(entryId){
    const entry = existingEntry;
    addedAt = entry ? entry.addedAt : Date.now();
    if(pendingPoster === undefined) poster = entry ? (entry.poster || null) : null;
    if(entry && (entry.title !== title || (entry.tmdbId ?? null) !== tmdbFields.tmdbId)){
      delete wikiCache[entry.id];
      saveWikiCache();
    }
    Object.assign(entry, { title, where:selectedWhere, notaPaulo:p, notaJulia:j, obs, poster, genres, oscarId:currentDiarioOscarId, ...tmdbFields });
  } else {
    entryId = 'd'+Date.now();
    diario.push({ id:entryId, title, where:selectedWhere, notaPaulo:p, notaJulia:j, obs, addedAt, poster, genres, oscarId:currentDiarioOscarId, ...tmdbFields });
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
    // merge: preserva campos que não são editados aqui (ex: a ordem personalizada)
    setDoc(doc(diarioColRef, entryId), { title, where:selectedWhere, notaPaulo:p, notaJulia:j, obs, addedAt, poster, genres, oscarId:linkedOscarId, ...tmdbFields }, { merge:true })
      .catch(err => logCloudError('Falha ao sincronizar filme do diário', err));
  }

  if(finishedConvertingId){
    const moved = removeWatchlistEntry(finishedConvertingId);
    const createdId = entryId;
    if(moved){
      showUndoToast(`"${title}" foi pro Diário`, ()=>{
        removeDiarioEntry(createdId);
        restoreWatchlistEntry(moved);
      });
    }
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

// Tira um filme do Diário (e, se for do Oscar, da contagem da roleta).
// Devolve o que foi removido, pra dar pra desfazer.
function removeDiarioEntry(removedId){
  const removedEntry = diario.find(e => e.id === removedId);
  if(!removedEntry) return null;
  const removedOscarId = removedEntry.oscarId ?? null;
  const oscarData = removedOscarId != null && data[removedOscarId] ? { ...data[removedOscarId] } : null;
  diario = diario.filter(e => e.id !== removedId);
  saveDiarioLocal();
  renderDiario();
  updateDiarioStats();

  if(cloudEnabled){
    deleteDoc(doc(diarioColRef, removedId)).catch(err => logCloudError('Falha ao remover filme no servidor', err));
  }
  if(removedOscarId != null){
    delete data[removedOscarId];
    saveData(removedOscarId);
    refreshOscarAfterChange(removedOscarId);
  }
  return { entry: { ...removedEntry }, oscarData };
}

function restoreDiarioEntry(removed){
  const { entry, oscarData } = removed;
  diario = diario.filter(e => e.id !== entry.id).concat([entry]);
  saveDiarioLocal();
  renderDiario();
  updateDiarioStats();
  if(cloudEnabled){
    const { id, ...rest } = entry;
    setDoc(doc(diarioColRef, id), rest).catch(err => logCloudError('Falha ao restaurar filme do diário', err));
  }
  if(entry.oscarId != null && oscarData){
    data[entry.oscarId] = oscarData;
    saveData(entry.oscarId);
    refreshOscarAfterChange(entry.oscarId);
  }
}

function refreshOscarAfterChange(oscarId){
  renderGrid();
  updateProgress();
  if(currentPick && currentPick.id === oscarId){
    showResult(MOVIES.findIndex(m => m.id === oscarId), {withMedia:false});
  }
}

diarioModalRemove.addEventListener('click', ()=>{
  if(!diarioEditId) return;
  const removed = removeDiarioEntry(diarioEditId);
  closeDiarioModal();
  if(removed){
    showUndoToast(`"${removed.entry.title}" saiu do Diário`, ()=> restoreDiarioEntry(removed));
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

function findDuplicateWatchlist(title, excludeId){
  const norm = normalizeTitle(title);
  if(!norm) return null;
  return watchlist.find(e => e.id !== excludeId && normalizeTitle(e.title) === norm) || null;
}

const WATCHLIST_VIEW_KEY = 'cinema-pj-watchlist-view';
let watchlistView = localStorage.getItem(WATCHLIST_VIEW_KEY) || 'list';
let watchlistReorderMode = false;

const watchlistGrid = document.getElementById('watchlistGrid');
const watchlistEmpty = document.getElementById('watchlistEmpty');
const watchlistSearch = document.getElementById('watchlistSearch');
const addWatchlistBtn = document.getElementById('addWatchlistBtn');
const watchlistModalOverlay = document.getElementById('watchlistModalOverlay');
const watchlistModalEyebrow = document.getElementById('watchlistModalEyebrow');
const watchlistTitleInput = document.getElementById('watchlistTitleInput');
const watchlistDupWarning = document.getElementById('watchlistDupWarning');
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
  buttonLabel: 'Gêneros',
  onSelect: ()=> renderWatchlist()
});

function renderWatchlist(){
  if(watchlistReorderMode){
    const sorted = [...watchlist].sort((a,b)=> (b.order ?? b.addedAt) - (a.order ?? a.addedAt));
    watchlistGrid.className = 'movie-grid';
    watchlistGrid.innerHTML = '';
    sorted.forEach(e=>{
      const genresHtml = genreChipsHtml(entryGenres(e));
      const card = document.createElement('div');
      card.className = 'movie-card reorder-item';
      card.dataset.entryId = e.id;
      card.innerHTML = `
        <div class="drag-handle">${iconHtml('grip-vertical')}</div>
        <div class="m-poster">${e.poster ? '' : '<div class="skeleton-poster"></div>'}</div>
        <div class="m-info">
          <div class="m-title">${escapeHtml(e.title)}</div>
          ${genresHtml ? `<div class="m-genres-inline">${genresHtml}</div>` : ''}
        </div>
      `;
      watchlistGrid.appendChild(card);
      const posterEl = card.querySelector('.m-poster');
      if(e.poster){
        posterEl.innerHTML = `<img class="m-poster-img" src="${e.poster}" alt="${escapeHtml(e.title)}" loading="lazy">`;
      } else {
        lazyLoadPoster(posterEl, lookupOf(e), 'm-poster-img');
      }
    });
    watchlistEmpty.style.display = sorted.length===0 ? 'block' : 'none';
    return;
  }

  const q = watchlistSearch.value.trim().toLowerCase();
  const filtered = watchlist
    .filter(e => !q || e.title.toLowerCase().includes(q))
    .filter(e => { const g = watchlistGenreFilter.getValue(); return !g || entryGenres(e).includes(g); })
    .sort((a,b) => (b.order ?? b.addedAt) - (a.order ?? a.addedAt));
  watchlistGrid.className = watchlistView === 'mural' ? 'diario-mural' : 'movie-grid';
  watchlistGrid.innerHTML = '';

  filtered.forEach(e=>{
    const genresHtml = genreChipsHtml(entryGenres(e));
    const color = primaryGenreColor(e);
    const card = document.createElement('div');

    if(watchlistView === 'mural'){
      card.className = 'mural-card';
      const hype = hypeHtml(e);
      card.innerHTML = `
        <div class="mural-poster"><div class="skeleton-poster"></div></div>
        ${hype ? `<div class="mural-hype">${hype}</div>` : ''}
        <div class="mural-overlay">
          <div>${color ? `<span class="mural-dot" style="background:${color}"></span>` : ''}${escapeHtml(e.title)}</div>
          ${genresHtml ? `<div class="mural-genres">${genresHtml}</div>` : ''}
        </div>
      `;
      card.addEventListener('click', ()=> openMovieView(e, 'watchlist', card));
      watchlistGrid.appendChild(card);
      const muralPosterEl = card.querySelector('.mural-poster');
      if(e.poster){
        muralPosterEl.innerHTML = `<img src="${e.poster}" alt="${escapeHtml(e.title)}" loading="lazy">`;
      } else {
        lazyLoadPoster(muralPosterEl, lookupOf(e), '');
      }
      return;
    }

    card.className = 'movie-card';
    const hype = hypeHtml(e);
    card.innerHTML = `
      <div class="m-poster">${e.poster ? '' : '<div class="skeleton-poster"></div>'}</div>
      <div class="m-info">
        <div class="m-title">${escapeHtml(e.title)}</div>
        ${(genresHtml || hype) ? `<div class="m-sub">${hype}${genresHtml}</div>` : ''}
        ${e.description ? `<div class="m-desc">${escapeHtml(truncate(e.description, 90))}</div>` : ''}
      </div>
    `;
    card.addEventListener('click', ()=> openMovieView(e, 'watchlist', card));
    watchlistGrid.appendChild(card);
    const posterEl = card.querySelector('.m-poster');
    if(e.poster){
      posterEl.innerHTML = `<img class="m-poster-img" src="${e.poster}" alt="${escapeHtml(e.title)}" loading="lazy">`;
    } else {
      lazyLoadPoster(posterEl, lookupOf(e), 'm-poster-img');
    }
  });

  watchlistEmpty.style.display = filtered.length===0 ? 'block' : 'none';
  if(typeof rouletteMode !== 'undefined' && rouletteMode === 'watchlist'){ renderWatchlistRoulette(); }
}
function updateWatchlistStats(){
  document.getElementById('wTotal').textContent = watchlist.length;
}

function finishWatchlistReorder(orderedIds){
  const base = Date.now();
  orderedIds.forEach((id, idx)=>{
    const entry = watchlist.find(x => x.id === id);
    if(entry) entry.order = base - idx;
  });
  saveWatchlistLocal();
  if(cloudEnabled){
    orderedIds.forEach(id=>{
      const entry = watchlist.find(x => x.id === id);
      if(entry) updateDoc(doc(watchlistColRef, id), { order: entry.order }).catch(err => logCloudError('Falha ao sincronizar ordem da watchlist', err));
    });
  }
  renderWatchlist();
}
makeReorderable(watchlistGrid, finishWatchlistReorder);

const watchlistReorderBtn = document.getElementById('watchlistReorderBtn');
const watchlistReorderHint = document.getElementById('watchlistReorderHint');
watchlistReorderBtn.addEventListener('click', ()=>{
  playClick();
  watchlistReorderMode = !watchlistReorderMode;
  watchlistReorderBtn.classList.toggle('active', watchlistReorderMode);
  watchlistReorderBtn.querySelector('span').textContent = watchlistReorderMode ? 'Concluir' : 'Ordem';
  watchlistReorderHint.classList.toggle('show', watchlistReorderMode);
  document.getElementById('watchlistSearchWrap').style.display = watchlistReorderMode ? 'none' : '';
  document.querySelector('#panel-watchlist .toolbar-filters').style.visibility = watchlistReorderMode ? 'hidden' : '';
  document.getElementById('watchlistViewToggle').style.display = watchlistReorderMode ? 'none' : '';
  renderWatchlist();
});

const watchlistViewToggle = document.getElementById('watchlistViewToggle');
function updateWatchlistViewToggle(){
  [...watchlistViewToggle.children].forEach(btn=>{
    btn.classList.toggle('active', btn.dataset.view === watchlistView);
  });
}
watchlistViewToggle.addEventListener('click', (ev)=>{
  const btn = ev.target.closest('.view-toggle-btn');
  if(!btn) return;
  playClick();
  watchlistView = btn.dataset.view;
  localStorage.setItem(WATCHLIST_VIEW_KEY, watchlistView);
  updateWatchlistViewToggle();
  renderWatchlist();
});
updateWatchlistViewToggle();

// "Quer muito ver": cada um pode marcar — aumenta a chance na roleta
const watchlistWantBtns = {
  paulo: document.getElementById('watchlistWantPaulo'),
  julia: document.getElementById('watchlistWantJulia'),
};
let watchlistWant = { paulo:false, julia:false };
function updateWantButtons(){
  Object.entries(watchlistWantBtns).forEach(([who, btn]) => btn.classList.toggle('active', !!watchlistWant[who]));
}
Object.entries(watchlistWantBtns).forEach(([who, btn])=>{
  btn.addEventListener('click', ()=>{
    playClick();
    watchlistWant[who] = !watchlistWant[who];
    updateWantButtons();
  });
});
function hypeWeight(e){ return 1 + (e.wantPaulo ? 1 : 0) + (e.wantJulia ? 1 : 0); }
function hypeHtml(e){
  return (e.wantPaulo ? `<span class="hype-chip p" title="Paulo quer muito">${iconHtml('flame')}</span>` : '')
       + (e.wantJulia ? `<span class="hype-chip j" title="Julia quer muito">${iconHtml('flame')}</span>` : '');
}

// Dados que passam da watchlist pro Diário quando marcam "já assisti"
function watchlistToDiarioPrefill(entry){
  return {
    title: entry.title,
    poster: entry.poster,
    genres: entryGenres(entry),
    tmdb: entry.tmdbId ? { tmdbId: entry.tmdbId, year: entry.year ?? null, overview: entry.overview ?? null } : null,
  };
}

let watchlistTmdbPick = null;
const watchlistSuggest = attachMovieSuggest(watchlistTitleInput, document.getElementById('watchlistSuggest'), {
  onPickTmdb: (r)=>{
    watchlistTitleInput.value = r.title;
    updateWatchlistDupWarning();
    watchlistTmdbPick = tmdbPickOf(r);
    const poster = tmdbPoster(r.poster_path);
    if(poster){
      watchlistPoster.state.pending = poster;
      watchlistPoster.render({ poster });
    }
    if(!watchlistGenrePicker.getValues().length) watchlistGenrePicker.setValues(mapTmdbGenres(r.genre_ids));
    if(!watchlistDescInput.value.trim() && r.overview) watchlistDescInput.value = r.overview;
  },
});

function openWatchlistModal(entry){
  watchlistEditId = entry ? entry.id : null;
  watchlistTmdbPick = null;
  watchlistSuggest.hide();
  watchlistWant = { paulo: !!(entry && entry.wantPaulo), julia: !!(entry && entry.wantJulia) };
  updateWantButtons();
  watchlistModalEyebrow.textContent = entry ? 'Editar item' : 'Novo filme pra ver';
  watchlistTitleInput.value = entry ? entry.title : '';
  updateWatchlistDupWarning();
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

function updateWatchlistDupWarning(){
  const dup = findDuplicateWatchlist(watchlistTitleInput.value, watchlistEditId);
  watchlistDupWarning.style.display = dup ? 'block' : 'none';
}
watchlistTitleInput.addEventListener('input', updateWatchlistDupWarning);

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
  const existingEntry = entryId ? watchlist.find(e => e.id === entryId) : null;
  const tmdbFields = resolveTmdbFields(watchlistTmdbPick, existingEntry, title);
  const want = { wantPaulo: !!watchlistWant.paulo, wantJulia: !!watchlistWant.julia };
  if(entryId){
    const entry = existingEntry;
    addedAt = entry ? entry.addedAt : Date.now();
    if(pendingPoster === undefined) poster = entry ? (entry.poster || null) : null;
    if(entry && (entry.title !== title || (entry.tmdbId ?? null) !== tmdbFields.tmdbId)){
      delete wikiCache[entry.id];
      saveWikiCache();
    }
    Object.assign(entry, { title, description, poster, genres, ...tmdbFields, ...want });
  } else {
    entryId = 'w'+Date.now();
    watchlist.push({ id:entryId, title, description, addedAt, poster, genres, ...tmdbFields, ...want });
  }
  saveWatchlistLocal();
  closeWatchlistModal();
  renderWatchlist();
  updateWatchlistStats();

  if(cloudEnabled){
    // merge: preserva campos que não são editados aqui (ex: a ordem personalizada)
    setDoc(doc(watchlistColRef, entryId), { title, description, addedAt, poster, genres, ...tmdbFields, ...want }, { merge:true })
      .catch(err => logCloudError('Falha ao sincronizar item da watchlist', err));
  }
});

// Devolve uma cópia do item removido (pra dar pra desfazer)
function removeWatchlistEntry(id){
  const removed = watchlist.find(e => e.id === id);
  watchlist = watchlist.filter(e => e.id !== id);
  saveWatchlistLocal();
  renderWatchlist();
  updateWatchlistStats();
  if(cloudEnabled){
    deleteDoc(doc(watchlistColRef, id)).catch(err => logCloudError('Falha ao remover item no servidor', err));
  }
  return removed ? { ...removed } : null;
}

function restoreWatchlistEntry(entry){
  watchlist = watchlist.filter(e => e.id !== entry.id).concat([entry]);
  saveWatchlistLocal();
  renderWatchlist();
  updateWatchlistStats();
  if(cloudEnabled){
    const { id, ...rest } = entry;
    setDoc(doc(watchlistColRef, id), rest).catch(err => logCloudError('Falha ao restaurar item da watchlist', err));
  }
}

watchlistModalRemove.addEventListener('click', ()=>{
  if(!watchlistEditId) return;
  const removed = removeWatchlistEntry(watchlistEditId);
  closeWatchlistModal();
  if(removed){
    showUndoToast(`"${removed.title}" saiu da lista`, ()=> restoreWatchlistEntry(removed));
  }
});

watchlistMarkWatched.addEventListener('click', ()=>{
  if(!watchlistEditId) return;
  const entry = watchlist.find(e => e.id === watchlistEditId);
  if(!entry) return;
  playClick();
  convertingWatchlistId = entry.id;
  closeWatchlistModal();
  openDiarioModal(null, watchlistToDiarioPrefill(entry));
});

watchlistModalClose.addEventListener('click', closeWatchlistModal);
watchlistModalOverlay.addEventListener('click', (e)=>{ if(e.target === watchlistModalOverlay) closeWatchlistModal(); });
watchlistSearch.addEventListener('input', renderWatchlist);

/* =====================================================
   TELA DE LEITURA — abre ao clicar num filme do Diário ou
   da Watchlist, com pôster, gêneros, nota (Diário) ou
   sinopse (Watchlist). A edição só acontece explicitamente
   pelo botão "Editar".
===================================================== */
const movieViewOverlay = document.getElementById('movieViewOverlay');
const movieViewClose = document.getElementById('movieViewClose');
const movieViewPhoto = document.getElementById('movieViewPhoto');
const movieViewGenres = document.getElementById('movieViewGenres');
const movieViewTitle = document.getElementById('movieViewTitle');
const movieViewMeta = document.getElementById('movieViewMeta');
const movieViewRating = document.getElementById('movieViewRating');
const movieViewRatingPaulo = document.getElementById('movieViewRatingPaulo');
const movieViewRatingJulia = document.getElementById('movieViewRatingJulia');
const movieViewObsSection = document.getElementById('movieViewObsSection');
const movieViewObsTitle = document.getElementById('movieViewObsTitle');
const movieViewObsText = document.getElementById('movieViewObsText');
const movieViewEditBtn = document.getElementById('movieViewEditBtn');
const movieViewMarkWatchedBtn = document.getElementById('movieViewMarkWatchedBtn');

const movieViewBackdrop = document.getElementById('movieViewBackdrop');
const movieViewCard = movieViewOverlay.querySelector('.view-card');
const movieViewOverviewSection = document.getElementById('movieViewOverviewSection');
const movieViewOverviewText = document.getElementById('movieViewOverviewText');
const movieViewProvidersSection = document.getElementById('movieViewProvidersSection');
const movieViewProviders = document.getElementById('movieViewProviders');
const movieViewEyebrow = document.getElementById('movieViewEyebrow');

let viewingMovieEntry = null;
let viewingMovieKind = null; // 'diario' | 'watchlist' | 'favorito'

function setMovieViewImage(src, title){
  movieViewPhoto.innerHTML = src
    ? `<img src="${src}" alt="${escapeHtml(title)}" onerror="handlePosterError(this)">`
    : posterPlaceholderHTML;
  movieViewBackdrop.style.backgroundImage = src ? `url("${src}")` : '';
  applyTint(movieViewCard, src);
}

/* "Capa que voa": ao abrir um filme, o pôster do card viaja até a tela
   de leitura (e volta ao fechar).
   Técnica FLIP feita à mão: uma cópia da capa (já carregada, tamanho
   grande) é animada só com transform/opacity via Web Animations — isso
   roda no compositor (GPU), sem redesenhar a página a cada quadro.
   A folha do filme sobe junto, também só com transform/opacity. */
const reducedMotionQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
const FLY_EASE = 'cubic-bezier(.22,.9,.24,1)';
const FLY_OPEN_MS = 500;
const FLY_CLOSE_MS = 400;
let viewOriginPoster = null;
let flyCleanup = null; // conclui na hora uma animação em andamento

function flyEnabled(){
  return !reducedMotionQuery.matches && typeof Element.prototype.animate === 'function';
}
function finishFlight(){
  if(!flyCleanup) return;
  const f = flyCleanup;
  flyCleanup = null;
  f();
}
// Posição inicial da folha (de baixo no celular, leve zoom no computador)
function sheetFromTransform(){
  return window.matchMedia('(min-width:640px)').matches ? 'translateY(14px) scale(.96)' : 'translateY(72px)';
}
// Cópia da capa posicionada (fixa) exatamente sobre `rect`
function makeFlyClone(src, rect){
  const img = document.createElement('img');
  img.className = 'fly-poster';
  img.alt = '';
  img.decoding = 'sync';
  img.src = src;
  img.style.left = rect.left + 'px';
  img.style.top = rect.top + 'px';
  img.style.width = rect.width + 'px';
  img.style.height = rect.height + 'px';
  document.body.appendChild(img);
  return img;
}
// transform que faz um elemento que está em `to` aparecer em `from`
function flipTransform(from, to){
  return `translate3d(${from.left - to.left}px, ${from.top - to.top}px, 0) scale(${from.width / to.width}, ${from.height / to.height})`;
}

function animateViewOpen(fromPoster, src){
  finishFlight();
  const first = fromPoster.getBoundingClientRect();
  // Abre já no estado final (sem a transição do CSS) pra medir onde a capa vai parar
  movieViewOverlay.classList.add('no-anim', 'open');
  const last = movieViewPhoto.getBoundingClientRect();
  const clone = makeFlyClone(src, last);
  movieViewPhoto.style.visibility = 'hidden';
  fromPoster.style.visibility = 'hidden';

  const anims = [
    clone.animate(
      [{ transform: flipTransform(first, last) }, { transform: 'none' }],
      { duration: FLY_OPEN_MS, easing: FLY_EASE }
    ),
    movieViewOverlay.animate([{ opacity: 0 }, { opacity: 1 }], { duration: 260, easing: 'ease-out' }),
    movieViewCard.animate(
      [{ transform: sheetFromTransform(), opacity: 0 }, { transform: 'none', opacity: 1 }],
      { duration: FLY_OPEN_MS - 60, easing: FLY_EASE }
    ),
  ];
  const done = ()=>{
    anims.forEach(a => a.cancel());
    clone.remove();
    movieViewPhoto.style.visibility = '';
    fromPoster.style.visibility = '';
    movieViewOverlay.classList.remove('no-anim');
  };
  settleFlight(done, anims[0], FLY_OPEN_MS);
}

// Termina a animação quando ela acabar — ou, por segurança, depois do
// tempo dela (se o navegador pausar os quadros, a tela não fica presa)
function settleFlight(done, anim, ms){
  flyCleanup = done;
  const end = ()=>{ if(flyCleanup === done){ flyCleanup = null; done(); } };
  anim.finished.then(end).catch(()=>{});
  setTimeout(end, ms + 250);
}

function animateViewClose(back){
  finishFlight();
  const photoImg = movieViewPhoto.querySelector('img');
  const src = photoImg && photoImg.complete && photoImg.naturalWidth ? (photoImg.currentSrc || photoImg.src) : null;
  const canFly = src && back && back.isConnected && isOnScreen(back);
  const first = movieViewPhoto.getBoundingClientRect();
  const target = canFly ? back.getBoundingClientRect() : null;
  const clone = canFly ? makeFlyClone(src, first) : null;
  movieViewOverlay.classList.add('no-anim');
  if(canFly){
    movieViewPhoto.style.visibility = 'hidden';
    back.style.visibility = 'hidden';
  }

  const anims = [
    movieViewOverlay.animate([{ opacity: 1 }, { opacity: 0 }], { duration: 280, easing: 'ease-in', fill: 'forwards' }),
    movieViewCard.animate(
      [{ transform: 'none', opacity: 1 }, { transform: sheetFromTransform(), opacity: 0 }],
      { duration: 280, easing: 'cubic-bezier(.4,0,1,1)', fill: 'forwards' }
    ),
  ];
  if(clone){
    anims.unshift(clone.animate(
      [{ transform: 'none' }, { transform: flipTransform(target, first) }],
      { duration: FLY_CLOSE_MS, easing: FLY_EASE, fill: 'forwards' }
    ));
  }
  const done = ()=>{
    movieViewOverlay.classList.remove('open');
    void movieViewOverlay.offsetWidth; // aplica o "fechado" antes de religar as transições do CSS
    anims.forEach(a => a.cancel());
    if(clone) clone.remove();
    movieViewPhoto.style.visibility = '';
    if(canFly) back.style.visibility = '';
    movieViewOverlay.classList.remove('no-anim');
  };
  settleFlight(done, anims[0], clone ? FLY_CLOSE_MS : 280);
}

// Aquece a cor da capa assim que o dedo encosta no card (o clique vem
// ~100ms depois), pra tela já abrir na cor certa sem repintar no meio.
document.addEventListener('pointerdown', (ev)=>{
  const poster = ev.target.closest && ev.target.closest('.movie-card, .mural-card, .fav-slot, .home-last');
  const src = loadedImgSrc(originPosterOf(poster));
  if(src) posterColor(src);
}, { passive: true });

function originPosterOf(el){
  if(!el) return null;
  return el.matches('.m-poster, .mural-poster, .fav-poster, .home-last-poster') ? el : el.querySelector('.m-poster, .mural-poster, .fav-poster, .home-last-poster');
}
function loadedImgSrc(posterEl){
  const img = posterEl && posterEl.querySelector('img');
  return img && img.complete && img.naturalWidth ? (img.currentSrc || img.src) : null;
}
function isOnScreen(el){
  const r = el.getBoundingClientRect();
  return r.width > 0 && r.bottom > 0 && r.top < window.innerHeight;
}

function openMovieView(entry, kind, originEl){
  viewingMovieEntry = entry;
  viewingMovieKind = kind;
  const fromPoster = originPosterOf(originEl);
  viewOriginPoster = fromPoster;

  movieViewPhoto.innerHTML = '<div class="skeleton-poster"></div>';
  movieViewBackdrop.style.backgroundImage = '';
  // A capa que já está carregada no card serve na hora (e é ela que "voa")
  const knownPoster = (kind === 'favorito' ? favoritePoster(entry) : entry.poster) || loadedImgSrc(fromPoster);
  if(knownPoster){
    setMovieViewImage(knownPoster, entry.title);
  } else {
    const lookupId = kind === 'favorito' ? (entry.diarioId || entry.id) : entry.id;
    getMovieInfo({ id: lookupId, t: entry.title, y: entry.year || '', tmdbId: entry.tmdbId || null }).then(info=>{
      if(viewingMovieEntry !== entry) return;
      setMovieViewImage((info && info.found && info.image) ? info.image : null, entry.title);
    }).catch(()=>{
      if(viewingMovieEntry === entry) setMovieViewImage(null, entry.title);
    });
  }

  const eyebrows = {
    diario: 'No nosso diário',
    watchlist: 'Na lista pra ver',
    favorito: entry.who === 'julia' ? 'Favorito da Julia' : 'Favorito do Paulo',
  };
  movieViewEyebrow.textContent = eyebrows[kind] || '';
  movieViewEyebrow.className = 'view-eyebrow' + (kind === 'favorito' ? ' who-' + entry.who : '');

  const genresHtml = kind === 'favorito' ? '' : genreChipsHtml(entryGenres(entry));
  movieViewGenres.innerHTML = genresHtml;
  movieViewGenres.style.display = genresHtml ? 'flex' : 'none';

  movieViewTitle.textContent = entry.title;

  const metaParts = [];
  if(kind === 'diario' && entry.where){
    const whereIcon = entry.where === 'Cinema' ? 'clapperboard' : 'sofa';
    metaParts.push(`<span>${iconHtml(whereIcon)} ${escapeHtml(entry.where)}</span>`);
  }
  if(entry.year) metaParts.unshift(`<span>${escapeHtml(String(entry.year))}</span>`);
  if(kind === 'diario'){
    const media = computeMedia(entry);
    if(media != null) metaParts.push(`<span class="view-meta-media">${iconHtml('star')} ${formatNum(media)} de média</span>`);
  }
  if(kind === 'watchlist' && (entry.wantPaulo || entry.wantJulia)){
    const who = [entry.wantPaulo && 'Paulo', entry.wantJulia && 'Julia'].filter(Boolean).join(' e ');
    metaParts.push(`<span class="view-meta-hype">${iconHtml('flame')} ${who} ${entry.wantPaulo && entry.wantJulia ? 'querem' : 'quer'} muito</span>`);
  }
  movieViewMeta.innerHTML = metaParts.join('');
  movieViewMeta.style.display = metaParts.length ? 'flex' : 'none';

  if(kind === 'diario'){
    movieViewRating.style.display = 'flex';
    movieViewRatingPaulo.textContent = entry.notaPaulo!=null ? formatNum(entry.notaPaulo) : '—';
    movieViewRatingJulia.textContent = entry.notaJulia!=null ? formatNum(entry.notaJulia) : '—';
  } else {
    movieViewRating.style.display = 'none';
  }

  const obsContent = kind === 'diario' ? entry.obs : entry.description;
  movieViewObsTitle.textContent = { diario:'Nossa resenha', watchlist:'Sobre', favorito:'Por que é favorito' }[kind];
  if(obsContent){
    movieViewObsSection.style.display = 'block';
    movieViewObsText.textContent = obsContent;
  } else {
    movieViewObsSection.style.display = 'none';
  }

  // Sinopse oficial (do TMDB), quando não é o mesmo texto já mostrado acima
  const overview = entry.overview && entry.overview !== obsContent ? entry.overview : '';
  movieViewOverviewSection.style.display = overview ? 'block' : 'none';
  movieViewOverviewText.textContent = overview;

  // Onde assistir: faz sentido pra quem ainda vai ver (watchlist) e pros favoritos
  if(tmdbEnabled() && (kind === 'watchlist' || kind === 'favorito')){
    movieViewProvidersSection.style.display = 'block';
    const lookup = kind === 'favorito'
      ? { id: entry.diarioId || entry.id, t: entry.title, y: entry.year || '', tmdbId: entry.tmdbId || null }
      : lookupOf(entry);
    renderProviders(movieViewProviders, lookup, movieViewProvidersSection);
  } else {
    movieViewProvidersSection.style.display = 'none';
    movieViewProviders._provToken = null;
  }

  movieViewMarkWatchedBtn.style.display = kind === 'watchlist' ? 'flex' : 'none';

  const flySrc = loadedImgSrc(fromPoster);
  if(flyEnabled() && fromPoster && flySrc && isOnScreen(fromPoster)){
    animateViewOpen(fromPoster, flySrc);
  } else {
    finishFlight();
    movieViewOverlay.classList.add('open');
  }
}
// instant=true quando a tela fecha pra abrir outra (editar, mover pro Diário):
// aí a capa não volta voando pro card.
function closeMovieView(instant){
  const back = instant === true ? null : viewOriginPoster;
  viewOriginPoster = null;
  viewingMovieEntry = null;
  viewingMovieKind = null;
  if(!movieViewOverlay.classList.contains('open')) return;
  if(instant === true || !flyEnabled()){
    finishFlight();
    movieViewOverlay.classList.remove('open');
    return;
  }
  animateViewClose(back);
}
movieViewClose.addEventListener('click', closeMovieView);
movieViewOverlay.addEventListener('click', (e)=>{ if(e.target === movieViewOverlay) closeMovieView(); });

movieViewEditBtn.addEventListener('click', ()=>{
  const entry = viewingMovieEntry, kind = viewingMovieKind;
  closeMovieView(true);
  if(kind === 'diario') openDiarioModal(entry);
  else if(kind === 'favorito') openFavModal(entry.who, entry.slot);
  else openWatchlistModal(entry);
});
movieViewMarkWatchedBtn.addEventListener('click', ()=>{
  if(!viewingMovieEntry) return;
  const entry = viewingMovieEntry;
  playClick();
  closeMovieView(true);
  convertingWatchlistId = entry.id;
  openDiarioModal(null, watchlistToDiarioPrefill(entry));
});

document.addEventListener('keydown', (e)=>{
  if(e.key !== 'Escape') return;
  if(diarioModalOverlay.classList.contains('open')) closeDiarioModal();
  if(watchlistModalOverlay.classList.contains('open')) closeWatchlistModal();
  if(movieViewOverlay.classList.contains('open')) closeMovieView();
  if(favModalOverlay.classList.contains('open')) closeFavModal();
  if(settingsOverlay.classList.contains('open')) closeSettings();
  if(memoryOverlay.classList.contains('open')) closeMemory();
  if(addChooserOverlay.classList.contains('open')) closeAddChooser();
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
const slotMachine = document.getElementById('slotMachine');
const slotStrip = document.getElementById('slotStrip');
const wrSpinBtn = document.getElementById('wrSpinBtn');
const wrResultCard = document.getElementById('wrResultCard');
const wrGenreTag = document.getElementById('wrGenreTag');
const wrTitle = document.getElementById('wrTitle');
const wrMedia = document.getElementById('wrMedia');
const wrActions = document.getElementById('wrActions');
const wrMarkWatched = document.getElementById('wrMarkWatched');
const wrSpinAgain = document.getElementById('wrSpinAgain');

let wrSelectedGenres = new Set();
let wrPool = [];
let wrSpinning = false;
let wrCurrentPick = null;

MOVIE_GENRES.forEach(g=>{
  const chip = document.createElement('div');
  chip.className = 'toggle-chip';
  chip.innerHTML = iconHtml(g.icon) + ' ' + escapeHtml(g.label);
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
  return watchlist
    .filter(e => !isVetoed('w:' + e.id))
    .filter(e => wrSelectedGenres.size === 0 || entryGenres(e).some(g => wrSelectedGenres.has(g)));
}

// Fatias da roleta proporcionais ao peso (1 + um por quem "quer muito")
function wheelSegments(pool){
  const total = pool.reduce((s, e) => s + hypeWeight(e), 0) || 1;
  let acc = 0;
  return pool.map(item => {
    const size = (hypeWeight(item) / total) * Math.PI * 2;
    const seg = { item, start: acc, size };
    acc += size;
    return seg;
  });
}

function renderWatchlistRoulette(){
  wrPool = getWatchlistPool();
  const n = wrPool.length;
  const vetoed = watchlist.filter(e => isVetoed('w:' + e.id)).length;
  const parts = [];
  if(n) parts.push(`${n} filme${n===1?'':'s'} ${wrSelectedGenres.size ? 'com essas categorias' : 'na roleta'}`);
  const hyped = wrPool.filter(e => hypeWeight(e) > 1).length;
  if(hyped) parts.push(`${hyped} com chance extra`);
  if(vetoed) parts.push(`${vetoed} vetado${vetoed===1?'':'s'} hoje`);
  wrPoolHint.textContent = parts.join(' · ');
  const hasItems = wrPool.length > 0;
  wrHasItems.hidden = !hasItems;
  wrEmptyState.style.display = hasItems ? 'none' : 'block';
  if(hasItems && !wrSpinning) renderSlotIdle();
}

/* -----------------------------------------------------
   Caça-níquel de pôsteres: uma fileira de capas passa por
   trás da moldura central e desacelera até parar no filme
   sorteado. Quem tem "quer muito" aparece mais vezes na
   fileira (e tem mais chance, pelo mesmo peso da sorte).
----------------------------------------------------- */
let slotItems = [];      // filmes na fileira, na ordem
let slotCenterIndex = 0; // qual célula está na moldura

// Sorteio ponderado pelo "quer muito"
function weightedPick(pool){
  const segments = wheelSegments(pool);
  let roll = Math.random() * Math.PI * 2;
  const seg = segments.find(s => (roll -= s.size) < 0) || segments[segments.length - 1];
  return seg.item;
}

function fillSlotPoster(cell, item){
  const wrap = cell.querySelector('.slot-poster');
  const show = (src)=>{
    wrap.innerHTML = src
      ? `<img src="${src}" alt="" draggable="false" onerror="this.remove()">`
      : '';
  };
  if(item.poster){ show(item.poster); return; }
  getMovieInfo(lookupOf(item))
    .then(info => show(info && info.found && info.image ? info.image : null))
    .catch(()=> show(null));
}

function buildSlotStrip(items){
  slotItems = items;
  slotStrip.innerHTML = '';
  items.forEach(item=>{
    const cell = document.createElement('div');
    cell.className = 'slot-cell';
    const hype = hypeHtml(item);
    cell.innerHTML = `
      <div class="slot-ph"><span>${escapeHtml(item.title)}</span></div>
      <div class="slot-poster"></div>
      ${hype ? `<div class="mural-hype">${hype}</div>` : ''}`;
    slotStrip.appendChild(cell);
    fillSlotPoster(cell, item);
  });
}

// Deslocamento que deixa a célula `index` no centro da moldura
function slotOffsetFor(index){
  const cell = slotStrip.children[index];
  if(!cell) return 0;
  const windowW = slotStrip.parentElement.clientWidth;
  return windowW/2 - (cell.offsetLeft + cell.offsetWidth/2);
}
function placeSlot(index, extra, transition){
  slotStrip.style.transition = transition || 'none';
  slotStrip.style.transform = `translate3d(${slotOffsetFor(index) + (extra || 0)}px,0,0)`;
}

// Fileira parada: embaralhada, com o último sorteado (se ainda vale) no centro
function renderSlotIdle(){
  if(!wrPool.length) return;
  const shuffled = wrPool.slice().sort(()=> Math.random() - .5);
  let items = shuffled;
  while(items.length < 9) items = items.concat(shuffled);
  items = items.slice(0, Math.max(9, Math.min(items.length, 15)));
  const center = 4;
  if(wrCurrentPick && wrPool.some(e => e.id === wrCurrentPick.id)){
    items = items.filter(e => e.id !== wrCurrentPick.id);
    items.splice(center, 0, wrCurrentPick);
  }
  buildSlotStrip(items);
  slotCenterIndex = center;
  slotStrip.children[center]?.classList.toggle('winner', !!(wrCurrentPick && items[center].id === wrCurrentPick.id));
  placeSlot(center);
}
window.addEventListener('resize', ()=>{
  if(rouletteMode === 'watchlist' && slotItems.length && !wrSpinning) placeSlot(slotCenterIndex);
});

const SLOT_SPIN_MS = 5200;

function spinWatchlistWheel(){
  if(wrSpinning || wrPool.length === 0) return;
  wrSpinning = true;
  wrSpinBtn.disabled = true;
  wrResultCard.classList.remove('show');
  slotMachine.classList.add('spinning', 'fast');
  clearTint(slotMachine);
  scheduleTicks(SLOT_SPIN_MS - 300);

  const picked = weightedPick(wrPool);

  // Começa pelas capas que já estão na tela (sem "pulo"), passa por uma
  // fileira sorteada e termina no escolhido.
  const lead = [];
  for(let i = slotCenterIndex - 2; i <= slotCenterIndex + 2; i++){
    lead.push(slotItems[i] || weightedPick(wrPool));
  }
  const RUN = 24;
  const middle = Array.from({ length: RUN }, ()=> weightedPick(wrPool));
  const tail = Array.from({ length: 4 }, ()=> weightedPick(wrPool));
  const items = lead.concat(middle, [picked], tail);
  const winIndex = lead.length + RUN;

  buildSlotStrip(items);
  placeSlot(2);
  void slotStrip.offsetWidth; // aplica a posição inicial antes de animar

  // Para um pouco fora do centro e depois "encaixa" — dá o suspense
  const cellW = slotStrip.children[winIndex].offsetWidth;
  const jitter = (Math.random() - .5) * cellW * .55;
  placeSlot(winIndex, jitter, `transform ${SLOT_SPIN_MS}ms cubic-bezier(.1,.75,.12,1)`);
  setTimeout(()=> slotMachine.classList.remove('fast'), SLOT_SPIN_MS * .55);

  const onEnd = (ev)=>{
    if(ev.target !== slotStrip || ev.propertyName !== 'transform') return;
    slotStrip.removeEventListener('transitionend', onEnd);
    placeSlot(winIndex, 0, 'transform 380ms cubic-bezier(.34,1.56,.64,1)');
    setTimeout(()=>{
      slotCenterIndex = winIndex;
      wrSpinning = false;
      wrSpinBtn.disabled = false;
      slotMachine.classList.remove('spinning');
      const winCell = slotStrip.children[winIndex];
      winCell.classList.add('winner');
      showWatchlistResult(picked);
      burstConfetti(winCell);
      flareBurst(winCell);
      playChime();
      if(navigator.vibrate) navigator.vibrate([30,40,70]);
    }, 400);
  };
  slotStrip.addEventListener('transitionend', onEnd);
}

function showWatchlistResult(item){
  wrCurrentPick = item;
  const genresHtml = genreChipsHtml(entryGenres(item));
  wrGenreTag.innerHTML = genresHtml || '<span class="m-genre-chip" style="background:rgba(255,255,255,.08); color:var(--muted);">Sem categoria</span>';
  wrTitle.textContent = item.title;
  wrActions.style.display = 'flex';

  const descHtml = item.description
    ? `<p>${escapeHtml(item.description)}</p>`
    : `<p class="r-no-info">Sem descrição guardada pra esse aqui.</p>`;

  const tint = (src)=>{ applyTint(wrResultCard, src); applyTint(slotMachine, src); };
  if(item.poster){
    tint(item.poster);
    wrMedia.innerHTML = `<div class="r-poster-wrap"><img class="r-poster" src="${item.poster}" alt="${escapeHtml(item.title)}" onerror="handlePosterError(this)"></div><div class="r-synopsis">${descHtml}</div>`;
  } else {
    tint(null);
    // Sem capa enviada à mão: tenta buscar uma automaticamente, igual já
    // acontece na grade da watchlist — antes esse giro nunca tentava e só
    // mostrava o placeholder direto.
    wrMedia.innerHTML = `<div class="r-poster-wrap"><div class="skeleton-poster"></div></div><div class="r-synopsis">${descHtml}</div>`;
    getMovieInfo(lookupOf(item)).then(info=>{
      if(!wrCurrentPick || wrCurrentPick.id !== item.id) return;
      const posterWrap = wrMedia.querySelector('.r-poster-wrap');
      if(!posterWrap) return;
      tint(info && info.found ? info.image : null);
      posterWrap.innerHTML = (info && info.found && info.image)
        ? `<img class="r-poster" src="${info.image}" alt="${escapeHtml(item.title)}" loading="lazy" onerror="handlePosterError(this)">`
        : posterPlaceholderHTML;
    }).catch(()=>{
      if(!wrCurrentPick || wrCurrentPick.id !== item.id) return;
      const posterWrap = wrMedia.querySelector('.r-poster-wrap');
      if(posterWrap) posterWrap.innerHTML = posterPlaceholderHTML;
    });
  }

  renderProviders(document.getElementById('wrProviders'), lookupOf(item));
  renderVetoUi();
  requestAnimationFrame(()=> wrResultCard.classList.add('show'));
}

wrSpinBtn.addEventListener('click', spinWatchlistWheel);
wrSpinAgain.addEventListener('click', ()=>{ playClick(); spinWatchlistWheel(); });
wrMarkWatched.addEventListener('click', ()=>{
  if(!wrCurrentPick) return;
  playClick();
  convertingWatchlistId = wrCurrentPick.id;
  openDiarioModal(null, watchlistToDiarioPrefill(wrCurrentPick));
});

/* =====================================================
   VETO — cada um pode vetar um sorteio por noite (vale pras
   duas roletas). O filme vetado sai do sorteio até a próxima
   sessão. A "noite" vira às 5h, pra sessão de madrugada contar
   como a mesma. Fica em sync/sessao pra valer nos dois celulares.
===================================================== */
const SESSAO_STORAGE_KEY = 'cinema-pj-sessao';
const sessaoDocRef = doc(db, 'sync', 'sessao');
const WHO_LABEL = { paulo:'Paulo', julia:'Julia' };

let sessao = {};
try{ sessao = JSON.parse(localStorage.getItem(SESSAO_STORAGE_KEY) || '{}') || {}; }catch(e){ sessao = {}; }

function sessionDay(){
  const d = new Date(Date.now() - 5*3600*1000);
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
}
function currentVetoes(){
  return (sessao && sessao.day === sessionDay() && Array.isArray(sessao.vetoes)) ? sessao.vetoes : [];
}
function vetoOf(who){ return currentVetoes().find(v => v.who === who) || null; }
function isVetoed(key){ return currentVetoes().some(v => v.key === key); }

function saveSessao(){
  try{ localStorage.setItem(SESSAO_STORAGE_KEY, JSON.stringify(sessao)); }catch(e){}
  if(cloudEnabled){
    setDoc(sessaoDocRef, sessao).catch(err => logCloudError('Falha ao sincronizar os vetos', err));
  }
  renderVetoUi();
  if(rouletteMode === 'watchlist') renderWatchlistRoulette();
}
function addVeto(who, key, title){
  sessao = {
    day: sessionDay(),
    vetoes: currentVetoes().filter(v => v.who !== who).concat([{ who, key, title, at: Date.now() }]),
  };
  saveSessao();
}
function resetVetoes(){
  sessao = { day: sessionDay(), vetoes: [] };
  saveSessao();
}

function renderVetoRow(el, key, title){
  if(!el) return;
  if(!key){ el.innerHTML = ''; return; }
  const vetoedBy = currentVetoes().find(v => v.key === key);
  if(vetoedBy){
    el.innerHTML = `<span class="veto-row-lbl">${iconHtml('ban')} Vetado por ${WHO_LABEL[vetoedBy.who]}</span>`;
    return;
  }
  el.innerHTML = `<span class="veto-row-lbl">Não rolou?</span>` + ['paulo','julia'].map(who=>{
    const used = vetoOf(who);
    return `<button type="button" class="veto-btn ${who[0]}" data-who="${who}" ${used ? 'disabled' : ''} title="${used ? `Já vetou ${escapeHtml(used.title)} hoje` : ''}">
      ${iconHtml('ban')} ${WHO_LABEL[who]} veta
    </button>`;
  }).join('');
  el.dataset.key = key;
  el.dataset.title = title;
}

function renderVetoUi(){
  const vetoes = currentVetoes();
  document.querySelectorAll('.veto-bar').forEach(bar=>{
    bar.innerHTML = `<span class="veto-bar-lbl">Vetos da noite</span>`
      + ['paulo','julia'].map(who=>{
          const v = vetoOf(who);
          return `<span class="veto-pill${v ? ' used' : ''}" title="${v ? `Vetou ${escapeHtml(v.title)}` : 'Ainda tem o veto'}">
            <span class="rate-dot ${who[0]}"></span>${WHO_LABEL[who]}${v ? ' ' + iconHtml('ban') : ''}
          </span>`;
        }).join('')
      + (vetoes.length ? `<button type="button" class="veto-reset" title="Devolve os vetos dos dois">${iconHtml('rotate-ccw')} Zerar</button>` : '');
  });
  renderVetoRow(document.getElementById('rVeto'), currentPick ? 'o:' + currentPick.id : null, currentPick ? currentPick.t : '');
  renderVetoRow(document.getElementById('wrVeto'), wrCurrentPick ? 'w:' + wrCurrentPick.id : null, wrCurrentPick ? wrCurrentPick.title : '');
}

document.addEventListener('click', (ev)=>{
  const reset = ev.target.closest('.veto-reset');
  if(reset){ playClick(); resetVetoes(); return; }
  const btn = ev.target.closest('.veto-btn');
  if(!btn || btn.disabled) return;
  const row = btn.closest('.veto-row');
  const who = btn.dataset.who;
  playClick();
  addVeto(who, row.dataset.key, row.dataset.title);
  if(navigator.vibrate) navigator.vibrate(40);
  // Vetou: gira de novo sozinho, já sem o filme vetado
  setTimeout(()=>{
    if(row.id === 'rVeto') spin();
    else spinWatchlistWheel();
  }, 450);
});

/* =====================================================
   CONFIGURAÇÕES — chave do TMDB e sons
===================================================== */
const settingsOverlay = document.getElementById('settingsOverlay');
const tmdbStatus = document.getElementById('tmdbStatus');
const tmdbSteps = document.getElementById('tmdbSteps');
const tmdbKeyInput = document.getElementById('tmdbKeyInput');
const tmdbKeySave = document.getElementById('tmdbKeySave');
const tmdbKeyRemove = document.getElementById('tmdbKeyRemove');
const tmdbMsg = document.getElementById('tmdbMsg');
const soundToggle = document.getElementById('soundToggle');

function openSettings(){
  refreshTmdbUi();
  tmdbMsg.textContent = '';
  tmdbMsg.className = 'settings-msg';
  soundToggle.checked = soundOn;
  settingsOverlay.classList.add('open');
}
function closeSettings(){ settingsOverlay.classList.remove('open'); }
document.getElementById('settingsBtn').addEventListener('click', ()=>{ playClick(); openSettings(); });
document.getElementById('settingsClose').addEventListener('click', closeSettings);
settingsOverlay.addEventListener('click', (e)=>{ if(e.target === settingsOverlay) closeSettings(); });
// Links "Ative o TMDB" dentro dos formulários
document.addEventListener('click', (ev)=>{
  if(!ev.target.closest('[data-open-settings]')) return;
  ev.preventDefault();
  openSettings();
});

function refreshTmdbUi(){
  const on = tmdbEnabled();
  tmdbStatus.textContent = on ? 'Conectado' : 'Desligado';
  tmdbStatus.classList.toggle('on', on);
  tmdbSteps.style.display = on ? 'none' : '';
  tmdbKeyRemove.style.display = on ? 'block' : 'none';
  tmdbKeyInput.placeholder = on ? 'Trocar a chave (cole uma nova)' : 'Cole a chave ou o token do TMDB';
  updateTmdbHints();
}

// Aplica uma chave nova (ou remove, com ''). persist=true grava na nuvem.
function setTmdbKey(key, persist){
  const changed = key !== tmdbKey;
  tmdbKey = key || '';
  try{
    if(tmdbKey) localStorage.setItem(TMDB_KEY_STORAGE, tmdbKey);
    else localStorage.removeItem(TMDB_KEY_STORAGE);
  }catch(e){}
  if(persist && cloudEnabled){
    setDoc(configDocRef, { tmdbKey: tmdbKey || null }, { merge:true })
      .catch(err => logCloudError('Falha ao salvar a chave do TMDB', err));
  }
  refreshTmdbUi();
  if(changed){
    // Capas e sinopses passam a vir do TMDB conforme os cards aparecem
    renderDiario();
    renderWatchlist();
    renderGrid();
    renderFavorites();
  }
}

tmdbKeySave.addEventListener('click', async ()=>{
  const key = tmdbKeyInput.value.trim();
  if(!key){ tmdbKeyInput.focus(); return; }
  tmdbKeySave.disabled = true;
  tmdbMsg.className = 'settings-msg';
  tmdbMsg.textContent = 'Testando a chave…';
  try{
    await tmdbFetch('/configuration', {}, key);
    setTmdbKey(key, true);
    tmdbKeyInput.value = '';
    tmdbMsg.className = 'settings-msg ok';
    tmdbMsg.textContent = 'Pronto! A busca automática está ligada nos dois aparelhos.';
    playChime();
  }catch(err){
    tmdbMsg.className = 'settings-msg err';
    tmdbMsg.textContent = 'Essa chave não funcionou. Confira se copiou ela inteira.';
  }
  tmdbKeySave.disabled = false;
});
tmdbKeyInput.addEventListener('keydown', (e)=>{ if(e.key === 'Enter') tmdbKeySave.click(); });
tmdbKeyRemove.addEventListener('click', ()=>{
  setTmdbKey('', true);
  tmdbMsg.className = 'settings-msg';
  tmdbMsg.textContent = 'TMDB desconectado. As capas voltam a vir da Wikipédia.';
});

soundToggle.addEventListener('change', ()=>{
  soundOn = soundToggle.checked;
  try{ localStorage.setItem(SOUND_KEY, soundOn ? 'on' : 'off'); }catch(e){}
  if(soundOn) playClick();
});

/* =====================================================
   FAVORITOS — vitrine de cada um (estilo Letterboxd): alguns
   filmes escolhidos à mão, com capa, nome e o porquê. Não
   depende das notas — favorito é favorito.
   Cada espaço é um documento "favoritos/{quem}-{posição}".
===================================================== */
const FAV_SLOTS = 4;
const FAVORITOS_STORAGE_KEY = 'cinema-pj-favoritos';

function loadFavoritos(){
  try{
    const raw = localStorage.getItem(FAVORITOS_STORAGE_KEY);
    if(raw) return JSON.parse(raw);
  }catch(e){}
  return [];
}
function saveFavoritosLocal(){
  try{ localStorage.setItem(FAVORITOS_STORAGE_KEY, JSON.stringify(favoritos)); }catch(e){}
}
let favoritos = loadFavoritos();

function favId(who, slot){ return `${who}-${slot}`; }
function findFavorite(who, slot){
  return favoritos.find(f => f.who === who && f.slot === slot) || null;
}
// Capa do favorito: a enviada à mão tem prioridade; senão reaproveita a
// capa do filme ligado no Diário (se tiver). Sem nenhuma das duas, quem
// chama busca na Wikipédia.
function favoritePoster(f){
  if(f.poster) return f.poster;
  const linked = f.diarioId ? diario.find(e => e.id === f.diarioId) : null;
  return linked && linked.poster ? linked.poster : null;
}

const favShelves = {
  julia: document.getElementById('favShelfJulia'),
  paulo: document.getElementById('favShelfPaulo'),
};

function renderFavorites(){
  Object.entries(favShelves).forEach(([who, shelf])=>{
    shelf.innerHTML = '';
    for(let slot = 1; slot <= FAV_SLOTS; slot++){
      const f = findFavorite(who, slot);
      const el = document.createElement('button');
      el.type = 'button';
      el.style.animationDelay = (slot*0.05) + 's';
      if(!f){
        el.className = 'fav-slot empty';
        el.setAttribute('aria-label', 'Escolher favorito');
        el.innerHTML = `<div class="fav-poster">${iconHtml('plus')}</div><div class="fav-title">Escolher</div>`;
        el.addEventListener('click', ()=>{ playClick(); openFavModal(who, slot); });
      } else {
        el.className = 'fav-slot';
        el.innerHTML = `<div class="fav-poster"><div class="skeleton-poster"></div></div><div class="fav-title">${escapeHtml(f.title)}</div>`;
        el.addEventListener('click', ()=> openMovieView(f, 'favorito', el));
        const posterEl = el.querySelector('.fav-poster');
        const poster = favoritePoster(f);
        if(poster){
          posterEl.innerHTML = `<img src="${poster}" alt="${escapeHtml(f.title)}" loading="lazy" onerror="handlePosterError(this)">`;
        } else {
          lazyLoadPoster(posterEl, {id: f.diarioId || f.id, t: f.title, y: f.year || '', tmdbId: f.tmdbId || null}, '');
        }
      }
      shelf.appendChild(el);
    }
  });
}

const favModalOverlay = document.getElementById('favModalOverlay');
const favModalEyebrow = document.getElementById('favModalEyebrow');
const favTitleInput = document.getElementById('favTitleInput');
const favSuggest = document.getElementById('favSuggest');
const favDescInput = document.getElementById('favDescInput');
const favModalSave = document.getElementById('favModalSave');
const favModalRemove = document.getElementById('favModalRemove');
const favModalClose = document.getElementById('favModalClose');
const favPosterPreview = document.getElementById('favPosterPreview');
const favPosterClear = document.getElementById('favPosterClear');
const favPoster = setupPosterPicker(favPosterPreview, document.getElementById('favPosterFile'), favPosterClear);

let favEditing = null; // { who, slot }
let favLinkedDiarioId = null;

// Mostra a capa que o favorito vai usar se ninguém enviar outra.
function refreshFavPreview(){
  if(favPoster.state.pending !== undefined) return; // já escolheram/limparam à mão
  const existing = favEditing ? findFavorite(favEditing.who, favEditing.slot) : null;
  if(existing && existing.poster){
    favPoster.render({ poster: existing.poster });
    return;
  }
  const linked = favLinkedDiarioId ? diario.find(e => e.id === favLinkedDiarioId) : null;
  if(linked && linked.poster){
    favPosterPreview.innerHTML = `<img src="${linked.poster}" alt="">`;
    favPosterClear.style.display = 'none';
  } else if(linked){
    favPoster.render({ id: linked.id, title: linked.title });
  } else if(existing){
    favPoster.render({ id: existing.id, title: existing.title });
  } else {
    favPoster.render(null);
  }
}

let favTmdbPick = null;
const favSuggestCtl = attachMovieSuggest(favTitleInput, favSuggest, {
  localItems: (q)=> diario.filter(e => normalizeTitle(e.title).includes(q)).slice(0, 4),
  onPickLocal: (e)=>{
    favTitleInput.value = e.title;
    favLinkedDiarioId = e.id;
    favTmdbPick = e.tmdbId ? { title: e.title, tmdbId: e.tmdbId, year: e.year ?? null } : null;
    refreshFavPreview();
    favDescInput.focus();
  },
  onPickTmdb: (r)=>{
    favTitleInput.value = r.title;
    favTmdbPick = tmdbPickOf(r);
    const norm = normalizeTitle(r.title);
    const inDiario = diario.find(e => e.tmdbId === r.id || normalizeTitle(e.title) === norm);
    favLinkedDiarioId = inDiario ? inDiario.id : null;
    const poster = tmdbPoster(r.poster_path);
    if(poster){
      favPoster.state.pending = poster;
      favPoster.render({ poster });
    } else {
      refreshFavPreview();
    }
    favDescInput.focus();
  },
  // Digitou o nome exato de um filme do Diário: já liga os dois (e a capa)
  onInput: ()=>{
    const q = normalizeTitle(favTitleInput.value);
    const exact = q ? diario.find(e => normalizeTitle(e.title) === q) : null;
    const newLink = exact ? exact.id : null;
    if(newLink !== favLinkedDiarioId){
      favLinkedDiarioId = newLink;
      refreshFavPreview();
    }
  },
});
function hideFavSuggest(){ favSuggestCtl.hide(); }

function openFavModal(who, slot){
  favEditing = { who, slot };
  favTmdbPick = null;
  const f = findFavorite(who, slot);
  favModalEyebrow.textContent = (who === 'julia' ? 'Favorito da Julia' : 'Favorito do Paulo') + ` · ${slot}º lugar`;
  favModalEyebrow.className = 'modal-eyebrow who-' + who;
  favTitleInput.value = f ? f.title : '';
  favDescInput.value = f ? (f.description || '') : '';
  favLinkedDiarioId = f ? (f.diarioId || null) : null;
  favModalRemove.style.display = f ? 'block' : 'none';
  favPoster.state.pending = undefined;
  refreshFavPreview();
  hideFavSuggest();
  favModalOverlay.classList.add('open');
  setTimeout(()=> favTitleInput.focus(), 150);
}
function closeFavModal(){
  favModalOverlay.classList.remove('open');
  hideFavSuggest();
  favEditing = null;
}
favModalClose.addEventListener('click', closeFavModal);
favModalOverlay.addEventListener('click', (e)=>{ if(e.target === favModalOverlay) closeFavModal(); });

favModalSave.addEventListener('click', ()=>{
  if(!favEditing) return;
  const title = favTitleInput.value.trim();
  if(!title){ favTitleInput.focus(); return; }
  playClick();
  const { who, slot } = favEditing;
  const id = favId(who, slot);
  const existing = findFavorite(who, slot);
  const pending = favPoster.state.pending;
  const poster = pending !== undefined ? pending : (existing ? (existing.poster || null) : null);
  const { tmdbId, year } = resolveTmdbFields(favTmdbPick, existing, title);
  if(existing && (existing.title !== title || (existing.tmdbId ?? null) !== tmdbId)){
    delete wikiCache[id];
    saveWikiCache();
  }
  const record = {
    who, slot, title,
    description: favDescInput.value.trim(),
    poster,
    diarioId: favLinkedDiarioId,
    tmdbId, year,
    updatedAt: Date.now(),
  };
  favoritos = favoritos.filter(f => !(f.who === who && f.slot === slot)).concat([{ id, ...record }]);
  saveFavoritosLocal();
  if(!existing){
    burstConfetti(favModalSave);
    playChime();
  }
  closeFavModal();
  renderFavorites();
  if(cloudEnabled){
    setDoc(doc(favoritosColRef, id), record).catch(err => logCloudError('Falha ao sincronizar favorito', err));
  }
});

favModalRemove.addEventListener('click', ()=>{
  if(!favEditing) return;
  const { who, slot } = favEditing;
  const id = favId(who, slot);
  const removed = findFavorite(who, slot);
  favoritos = favoritos.filter(f => !(f.who === who && f.slot === slot));
  saveFavoritosLocal();
  closeFavModal();
  renderFavorites();
  if(cloudEnabled){
    deleteDoc(doc(favoritosColRef, id)).catch(err => logCloudError('Falha ao remover favorito no servidor', err));
  }
  if(removed){
    const copy = { ...removed };
    showUndoToast(`"${copy.title}" saiu dos favoritos`, ()=>{
      favoritos = favoritos.filter(f => !(f.who === who && f.slot === slot)).concat([copy]);
      saveFavoritosLocal();
      renderFavorites();
      if(cloudEnabled){
        const { id: docId, ...rest } = copy;
        setDoc(doc(favoritosColRef, docId), rest).catch(err => logCloudError('Falha ao restaurar favorito', err));
      }
    });
  }
});

/* =====================================================
   NÓS — perfil do casal (estatísticas derivadas do Diário)
===================================================== */
let profileTopWho = 'geral'; // 'geral' | 'paulo' | 'julia'

function computeTop5(who){
  let list;
  if(who === 'paulo'){
    list = diario.filter(e => e.notaPaulo != null).map(e => ({ e, media: e.notaPaulo }));
  } else if(who === 'julia'){
    list = diario.filter(e => e.notaJulia != null).map(e => ({ e, media: e.notaJulia }));
  } else {
    list = diario.map(e => ({ e, media: computeMedia(e) })).filter(x => x.media != null);
  }
  return list.sort((a,b) => b.media - a.media).slice(0,5);
}

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

  const top5 = computeTop5(profileTopWho);

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
  renderFavorites();
  renderProfileExtras();
  const stats = computeProfileStats();

  animateNumberTo(document.getElementById('pTotal'), stats.total);
  document.getElementById('pAvg').textContent = formatNum(stats.avgCasal);
  const topGenre = stats.genreRanking[0];
  document.getElementById('pTopGenre').innerHTML = topGenre ? (iconHtml(topGenre.genre.icon) + ' ' + escapeHtml(topGenre.genre.label)) : '—';
  document.getElementById('pCritico').textContent = stats.critico;

  const topList = document.getElementById('profileTopList');
  topList.innerHTML = '';
  if(!stats.top5.length){
    topList.innerHTML = '<div class="profile-empty">Avaliem alguns filmes no Diário pra ver o ranking aqui.</div>';
  } else {
    stats.top5.forEach((x,i)=>{
      const rowIsPerfect = x.media === 10;
      const row = document.createElement('div');
      row.className = 'profile-rank-row' + (rowIsPerfect ? ' perfect-score' : '');
      row.style.animationDelay = (i*0.06)+'s';
      row.innerHTML = `
        <div class="rank-num rank-${i+1}">${i+1}</div>
        <div class="m-poster">${x.e.poster ? '' : '<div class="skeleton-poster"></div>'}</div>
        <div class="m-info"><div class="m-title">${escapeHtml(x.e.title)}</div></div>
        <div class="m-ratings">
          <span class="m-media-badge${rowIsPerfect ? ' perfect' : ''}">${rowIsPerfect ? iconHtml('star')+' ' : ''}${formatNum(x.media)}</span>
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
        lazyLoadPoster(posterEl, lookupOf(x.e), 'm-poster-img');
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
        lazyLoadPoster(posterEl, lookupOf(x.e), 'm-poster-img');
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
        <div class="genre-bar-label">${iconHtml(g.genre.icon)} ${escapeHtml(g.genre.label)}</div>
        <div class="genre-bar-track"><div class="genre-bar-fill" style="width:0%; background:${g.genre.color};"></div></div>
        <div class="genre-bar-count">${g.count}</div>
      `;
      genreBars.appendChild(row);
      const fill = row.querySelector('.genre-bar-fill');
      requestAnimationFrame(()=>{ fill.style.width = (g.count / max * 100) + '%'; });
    });
  }
}

const profileTopFilter = document.getElementById('profileTopFilter');
profileTopFilter.addEventListener('click', (ev)=>{
  const btn = ev.target.closest('.mode-btn');
  if(!btn) return;
  playClick();
  profileTopWho = btn.dataset.who;
  [...profileTopFilter.children].forEach(b => b.classList.toggle('active', b === btn));
  renderProfile();
});

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

const TAB_ORDER = ['diario', 'watchlist', 'roleta', 'perfil'];
const TAB_LABELS = { diario:'Diário', watchlist:'Quero ver', roleta:'Roleta', perfil:'Nós' };

function setActiveTab(tab){
  const prev = activeTab;
  activeTab = tab;
  tabBtns.forEach(b => b.classList.toggle('active', b.dataset.tab === tab));
  // A aba nova entra pelo lado de onde veio (dá a sensação de "deslizar")
  const dir = TAB_ORDER.indexOf(tab) >= TAB_ORDER.indexOf(prev) ? 'from-right' : 'from-left';
  Object.entries(panels).forEach(([name, el]) => {
    el.hidden = name !== tab;
    el.classList.remove('from-right', 'from-left');
    if(name === tab && prev && prev !== tab) el.classList.add(dir);
  });
  const topTitle = document.getElementById('topBarTitle');
  if(topTitle) topTitle.textContent = TAB_LABELS[tab] || '';
  localStorage.setItem(ACTIVE_TAB_KEY, tab);
  if(tab !== 'roleta'){ fabSpin.classList.remove('visible'); }
  else {
    requestAnimationFrame(()=>{
      drawWheel();
      // a fileira de pôsteres pode ter sido montada com a aba escondida
      if(rouletteMode === 'watchlist' && slotItems.length && !wrSpinning) placeSlot(slotCenterIndex);
    });
  }
  if(tab === 'perfil'){ renderProfile(); }
}
function goToTab(tab){
  const changed = tab !== activeTab;
  setActiveTab(tab);
  // Cada aba começa do topo (a navegação fica fixa embaixo, então sem
  // isso a aba nova abriria no meio da rolagem da anterior).
  if(changed) window.scrollTo({ top: 0, behavior: 'instant' });
}
tabBtns.forEach(b => b.addEventListener('click', ()=>{
  playClick();
  goToTab(b.dataset.tab);
}));
// (a aba inicial é aberta lá no fim, na inicialização — depois de todo o
// código carregado, senão abrir direto em "Nós" quebrava o app)

/* =====================================================
   Deslizar pros lados troca de aba (celular). Ignora gestos que
   começam em coisas que já usam o arraste: campos, roletas,
   carrosséis, alças de reordenar e janelas abertas.
===================================================== */
(function initSwipeTabs(){
  let start = null;
  const IGNORE = 'input, textarea, select, button.drag-handle, .drag-handle, .genre-dropdown, .slot-machine, .wheel-area, .wrapped-track, .rating-chart, .bottom-nav, .reorder-item';
  document.addEventListener('touchstart', (e)=>{
    start = null;
    if(e.touches.length !== 1) return;
    if(document.querySelector('.modal-overlay.open')) return;
    if(diarioReorderMode || watchlistReorderMode) return;
    if(e.target.closest && e.target.closest(IGNORE)) return;
    const t = e.touches[0];
    start = { x: t.clientX, y: t.clientY, at: Date.now() };
  }, { passive: true });
  document.addEventListener('touchend', (e)=>{
    if(!start) return;
    const t = e.changedTouches[0];
    const dx = t.clientX - start.x;
    const dy = t.clientY - start.y;
    const quick = Date.now() - start.at < 650;
    start = null;
    if(!quick || Math.abs(dx) < 70 || Math.abs(dx) < Math.abs(dy) * 1.8) return;
    const idx = TAB_ORDER.indexOf(activeTab);
    const next = TAB_ORDER[idx + (dx < 0 ? 1 : -1)];
    if(!next) return;
    if(navigator.vibrate) navigator.vibrate(8);
    goToTab(next);
  }, { passive: true });
})();

/* =====================================================
   Cabeçalho que encolhe: quando o cabeçalho grande sai da tela,
   uma barra fina (foto pequena + nome da aba) aparece no topo.
===================================================== */
(function initTopBar(){
  const bar = document.getElementById('topBar');
  const header = document.querySelector('header');
  if(!bar || !header) return;
  let ticking = false;
  const update = ()=>{
    ticking = false;
    const show = window.scrollY > header.offsetTop + header.offsetHeight - 12;
    bar.classList.toggle('show', show);
    bar.setAttribute('aria-hidden', show ? 'false' : 'true');
  };
  window.addEventListener('scroll', ()=>{
    if(!ticking){ ticking = true; requestAnimationFrame(update); }
  }, { passive: true });
  update();
})();

/* =====================================================
   TELA INICIAL — saudação + último filme em destaque
===================================================== */
function greetingNow(){
  const h = new Date().getHours();
  if(h >= 5 && h < 12) return 'Bom dia';
  if(h >= 12 && h < 18) return 'Boa tarde';
  return 'Boa noite';
}
function homeLineNow(){
  const d = new Date();
  const day = d.getDay(); // 0 dom … 6 sáb
  const h = d.getHours();
  if((day === 5 || day === 6) && (h >= 17 || h < 4)) return 'Noite perfeita pra um filminho. O que vai ser hoje?';
  if(day === 0) return 'Domingo pede sofá, pipoca e um bom filme.';
  if(h >= 5 && h < 12) return 'Já pensaram no filme de hoje à noite?';
  return 'O que vamos assistir hoje?';
}
function lastWatched(){
  if(!diario.length) return null;
  return diario.reduce((a, b) => ((b.addedAt || 0) > (a.addedAt || 0) ? b : a));
}

let homeLastEntry = null;
function renderHome(){
  const hero = document.getElementById('homeHero');
  if(!hero) return;
  document.getElementById('homeGreeting').textContent = greetingNow();
  document.getElementById('homeLine').textContent = homeLineNow();

  const last = lastWatched();
  const card = document.getElementById('homeLast');
  const bg = document.getElementById('homeHeroBg');
  const posterEl = document.getElementById('homeLastPoster');
  card.hidden = !last;
  if(!last){ bg.style.backgroundImage = ''; clearTint(hero); homeLastEntry = null; return; }

  const sameEntry = homeLastEntry && homeLastEntry.id === last.id && homeLastEntry.poster === last.poster;
  homeLastEntry = last;
  document.getElementById('homeLastTitle').textContent = last.title;
  const media = computeMedia(last);
  const meta = [];
  if(media != null) meta.push(`<span class="home-last-media">${iconHtml('star')} ${formatNum(media)}</span>`);
  if(last.notaPaulo != null) meta.push(`<span><span class="rate-dot p"></span>${formatNum(last.notaPaulo)}</span>`);
  if(last.notaJulia != null) meta.push(`<span><span class="rate-dot j"></span>${formatNum(last.notaJulia)}</span>`);
  if(last.where) meta.push(`<span>${iconHtml(last.where === 'Cinema' ? 'clapperboard' : 'sofa')} ${escapeHtml(last.where)}</span>`);
  document.getElementById('homeLastMeta').innerHTML = meta.join('');

  if(sameEntry) return; // capa e cor já estão certas
  const show = (src)=>{
    if(homeLastEntry !== last) return;
    posterEl.innerHTML = src ? `<img src="${src}" alt="" onerror="handlePosterError(this)">` : posterPlaceholderHTML;
    bg.style.backgroundImage = src ? `url("${src}")` : '';
    applyTint(hero, src);
  };
  if(last.poster){ show(last.poster); return; }
  posterEl.innerHTML = '<div class="skeleton-poster"></div>';
  getMovieInfo(lookupOf(last))
    .then(info => show(info && info.found ? info.image : null))
    .catch(()=> show(null));
}

document.getElementById('homeLast').addEventListener('click', ()=>{
  if(homeLastEntry) openMovieView(homeLastEntry, 'diario', document.getElementById('homeLastPoster'));
});
document.getElementById('homeSpinBtn').addEventListener('click', ()=>{
  playClick();
  goToTab('roleta');
});

// "Adicionar": pergunta se já viram (Diário) ou se querem ver (lista)
const addChooserOverlay = document.getElementById('addChooserOverlay');
function closeAddChooser(){ addChooserOverlay.classList.remove('open'); }
document.getElementById('homeAddBtn').addEventListener('click', ()=>{
  playClick();
  addChooserOverlay.classList.add('open');
});
document.getElementById('addChooserClose').addEventListener('click', closeAddChooser);
addChooserOverlay.addEventListener('click', (e)=>{ if(e.target === addChooserOverlay) closeAddChooser(); });
document.getElementById('addChoiceDiario').addEventListener('click', ()=>{
  closeAddChooser();
  openDiarioModal(null);
});
document.getElementById('addChoiceWatchlist').addEventListener('click', ()=>{
  closeAddChooser();
  openWatchlistModal(null);
});

/* =====================================================
   NESTE DIA — lembra um filme registrado há 1 mês ou há N anos,
   num pop-up, no máximo uma vez por dia. (Abrir o site com
   ?neste-dia mostra uma prévia com o último filme, pra testar.)
===================================================== */
const MEMORY_DAY_KEY = 'cinema-pj-memory-day';
const memoryOverlay = document.getElementById('memoryOverlay');
let memoryEntry = null;
let memoryChecked = false;

function findMemory(){
  const now = new Date();
  const found = [];
  diario.forEach(e=>{
    if(!e.addedAt || e.addedAt < 1.5e12) return; // registros antigos sem data real
    const d = new Date(e.addedAt);
    if(d.getDate() !== now.getDate()) return;
    const months = (now.getFullYear() - d.getFullYear()) * 12 + (now.getMonth() - d.getMonth());
    if(months === 1) found.push({ e, months, label: 'há 1 mês' });
    else if(months >= 12 && months % 12 === 0){
      const y = months / 12;
      found.push({ e, months, label: y === 1 ? 'há 1 ano' : `há ${y} anos` });
    }
  });
  // Lembrança de anos tem prioridade; entre iguais, a mais bem avaliada
  found.sort((a, b) => (b.months - a.months) || ((computeMedia(b.e) ?? 0) - (computeMedia(a.e) ?? 0)));
  return found[0] || null;
}

function todayKey(){
  const d = new Date();
  return `${d.getFullYear()}-${d.getMonth()+1}-${d.getDate()}`;
}

function showMemory(memory, preview){
  memoryEntry = memory.e;
  const e = memory.e;
  document.getElementById('memoryKicker').textContent = preview ? 'Neste dia (prévia)' : `Neste dia, ${memory.label}`;
  document.getElementById('memoryTitle').textContent = e.title;
  const meta = [];
  if(e.notaPaulo != null) meta.push(`<span><span class="rate-dot p"></span>Paulo ${formatNum(e.notaPaulo)}</span>`);
  if(e.notaJulia != null) meta.push(`<span><span class="rate-dot j"></span>Julia ${formatNum(e.notaJulia)}</span>`);
  if(e.where) meta.push(`<span>${iconHtml(e.where === 'Cinema' ? 'clapperboard' : 'sofa')} ${escapeHtml(e.where)}</span>`);
  document.getElementById('memoryMeta').innerHTML = meta.join('');
  const quote = document.getElementById('memoryQuote');
  quote.textContent = e.obs ? `“${truncate(e.obs, 160)}”` : 'Vocês assistiram esse juntos. Que tal relembrar?';
  const posterEl = document.getElementById('memoryPoster');
  const card = memoryOverlay.querySelector('.memory-card');
  const show = (src)=>{
    posterEl.innerHTML = src ? `<img src="${src}" alt="">` : posterPlaceholderHTML;
    applyTint(card, src);
  };
  if(e.poster) show(e.poster);
  else {
    posterEl.innerHTML = '<div class="skeleton-poster"></div>';
    getMovieInfo(lookupOf(e)).then(info => show(info && info.found ? info.image : null)).catch(()=> show(null));
  }
  memoryOverlay.classList.add('open');
  if(!preview){ try{ localStorage.setItem(MEMORY_DAY_KEY, todayKey()); }catch(err){} }
}
function closeMemory(){ memoryOverlay.classList.remove('open'); }

// Chamado quando os dados do Diário chegam (nuvem ou local). Espera a
// abertura (splash) sumir e nenhuma outra janela estar aberta.
function maybeShowMemory(){
  if(memoryChecked) return;
  memoryChecked = true;
  const preview = new URLSearchParams(location.search).has('neste-dia');
  let shownToday = false;
  try{ shownToday = localStorage.getItem(MEMORY_DAY_KEY) === todayKey(); }catch(err){}
  if(shownToday && !preview) return;
  const memory = findMemory() || (preview && lastWatched() ? { e: lastWatched(), label: '' } : null);
  if(!memory) return;
  const tryShow = (attempt)=>{
    const busy = document.getElementById('splashScreen') || document.querySelector('.modal-overlay.open');
    if(busy){ if(attempt < 40) setTimeout(()=> tryShow(attempt + 1), 500); return; }
    showMemory(memory, preview && !findMemory());
  };
  setTimeout(()=> tryShow(0), 600);
}

document.getElementById('memoryClose').addEventListener('click', closeMemory);
document.getElementById('memoryDismiss').addEventListener('click', closeMemory);
memoryOverlay.addEventListener('click', (e)=>{ if(e.target === memoryOverlay) closeMemory(); });
document.getElementById('memoryOpen').addEventListener('click', ()=>{
  const entry = memoryEntry;
  closeMemory();
  if(entry) setTimeout(()=> openMovieView(entry, 'diario'), 120);
});

/* =====================================================
   NÓS — capa do perfil, gráfico de notas e retrospectiva
===================================================== */
const MONTHS_PT = ['janeiro','fevereiro','março','abril','maio','junho','julho','agosto','setembro','outubro','novembro','dezembro'];
const REAL_DATE_MIN = 1.5e12; // registros antigos (da planilha) não têm data real

function renderProfileExtras(){
  // "Juntos desde…" pelo primeiro registro com data de verdade
  const dated = diario.filter(e => (e.addedAt || 0) > REAL_DATE_MIN).sort((a,b) => a.addedAt - b.addedAt);
  const since = document.getElementById('profileSince');
  if(dated.length){
    const d = new Date(dated[0].addedAt);
    since.textContent = `Registrando filme por filme desde ${MONTHS_PT[d.getMonth()]} de ${d.getFullYear()}.`;
  }
  // Fundo da capa: mosaico desfocado das capas dos favoritos/melhores
  const bg = document.getElementById('profileBannerBg');
  const posters = favoritos.map(favoritePoster).concat(diario.filter(e => e.poster && computeMedia(e) >= 9).map(e => e.poster)).filter(Boolean).slice(0, 4);
  bg.innerHTML = posters.map(src => `<span style="background-image:url('${src.replace(/'/g, '%27')}')"></span>`).join('');
  bg.classList.toggle('has-posters', posters.length > 0);

  renderRatingChart();
  renderWrapped();
}

/* Gráfico de linha: nota do Paulo e da Julia em cada filme, na ordem
   em que foram registrados. SVG desenhado à mão, com cursor + dica. */
const CHART_COLORS = { p:'#c48614', j:'#e84a98' }; // validados p/ o fundo escuro (contraste e daltonismo)

function renderRatingChart(){
  const el = document.getElementById('ratingChart');
  const list = diario.slice().sort((a,b) => (a.addedAt||0) - (b.addedAt||0))
    .filter(e => e.notaPaulo != null || e.notaJulia != null);
  if(list.length < 2){
    el.innerHTML = '<div class="profile-empty">Avaliem pelo menos dois filmes pra ver a linha do tempo.</div>';
    return;
  }
  const W = Math.max(280, el.clientWidth || 340);
  const H = 210;
  const pad = { l: 28, r: 10, t: 12, b: 26 };
  const n = list.length;
  const x = i => pad.l + (n === 1 ? 0 : i * (W - pad.l - pad.r) / (n - 1));
  const y = v => pad.t + (10 - v) / 10 * (H - pad.t - pad.b);

  // linha com "buracos" onde alguém não deu nota
  const pathFor = key => {
    let d = '', pen = false;
    list.forEach((e, i)=>{
      const v = e[key];
      if(v == null){ pen = false; return; }
      d += `${pen ? 'L' : 'M'}${x(i).toFixed(1)},${y(v).toFixed(1)}`;
      pen = true;
    });
    return d;
  };
  const lastIdx = key => { for(let i = n - 1; i >= 0; i--) if(list[i][key] != null) return i; return -1; };
  const endDot = (key, color) => {
    const i = lastIdx(key);
    return i < 0 ? '' : `<circle cx="${x(i)}" cy="${y(list[i][key])}" r="4" fill="${color}" stroke="#0d0b18" stroke-width="2"/>`;
  };
  const grid = [0, 5, 10].map(v => `
    <line x1="${pad.l}" x2="${W - pad.r}" y1="${y(v)}" y2="${y(v)}" class="chart-grid"/>
    <text x="${pad.l - 8}" y="${y(v) + 4}" class="chart-tick" text-anchor="end">${v}</text>`).join('');

  el.innerHTML = `
    <svg viewBox="0 0 ${W} ${H}" width="${W}" height="${H}" role="img" aria-label="Notas de Paulo e Julia em ${n} filmes, do primeiro ao mais recente">
      ${grid}
      <text x="${pad.l}" y="${H - 6}" class="chart-tick">primeiro</text>
      <text x="${W - pad.r}" y="${H - 6}" class="chart-tick" text-anchor="end">mais recente</text>
      <path d="${pathFor('notaPaulo')}" fill="none" stroke="${CHART_COLORS.p}" stroke-width="2" stroke-linejoin="round" stroke-linecap="round"/>
      <path d="${pathFor('notaJulia')}" fill="none" stroke="${CHART_COLORS.j}" stroke-width="2" stroke-linejoin="round" stroke-linecap="round"/>
      ${endDot('notaPaulo', CHART_COLORS.p)}
      ${endDot('notaJulia', CHART_COLORS.j)}
      <g class="chart-hover" visibility="hidden">
        <line class="chart-crosshair" y1="${pad.t}" y2="${H - pad.b}"/>
        <circle class="chart-hp" r="5" fill="${CHART_COLORS.p}" stroke="#0d0b18" stroke-width="2"/>
        <circle class="chart-hj" r="5" fill="${CHART_COLORS.j}" stroke="#0d0b18" stroke-width="2"/>
      </g>
      <rect class="chart-hit" x="0" y="0" width="${W}" height="${H}" fill="transparent"/>
    </svg>
    <div class="chart-tip" hidden></div>
    <table class="sr-only">
      <caption>Notas por filme</caption>
      <tr><th>Filme</th><th>Paulo</th><th>Julia</th></tr>
      ${list.map(e => `<tr><td>${escapeHtml(e.title)}</td><td>${formatNum(e.notaPaulo)}</td><td>${formatNum(e.notaJulia)}</td></tr>`).join('')}
    </table>`;

  const svg = el.querySelector('svg');
  const hover = svg.querySelector('.chart-hover');
  const cross = svg.querySelector('.chart-crosshair');
  const hp = svg.querySelector('.chart-hp');
  const hj = svg.querySelector('.chart-hj');
  const tip = el.querySelector('.chart-tip');
  const showAt = (clientX)=>{
    const r = svg.getBoundingClientRect();
    const px = (clientX - r.left) * (W / r.width);
    const i = Math.max(0, Math.min(n - 1, Math.round((px - pad.l) / ((W - pad.l - pad.r) / (n - 1)))));
    const e = list[i];
    const cx = x(i);
    cross.setAttribute('x1', cx); cross.setAttribute('x2', cx);
    hp.setAttribute('visibility', e.notaPaulo != null ? 'visible' : 'hidden');
    hj.setAttribute('visibility', e.notaJulia != null ? 'visible' : 'hidden');
    if(e.notaPaulo != null){ hp.setAttribute('cx', cx); hp.setAttribute('cy', y(e.notaPaulo)); }
    if(e.notaJulia != null){ hj.setAttribute('cx', cx); hj.setAttribute('cy', y(e.notaJulia)); }
    hover.setAttribute('visibility', 'visible');
    tip.innerHTML = `<strong>${escapeHtml(e.title)}</strong>
      <span><i class="chart-swatch p"></i>Paulo ${formatNum(e.notaPaulo)}</span>
      <span><i class="chart-swatch j"></i>Julia ${formatNum(e.notaJulia)}</span>`;
    tip.hidden = false;
    const left = (cx / W) * r.width;
    tip.style.left = Math.max(70, Math.min(r.width - 70, left)) + 'px';
  };
  const hide = ()=>{ hover.setAttribute('visibility', 'hidden'); tip.hidden = true; };
  svg.addEventListener('pointermove', (ev)=> showAt(ev.clientX));
  svg.addEventListener('pointerdown', (ev)=> showAt(ev.clientX));
  svg.addEventListener('pointerleave', (ev)=>{ if(ev.pointerType === 'mouse') hide(); });
}
window.addEventListener('resize', ()=>{ if(activeTab === 'perfil') renderRatingChart(); });

/* Retrospectiva do ano: cartões estilo "Wrapped" num carrossel */
function renderWrapped(){
  const year = new Date().getFullYear();
  document.getElementById('wrappedTitle').textContent = `Retrospectiva ${year}`;
  const el = document.getElementById('profileWrapped');
  const items = diario.filter(e => (e.addedAt || 0) > REAL_DATE_MIN && new Date(e.addedAt).getFullYear() === year);
  if(!items.length){
    el.innerHTML = `<div class="profile-empty">A retrospectiva de ${year} aparece assim que vocês registrarem filmes este ano.</div>`;
    return;
  }
  const cinema = items.filter(e => e.where === 'Cinema').length;
  const casa = items.filter(e => e.where === 'Casa').length;
  const rated = items.map(e => ({ e, m: computeMedia(e) })).filter(x => x.m != null).sort((a,b) => b.m - a.m);
  const best = rated[0];
  const worst = rated.length > 1 ? rated[rated.length - 1] : null;

  const byMonth = {};
  items.forEach(e => { const m = new Date(e.addedAt).getMonth(); byMonth[m] = (byMonth[m] || 0) + 1; });
  const topMonth = Object.entries(byMonth).sort((a,b) => b[1] - a[1])[0];

  const genreCount = {};
  items.forEach(e => entryGenres(e).forEach(g => { genreCount[g] = (genreCount[g] || 0) + 1; }));
  const topGenreEntry = Object.entries(genreCount).sort((a,b) => b[1] - a[1])[0];
  const topGenre = topGenreEntry ? genreById(topGenreEntry[0]) : null;

  const clash = items.filter(e => e.notaPaulo != null && e.notaJulia != null)
    .map(e => ({ e, gap: Math.abs(e.notaPaulo - e.notaJulia) })).sort((a,b) => b.gap - a.gap)[0];
  const tensP = items.filter(e => e.notaPaulo === 10).length;
  const tensJ = items.filter(e => e.notaJulia === 10).length;

  const posterOf = e => e.poster ? `<img src="${e.poster}" alt="">` : '';
  const cards = [];
  cards.push(`
    <div class="wrapped-card w-total">
      <span class="w-kicker">${year} em filmes</span>
      <strong class="w-big">${items.length}</strong>
      <span class="w-label">filme${items.length === 1 ? '' : 's'} juntos</span>
      <span class="w-foot">${cinema} no cinema · ${casa} em casa</span>
    </div>`);
  if(best) cards.push(`
    <div class="wrapped-card w-best">
      <span class="w-kicker">O melhor do ano</span>
      <div class="w-poster">${posterOf(best.e)}</div>
      <strong class="w-title">${escapeHtml(best.e.title)}</strong>
      <span class="w-foot">${iconHtml('star')} ${formatNum(best.m)} de média</span>
    </div>`);
  if(topGenre) cards.push(`
    <div class="wrapped-card w-genre" style="--g:${topGenre.color}">
      <span class="w-kicker">O gênero de vocês</span>
      <span class="w-icon">${iconHtml(topGenre.icon)}</span>
      <strong class="w-title">${escapeHtml(topGenre.label)}</strong>
      <span class="w-foot">${topGenreEntry[1]} filme${topGenreEntry[1] === 1 ? '' : 's'} este ano</span>
    </div>`);
  if(topMonth) cards.push(`
    <div class="wrapped-card w-month">
      <span class="w-kicker">Mês mais cinéfilo</span>
      <strong class="w-big w-cap">${MONTHS_PT[+topMonth[0]]}</strong>
      <span class="w-foot">${topMonth[1]} filme${topMonth[1] === 1 ? '' : 's'} num mês só</span>
    </div>`);
  if(clash && clash.gap > 0) cards.push(`
    <div class="wrapped-card w-clash">
      <span class="w-kicker">A maior discórdia</span>
      <strong class="w-title">${escapeHtml(clash.e.title)}</strong>
      <span class="w-vs"><span><i class="rate-dot p"></i>${formatNum(clash.e.notaPaulo)}</span><em>vs</em><span><i class="rate-dot j"></i>${formatNum(clash.e.notaJulia)}</span></span>
      <span class="w-foot">${formatNum(clash.gap)} pontos de diferença</span>
    </div>`);
  cards.push(`
    <div class="wrapped-card w-tens">
      <span class="w-kicker">Notas 10</span>
      <span class="w-vs big"><span><i class="rate-dot p"></i>${tensP}</span><em>×</em><span><i class="rate-dot j"></i>${tensJ}</span></span>
      <span class="w-foot">${tensP === tensJ ? 'Empatados na empolgação' : (tensP > tensJ ? 'Paulo se empolgou mais' : 'Julia se empolgou mais')}</span>
    </div>`);
  if(worst && worst.m < (best ? best.m : 10)) cards.push(`
    <div class="wrapped-card w-worst">
      <span class="w-kicker">Esse não desceu</span>
      <strong class="w-title">${escapeHtml(worst.e.title)}</strong>
      <span class="w-foot">${formatNum(worst.m)} de média</span>
    </div>`);

  el.innerHTML = `<div class="wrapped-track">${cards.join('')}</div>`;

  // Capa do "melhor do ano" sem capa enviada: busca automática
  const bestPoster = el.querySelector('.w-best .w-poster');
  if(best && bestPoster && !best.e.poster){
    getMovieInfo(lookupOf(best.e)).then(info=>{
      if(info && info.found && info.image) bestPoster.innerHTML = `<img src="${info.image}" alt="" onerror="this.remove()">`;
    }).catch(()=>{});
  }
}

/* =====================================================
   Capas que surgem suavemente: toda imagem de capa começa
   transparente e ganha .is-loaded quando termina de carregar.
===================================================== */
document.addEventListener('load', (e)=>{
  const t = e.target;
  if(t && t.tagName === 'IMG') t.classList.add('is-loaded');
}, true);

/* =====================================================
   Sincronização em nuvem (Firestore)
   Faz login anônimo, semeia o banco na primeira vez que
   alguém abrir o app, e escuta mudanças em tempo real.
   Se qualquer etapa falhar, o app segue 100% no localStorage.
===================================================== */
const cloudStatusEl = document.getElementById('cloudStatus');

function setCloudStatus(text, cls){
  if(!cloudStatusEl) return;
  cloudStatusEl.innerHTML = text;
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
  el.innerHTML = iconHtml('triangle-alert') + ' ' + escapeHtml(msg);
  el.classList.add('show');
  clearTimeout(cloudToastTimer);
  cloudToastTimer = setTimeout(()=> el.classList.remove('show'), 5000);
}
function logCloudError(action, err){
  console.warn(action, err);
  showCloudError('Não sincronizou com a nuvem (' + action.replace(/^Falha ao /, '') + '). Só salvou neste aparelho por enquanto.');
}

async function initCloudSync(){
  if(OFFLINE_MODE){
    console.info('Modo offline (?offline): nuvem desligada, nada é sincronizado.');
    maybeShowMemory();
    return;
  }
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
    setCloudStatus(iconHtml('cloud-off') + ' Modo local (só neste aparelho)', 'cloud-off');
    maybeShowMemory();
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
      maybeShowMemory();
    });
    successCount++;
  }catch(err){
    console.warn('Falha ao sincronizar o diário (seguindo local só pra essa parte):', err);
    maybeShowMemory();
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

  try{
    onSnapshot(favoritosColRef, (snap)=>{
      favoritos = snap.docs.map(d => ({ id:d.id, ...d.data() }));
      try{ localStorage.setItem(FAVORITOS_STORAGE_KEY, JSON.stringify(favoritos)); }catch(e){}
      renderFavorites();
    }, (err)=> console.warn('Falha ao escutar os favoritos:', err));
    successCount++;
  }catch(err){
    console.warn('Falha ao sincronizar os favoritos (seguindo local só pra essa parte):', err);
  }

  cloudEnabled = successCount > 0;

  // Configurações compartilhadas (chave do TMDB) e vetos da noite.
  // Não entram na contagem acima: se falharem, o resto segue normal.
  try{
    onSnapshot(configDocRef, (snap)=>{
      if(snap.exists()){
        const remoteKey = snap.data().tmdbKey || '';
        if(remoteKey !== tmdbKey) setTmdbKey(remoteKey, false);
      } else if(tmdbKey){
        // Chave salva só neste aparelho (de antes da nuvem): sobe pra nuvem
        setDoc(configDocRef, { tmdbKey }, { merge:true }).catch(()=>{});
      }
    }, (err)=> console.warn('Falha ao escutar as configurações:', err));
    onSnapshot(sessaoDocRef, (snap)=>{
      if(!snap.exists()) return;
      sessao = snap.data() || {};
      try{ localStorage.setItem(SESSAO_STORAGE_KEY, JSON.stringify(sessao)); }catch(e){}
      renderVetoUi();
      if(rouletteMode === 'watchlist') renderWatchlistRoulette();
    }, (err)=> console.warn('Falha ao escutar os vetos:', err));
  }catch(err){
    console.warn('Falha ao sincronizar configurações/vetos:', err);
  }

  if(successCount === 4){
    setCloudStatus(iconHtml('cloud') + ' Sincronizado entre aparelhos', 'cloud-on');
  } else if(successCount > 0){
    setCloudStatus(iconHtml('cloud') + ' Sincronizado parcialmente — veja o console', 'cloud-off');
    showCloudError('Uma parte não sincronizou com a nuvem — confira se as regras do Firestore foram publicadas.');
  } else {
    setCloudStatus(iconHtml('cloud-off') + ' Modo local (só neste aparelho)', 'cloud-off');
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
renderFavorites();
renderVetoUi();
refreshTmdbUi();
// Abre a última aba usada. Protegido: um erro de desenho numa aba nunca
// pode impedir a sincronização com a nuvem logo abaixo.
try{ setActiveTab(activeTab); }catch(err){ console.error('Falha ao abrir a aba inicial:', err); }
initCloudSync();
