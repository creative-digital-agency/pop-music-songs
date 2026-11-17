 'use strict';
const $ = selector => document.querySelector(selector);
const audio = $('#audio');
let albums = [], queue = [], queueIndex = -1, currentTrack = null;
const formatTime = seconds => !Number.isFinite(seconds) ? '0:00' : `${Math.floor(seconds / 60)}:${String(Math.floor(seconds % 60)).padStart(2,'0')}`;
function el(tag, className = '', text) { const node = document.createElement(tag); if (className) node.className = className; if (text !== undefined) node.textContent = text; return node; }
function makeArt(album) { const art = el('div', 'album-art' + (album.cover ? '' : ' placeholder')); if (album.cover) { const img = el('img'); img.src = album.cover; img.alt = `Cover art for ${album.title}`; img.loading = 'lazy'; art.append(img); } else art.append(el('span','note','♫')); return art; }
function renderAlbums() {
 const grid = $('#albumGrid'); grid.replaceChildren();
 const term = $('#search').value.toLowerCase().trim();
 const visible = albums.filter(a => [a.title,a.artist,a.genre,a.description,...a.tracks.map(t=>t.title)].join(' ').toLowerCase().includes(term));
 $('#emptyState').hidden = visible.length > 0;
 visible.forEach(album => {
  const card = el('article','album-card'); card.id = `album-${album.id}`; card.append(makeArt(album));
  const body = el('div','album-body'); body.append(el('div','album-tag',album.genre.toUpperCase()),el('h3','',album.title),el('div','artist',`by ${album.artist}`),el('p','album-desc',album.description || 'Explore the sound and songs of this album.'));
  const foot = el('div','album-footer'); foot.append(el('span','',album.sample && !album.tracks.length ? 'COMING SOON · ALBUM PREVIEW' : `${album.tracks.length} ${album.tracks.length===1?'track':'tracks'}`)); body.append(foot);
  if (album.tracks.length) { const list = el('div','track-list'); album.tracks.forEach((track,i) => { const row = el('div','track'); const play = el('button','','▶'); play.type='button'; play.setAttribute('aria-label',`Play ${track.title}`); play.addEventListener('click',()=>playTrack(album.id,i)); row.append(play,el('span','track-name',track.title),el('span','track-time',track.duration ? formatTime(track.duration) : '♪')); list.append(row); }); body.append(list); }
  card.append(body); grid.append(card);
 }); updateSchema(); updateActiveTrack();
}
function updateSchema() {
 const list = albums.map((a,i)=>({'@type':'ListItem',position:i+1,item:{'@type':'MusicAlbum',name:a.title,description:a.description,genre:a.genre,byArtist:{'@type':'MusicGroup',name:a.artist},numTracks:a.tracks.length,track:a.tracks.map((t,j)=>({'@type':'MusicRecording',name:t.title,position:j+1,byArtist:{'@type':'MusicGroup',name:a.artist},inAlbum:{'@type':'MusicAlbum',name:a.title},...(t.duration ? {duration:`PT${Math.floor(t.duration/60)}M${Math.round(t.duration%60)}S`} : {})}))}}));
 $('#musicSchema').textContent=JSON.stringify({'@context':'https://schema.org','@type':'ItemList',name:'Pop music albums',itemListElement:list});
const faq = [
  [
    'What is Pop Music Songs?',
    'Pop Music Songs is an interactive album and track library.'
  ],
  [
    'Who adds the music?',
    'Albums and songs are selected and published by the website administrator.'
  ],
  [
    'How can I listen to a song?',
    'Open an album and press the play button beside an available track. Preview albums without tracks are not yet playable.'
  ]
];
 let script=$('#faqSchema'); if(!script){script=el('script');script.type='application/ld+json';script.id='faqSchema';document.head.append(script)} script.textContent=JSON.stringify({'@context':'https://schema.org','@type':'FAQPage',mainEntity:faq.map(([q,a])=>({'@type':'Question',name:q,acceptedAnswer:{'@type':'Answer',text:a}}))});
}
function buildQueue() { queue=albums.flatMap(a=>a.tracks.map((t,i)=>({albumId:a.id,index:i}))); }
function updateActiveTrack(){ document.querySelectorAll('.track').forEach(row=>row.classList.remove('is-active')); if(!currentTrack)return; const album=albums.find(a=>a.id===currentTrack.albumId); const card=document.getElementById(`album-${currentTrack.albumId}`); const row=card?.querySelectorAll('.track')[currentTrack.index]; row?.classList.add('is-active'); }
async function playTrack(albumId,index){ const album=albums.find(a=>a.id===albumId); const track=album?.tracks[index]; if(!track?.src)return; currentTrack={albumId,index}; buildQueue(); queueIndex=queue.findIndex(q=>q.albumId===albumId&&q.index===index); audio.src=track.src; $('#player').hidden=false; $('#playerTitle').textContent=track.title; $('#playerArtist').textContent=album.artist; $('#playerArt').src=album.cover||'assets/favicon.png'; $('#currentTime').textContent='0:00'; $('#duration').textContent=track.duration?formatTime(track.duration):'0:00'; $('#seek').value=0; updateActiveTrack(); try{await audio.play()}catch(err){console.error('Audio playback failed:',err);$('#playPause').textContent='▶';$('#player').classList.remove('is-playing');} }
function skip(direction){if(!queue.length)return;const next=(queueIndex+direction+queue.length)%queue.length;const q=queue[next];playTrack(q.albumId,q.index)}
function validateCatalog(data) {
  if (!data || !Array.isArray(data.albums)) {
    throw Error('Invalid albums.json');
  }

  return data.albums.map((a, i) => ({
    id: String(a.id || `album-${i}`),
    title: String(a.title || 'Untitled album'),
    artist: String(a.artist || 'Unknown artist'),
    genre: String(a.genre || 'Pop'),
    description: String(a.description || ''),
    cover: a.cover || '',
    sample: !!a.sample,
    tracks: (a.tracks || [])
      .map((t, index) => {
        if (typeof t === 'string') {
          return {
            title: t.split('/').pop()
              .replace(/\.[^/.]+$/, ''),
            src: t,
            duration: null
          };
        }

        return {
          title: t.title || `Track ${index + 1}`,
          src: t.src,
          duration: Number(t.duration) || null
        };
      })
      .filter(t => t.src)
  }));
}
async function loadCatalog(){try{const response=await fetch('albums.json',{cache:'no-cache'});if(!response.ok)throw Error(`HTTP ${response.status}`);albums=validateCatalog(await response.json());renderAlbums()}catch(error){console.error('Could not load album catalog:',error);$('#emptyState').hidden=false;$('#emptyState').textContent='The music catalog could not be loaded. Please refresh the page or try again later.';}}
function setup(){
 $('#year').textContent=new Date().getFullYear();$('#search').addEventListener('input',renderAlbums);
 $('#playPause').addEventListener('click',()=>{if(audio.paused)audio.play().catch(console.error);else audio.pause()});
 $('#prevTrack').addEventListener('click',()=>skip(-1));$('#nextTrack').addEventListener('click',()=>skip(1));audio.addEventListener('ended',()=>skip(1));
 audio.addEventListener('pause',()=>{$('#playPause').textContent='▶';$('#player').classList.remove('is-playing')});audio.addEventListener('play',()=>{$('#playPause').textContent='❚❚';$('#player').classList.add('is-playing')});
 audio.addEventListener('loadedmetadata',()=>{$('#duration').textContent=formatTime(audio.duration)});
 audio.addEventListener('timeupdate',()=>{$('#currentTime').textContent=formatTime(audio.currentTime);$('#seek').value=audio.duration?Math.round(audio.currentTime/audio.duration*100):0});
 $('#seek').addEventListener('input',e=>{if(Number.isFinite(audio.duration))audio.currentTime=Number(e.target.value)*audio.duration/100});
 $('#mute').addEventListener('click',()=>{audio.muted=!audio.muted;$('#mute').textContent=audio.muted?'🔇':'🔊'});
 const eq=$('#heroEq');for(let i=0;i<47;i++){const bar=el('span');bar.style.height=`${15+Math.random()*95}px`;bar.style.animationDelay=`-${Math.random()*2}s`;bar.style.animationDuration=`${.5+Math.random()*1.3}s`;eq.append(bar)}
 const pointer=$('#cursorMic');document.addEventListener('pointermove',e=>{pointer.style.left=e.clientX+'px';pointer.style.top=e.clientY+'px'});
 loadCatalog();
}
setup();
