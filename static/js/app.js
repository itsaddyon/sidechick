// ── Config ───────────────────────────────────────────────────
const BACKEND_URL = window.location.hostname.includes('vercel.app')
  ? 'https://sidechick-syej.onrender.com' : '';
const socket = io(BACKEND_URL);
// --- PREMIUM TOAST NOTIFICATIONS ---
function showToast(message, type = 'info') {
  const container = document.getElementById('toast-container');
  if (!container) return;
  const toast = document.createElement('div');
  toast.className = 'premium-toast';
  toast.textContent = message;
  
  if(type === 'error') toast.style.borderLeft = '4px solid var(--red)';
  if(type === 'success') toast.style.borderLeft = '4px solid var(--green)';
  
  container.appendChild(toast);
  
  setTimeout(() => {
    toast.classList.add('fade-out');
    setTimeout(() => toast.remove(), 300);
  }, 3000);
}

// Override alert
window.alert = function(msg) {
  showToast(msg, 'error');
};

// --- ONE-CLICK INVITE LINKS ---
function copyInviteLink() {
  if (!currentGameCode) return;
  const inviteUrl = window.location.origin + window.location.pathname + '?game=' + currentGameCode;
  navigator.clipboard.writeText(inviteUrl).then(() => {
    showToast('✨ Invite Link Copied! Send it to your partner.', 'success');
  }).catch(() => {
    showToast('Failed to copy link.', 'error');
  });
}

// Check URL for Auto-Join
window.addEventListener('DOMContentLoaded', () => {
  const urlParams = new URLSearchParams(window.location.search);
  const gameToJoin = urlParams.get('game');
  if (gameToJoin) {
     const codeInput = document.getElementById('game-code-input');
     if(codeInput) codeInput.value = gameToJoin;
     showToast('✨ Invite code applied! Enter your name to join.', 'success');
     
     pendingGameCode = gameToJoin;
     pendingGameType = 'join';
     
     // Delay slightly to let layout load
     setTimeout(() => {
       const titleEl = document.getElementById('game-modal-title');
       if(titleEl) titleEl.textContent = 'Joining Game';
       const modalEl = document.getElementById('game-name-modal');
       if(modalEl) modalEl.style.display = 'flex';
       const nameInput = document.getElementById('modal-game-username');
       if(nameInput) nameInput.focus();
     }, 500);
     
     window.history.replaceState({}, document.title, window.location.pathname);
  }
});


// ── State ─────────────────────────────────────────────────────
let myName='',myRoom='',ghostText='',typingTimer=null;
let timelineCanvas=null,timelineCtx=null,timelineData=[],currentLevel=0;
let theirLastMsg='',aiAvailable=false,sidekickTone='balanced';
let autoSummaryEnabled=false,autoSummaryEvery=6,msgCountSinceSummary=0;
let messageHistory=[],lastInferRequestId=null,themeMode='light';
let toastTimer=null,roomMode='manual',openMatchWaiting=false;
const MOOD_ICONS={ANGRY:'ANG',SAD:'SAD',SCARED:'ALR',HAPPY:'POS',LOVING:'AFF',NEUTRAL:'NEU',UPSET:'UPS',THREATENING:'CRT'};

// ── Helpers ───────────────────────────────────────────────────
function escapeHtml(v){return String(v||'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&#39;')}
function isMobile(){return window.innerWidth<=720}

// ── Scroll ────────────────────────────────────────────────────
function scrollToBottom(smooth){
  const feed=document.getElementById('messages');
  if(!feed)return;
  requestAnimationFrame(()=>feed.scrollTo({top:feed.scrollHeight,behavior:smooth===false?'auto':'smooth'}));
}

// ── Theme ─────────────────────────────────────────────────────
function setThemeMode(mode){
  themeMode=mode==='dark'?'dark':'light';
  document.body.classList.toggle('theme-dark',themeMode==='dark');
  localStorage.setItem('theme',themeMode);
  updateThemeToggles();
}
function toggleTheme(){setThemeMode(themeMode==='dark'?'light':'dark')}
function updateThemeToggles(){
  document.querySelectorAll('[data-theme-toggle]').forEach(btn=>{
    const icon=btn.querySelector('.btn-icon');
    const label=themeMode==='dark'?'Light Mode':'Dark Mode';
    if(icon)icon.textContent=themeMode==='dark'?'☀':'☾';
    btn.title=label;btn.setAttribute('aria-label',label);
    btn.setAttribute('aria-pressed',themeMode==='dark'?'true':'false');
  });
  // Also sync dropdown theme button
  const ddTheme=document.getElementById('dd-theme-btn');
  if(ddTheme)ddTheme.textContent=(themeMode==='dark'?'☀ Light Mode':'☾ Dark Mode');
}
function initTheme(){setThemeMode(localStorage.getItem('theme')||'dark')}
function bindThemeToggles(){
  document.querySelectorAll('[data-theme-toggle]').forEach(btn=>{
    if(btn.dataset.bound)return;
    btn.dataset.bound='true';
    btn.addEventListener('click',toggleTheme);
  });
  updateThemeToggles();
}

// ── Toast ──────────────────────────────────────────────────────
function showDetectiveToast(message){
  const toast=document.getElementById('mode-toast');
  if(!toast)return;
  toast.textContent=message||'';
  toast.classList.add('show');
  if(toastTimer)clearTimeout(toastTimer);
  toastTimer=setTimeout(()=>toast.classList.remove('show'),1400);
}

// ── Composer resize ───────────────────────────────────────────
function autoResizeComposer(){
  const input=document.getElementById('msg-input');
  if(!input)return;
  input.style.height='auto';
  input.style.height=Math.min(Math.max(input.scrollHeight,isMobile()?44:52),isMobile()?120:160)+'px';
}

// ── Mobile topbar dropdown ────────────────────────────────────
// .topbar-dropdown lives inside .app-topbar as grid row 2.
// Toggle .is-open to show/hide. All buttons wire directly to functions.
let _ddOutsideHandler=null;

function toggleTopbarMenu(force){
  const dd=document.getElementById('topbar-dropdown');
  const btn=document.getElementById('mobile-menu-btn');
  if(!dd||!btn)return;
  const isOpen=dd.classList.contains('is-open');
  const next=typeof force==='boolean'?force:!isOpen;
  dd.classList.toggle('is-open',next);
  btn.setAttribute('aria-expanded',next?'true':'false');
  btn.textContent=next?'✕ Close':'☰ Menu';
  if(next){
    // Sync room badge
    const srcBadge=document.getElementById('room-badge');
    const ddBadge=document.getElementById('dd-room-badge');
    if(srcBadge&&ddBadge)ddBadge.textContent=srcBadge.textContent;
    // Sync vibe btn state
    const vibeBtn=document.getElementById('dd-vibe-btn');
    const detOn=!document.getElementById('app').classList.contains('ai-off');
    if(vibeBtn){vibeBtn.textContent=detOn?'⌕ Vibe Check: ON':'⌕ Vibe Check: OFF';vibeBtn.classList.toggle('active',detOn)}
    // Sync theme
    updateThemeToggles();
    // Close on outside tap
    if(_ddOutsideHandler)document.removeEventListener('click',_ddOutsideHandler);
    setTimeout(()=>{
      _ddOutsideHandler=(e)=>{
        if(!dd.contains(e.target)&&e.target!==btn&&!btn.contains(e.target))toggleTopbarMenu(false);
      };
      document.addEventListener('click',_ddOutsideHandler);
    },0);
  }else{
    if(_ddOutsideHandler){document.removeEventListener('click',_ddOutsideHandler);_ddOutsideHandler=null}
  }
}

// ── Detective / Vibe Check ────────────────────────────────────
const isDetectiveOn=()=>!document.getElementById('app').classList.contains('ai-off');

function setSidekickEnabled(enabled){
  const app=document.getElementById('app');
  const shell=document.querySelector('#app .app-shell');
  const panel=document.getElementById('ai-panel');
  const btn=document.getElementById('toggle-ai-btn');
  const overlay=document.getElementById('ai-overlay');
  if(!app||!panel)return;
  if(enabled){
    app.classList.remove('ai-off');app.setAttribute('data-detective-mode','on');
    if(shell)shell.classList.remove('ai-off');
    isMobile()?panel.classList.add('mobile-visible'):panel.style.display='flex';
    if(overlay&&isMobile()){
      overlay.classList.add('visible');
      // Backdrop click closes drawer only (keeps detective mode on)
      if(!overlay.dataset.bound){
        overlay.dataset.bound='true';
        overlay.addEventListener('click',closeAIDrawer);
      }
    }
    if(btn){btn.classList.add('active');btn.setAttribute('aria-pressed','true')}
  }else{
    app.classList.add('ai-off');app.setAttribute('data-detective-mode','off');
    if(shell)shell.classList.add('ai-off');
    panel.classList.remove('mobile-visible');
    if(!isMobile())panel.style.display='none';else panel.style.display='';
    if(overlay){overlay.classList.remove('visible');if(overlay.dataset.bound){overlay.removeEventListener('click',closeAIDrawer)}}
    if(btn){btn.classList.remove('active');btn.setAttribute('aria-pressed','false')}
  }
  if(btn){btn.title=enabled?'Detective Mode On':'Detective Mode Off';btn.setAttribute('aria-label',btn.title)}
  localStorage.setItem('sidekick_enabled',enabled?'true':'false');
  if(!enabled)updateMoodBackground('NEUTRAL');
  // Sync mobile vibe bar button
  const mobBtn=document.getElementById('mob-det-toggle');
  if(mobBtn)mobBtn.textContent='⌕ Open Vibe Check';  // Always start closed
  // Sync dropdown button
  const vibeBtn=document.getElementById('dd-vibe-btn');
  if(vibeBtn){vibeBtn.textContent=enabled?'⌕ Vibe Check: ON':'⌕ Vibe Check: OFF';vibeBtn.classList.toggle('active',enabled)}
}

function toggleSidekick(){
  const app=document.getElementById('app');if(!app)return;
  const wasOff=app.classList.contains('ai-off');
  setSidekickEnabled(wasOff);
  showDetectiveToast(wasOff?'Vibe Check: ON 🔍':'Vibe Check: OFF');
  toggleTopbarMenu(false);
}

// ── Close AI drawer (mobile) without disabling detective mode ───
function closeAIDrawer(){
  const panel=document.getElementById('ai-panel');
  const overlay=document.getElementById('ai-overlay');
  if(isMobile()){
    if(panel)panel.classList.remove('mobile-visible');
    if(overlay)overlay.classList.remove('visible');
    // Update button text to show users they can reopen
    const mobBtn=document.getElementById('mob-det-toggle');
    if(mobBtn)mobBtn.textContent='⌕ Open Vibe Check';
  }
}

// ── Toggle AI drawer (mobile) - open/close only, keep mode enabled ───
function toggleAIDrawer(){
  const panel=document.getElementById('ai-panel');
  const overlay=document.getElementById('ai-overlay');
  const mobBtn=document.getElementById('mob-det-toggle');
  if(!isMobile()||!panel)return;
  
  const isOpen=panel.classList.contains('mobile-visible');
  if(isOpen){
    closeAIDrawer();
  }else{
    // Open drawer
    panel.classList.add('mobile-visible');
    if(overlay)overlay.classList.add('visible');
    if(mobBtn)mobBtn.textContent='✕ Close';
  }
}

function updateMoodBackground(mood){
  const root=document.documentElement;
  const c={HAPPY:{g1:'rgba(76,255,150,0.2)',g2:'rgba(255,230,76,0.2)'},LOVING:{g1:'rgba(255,76,150,0.25)',g2:'rgba(255,150,76,0.2)'},ANGRY:{g1:'rgba(255,76,76,0.25)',g2:'rgba(150,76,255,0.2)'},THREATENING:{g1:'rgba(255,0,0,0.3)',g2:'rgba(0,0,0,0.4)'},SAD:{g1:'rgba(76,150,255,0.2)',g2:'rgba(120,120,120,0.2)'},SCARED:{g1:'rgba(255,255,76,0.15)',g2:'rgba(76,76,76,0.3)'},UPSET:{g1:'rgba(255,150,76,0.2)',g2:'rgba(150,76,76,0.2)'},NEUTRAL:{g1:'rgba(76,232,255,0.24)',g2:'rgba(255,111,141,0.2)'}};
  const m=c[mood]||c.NEUTRAL;
  root.style.setProperty('--bg-grad-1',`radial-gradient(circle at 10% 12%,${m.g1},transparent 42%)`);
  root.style.setProperty('--bg-grad-2',`radial-gradient(circle at 90% 10%,${m.g2},transparent 40%)`);
}

// ── Suggestions ────────────────────────────────────────────────
function renderSuggestions(sugg){
  const row=document.getElementById('sugg-row');if(!row)return;
  row.innerHTML='';
  if(!isDetectiveOn()||currentLevel<2||!sugg||!Object.keys(sugg).length){row.style.display='none';return}
  row.style.display='flex';
  Object.entries(sugg).forEach(([key,text])=>{
    const chip=document.createElement('button');
    chip.className='sugg-chip '+key;chip.textContent=text;
    chip.onclick=()=>{const i=document.getElementById('msg-input');i.value=text;autoResizeComposer();i.focus()};
    row.appendChild(chip);
  });
}

// ── Intel tab ─────────────────────────────────────────────────
function switchIntelTab(name,evt){
  document.querySelectorAll('.intel-tab').forEach(b=>b.classList.remove('active'));
  document.querySelectorAll('.intel-pane').forEach(p=>{p.classList.remove('is-active');p.classList.add('is-hidden')});
  const panel=document.getElementById('intel-'+name);
  if(panel){panel.classList.remove('is-hidden');requestAnimationFrame(()=>panel.classList.add('is-active'))}
  if(evt&&evt.target)evt.target.classList.add('active');
}

// ── Match / Room mode ──────────────────────────────────────────
function setMatchStatus(message,state=''){
  const el=document.getElementById('match-status');if(!el)return;
  el.textContent=message||'';el.className='match-status';if(state)el.classList.add(state);
}
function setOpenMatchWaiting(waiting){
  openMatchWaiting=!!waiting;
  const startBtn=document.getElementById('start-chat-btn');
  const cancelBtn=document.getElementById('cancel-match-btn');
  if(startBtn){startBtn.disabled=openMatchWaiting;startBtn.textContent=openMatchWaiting?'Finding Match…':(roomMode==='open'?'Find Open Match':'Start Chat')}
  if(cancelBtn)cancelBtn.classList.toggle('is-visible',openMatchWaiting);
}
function setRoomMode(mode){
  if(openMatchWaiting)cancelOpenMatch();
  roomMode=mode==='open'?'open':'manual';
  const manualBtn=document.getElementById('manual-room-btn');
  const openBtn=document.getElementById('open-room-btn');
  const input=document.getElementById('room-input');
  const openNote=document.getElementById('open-room-note');
  const roomCodeRow=document.querySelector('.room-code-row');
  const roomCodeLabel=document.querySelector('label[for="room-input"]');
  const startBtn=document.getElementById('start-chat-btn');
  if(manualBtn)manualBtn.classList.toggle('active',roomMode==='manual');
  if(openBtn)openBtn.classList.toggle('active',roomMode==='open');
  if(openNote)openNote.classList.toggle('is-visible',roomMode==='open');
  if(roomCodeRow)roomCodeRow.classList.toggle('is-hidden',roomMode==='open');
  if(roomCodeLabel)roomCodeLabel.classList.toggle('is-hidden',roomMode==='open');
  if(startBtn)startBtn.textContent=roomMode==='open'?'Find Open Match':'Start Chat';
  setMatchStatus('','');setOpenMatchWaiting(false);
  if(!input)return;
  input.readOnly=roomMode==='open';input.value='';
  if(roomMode!=='open')input.focus();
}
function startOpenMatch(username){
  if(!socket.connected)socket.connect();
  setOpenMatchWaiting(true);setMatchStatus('Waiting for another open room user…','waiting');
  socket.emit('open_match_request',{username});
}
function cancelOpenMatch(){
  if(openMatchWaiting&&socket.connected)socket.emit('open_match_cancel');
  setOpenMatchWaiting(false);setMatchStatus('','');
}

// ── AI availability ────────────────────────────────────────────
function updateAISummaryAvailability(enabled){
  aiAvailable=!!enabled;
  const btn=document.getElementById('ai-summary-btn');
  const text=document.getElementById('ai-summary-text');
  if(!btn||!text)return;
  btn.disabled=!aiAvailable;
  if(!aiAvailable)text.textContent='Developer got the AI bill - no worries 🙋';
  else if(!text.textContent||text.textContent.includes('OPENROUTER'))text.textContent='Ready to get the tea ☕';
}
function updateAIStatus(status){
  const el=document.getElementById('ai-status');if(!el)return;
  if(!status||!status.openrouter){el.textContent='Limited mode';el.className='panel-status warn';return}
  el.textContent='Reading the vibe fr 👀';el.className='panel-status ok';
}
async function refreshAIStatus(){
  try{const res=await fetch(BACKEND_URL+'/api/ai-status');const data=await res.json();updateAIStatus(data);updateAISummaryAvailability(!!data.openrouter);populateModelEvaluation(data.sequence_model)}catch{updateAIStatus(null)}
}
function populateModelEvaluation(seq){
  const ev=seq&&seq.summary&&seq.summary.evaluation;if(!ev)return;
  const s=(id,v)=>{const el=document.getElementById(id);if(el)el.textContent=v};
  s('eval-accuracy',Math.round((ev.accuracy||0)*100)+'%');s('eval-precision',Math.round((ev.precision||0)*100)+'%');
  s('eval-recall',Math.round((ev.recall||0)*100)+'%');s('eval-f1',Math.round((ev.f1||0)*100)+'%');
}
function loadSidekickSettings(){
  const storedTone=localStorage.getItem('sidekick_tone');
  const storedAuto=localStorage.getItem('sidekick_auto_summary');
  const storedEvery=localStorage.getItem('sidekick_auto_every');
  if(storedTone)sidekickTone=storedTone;
  if(storedAuto)autoSummaryEnabled=storedAuto==='true';
  if(storedEvery)autoSummaryEvery=parseInt(storedEvery,10)||6;
  const ts=document.getElementById('tone-select');
  const at=document.getElementById('auto-summary-toggle');
  const ae=document.getElementById('auto-summary-every');
  if(ts)ts.value=sidekickTone;if(at)at.checked=autoSummaryEnabled;if(ae)ae.value=String(autoSummaryEvery);
  if(!at||!ae){autoSummaryEnabled=false;autoSummaryEvery=6}
}
function initSidekickControls(){
  const ts=document.getElementById('tone-select');
  const at=document.getElementById('auto-summary-toggle');
  const ae=document.getElementById('auto-summary-every');
  if(ts&&!ts.dataset.bound){ts.dataset.bound='true';ts.addEventListener('change',()=>{sidekickTone=ts.value;localStorage.setItem('sidekick_tone',sidekickTone)})}
  if(at&&!at.dataset.bound){at.dataset.bound='true';at.addEventListener('change',()=>{autoSummaryEnabled=at.checked;localStorage.setItem('sidekick_auto_summary',autoSummaryEnabled?'true':'false')})}
  if(ae&&!ae.dataset.bound){ae.dataset.bound='true';ae.addEventListener('change',()=>{autoSummaryEvery=parseInt(ae.value,10)||6;localStorage.setItem('sidekick_auto_every',String(autoSummaryEvery))})}
}

// ── Enter / Leave Room ─────────────────────────────────────────
function joinChat(){
  const u=((document.getElementById('username-input') || document.getElementById('chat-username-input')).value||'').trim();
  if(!u){alert('Enter your name first.');return}
  if(roomMode==='open'){startOpenMatch(u);return}
  const r=(document.getElementById('room-input').value||'').trim();
  if(!r){alert('Enter your name and room code.');return}
  enterRoom(u,r,"You're chatting as "+u+'.');
}
function enterRoom(username,room,subText){
  myName=username;myRoom=room;ghostText='';
  timelineData=[];messageHistory=[];msgCountSinceSummary=0;
  hideThreatStop();
  document.getElementById('messages').innerHTML='';
  const empty=document.getElementById('messages-empty');if(empty)empty.style.display='grid';
  if(!socket.connected)socket.connect();
  socket.emit('join',{username,room});
  document.getElementById('lobby').style.display='none';
  document.getElementById('app').style.display='flex';
  document.body.classList.add('app-active');
  document.getElementById('header-title').textContent='Room '+room;
  document.getElementById('header-sub').textContent=subText||"You're chatting as "+username+'.';
  const badge=document.getElementById('room-badge');if(badge)badge.textContent='#'+room;
  const ddBadge=document.getElementById('dd-room-badge');if(ddBadge)ddBadge.textContent='#'+room;
  updateParticipants({users:[username],count:1});
  toggleTopbarMenu(false);
  const heroCallout=document.getElementById('hero-callout');
  if(heroCallout)heroCallout.textContent='Your chat stays in this room. No admin or creator view is built to read it.';
  initChart();loadSidekickSettings();initSidekickControls();refreshAIStatus();
  setSidekickEnabled(false);showDetectiveToast('Detective mode: off');autoResizeComposer();
}
function leaveChat(){
  hideThreatStop();
  document.getElementById('app').style.display='none';
  document.getElementById('lobby').style.display='flex';
  document.body.classList.remove('app-active');
  myName='';myRoom='';setOpenMatchWaiting(false);setMatchStatus('','');
  toggleTopbarMenu(false);
  const empty=document.getElementById('messages-empty');if(empty)empty.style.display='grid';
  socket.disconnect();
}
function usePrompt(text){const input=document.getElementById('msg-input');if(!input)return;input.value=text;autoResizeComposer();input.focus()}

function updateParticipants(data){
  const countEl=document.getElementById('participant-count');
  const listEl=document.getElementById('participant-list');
  const users=Array.isArray(data&&data.users)?data.users:[];
  const count=(data&&data.count)?data.count:users.length;
  if(countEl)countEl.textContent=count===1?'1 participant':count+' participants';
  if(!listEl)return;
  listEl.innerHTML='';
  users.slice(0,6).forEach(name=>{
    const pill=document.createElement('span');
    pill.className='participant-pill';pill.textContent=name===myName?name+' (you)':name;
    listEl.appendChild(pill);
  });
  if(users.length>6){const more=document.createElement('span');more.className='participant-pill';more.textContent='+' +(users.length-6)+' more';listEl.appendChild(more)}
}
async function copyRoomCode(){
  if(!myRoom)return;let copied=false;
  try{if(navigator.clipboard&&window.isSecureContext){await navigator.clipboard.writeText(myRoom);copied=true}}catch{}
  if(!copied){const t=document.createElement('textarea');t.value=myRoom;t.style.cssText='position:fixed;opacity:0';document.body.appendChild(t);t.select();try{copied=document.execCommand('copy')}catch{}t.remove()}
  showDetectiveToast(copied?'✓ Room code copied':'Could not copy');toggleTopbarMenu(false);
}

// ── Chart ──────────────────────────────────────────────────────
function initChart(){
  timelineCanvas=document.getElementById('timeline-chart');if(!timelineCanvas)return;
  timelineCtx=timelineCanvas.getContext('2d');drawTimeline([]);
  if(!window.__sidechickChartBound){window.__sidechickChartBound=true;window.addEventListener('resize',()=>drawTimeline(timelineData))}
}
function updateChart(timeline){timelineData=Array.isArray(timeline)?timeline.slice(-16):[];drawTimeline(timelineData)}
function drawTimeline(timeline){
  if(!timelineCanvas||!timelineCtx)return;
  const ctx=timelineCtx,dpr=window.devicePixelRatio||1;
  const rect=timelineCanvas.getBoundingClientRect();
  const W=rect.width||300,H=rect.height||100;
  if(timelineCanvas.width!==W*dpr||timelineCanvas.height!==H*dpr){timelineCanvas.width=W*dpr;timelineCanvas.height=H*dpr}
  ctx.setTransform(dpr,0,0,dpr,0,0);ctx.clearRect(0,0,W,H);
  const gradient=ctx.createLinearGradient(0,0,W,0);gradient.addColorStop(0,'#3b82f6');gradient.addColorStop(1,'#f97316');
  ctx.strokeStyle='rgba(148,163,184,0.25)';ctx.lineWidth=1;
  for(let row=1;row<=3;row++){ctx.beginPath();ctx.moveTo(0,H/4*row);ctx.lineTo(W,H/4*row);ctx.stroke()}
  if(!timeline.length)return;
  const pad=12,span=Math.max(1,timeline.length-1);
  const xStep=(W-pad*2)/span,mid=H/2,amp=H*0.32;
  ctx.lineWidth=3;ctx.strokeStyle=gradient;ctx.beginPath();
  timeline.forEach((point,i)=>{const x=pad+i*xStep,y=mid-(point.p||0)*amp;i===0?ctx.moveTo(x,y):ctx.lineTo(x,y)});
  ctx.stroke();
  timeline.forEach((point,i)=>{
    const x=pad+i*xStep,y=mid-(point.p||0)*amp;
    ctx.fillStyle=point.p>0.2?'#22c55e':point.p>-0.1?'#f59e0b':'#ef4444';
    ctx.beginPath();ctx.arc(x,y,4,0,Math.PI*2);ctx.fill();
  });
}

// ── Vibe Badge ─────────────────────────────────────────────────
function updateVibeBadge(level,label,alertMsg,stageCode,criticalAction){
  currentLevel=level;
  const levelLabels=['Calm','A bit tense','Heated','Very tense','Unsafe'];
  const levelIcons=['🙂','😬','😤','🚩','🛑'];
  const badge=document.getElementById('vibe-badge');const icon=document.getElementById('vibe-icon');
  const labelEl=document.getElementById('vibe-label');const detail=document.getElementById('vibe-detail');
  const banner=document.getElementById('escalation-banner');const heroCallout=document.getElementById('hero-callout');
  if(badge)badge.className='vibe-badge level-'+level;
  if(icon)icon.textContent=levelIcons[level]||'🙂';
  if(labelEl)labelEl.textContent=levelLabels[level]||'Calm';
  if(detail)detail.textContent=alertMsg||'All good so far.';
  if(heroCallout)heroCallout.textContent=level>=4?'This feels unsafe. Consider leaving or taking a break.':level===3?'Tension feels high. Slow it down.':level===2?'Heat is rising. Try a softer reply.':level===1?'A little tension. Stay kind and clear.':'All good. Keep it friendly.';
  if(level>0&&banner){banner.style.display='block';banner.className='alert-banner level-'+level;banner.textContent=alertMsg||'Heads up: the vibe is shifting.'}
  else if(banner)banner.style.display='none';
  if(criticalAction==='terminate_chat'){
    const note=document.getElementById('intervention-note');if(note)note.textContent='Safety pause rn - chat needs to chill.';
    showThreatStop(alertMsg||'Nah this ain\'t healthy. We stopping.');
  }
  const warningDiv=document.getElementById('composer-warning');
  if(warningDiv){if(criticalAction==='warn_terminate'){warningDiv.textContent='Heads up: that msg might end the chat for real.';warningDiv.style.display='block'}else warningDiv.style.display='none'}
}
function setThinking(text){const t=document.getElementById('their-thinking');if(t)t.textContent=text||''}
function setExpectation(text){const e=document.getElementById('their-expectation');if(e)e.textContent=text||''}
function setSuggestedReply(text){['sugg-row','draft-reply','reply-tip'].forEach(id=>{const el=document.getElementById(id);if(el)el.style.display='none'})}
function showThreatStop(message){
  const overlay=document.getElementById('threat-stop-overlay');const text=document.getElementById('threat-stop-text');
  const input=document.getElementById('msg-input');const sendBtn=document.getElementById('send-btn');
  if(text)text.textContent=message||'This ain\'t the vibe. Stay safe.';if(overlay)overlay.style.display='flex';
  if(input)input.disabled=true;if(sendBtn)sendBtn.disabled=true;
}
function hideThreatStop(){
  const overlay=document.getElementById('threat-stop-overlay');const input=document.getElementById('msg-input');
  const sendBtn=document.getElementById('send-btn');const warningDiv=document.getElementById('composer-warning');
  if(overlay)overlay.style.display='none';if(warningDiv)warningDiv.style.display='none';
  if(input)input.disabled=false;if(sendBtn)sendBtn.disabled=false;
}
function exitThreatSession(){hideThreatStop();leaveChat()}
function updateDriftPanel(drift){
  if(!drift)return;
  const byId=id=>document.getElementById(id);
  const ds=typeof drift.drift_score==='number'?drift.drift_score:'--';
  const rs=typeof drift.risk_score==='number'?drift.risk_score:'--';
  const fs=typeof drift.forecast_score==='number'?drift.forecast_score:'--';
  const rc=typeof drift.recovery_score==='number'?drift.recovery_score:'--';
  if(byId('drift-score'))byId('drift-score').textContent=ds+'/100';
  if(byId('drift-risk'))byId('drift-risk').textContent=(drift.risk_level||'--')+' ('+rs+')';
  if(byId('forecast-score'))byId('forecast-score').textContent=(drift.forecast_label||'--')+' ('+fs+')';
  if(byId('recovery-score'))byId('recovery-score').textContent=rc+'/100';
  if(byId('primary-driver'))byId('primary-driver').textContent=drift.primary_driver||'No dominant signal yet.';
  const triggers=Array.isArray(drift.triggers)?drift.triggers:[];const tips=Array.isArray(drift.tips)?drift.tips:[];
  if(byId('drift-triggers'))byId('drift-triggers').textContent=triggers.length?triggers.join(' • '):'No signals yet.';
  if(byId('drift-tips'))byId('drift-tips').textContent=tips.length?tips.join(' • '):'Tips will appear here.';
  if(byId('intervention-note'))byId('intervention-note').textContent=drift.intervention||'Tips update as the chat moves.';
}
function updateFactCheck(data){
  const box=document.getElementById('fact-check');if(!box||!data)return;
  const verdict=data.verdict||'Unclear';const conf=typeof data.confidence==='number'?Math.round(data.confidence*100):0;
  box.textContent=verdict+' ('+conf+'%)' +(data.note?' • '+data.note:'');box.dataset.verdict=verdict.toLowerCase().replace(/\s+/g,'-');
}
function maybeShowFactCheckLoading(text){
  const box=document.getElementById('fact-check');if(!box||!text)return;
  const t=text.toLowerCase();
  if(/\d/.test(text)||/according to|study|report|data|statistics|percent|%|always|never|research/.test(t)){box.textContent='Checking claim…';box.dataset.verdict='unclear'}
}

// ── Render Message ─────────────────────────────────────────────
// Message rendering with reactions and photos support
let messageIndexMap = {}; // Map to track message indices for reactions

function renderMessage(data){
  const isMine=data.username===myName;
  const div=document.createElement('div');
  div.className='msg slide-in '+(isMine?'mine':'theirs');
  const msgIndex = data.msg_index !== undefined ? data.msg_index : -1;
  div.dataset.msgIndex = msgIndex;
  if(msgIndex >= 0) messageIndexMap[msgIndex] = div;
  
  if(!isMine&&data.username){let hash=0;for(let i=0;i<data.username.length;i++)hash=data.username.charCodeAt(i)+((hash<<5)-hash);div.style.setProperty('--user-hue',Math.abs(hash%360))}
  if(data.is_toxic&&!isMine)div.classList.add('message-blurred');
  
  const avatar=document.createElement('div');avatar.className='msg-avatar';avatar.textContent=(data.username||'?').charAt(0).toUpperCase();
  const body=document.createElement('div');body.className='msg-body';
  
  if(!isMine&&data.thinking&&isDetectiveOn()&&(data.level>=2||data.is_toxic||data.alert)){
    const thinking=document.createElement('div');thinking.className='msg-thinking';thinking.textContent=data.thinking;body.appendChild(thinking);
  }
  
  const bubble=document.createElement('div');bubble.className='msg-bubble';
  
  // Handle photos
  if(data.photo_url && data.is_photo) {
    const photoEl = document.createElement('img');
    photoEl.src = data.photo_url;
    photoEl.className = 'msg-photo';
    photoEl.alt = 'Shared photo';
    photoEl.style.maxWidth = '280px';
    photoEl.style.borderRadius = '12px';
    photoEl.style.marginBottom = '8px';
    bubble.appendChild(photoEl);
    
    if(data.message && data.message !== '[Shared a photo]') {
      const caption = document.createElement('div');
      caption.className = 'photo-caption';
      caption.textContent = data.message;
      bubble.appendChild(caption);
    }
  } else {
    bubble.textContent=data.text;
  }
  
  if(data.is_toxic&&!isMine){
    bubble.title='Message hidden. Click to reveal.';
    bubble.onclick=()=>{div.classList.remove('message-blurred');div.classList.add('message-revealed');bubble.title=''};
  }
  body.appendChild(bubble);
  
  // Add reactions display
  if(data.reactions && Object.keys(data.reactions).length > 0) {
    const reactionsEl = document.createElement('div');
    reactionsEl.className = 'msg-reactions';
    Object.entries(data.reactions).forEach(([emoji, users]) => {
      if(users.length > 0) {
        const reactionBtn = document.createElement('button');
        reactionBtn.className = 'reaction-btn';
        reactionBtn.dataset.emoji = emoji;
        reactionBtn.textContent = emoji + ' ' + users.length;
        reactionBtn.title = 'Reacted: ' + users.join(', ');
        reactionBtn.onclick = () => toggleReaction(msgIndex, emoji);
        reactionsEl.appendChild(reactionBtn);
      }
    });
    body.appendChild(reactionsEl);
  }
  
  // Add reaction buttons on hover
  const reactBtnRow = document.createElement('div');
  reactBtnRow.className = 'msg-react-btns';
  const reactions = ['❤️', '😂', '😮', '😢', '🔥', '👍', '✨', '🎉'];
  reactions.forEach(emoji => {
    const btn = document.createElement('button');
    btn.className = 'msg-react-btn';
    btn.textContent = emoji;
    btn.dataset.emoji = emoji;
    btn.onclick = (e) => {
      e.stopPropagation(); 
      smartToggleReaction(msgIndex, emoji, div);
    };
    reactBtnRow.appendChild(btn);
  });
  body.appendChild(reactBtnRow);
  
  // Store reactions data on element for easy access
  div.dataset.reactions = JSON.stringify(data.reactions || {});
  
  const meta=document.createElement('div');meta.className='msg-meta';
  meta.innerHTML='<span>'+escapeHtml(data.timestamp||'')+'</span><span>'+escapeHtml(MOOD_ICONS[data.mood]||'NEU')+' '+escapeHtml(data.mood||'NEUTRAL')+'</span>';
  body.appendChild(meta);
  
  isMine?(div.appendChild(body),div.appendChild(avatar)):(div.appendChild(avatar),div.appendChild(body));
  
  const feed=document.getElementById('messages');
  const indicator=document.getElementById('typing-indicator');
  indicator?feed.insertBefore(div,indicator):feed.appendChild(div);
  
  scrollToBottom();
  
  const empty=document.getElementById('messages-empty');if(empty)empty.style.display='none';
  messageHistory.push({speaker:isMine?'You':'Other',text:data.text||data.message});
  if(messageHistory.length>30)messageHistory.shift();
  
  if(!isMine){
    msgCountSinceSummary++;theirLastMsg=data.text;
    maybeShowFactCheckLoading(data.text);
    if(data.thinking)setThinking(data.thinking);
    if(data.expectation||data.expecting)setExpectation(data.expectation||data.expecting);
    if(data.reply)setSuggestedReply(data.reply);
    updateMoodBackground(data.mood);
    if(data.their_mood||data.mood){const moodEl=document.getElementById('their-mood');if(moodEl)moodEl.textContent=data.their_mood||data.mood}
    if(aiAvailable){
      lastInferRequestId=String(Date.now())+'-'+Math.random().toString(36).slice(2,8);
      socket.emit('ai_infer_request',{room:myRoom,text:data.text,tone:sidekickTone,context:messageHistory.slice(-3),request_id:lastInferRequestId});
    }
    if(autoSummaryEnabled&&msgCountSinceSummary>=autoSummaryEvery){requestAISummary(true);msgCountSinceSummary=0}
  }
}
function exportSession(format){if(!myRoom)return;window.location.href=BACKEND_URL+'/api/export/'+encodeURIComponent(myRoom)+'?format='+encodeURIComponent(format||'json')}

// ── Reactions & Photo Share ────────────────────────────────────
function smartToggleReaction(msgIndex, emoji, msgEl) {
  // Smart toggle: checks current state and adds or removes reaction
  if(!msgEl) {
    msgEl = messageIndexMap[msgIndex];
    if(!msgEl) return;
  }
  
  // Get current reactions state
  let currentReactions = {};
  try {
    currentReactions = JSON.parse(msgEl.dataset.reactions || '{}');
  } catch(e) {
    currentReactions = {};
  }
  
  // Check if current user already reacted with this emoji
  const userReacted = currentReactions[emoji] && currentReactions[emoji].includes(myName);
  
  if(userReacted) {
    // Remove reaction
    toggleReaction(msgIndex, emoji);
  } else {
    // Add reaction
    reactMessage(msgIndex, emoji);
  }
}

function reactMessage(msgIndex, emoji) {
  socket.emit('react', {
    room: myRoom,
    msg_index: msgIndex,
    emoji: emoji,
    username: myName
  });
}

function toggleReaction(msgIndex, emoji) {
  socket.emit('remove_reaction', {
    room: myRoom,
    msg_index: msgIndex,
    emoji: emoji,
    username: myName
  });
}

function uploadAndSharePhoto(file) {
  if(!file || !myRoom) return;
  
  const formData = new FormData();
  formData.append('photo', file);
  
  const uploadStatus = document.getElementById('upload-status');
  if(uploadStatus) uploadStatus.textContent = 'Uploading...';
  
  fetch(BACKEND_URL + '/upload', {
    method: 'POST',
    body: formData
  })
  .then(res => res.json())
  .then(data => {
    if(data.success) {
      const photoUrl = BACKEND_URL + data.url;
      const caption = document.getElementById('photo-caption').value;
      socket.emit('photo_share', {
        room: myRoom,
        username: myName,
        photo_url: photoUrl,
        message: caption || ''
      });
      if(uploadStatus) uploadStatus.textContent = '';
      document.getElementById('photo-caption').value = '';
    } else {
      if(uploadStatus) uploadStatus.textContent = 'Upload failed: ' + data.error;
    }
  })
  .catch(err => {
    if(uploadStatus) uploadStatus.textContent = 'Upload error: ' + err.message;
  });
}

// ── Send / Typing ──────────────────────────────────────────────
function quickReply(text) {
  const input = document.getElementById('msg-input');
  input.value = text;
  autoResizeComposer();
  sendMessage();
}

function sendMessage(){
  const input=document.getElementById('msg-input');const text=(input.value||'').trim();if(!text)return;
  socket.emit('message',{room:myRoom,username:myName,text});
  input.value='';const suggRow=document.getElementById('sugg-row');if(suggRow)suggRow.innerHTML='';
  autoResizeComposer();
}
function handleKey(event){if(event.key==='Enter'&&!event.shiftKey){event.preventDefault();sendMessage()}}

// ── Game Features ──────────────────────────────────────────────
let gameState = {};

function startGame(gameType) {
  socket.emit('start_game', {
    room: myRoom,
    game_type: gameType,
    username: myName
  });
  showGameDialog(gameType);
}

function showGameDialog(gameType) {
  if(gameType === 'dark_fantasy') {
    const dialog = document.createElement('div');
    dialog.className = 'game-modal';
    dialog.innerHTML = `
      <div class="game-modal-content">
        <h2>🎮 Know You Better</h2>
        <p>Answer questions about yourself and your partner</p>
        <div class="game-questions">
          <div class="game-q">
            <p>1. What's your superpower?</p>
            <input type="text" id="q1-self" placeholder="About you...">
            <input type="text" id="q1-other" placeholder="About them...">
          </div>
          <div class="game-q">
            <p>2. Your relationship vibe is...</p>
            <input type="text" id="q2-self" placeholder="You would say...">
            <input type="text" id="q2-other" placeholder="They would say...">
          </div>
          <div class="game-q">
            <p>3. Your biggest red flag...</p>
            <input type="text" id="q3-self" placeholder="You...">
            <input type="text" id="q3-other" placeholder="Them...">
          </div>
        </div>
        <button onclick="submitGameAnswers()" class="btn-primary">Submit & See Score 🎯</button>
        <button onclick="closeGameDialog()" class="btn-secondary">Cancel</button>
      </div>
    `;
    document.body.appendChild(dialog);
  }
}

function submitGameAnswers() {
  for(let i = 1; i <= 3; i++) {
    const selfAnswer = document.getElementById(`q${i}-self`).value;
    const otherAnswer = document.getElementById(`q${i}-other`).value;
    
    if(selfAnswer) {
      socket.emit('submit_game_answer', {
        room: myRoom,
        username: myName,
        question_id: i,
        answer: selfAnswer,
        answer_type: 'self'
      });
    }
    if(otherAnswer) {
      socket.emit('submit_game_answer', {
        room: myRoom,
        username: myName,
        question_id: i,
        answer: otherAnswer,
        answer_type: 'other'
      });
    }
  }
  
  setTimeout(() => {
    socket.emit('get_game_score', { room: myRoom });
  }, 500);
  
  closeGameDialog();
}

function closeGameDialog() {
  const modal = document.querySelector('.game-modal');
  if(modal) modal.remove();
}

function startConversationPrompt() {
  const prompts = [
    { q: 'This or That?', options: ['Deep conversations OR Surface level banter?', 'Plan dates OR Spontaneous adventures?', 'Text all day OR Quality time IRL?'] },
    { q: 'Would You Rather?', options: ['Travel together OR Explore separately?', 'Netflix dates OR Outdoor vibes?', 'Overthink OR Move on?'] },
    { q: 'Spicy Question:', options: ['What\'s something you haven\'t told them?', 'What do you secretly think about them?', 'What\'s your love language?'] }
  ];
  
  const random = prompts[Math.floor(Math.random() * prompts.length)];
  const dialog = document.createElement('div');
  dialog.className = 'prompt-modal';
  dialog.innerHTML = `
    <div class="prompt-content">
      <h3>${random.q}</h3>
      <div class="prompt-options">
        ${random.options.map(opt => `<button onclick="quickReply('${opt.replace(/'/g, "\\'")}'); this.closest('.prompt-modal').remove();" class="prompt-btn">${opt}</button>`).join('')}
      </div>
      <button onclick="this.closest('.prompt-modal').remove()" class="btn-secondary">Skip</button>
    </div>
  `;
  document.body.appendChild(dialog);
}

function triggerVibeReport() {
  socket.emit('screenshot_vibe', { room: myRoom });
}

function showGameHistory() {
  const dialog = document.createElement('div');
  dialog.className = 'modal';
  dialog.innerHTML = `
    <div class="modal-content">
      <h2>📊 Compatibility Scores</h2>
      <div id="history-list" style="max-height: 400px; overflow-y: auto;"></div>
      <button onclick="this.closest('.modal').remove()" class="btn-primary">Close</button>
    </div>
  `;
  document.body.appendChild(dialog);
}

// ── Photo Upload Helpers ───────────────────────────────────────
function handlePhotoSelect(event) {
  const file = event.target.files[0];
  if(!file) return;
  
  if(!file.type.startsWith('image/')) {
    alert('Please select an image file');
    return;
  }
  
  if(file.size > 5 * 1024 * 1024) {
    alert('Image must be less than 5MB');
    return;
  }
  
  const reader = new FileReader();
  reader.onload = (e) => {
    document.getElementById('preview-img').src = e.target.result;
    document.getElementById('photo-upload-preview').style.display = 'block';
    document.getElementById('photo-input').dataset.selectedFile = JSON.stringify({
      name: file.name,
      type: file.type,
      size: file.size,
      data: e.target.result
    });
  };
  reader.readAsDataURL(file);
}

function sendPhotoMessage() {
  const photoInput = document.getElementById('photo-input');
  const caption = document.getElementById('photo-caption').value;
  const file = photoInput.files[0];
  
  if(!file) return;
  
  uploadAndSharePhoto(file);
  cancelPhotoUpload();
}

function cancelPhotoUpload() {
  document.getElementById('photo-upload-preview').style.display = 'none';
  document.getElementById('photo-input').value = '';
  document.getElementById('photo-caption').value = '';
  document.getElementById('preview-img').src = '';
}

function onTyping(){
  autoResizeComposer();const text=document.getElementById('msg-input').value;
  clearTimeout(typingTimer);socket.emit('typing',{username:myName,room:myRoom});socket.emit('typing_analysis',{text,room:myRoom});
}
function useGhost(){if(!ghostText)return;const input=document.getElementById('msg-input');input.value=ghostText;autoResizeComposer();input.focus()}
function useDraft(){useGhost()}

// Photo upload button handler
document.addEventListener('DOMContentLoaded', () => {
  const photoUploadBtn = document.getElementById('photo-upload-btn');
  const photoInput = document.getElementById('photo-input');
  if(photoUploadBtn && photoInput) {
    photoUploadBtn.addEventListener('click', () => photoInput.click());
  }
});
function requestAISummary(auto=false){
  if(!aiAvailable){updateAISummaryAvailability(false);return}
  const btn=document.getElementById('ai-summary-btn');const textBox=document.getElementById('ai-summary-text');
  if(!btn||!textBox)return;
  btn.classList.add('loading');textBox.textContent=auto?'Refreshing insights…':'Generating insights…';
  socket.emit('ai_summary_request',{room:myRoom,tone:sidekickTone,window:8,auto});
}

// ── Standalone Game Modes ──────────────────────────────────────
let currentGameCode = '';
let currentGameType = '';

const GAME_DATA = {
  "compatibility_quiz": {
    "emoji": "\ud83c\udfae",
    "name": "Compatibility Quiz",
    "description": "Deep emotional & lifestyle alignment",
    "questions": [
      {
        "id": 1,
        "text": "How do you handle a massive argument?",
        "choices": [
          "I need space immediately",
          "I want to talk it out right now",
          "I pretend it didn't happen",
          "I get very emotional"
        ]
      },
      {
        "id": 2,
        "text": "What is your primary love language?",
        "choices": [
          "Physical Touch",
          "Words of Affirmation",
          "Quality Time",
          "Acts of Service / Gifts"
        ]
      },
      {
        "id": 3,
        "text": "What is your biggest relationship red flag?",
        "choices": [
          "Controlling behavior",
          "Poor communication",
          "Lack of ambition",
          "Too clingy/needy"
        ]
      },
      {
        "id": 4,
        "text": "How much alone time do you need in a relationship?",
        "choices": [
          "I need a lot of personal space",
          "I like a healthy balance",
          "I want to be together 24/7",
          "It depends on my mood"
        ]
      },
      {
        "id": 5,
        "text": "What is your view on finances in a serious relationship?",
        "choices": [
          "Combine everything",
          "Keep it 100% separate",
          "Split shared bills, keep the rest separate",
          "Whoever makes more pays more"
        ]
      },
      {
        "id": 6,
        "text": "How do you prefer to spend a lazy Sunday?",
        "choices": [
          "Binge-watching shows in bed",
          "Deep cleaning & organizing",
          "Going out for a long brunch",
          "Sleeping all day"
        ]
      },
      {
        "id": 7,
        "text": "What is your approach to dealing with stress?",
        "choices": [
          "I completely shut down",
          "I vent to my partner immediately",
          "I distract myself with hobbies",
          "I take it out on people around me"
        ]
      },
      {
        "id": 8,
        "text": "How important is physical intimacy for a successful relationship?",
        "choices": [
          "It is the absolute most important thing",
          "Very important, but not everything",
          "Somewhat important",
          "Emotional connection matters way more"
        ]
      },
      {
        "id": 9,
        "text": "What is your stance on jealousy?",
        "choices": [
          "I get extremely jealous easily",
          "A little jealousy is healthy/hot",
          "I rarely get jealous",
          "I never get jealous at all"
        ]
      },
      {
        "id": 10,
        "text": "How do you handle apologies?",
        "choices": [
          "I apologize immediately",
          "I need time before I can apologize",
          "I rarely think I am wrong",
          "I expect the other person to apologize first"
        ]
      },
      {
        "id": 11,
        "text": "What is your ideal vacation style?",
        "choices": [
          "Relaxing at a luxury resort",
          "Backpacking and roughing it",
          "Exploring a busy city",
          "A romantic cabin in the woods"
        ]
      },
      {
        "id": 12,
        "text": "How do you feel about public displays of affection (PDA)?",
        "choices": [
          "I love it, all the time",
          "Holding hands is fine, nothing crazy",
          "Only when we are drunk",
          "I absolutely hate PDA"
        ]
      },
      {
        "id": 13,
        "text": "What is your communication style via text?",
        "choices": [
          "Double/Triple texter",
          "Takes 3-5 business days to reply",
          "Short and dry",
          "Only communicates in memes/reels"
        ]
      },
      {
        "id": 14,
        "text": "How do you deal with your partner having opposite-sex friends?",
        "choices": [
          "Totally fine, I trust them",
          "Fine, but I want to meet them",
          "I get slightly uncomfortable",
          "Absolutely not allowed"
        ]
      },
      {
        "id": 15,
        "text": "What is the most important trait in a long-term partner?",
        "choices": [
          "Unwavering loyalty",
          "A great sense of humor",
          "High sexual compatibility",
          "Emotional intelligence"
        ]
      },
      {
        "id": 16,
        "text": "How do you feel about sharing passwords with your partner?",
        "choices": [
          "We should share everything",
          "Only for streaming services",
          "I value my privacy too much",
          "I would only share if asked"
        ]
      },
      {
        "id": 17,
        "text": "What is your approach to making big life decisions?",
        "choices": [
          "I overthink for weeks",
          "I go with my gut instinct",
          "I ask my partner/friends for advice",
          "I flip a coin/act impulsively"
        ]
      },
      {
        "id": 18,
        "text": "How do you prefer to celebrate your birthday?",
        "choices": [
          "Massive party with everyone",
          "Intimate dinner with my partner",
          "I don't want to celebrate it",
          "A surprise getaway"
        ]
      },
      {
        "id": 19,
        "text": "What is your stance on keeping in touch with exes?",
        "choices": [
          "We are still good friends",
          "Cordial but distant",
          "Blocked and forgotten",
          "Depends on how it ended"
        ]
      },
      {
        "id": 20,
        "text": "How important are shared hobbies in a relationship?",
        "choices": [
          "Crucial, we must do things together",
          "Nice to have, but not required",
          "I prefer we have our own separate hobbies",
          "I don't care either way"
        ]
      },
      {
        "id": 21,
        "text": "What is your biggest fear in a relationship?",
        "choices": [
          "Being cheated on",
          "Losing my independence",
          "Growing bored/falling out of love",
          "Not being appreciated"
        ]
      },
      {
        "id": 22,
        "text": "How do you handle being sick?",
        "choices": [
          "I want to be babied and taken care of",
          "Leave me alone until I am better",
          "I pretend I am fine",
          "I complain constantly"
        ]
      },
      {
        "id": 23,
        "text": "What is your view on marriage?",
        "choices": [
          "Can't wait for a huge wedding",
          "I want a small/private elopement",
          "It's just a piece of paper",
          "I am completely against it"
        ]
      },
      {
        "id": 24,
        "text": "How do you deal with family drama?",
        "choices": [
          "I get heavily involved",
          "I avoid it at all costs",
          "I vent about it constantly",
          "I try to play peacemaker"
        ]
      },
      {
        "id": 25,
        "text": "What makes you feel most loved?",
        "choices": [
          "Surprise gifts or dates",
          "When they remember small details",
          "Deep, late-night conversations",
          "Physical closeness and cuddles"
        ]
      }
    ]
  },
  "spicy_or_sweet": {
    "emoji": "\ud83c\udf36\ufe0f",
    "name": "Spicy or Sweet",
    "description": "Strictly NSFW & intimate preferences",
    "questions": [
      {
        "id": 26,
        "text": "What is your ultimate dynamic in the bedroom?",
        "choices": [
          "Taking total control (Dominant)",
          "Being completely dominated (Submissive)",
          "A completely equal switch",
          "Depends entirely on my mood"
        ]
      },
      {
        "id": 27,
        "text": "What is your stance on public intimacy?",
        "choices": [
          "Only behind locked doors",
          "Risky places (Cars, alleys, etc)",
          "Heavy petting at a party",
          "Exhibitionism is a major turn-on"
        ]
      },
      {
        "id": 28,
        "text": "How do you feel about dirty talk?",
        "choices": [
          "I need it, the dirtier the better",
          "I like soft/praising whispers",
          "It makes me cringe/laugh",
          "I like to hear it, but I can't do it"
        ]
      },
      {
        "id": 29,
        "text": "What is your preference for pace?",
        "choices": [
          "Slow, romantic, and sensual",
          "Rough, fast, and aggressive",
          "A mix: start slow, end rough",
          "Quickies are the best"
        ]
      },
      {
        "id": 30,
        "text": "How do you feel about introducing toys?",
        "choices": [
          "Absolutely essential",
          "Fun to use occasionally",
          "Intimidated but curious",
          "I prefer natural only"
        ]
      },
      {
        "id": 31,
        "text": "What is your stance on recording or taking photos?",
        "choices": [
          "Love it, let's make a tape",
          "A few spicy pics are fine",
          "Only if my face isn't in it",
          "Absolutely never"
        ]
      },
      {
        "id": 32,
        "text": "What time of day is best for intimacy?",
        "choices": [
          "First thing in the morning",
          "Late at night",
          "A lazy afternoon",
          "Whenever the mood strikes"
        ]
      },
      {
        "id": 33,
        "text": "What is your view on roleplay?",
        "choices": [
          "I have a whole wardrobe for it",
          "I'd try it if my partner wanted",
          "I feel too silly doing it",
          "Strictly no roleplay"
        ]
      },
      {
        "id": 34,
        "text": "How do you feel about lingerie?",
        "choices": [
          "I love wearing/seeing it",
          "It's too much effort, just take it off",
          "Only for very special occasions",
          "I prefer wearing nothing at all"
        ]
      },
      {
        "id": 35,
        "text": "What is your biggest physical turn-on?",
        "choices": [
          "Neck kisses/biting",
          "Eye contact",
          "Hair pulling/choking",
          "Being pinned down"
        ]
      },
      {
        "id": 36,
        "text": "How do you feel about threesomes/group play?",
        "choices": [
          "Done it and loved it",
          "Fantasize about it, but haven't",
          "Would only do it under strict rules",
          "I am strictly monogamous"
        ]
      },
      {
        "id": 37,
        "text": "What is your preferred lighting?",
        "choices": [
          "Lights wide open",
          "Dim mood lighting/LEDs",
          "Pitch black",
          "Daylight/Sunlight"
        ]
      },
      {
        "id": 38,
        "text": "How important is foreplay?",
        "choices": [
          "More important than the main event",
          "Crucial for a warm-up",
          "A few minutes is enough",
          "Just skip to the good part"
        ]
      },
      {
        "id": 39,
        "text": "What is your stance on bondage/restraints?",
        "choices": [
          "Tie me up completely",
          "I want to do the tying",
          "Light restraints (cuffs/silk ties)",
          "No restraints for me"
        ]
      },
      {
        "id": 40,
        "text": "How do you handle noise in the bedroom?",
        "choices": [
          "I am extremely loud",
          "I am completely silent",
          "I try to be quiet but fail",
          "Only heavy breathing"
        ]
      },
      {
        "id": 41,
        "text": "What is your view on morning afters?",
        "choices": [
          "Round two immediately",
          "Cuddle and sleep more",
          "Get up, shower, and make breakfast",
          "I need my personal space"
        ]
      },
      {
        "id": 42,
        "text": "How do you feel about mirror play?",
        "choices": [
          "I love watching us",
          "Only if I look good that day",
          "It distracts me",
          "I hate seeing myself"
        ]
      },
      {
        "id": 43,
        "text": "What is your stance on sensory deprivation (blindfolds)?",
        "choices": [
          "Love the anticipation",
          "Makes me too anxious",
          "Only if I trust them 100%",
          "Never tried but want to"
        ]
      },
      {
        "id": 44,
        "text": "How do you feel about spontaneous intimacy?",
        "choices": [
          "Love it, anytime anywhere",
          "I prefer to be clean and prepared",
          "Only if we are alone in the house",
          "It gives me anxiety"
        ]
      },
      {
        "id": 45,
        "text": "What is your preferred method of initiation?",
        "choices": [
          "Directly asking for it",
          "Subtle physical touching",
          "Sending a risky text earlier",
          "Just going in for a heavy kiss"
        ]
      },
      {
        "id": 46,
        "text": "How do you feel about Edging/Teasing?",
        "choices": [
          "It's my favorite thing",
          "It's frustrating but hot",
          "I hate it, give it to me now",
          "I don't have the patience"
        ]
      },
      {
        "id": 47,
        "text": "What is your view on sharing fantasies?",
        "choices": [
          "I am an open book",
          "I only share if they ask",
          "I have secrets I will take to the grave",
          "I don't really have any"
        ]
      },
      {
        "id": 48,
        "text": "How do you feel about receiving oral?",
        "choices": [
          "It's mandatory",
          "It's a nice treat",
          "I prefer giving",
          "I am not a fan"
        ]
      },
      {
        "id": 49,
        "text": "What is your view on temperature play (ice/hot wax)?",
        "choices": [
          "Fascinated by it",
          "Ice cubes are fun, wax is too much",
          "I don't like being uncomfortable",
          "Sounds terrifying"
        ]
      },
      {
        "id": 50,
        "text": "How do you feel about aftercare?",
        "choices": [
          "I need a lot of physical touch and reassurance",
          "Just a quick cuddle is fine",
          "I just want to sleep immediately",
          "I prefer getting up and doing something"
        ]
      }
    ]
  },
  "couple_trivia": {
    "emoji": "\ud83c\udfaf",
    "name": "Couple Trivia",
    "description": "Basic facts & daily habits",
    "questions": [
      {
        "id": 51,
        "text": "What is my go-to drunk food?",
        "choices": [
          "Pizza",
          "Taco Bell / Fast Food",
          "Instant Noodles",
          "I don't eat when drunk"
        ]
      },
      {
        "id": 52,
        "text": "What is my usual coffee/tea order?",
        "choices": [
          "Black coffee / Espresso",
          "Sweet Iced Latte / Frappe",
          "Tea / Matcha",
          "I don't drink caffeine"
        ]
      },
      {
        "id": 53,
        "text": "How many alarms do I set in the morning?",
        "choices": [
          "Just one, I wake up instantly",
          "2 or 3, just in case",
          "5+ alarms and I still sleep through them",
          "I naturally wake up without one"
        ]
      },
      {
        "id": 54,
        "text": "What is my favorite genre of movie?",
        "choices": [
          "Action / Thriller",
          "Rom-Com / Drama",
          "Horror",
          "Sci-Fi / Fantasy"
        ]
      },
      {
        "id": 55,
        "text": "If I had a free weekend, what would I do?",
        "choices": [
          "Go out clubbing/drinking",
          "Play video games all day",
          "Go hiking/outdoors",
          "Read a book/Netflix in bed"
        ]
      },
      {
        "id": 56,
        "text": "What is my biggest pet peeve?",
        "choices": [
          "Loud chewing",
          "Slow walkers",
          "Being interrupted",
          "Bad drivers"
        ]
      },
      {
        "id": 57,
        "text": "How do I like my eggs cooked?",
        "choices": [
          "Scrambled",
          "Sunny-side up",
          "Boiled",
          "I hate eggs"
        ]
      },
      {
        "id": 58,
        "text": "What is my favorite season?",
        "choices": [
          "Summer",
          "Winter",
          "Autumn/Fall",
          "Spring"
        ]
      },
      {
        "id": 59,
        "text": "Which social media app do I spend the most time on?",
        "choices": [
          "Instagram",
          "TikTok",
          "Twitter/X",
          "Reddit"
        ]
      },
      {
        "id": 60,
        "text": "What is my favorite color to wear?",
        "choices": [
          "All black everything",
          "Bright/Neon colors",
          "Earth tones (Browns/Greens)",
          "Pastels"
        ]
      },
      {
        "id": 61,
        "text": "How do I handle spicy food?",
        "choices": [
          "I can eat pure fire",
          "I like a little kick",
          "I sweat but I push through",
          "Salt is too spicy for me"
        ]
      },
      {
        "id": 62,
        "text": "What is my preferred sleeping position?",
        "choices": [
          "On my back",
          "On my stomach",
          "Fetal position/side",
          "Starfish (taking the whole bed)"
        ]
      },
      {
        "id": 63,
        "text": "What is my worst habit?",
        "choices": [
          "Biting my nails",
          "Procrastinating",
          "Interrupting people",
          "Scrolling on my phone mid-conversation"
        ]
      },
      {
        "id": 64,
        "text": "If I won the lottery, what is the first thing I'd buy?",
        "choices": [
          "A massive mansion",
          "A luxury car",
          "A first-class ticket around the world",
          "Pay off all debt immediately"
        ]
      },
      {
        "id": 65,
        "text": "What is my favorite fast-food chain?",
        "choices": [
          "McDonald's",
          "KFC / Popeyes",
          "Burger King",
          "Subway / Healthy option"
        ]
      },
      {
        "id": 66,
        "text": "How do I react to jump scares in movies?",
        "choices": [
          "I don't flinch",
          "I scream out loud",
          "I cover my eyes the whole time",
          "I laugh at them"
        ]
      },
      {
        "id": 67,
        "text": "What was my favorite subject in school?",
        "choices": [
          "Math / Science",
          "English / Literature",
          "Art / Music",
          "P.E. / Gym"
        ]
      },
      {
        "id": 68,
        "text": "What is my usual shoe choice?",
        "choices": [
          "Sneakers / Jordans",
          "Boots",
          "Sandals / Crocs",
          "Formal shoes / Heels"
        ]
      },
      {
        "id": 69,
        "text": "How often do I clean my room/apartment?",
        "choices": [
          "Every single day (Neat freak)",
          "Once a week",
          "Only when someone is coming over",
          "It is a permanent disaster zone"
        ]
      },
      {
        "id": 70,
        "text": "What is my favorite type of music?",
        "choices": [
          "Rap / Hip-Hop",
          "Pop / Top 40",
          "Rock / Metal",
          "Indie / Alternative"
        ]
      },
      {
        "id": 71,
        "text": "Which household chore do I hate the most?",
        "choices": [
          "Doing dishes",
          "Folding laundry",
          "Vacuuming",
          "Cleaning the bathroom"
        ]
      },
      {
        "id": 72,
        "text": "What is my comfort TV show?",
        "choices": [
          "The Office / Friends",
          "True Crime documentaries",
          "Reality TV trash",
          "Anime"
        ]
      },
      {
        "id": 73,
        "text": "How do I pack for a trip?",
        "choices": [
          "Weeks in advance",
          "The night before",
          "Throwing everything in a bag 1 hour before",
          "I overpack for every scenario"
        ]
      },
      {
        "id": 74,
        "text": "What is my favorite dessert?",
        "choices": [
          "Chocolate anything",
          "Ice cream",
          "Cheesecake",
          "I prefer savory snacks over sweets"
        ]
      },
      {
        "id": 75,
        "text": "What time do I usually go to bed?",
        "choices": [
          "Before 10 PM",
          "Midnight",
          "2 AM - 3 AM",
          "When the sun comes up"
        ]
      }
    ]
  },
  "truth_or_lie": {
    "emoji": "\ud83e\udd25",
    "name": "Truth or Lie",
    "description": "Wild confessions & secret facts",
    "questions": [
      {
        "id": 76,
        "text": "Which of these is a true secret of mine?",
        "choices": [
          "I've kissed someone in a club bathroom",
          "I still check my ex's social media",
          "I've lied about my body count",
          "I've snooped through a partner's phone"
        ]
      },
      {
        "id": 77,
        "text": "Which illegal/reckless thing have I actually done?",
        "choices": [
          "Stolen something from a store",
          "Ran from the police/security",
          "Trespassed into an abandoned place",
          "Drove heavily intoxicated/high"
        ]
      },
      {
        "id": 78,
        "text": "Which of these lies have I told a partner?",
        "choices": [
          "\"I fell asleep\" (I was ignoring them)",
          "\"I'm almost there\" (I hadn't left yet)",
          "\"You're the biggest/best I've had\"",
          "\"I didn't see your text\""
        ]
      },
      {
        "id": 79,
        "text": "What is the most embarrassing thing I've done drunk?",
        "choices": [
          "Thrown up in public",
          "Texted an ex a massive paragraph",
          "Fallen and injured myself",
          "Started crying for no reason"
        ]
      },
      {
        "id": 80,
        "text": "Which of these wild places have I hooked up in?",
        "choices": [
          "A car in a public parking lot",
          "A movie theater",
          "A public beach/park at night",
          "A friend's bed during a party"
        ]
      },
      {
        "id": 81,
        "text": "Which of these petty things have I done?",
        "choices": [
          "Blocked someone just for annoying me",
          "Liked my own post on a burner account",
          "Started an argument because I was bored",
          "Purposely posted a story to make someone jealous"
        ]
      },
      {
        "id": 82,
        "text": "What is a weird quirk I actually have?",
        "choices": [
          "I talk to myself out loud",
          "I smell my own socks/clothes",
          "I eat food that fell on the floor",
          "I practice arguments in the shower"
        ]
      },
      {
        "id": 83,
        "text": "Which of these toxic traits do I actually possess?",
        "choices": [
          "I hold grudges forever",
          "I ghost people instead of communicating",
          "I manipulate situations to get my way",
          "I get insanely jealous over small things"
        ]
      },
      {
        "id": 84,
        "text": "What is a fake persona I've put on?",
        "choices": [
          "Pretending to like a band/movie to impress someone",
          "Faking an accent or background",
          "Lying about my age/name at a bar",
          "Acting rich when I was broke"
        ]
      },
      {
        "id": 85,
        "text": "Which of these awkward moments actually happened to me?",
        "choices": [
          "Walked in on parents/roommates",
          "Sent a dirty text to the wrong person",
          "Farted loudly in a quiet room",
          "Waved at someone who wasn't waving at me"
        ]
      },
      {
        "id": 86,
        "text": "What is a secret I kept from my parents?",
        "choices": [
          "A secret piercing/tattoo",
          "Sneaking out of the house at 3 AM",
          "Failing a major class",
          "A secret relationship"
        ]
      },
      {
        "id": 87,
        "text": "Which of these relationship rules have I broken?",
        "choices": [
          "Cheated or micro-cheated",
          "Flirted with my partner's friend",
          "Kept a backup plan/roster",
          "Gone through their messages"
        ]
      },
      {
        "id": 88,
        "text": "What is a weird fear I actually have?",
        "choices": [
          "Fear of belly buttons",
          "Fear of escalators",
          "Fear of dark water",
          "Fear of looking in mirrors at night"
        ]
      },
      {
        "id": 89,
        "text": "Which of these hygiene sins am I guilty of?",
        "choices": [
          "Not showering for 3+ days",
          "Peeing in the pool/shower",
          "Wearing the same underwear twice",
          "Using someone else's toothbrush"
        ]
      },
      {
        "id": 90,
        "text": "What is the worst date I've ever been on?",
        "choices": [
          "My date forgot their wallet",
          "They talked about their ex the whole time",
          "We got into a screaming match",
          "I left in the middle of it without telling them"
        ]
      },
      {
        "id": 91,
        "text": "Which of these financial mistakes have I made?",
        "choices": [
          "Maxed out a credit card on clothes",
          "Fell for a scam",
          "Lent money and never got it back",
          "Bought a gym membership and never went"
        ]
      },
      {
        "id": 92,
        "text": "What is a terrible phase I went through?",
        "choices": [
          "An intense emo/goth phase",
          "A highly toxic \"fuckboy/girl\" phase",
          "An obsessed stan/fangirl phase",
          "A \"I'm smarter than everyone\" phase"
        ]
      },
      {
        "id": 93,
        "text": "Which of these minor crimes would I commit if legal?",
        "choices": [
          "Bank robbery",
          "Stealing expensive cars",
          "Hacking someone's social media",
          "Tax fraud"
        ]
      },
      {
        "id": 94,
        "text": "What is a weird food combination I actually like?",
        "choices": [
          "Fries dipped in milkshake",
          "Ketchup on eggs",
          "Peanut butter and pickles",
          "Pineapple on pizza (and I defend it)"
        ]
      },
      {
        "id": 95,
        "text": "Which of these social faux pas am I guilty of?",
        "choices": [
          "Laughing at a funeral/serious moment",
          "Forgetting someone's name immediately",
          "Replying \"you too\" when a waiter says enjoy your food",
          "Tripping in public and pretending I meant to"
        ]
      },
      {
        "id": 96,
        "text": "What is a secret belief I hold?",
        "choices": [
          "Aliens are definitely living among us",
          "Ghosts and spirits are real",
          "Astrology dictates my life choices",
          "The earth might be flat"
        ]
      },
      {
        "id": 97,
        "text": "Which of these workplace/school sins have I committed?",
        "choices": [
          "Slept during a major meeting/class",
          "Stole someone's lunch from the fridge",
          "Plagiarized an entire assignment",
          "Lied to get out of work/class"
        ]
      },
      {
        "id": 98,
        "text": "What is a bad habit I have when drunk?",
        "choices": [
          "I become aggressively affectionate",
          "I start fights/arguments",
          "I disappear without telling anyone",
          "I spill all my secrets"
        ]
      },
      {
        "id": 99,
        "text": "Which of these superficial things do I care about?",
        "choices": [
          "How many followers someone has",
          "The brand of clothes they wear",
          "Their height/weight strictly",
          "What car they drive"
        ]
      },
      {
        "id": 100,
        "text": "What is a secret I've never told anyone until now?",
        "choices": [
          "I don't actually like my best friend",
          "I regret my major/career path",
          "I am still in love with my ex",
          "I have a secret stash of money"
        ]
      }
    ]
  }
};

let pendingGameType = '';
let pendingGameCode = '';

function createGame(gameType) {
  pendingGameType = gameType;
  const titles = {
    'compatibility_quiz': 'Compatibility Quiz',
    'spicy_or_sweet': 'Spicy or Sweet',
    'couple_trivia': 'Couple Trivia',
    'truth_or_lie': 'Truth or Lie'
  };
  const titleEl = document.getElementById('game-modal-title');
  if(titleEl) titleEl.textContent = 'Starting ' + (titles[gameType] || 'Game');
  const modalEl = document.getElementById('game-name-modal');
  if(modalEl) modalEl.style.display = 'flex';
  const nameInput = document.getElementById('modal-game-username');
  if(nameInput) {
    nameInput.value = '';
    nameInput.focus();
  }
}

function joinGameWithCode() {
  const codeInput = document.getElementById('game-code-input');
  const gameCode = codeInput ? codeInput.value.trim().toUpperCase() : '';
  
  if(!gameCode) {
    showToast('Please enter a game code', 'error');
    codeInput?.focus();
    return;
  }
  
  pendingGameCode = gameCode;
  pendingGameType = 'join';
  const titleEl = document.getElementById('game-modal-title');
  if(titleEl) titleEl.textContent = 'Joining Game';
  const modalEl = document.getElementById('game-name-modal');
  if(modalEl) modalEl.style.display = 'flex';
  const nameInput = document.getElementById('modal-game-username');
  if(nameInput) {
    nameInput.value = '';
    nameInput.focus();
  }
}

function closeGameModal() {
  const modalEl = document.getElementById('game-name-modal');
  if(modalEl) modalEl.style.display = 'none';
  pendingGameType = '';
  pendingGameCode = '';
}

async function submitGameName() {
  const nameInput = document.getElementById('modal-game-username');
  const username = nameInput ? nameInput.value.trim() : '';
  
  if(!username) {
    showToast('Please enter your name first', 'error');
    nameInput?.focus();
    return;
  }
  
  closeGameModal();
  
  if (pendingGameType === 'join') {
    // JOIN GAME FLOW
    try {
      const response = await fetch(BACKEND_URL + `/api/game/${pendingGameCode}/join`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username })
      });
      
      const data = await response.json();
      if(data.success) {
        currentGameCode = data.game_code;
        currentGameType = data.game_type || 'compatibility_quiz';
        showGameScreen(currentGameType, data.game_code, username);
        
        socket.emit('game_join', { game_code: data.game_code, username });
      } else {
        showToast(data.error || 'Invalid code', 'error');
      }
    } catch(e) {
      showToast(e.message, 'error');
      console.error('joinGame error:', e);
    }
  } else {
    // CREATE GAME FLOW
    try {
      const response = await fetch(BACKEND_URL + '/api/game/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ game_type: pendingGameType, username })
      });
      
      const data = await response.json();
      if(data.success) {
        currentGameCode = data.game_code;
        currentGameType = pendingGameType;
        showGameScreen(pendingGameType, data.game_code, username);
        
        socket.emit('game_join', { game_code: data.game_code, username });
      } else {
        showToast(data.error || 'Error creating game', 'error');
      }
    } catch(e) {
      showToast(e.message, 'error');
      console.error('createGame error:', e);
    }
  }
}

function showGameScreen(gameType, gameCode, username) {
  console.log('=== showGameScreen START ===');
  console.log('gameType:', gameType, 'gameCode:', gameCode, 'username:', username);
  
  // Hide lobby, show game screen
  const lobbyEl = document.getElementById('lobby');
  const appEl = document.getElementById('app');
  const gameScreenEl = document.getElementById('game-screen');
  
  console.log('Elements found:', { lobby: !!lobbyEl, app: !!appEl, gameScreen: !!gameScreenEl });
  
  if(lobbyEl) {
    lobbyEl.style.display = 'none';
    console.log('Hid lobby');
  }
  if(appEl) {
    appEl.style.display = 'none';
    console.log('Hid app');
  }
  if(gameScreenEl) {
    gameScreenEl.classList.add('is-active');
    // Force inline style — beats any CSS rule regardless of specificity or caching
    gameScreenEl.style.cssText = 'display:flex !important; flex-direction:column; position:fixed; inset:0; z-index:500; overflow:hidden;';
    console.log('Showed game-screen via is-active class + inline style');
  } else {
    console.error('❌ game-screen element NOT found!');
    return;
  }
  
  document.body.classList.add('game-active', 'app-active');
  console.log('Added game-active class to body');
  
  // Update game info
  const gameInfo = GAME_DATA[gameType];
  if(!gameInfo) {
    console.error('❌ Game data not found for type:', gameType);
    console.log('Available games:', Object.keys(GAME_DATA));
    return;
  }
  
  console.log('Game info:', gameInfo);
  
  const elements = {
    'game-emoji': gameInfo.emoji,
    'game-title': gameInfo.name,
    'game-description': gameInfo.description,
    'game-type-display': gameInfo.name,
    'game-code-display': '#' + gameCode,
    'game-code-large': gameCode
  };
  
  for(let [id, text] of Object.entries(elements)) {
    const el = document.getElementById(id);
    if(el) {
      el.textContent = text;
      console.log(`✓ Updated #${id} to "${text}"`);
    } else {
      console.warn(`⚠️ Element #${id} not found`);
    }
  }
  
  // Make sure game-lobby is visible and other sections are hidden
  const gameLobby = document.getElementById('game-lobby');
  const gamePlay = document.getElementById('game-play');
  const gameResults = document.getElementById('game-results');
  
  if(gameLobby) {
    gameLobby.style.display = 'flex';
    console.log('✓ Set game-lobby to display: flex');
  }
  if(gamePlay) {
    gamePlay.style.display = 'none';
  }
  if(gameResults) {
    gameResults.style.display = 'none';
  }
  
  myName = username;
  myRoom = gameCode;
  
  console.log('=== showGameScreen COMPLETE ===');
  console.log('Final state:', { myName, myRoom, gameScreenDisplay: gameScreenEl?.style.display });
}

function copyGameCode() {
  const code = document.getElementById('game-code-large').textContent;
  navigator.clipboard.writeText(code);
  alert('Game code copied! Share it with your friend');
}

function leaveGame() {
  const gameScreenEl = document.getElementById('game-screen');
  if(gameScreenEl) {
    gameScreenEl.classList.remove('is-active');
    gameScreenEl.style.cssText = '';
  }
  document.getElementById('lobby').style.display = '';
  document.getElementById('app').style.display = 'none';
  document.body.classList.remove('game-active', 'app-active');
  currentGameCode = '';
  currentGameType = '';
  myRoom = '';
  myName = '';
}

function startChatAfterGame() {
  // After playing a game, user can start a chat
  const chatUsernameInput = document.getElementById('chat-username-input');
  if(chatUsernameInput) {
    chatUsernameInput.value = myName;
  } else {
    // Fallback to game-username-input
    const gameUsernameInput = document.getElementById('game-username-input');
    if(gameUsernameInput) {
      gameUsernameInput.value = myName;
    }
  }
  leaveGame();
  // Optionally auto-fill their name in the chat section
}

function playAgain() {
  // Reset game and show lobby
  document.getElementById('game-results').style.display = 'none';
  document.getElementById('game-lobby').style.display = 'flex';
  socket.emit('game_play_again', { game_code: currentGameCode });
}

// ── Socket Events ──────────────────────────────────────────────
socket.on('connect',()=>console.log('Sidechick connected'));
socket.on('disconnect',()=>console.log('Sidechick disconnected'));
socket.on('message',renderMessage);
socket.on('system',(data)=>{
  const div=document.createElement('div');div.className='sys-msg';div.textContent=data.msg;
  const feed=document.getElementById('messages');feed.appendChild(div);scrollToBottom();
  const empty=document.getElementById('messages-empty');if(empty)empty.style.display='none';
});
socket.on('user_joined',(data)=>{if(data.username!==myName)document.getElementById('header-sub').textContent=data.username+' joined the room.'});
socket.on('user_left',(data)=>{document.getElementById('header-sub').textContent=data.username+' left the room.'});
socket.on('join_error',(data)=>{
  document.getElementById('app').style.display='none';document.getElementById('lobby').style.display='flex';
  document.body.classList.remove('app-active');myRoom='';setOpenMatchWaiting(false);
  setMatchStatus((data&&data.message)||'Could not join this room.','cancelled');
});
socket.on('room_users',updateParticipants);
socket.on('open_match_waiting',(data)=>{setOpenMatchWaiting(true);setMatchStatus((data&&data.message)||'Waiting…','waiting')});
socket.on('open_match_cancelled',(data)=>{setOpenMatchWaiting(false);setMatchStatus((data&&data.message)||'','cancelled')});
socket.on('open_match_found',(data)=>{
  if(!data||!data.room)return;
  const username=((document.getElementById('username-input') || document.getElementById('chat-username-input')).value||'').trim();if(!username)return;
  setOpenMatchWaiting(false);setMatchStatus('Match found. Opening room…','found');
  enterRoom(username,data.room,data.peer?'Matched with '+data.peer+'.':'Matched in an open room.');
});
socket.on('ai_config',(data)=>{updateAISummaryAvailability(!!data.openrouter);refreshAIStatus()});
socket.on('ai_infer',(data)=>{
  if(!data||!data.text)return;
  if(lastInferRequestId&&data.request_id&&data.request_id!==lastInferRequestId)return;
  if(data.text!==theirLastMsg)return;
  if(data.thinking)setThinking(data.thinking);if(data.expecting)setExpectation(data.expecting);
  if(data.mood){const el=document.getElementById('their-mood');if(el)el.textContent=data.mood}
});
socket.on('fact_check',(data)=>{if(!data||!data.fact||(data.sender&&data.sender===myName))return;updateFactCheck(data.fact)});
socket.on('ai_update',(data)=>{
  updateVibeBadge(data.level,data.label,data.alert_msg,data.stage_code||(data.drift&&data.drift.stage_code),data.critical_action||(data.drift&&data.drift.critical_action));
  if(data.drift)updateDriftPanel(data.drift);if(data.timeline)updateChart(data.timeline);
  if(data.prediction){const el=document.getElementById('prediction-text');if(el)el.textContent=data.prediction}
  if(data.thinking&&data.sender&&data.sender!==myName)setThinking(data.thinking);
});
socket.on('typing_insight',(data)=>{
  if(data.level!==undefined)updateVibeBadge(data.level,data.label||'Stable',data.alert||'',data.stage_code,data.critical_action);
  if(data.ghost)ghostText=data.ghost;
  if(data.prediction){const el=document.getElementById('prediction-text');if(el)el.textContent=data.prediction}
  if(data.sugg)renderSuggestions(data.sugg);
});
socket.on('suggestions',(data)=>renderSuggestions(data.sugg));
socket.on('ai_summary',(data)=>{
  const box=document.getElementById('ai-summary-text');const btn=document.getElementById('ai-summary-btn');
  if(!box)return;const summary=data.summary;
  if(summary&&typeof summary==='object'){
    box.innerHTML='<div class="summary-grid"><div class="summary-row"><span>Situation</span><strong>'+escapeHtml(summary.situation)+'</strong></div><div class="summary-row"><span>Speaker Need</span><strong>'+escapeHtml(summary.they_want)+'</strong></div><div class="summary-row"><span>Best Move</span><strong>'+escapeHtml(summary.best_move)+'</strong></div><div class="summary-row"><span>Avoid</span><strong>'+escapeHtml(summary.avoid)+'</strong></div></div>'+(summary.alert?'<div class="summary-alert">'+escapeHtml(summary.alert)+'</div>':'');
  }else box.textContent=summary||'No playbook available.';
  if(btn)btn.classList.remove('loading');
});

let theirTypingTimer=null;
socket.on('typing_status',(data)=>{
  if(data.username===myName)return;
  const feed=document.getElementById('messages');
  let indicator=document.getElementById('typing-indicator');
  if(!indicator){
    indicator=document.createElement('div');indicator.id='typing-indicator';
    indicator.className='msg slide-in theirs typing-indicator-msg';
    indicator.innerHTML='<div class="msg-avatar">'+data.username.charAt(0).toUpperCase()+'</div><div class="msg-body"><div class="msg-bubble typing-dots"><span>.</span><span>.</span><span>.</span></div></div>';
    feed.appendChild(indicator);scrollToBottom();
  }
  clearTimeout(theirTypingTimer);theirTypingTimer=setTimeout(()=>{const ind=document.getElementById('typing-indicator');if(ind)ind.remove()},2000);
});

// ── New: Reactions & Photos ────────────────────────────────────
socket.on('reaction_update', (data) => {
  const msgEl = messageIndexMap[data.msg_index];
  if(!msgEl) {
    console.log('Reaction update: message not found at index', data.msg_index, 'available:', Object.keys(messageIndexMap));
    return;
  }
  
  console.log('Reaction update received:', data);
  
  // Update stored reactions data
  msgEl.dataset.reactions = JSON.stringify(data.reactions);
  
  // Find reactions container
  let reactionsEl = msgEl.querySelector('.msg-reactions');
  if(!reactionsEl) {
    reactionsEl = document.createElement('div');
    reactionsEl.className = 'msg-reactions';
    const body = msgEl.querySelector('.msg-body');
    const reactBtns = body ? body.querySelector('.msg-react-btns') : null;
    if(body) body.insertBefore(reactionsEl, reactBtns);
  }
  
  // Update or remove reaction
  const existing = reactionsEl.querySelector(`button[data-emoji="${data.emoji}"]`);
  if(data.reactions[data.emoji] && data.reactions[data.emoji].length > 0) {
    if(existing) {
      existing.textContent = data.emoji + ' ' + data.reactions[data.emoji].length;
      existing.title = 'Reacted: ' + data.reactions[data.emoji].join(', ');
    } else {
      const btn = document.createElement('button');
      btn.className = 'reaction-btn';
      btn.dataset.emoji = data.emoji;
      btn.textContent = data.emoji + ' ' + data.reactions[data.emoji].length;
      btn.title = 'Reacted: ' + data.reactions[data.emoji].join(', ');
      btn.onclick = () => toggleReaction(data.msg_index, data.emoji);
      reactionsEl.appendChild(btn);
    }
  } else if(existing) {
    existing.remove();
  }
});

socket.on('photo_message', (data) => {
  renderMessage({
    username: data.username,
    photo_url: data.photo_url,
    message: data.message,
    text: data.message,
    is_photo: true,
    mood: data.mood || 'HAPPY',
    timestamp: data.timestamp,
    is_toxic: false,
    reactions: {},
    msg_index: data.msg_index
  });
});

// ── New: Game Events ────────────────────────────────────────
socket.on('game_started', (data) => {
  console.log('Game started:', data);
  showDetectiveToast(data.message);
});

socket.on('game_answer_submitted', (data) => {
  console.log('Player answered:', data);
});

socket.on('game_score', (data) => {
  const dialog = document.createElement('div');
  dialog.className = 'modal';
  dialog.innerHTML = `
    <div class="modal-content game-result">
      <h2>🎯 Compatibility Score</h2>
      <div class="score-display">
        <div class="score-number">${data.compatibility}%</div>
        <p>${data.message}</p>
        <p style="font-size: 0.9rem; color: #9bb0d2;">You got ${data.matched} out of ${data.total} right!</p>
      </div>
      <button onclick="this.closest('.modal').remove(); downloadScoreCard(${data.compatibility})" class="btn-primary">📸 Screenshot</button>
      <button onclick="this.closest('.modal').remove()" class="btn-secondary">Close</button>
    </div>
  `;
  document.body.appendChild(dialog);
});

socket.on('vibe_screenshot', (data) => {
  const screenshotCard = `
    ╔════════════════════════╗
    ║   SIDECHICK VIBE CHECK ║
    ╠════════════════════════╣
    ║ ${data.vibe_emoji} Chemistry: ${data.chemistry}%
    ║ Messages: ${data.message_count}
    ║ Room: ${data.room_code}
    ║
    ║ ✨ Highlights:
    ${data.green_flags.map(f => `    ║ • ${f}`).join('\n')}
    ║
    ║ ⚠️ To Watch:
    ${data.red_flags.map(f => `    ║ • ${f}`).join('\n')}
    ║
    ║ Best Moment:
    ║ "${data.best_moment.substring(0, 20)}..."
    ╚════════════════════════╝
  `;
  
  const dialog = document.createElement('div');
  dialog.className = 'modal';
  dialog.innerHTML = `
    <div class="modal-content">
      <h2>📸 Your Vibe Report</h2>
      <pre class="vibe-card">${screenshotCard}</pre>
      <button onclick="copyToClipboard(event)" class="btn-primary">Copy & Share</button>
      <button onclick="this.closest('.modal').remove()" class="btn-secondary">Close</button>
    </div>
  `;
  document.body.appendChild(dialog);
});

function downloadScoreCard(score) {
  const card = `SidekickAI Compatibility Score: ${score}%\nRoom: ${myRoom}\nWe know each other pretty well!`;
  navigator.clipboard.writeText(card);
  alert('Score copied! Paste it anywhere to brag 🎉');
}

function copyToClipboard(e) {
  const text = e.target.closest('.modal').querySelector('.vibe-card').textContent;
  navigator.clipboard.writeText(text);
  e.target.textContent = '✅ Copied!';
  setTimeout(() => e.target.textContent = 'Copy & Share', 2000);
}

// Real-time vibe meter update
socket.on('vibe_update', (data) => {
  const vibeMeter = document.getElementById('vibe-meter');
  const flagsDisplay = document.getElementById('flags-display');
  
  if(vibeMeter) {
    vibeMeter.style.display = 'block';
    document.getElementById('vibe-emoji').textContent = data.emoji;
    document.getElementById('vibe-text').textContent = 
      data.trend === 'rising' ? '📈 Energy rising!' : 
      data.trend === 'falling' ? '📉 Energy dipping' : '😊 Steady vibes';
    
    const alertsContainer = document.getElementById('vibe-alerts');
    alertsContainer.innerHTML = '';
    if(data.alert) {
      const alertTag = document.createElement('span');
      alertTag.className = 'vibe-alert-tag';
      alertTag.textContent = data.alert;
      alertsContainer.appendChild(alertTag);
    }
  }
  
  if(flagsDisplay && (data.green_flags.length > 0 || data.red_flags.length > 0)) {
    flagsDisplay.style.display = 'block';
    
    if(data.green_flags.length > 0) {
      const greenFlags = document.getElementById('green-flags');
      greenFlags.style.display = 'block';
      greenFlags.innerHTML = data.green_flags.map(f => `<p>${f}</p>`).join('');
    }
    
    if(data.red_flags.length > 0) {
      const redFlags = document.getElementById('red-flags');
      redFlags.style.display = 'block';
      redFlags.innerHTML = data.red_flags.map(f => `<p>${f}</p>`).join('');
    }
  }
});

// ── Keyboard & Viewport ────────────────────────────────────────
document.addEventListener('keydown',(event)=>{
  if(document.body.classList.contains('intro-active'))return;
  if(event.key==='Enter'&&document.getElementById('lobby').style.display!=='none')joinChat();
});
// Soft keyboard: update --real-viewport-h so app-screen stays correct
if(window.visualViewport){
  const setVH=()=>{
    document.documentElement.style.setProperty('--real-viewport-h',window.visualViewport.height+'px');
    const keyboardH=window.innerHeight-window.visualViewport.height-window.visualViewport.offsetTop;
    if(keyboardH>80)scrollToBottom(false);
  };
  window.visualViewport.addEventListener('resize',setVH);
  window.visualViewport.addEventListener('scroll',setVH);
  setVH();
}

// ── Game Socket Listeners ──────────────────────────────────────
socket.on('game_player_joined', (data) => {
  const statusBox = document.getElementById('game-status-box');
  const playersDiv = document.getElementById('game-players-in-lobby');
  
  if(statusBox && data.players.length === 2) {
    // Both players have joined - start game
    showGamePlay(currentGameType);
  }
  
  // Update player list
  if(playersDiv) {
    playersDiv.innerHTML = data.players.map(p => `<div class="game-player">✓ ${p}</div>`).join('');
  }
  
  if(data.new_player && data.new_player !== myName) {
    const statusText = document.getElementById('game-status-text');
    if(statusText) statusText.textContent = `${data.new_player} joined! Get ready...`;
  }
});

socket.on('game_answer_recorded', (data) => {
  console.log(`${data.username} answered question ${data.question_id}`);
  if (data.username === myName) {
    myAnswersTracker[data.question_id] = true;
  } else {
    partnerAnswersTracker[data.question_id] = true;
  }
  checkNextQuestion();
});

socket.on('game_results', (data) => {
  showGameResults(data);
});

socket.on('game_reset', () => {
  document.getElementById('game-results').style.display = 'none';
  document.getElementById('game-play').style.display = 'flex';
  document.getElementById('game-lobby').style.display = 'none';
  
  // Increment round so we get new random questions
  if (typeof currentGameRound === 'undefined') {
    window.currentGameRound = 1;
  }
  window.currentGameRound++;
  
  showGamePlay(currentGameType);
});

// ── Intro Loader ───────────────────────────────────────────────
function initIntroLoader(){
  const intro=document.getElementById('intro-loader');const skip=document.getElementById('intro-skip');
  if(!intro){
    document.body.classList.remove('intro-active');
    document.getElementById('mode-select').style.display = 'flex';
    return;
  }
  const reduceMotion=window.matchMedia&&window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const duration=reduceMotion?700:3000;let dismissed=false;
  
  const dismissIntro=()=>{
    if(dismissed)return;
    dismissed=true;
    window.scrollTo(0,0);
    intro.classList.add('is-leaving');
    document.body.classList.remove('intro-active');
    setTimeout(() => {
      intro.remove();
      document.getElementById('mode-select').style.display = 'flex';
    }, 650);
  };
  
  if(skip)skip.addEventListener('click',dismissIntro);
  setTimeout(dismissIntro,duration);
}

// ── Mode Selection ──────────────────────────────────────────────
function selectMode(mode) {
  const modeSelect = document.getElementById('mode-select');
  const lobby = document.getElementById('lobby');
  
  modeSelect.style.display = 'none';
  lobby.style.display = 'block';
  
  // Clear previous mode classes
  lobby.classList.remove('mode-chat', 'mode-game');
  
  if (mode === 'chat') {
    lobby.classList.add('mode-chat');
  } else if (mode === 'game') {
    lobby.classList.add('mode-game');
  }
}

function backToModeSelect() {
  const modeSelect = document.getElementById('mode-select');
  const lobby = document.getElementById('lobby');
  
  lobby.style.display = 'none';
  modeSelect.style.display = 'flex';
}

let currentQuestionIndex = 0;
let myAnswersTracker = {};
let partnerAnswersTracker = {};
let sessionQuestions = [];

function getSyncedQuestions(gameType, gameCode, count=5) {
  const allQs = GAME_DATA[gameType].questions;
  let seed = 0;
  
  // Include round number in seed so it changes on Play Again
  const round = window.currentGameRound || 1;
  const seedString = gameCode + '_' + round;
  
  for(let i = 0; i < seedString.length; i++) {
    seed += seedString.charCodeAt(i);
  }
  
  // Seeded shuffle
  let shuffled = [...allQs].sort((a, b) => {
     let x = Math.sin(seed++) * 10000;
     let rand1 = x - Math.floor(x);
     let y = Math.sin(seed++) * 10000;
     let rand2 = y - Math.floor(y);
     return rand1 - rand2;
  });
  
  return shuffled.slice(0, count);
}

function showGamePlay(gameType) {
  document.getElementById('game-lobby').style.display = 'none';
  document.getElementById('game-play').style.display = 'flex';
  
  // Apply Addictive Background Colors based on game mode
  const gameScreen = document.getElementById('game-screen');
  gameScreen.className = 'screen game-screen is-active'; // Reset classes
  if(gameType === 'spicy_or_sweet') gameScreen.classList.add('bg-spicy');
  else if(gameType === 'couple_trivia') gameScreen.classList.add('bg-trivia');
  else if(gameType === 'compatibility_quiz') gameScreen.classList.add('bg-sweet');
  else if(gameType === 'truth_or_lie') gameScreen.classList.add('bg-truth');
  
  currentQuestionIndex = 0;
  myAnswersTracker = {};
  partnerAnswersTracker = {};
  
  // Select exactly 5 questions synchronized via the gameCode
  sessionQuestions = getSyncedQuestions(gameType, currentGameCode, 10);
  
  renderQuestion(currentQuestionIndex);
}

function renderQuestion(index) {
  const q = sessionQuestions[index];
  
  document.getElementById('current-q-num').textContent = index + 1;
  document.getElementById('total-q-num').textContent = sessionQuestions.length;
  
  const progBar = document.getElementById('game-progress-bar');
  if(progBar) {
    const percent = ((index) / sessionQuestions.length) * 100;
    // For visual aesthetic, give a minimum width
    progBar.style.width = Math.max(percent, 5) + '%';
  }
  
  const qText = document.getElementById('question-text');
  qText.textContent = q.text;
  
  // Re-trigger animation
  qText.classList.remove('animate-in', 'animate-out');
  void qText.offsetWidth; // trigger reflow
  qText.classList.add('animate-in');
  
  const grid = document.getElementById('choices-grid');
  grid.innerHTML = '';
  
  q.choices.forEach(choice => {
    const card = document.createElement('div');
    card.className = 'choice-card animate-in';
    card.textContent = choice;
    card.onclick = () => selectChoice(q.id, choice, card);
    grid.appendChild(card);
  });
  
  document.getElementById('waiting-partner').style.display = 'none';
  grid.style.pointerEvents = 'auto';
}

function selectChoice(questionId, choiceText, cardElement) {
  // Visuals
  const grid = document.getElementById('choices-grid');
  Array.from(grid.children).forEach(c => c.classList.remove('selected'));
  cardElement.classList.add('selected');
  grid.style.pointerEvents = 'none'; // Prevent changing answer
  
  document.getElementById('waiting-partner').style.display = 'flex';
  
  socket.emit('game_answer_submit', {
    game_code: currentGameCode,
    username: myName,
    question_id: questionId,
    answer: choiceText
  });
}

// Global handler exposed to check advancement
function checkNextQuestion() {
  const q = sessionQuestions[currentQuestionIndex];
  if (myAnswersTracker[q.id] && partnerAnswersTracker[q.id]) {
     // Both answered! Move to next question with animation
     currentQuestionIndex++;
     if (currentQuestionIndex < sessionQuestions.length) {
         // Animate out
         document.getElementById('question-text').classList.add('animate-out');
         Array.from(document.getElementById('choices-grid').children).forEach(c => c.classList.add('animate-out'));
         
         setTimeout(() => renderQuestion(currentQuestionIndex), 500);
     } else {
         // Finished, request results
         socket.emit('game_get_results', { game_code: currentGameCode });
     }
  }
}

function showGameResults(data) {
  document.getElementById('game-play').style.display = 'none';
  document.getElementById('game-results').style.display = 'flex';
  
  // Fire Confetti!
  if (window.confetti) {
    let duration = data.compatibility >= 85 ? 6000 : 2500;
    const end = Date.now() + duration;
    
    (function frame() {
      // Base confetti
      confetti({
        particleCount: 5,
        angle: 60,
        spread: 45,
        origin: { x: 0 },
        colors: ['#E0AB8E', '#ffffff', '#FFD1DC', '#D8A081']
      });
      confetti({
        particleCount: 5,
        angle: 120,
        spread: 45,
        origin: { x: 1 },
        colors: ['#E0AB8E', '#ffffff', '#FFD1DC', '#D8A081']
      });
      
      // Crackers/Fireworks if >= 80%
      if (data.compatibility >= 85 && Math.random() < 0.2) {
        confetti({
          particleCount: 20,
          angle: Math.random() * 360,
          spread: 360,
          origin: { x: Math.random(), y: Math.random() - 0.2 },
          colors: ['#FFC1CC', '#FFD700', '#FFFFFF', '#FF69B4'],
          startVelocity: 30,
          gravity: 0.5,
          scalar: 0.8,
          ticks: 60
        });
      }
      
      if (Date.now() < end) requestAnimationFrame(frame);
    }());
  }
  
  // Animated Circular Scorecard
  const scorecard = document.getElementById('results-scorecard');
  const dashArray = 283; // 2 * pi * 45
  const dashOffset = dashArray - (dashArray * data.compatibility) / 100;
  
  scorecard.innerHTML = `
    <div class="score-ring-wrapper">
      <svg class="score-ring" viewBox="0 0 100 100">
        <defs>
          <linearGradient id="scoreGradient" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stop-color="#E0AB8E" />
            <stop offset="100%" stop-color="#FFD1DC" />
          </linearGradient>
        </defs>
        <circle class="ring-bg" cx="50" cy="50" r="45"></circle>
        <circle class="ring-fill" cx="50" cy="50" r="45" style="stroke-dasharray: ${dashArray}; stroke-dashoffset: ${dashArray}; animation: fillRing 1.5s cubic-bezier(0.2, 0.8, 0.2, 1) forwards; --target-offset: ${dashOffset};"></circle>
      </svg>
      <div class="score-number" id="animated-score">0%</div>
    </div>
    <div class="score-text">
      <p class="score-msg">${data.compatibility >= 85 ? '✨' : ''} ${data.message}</p>
      <p class="score-subtext">You matched ${data.matched} out of ${data.total} times.</p>
    </div>
  `;
  
  // Count-up animation for score
  let currentScore = 0;
  const targetScore = data.compatibility;
  const scoreElement = document.getElementById('animated-score');
  const duration = 1500; // matching ring animation
  const stepTime = Math.max(Math.floor(duration / (targetScore || 1)), 10);
  
  const timer = setInterval(() => {
    if (currentScore >= targetScore) {
      clearInterval(timer);
      scoreElement.textContent = targetScore + '%';
    } else {
      currentScore += Math.ceil(targetScore / 20); // Faster counting
      if(currentScore > targetScore) currentScore = targetScore;
      scoreElement.textContent = currentScore + '%';
    }
  }, stepTime);
  
  // Render Answer Breakdown
  const breakdownContainer = document.getElementById('results-breakdown');
  breakdownContainer.innerHTML = '<h3>Answers Breakdown</h3>';
  
  sessionQuestions.forEach((q, idx) => {
    const p1Ans = data.player1_answers ? data.player1_answers[q.id] : null;
    const p2Ans = data.player2_answers ? data.player2_answers[q.id] : null;
    
    // Determine if matched based on the logic we use in the backend
    const isMatch = (p1Ans && p2Ans && String(p1Ans).toLowerCase() === String(p2Ans).toLowerCase());
    
    const card = document.createElement('div');
    card.className = 'breakdown-card ' + (isMatch ? 'match' : 'miss');
    card.style.animationDelay = (idx * 0.15) + 's';
    
    card.innerHTML = `
      <div class="breakdown-q-text">Q${idx+1}: ${q.text}</div>
      <div class="breakdown-answers">
        <div class="breakdown-ans ${isMatch ? 'match' : 'miss'}">
          <span>${data.player1 || 'Player 1'}:</span>
          <strong>${p1Ans || 'No Answer'}</strong>
        </div>
        <div class="breakdown-ans ${isMatch ? 'match' : 'miss'}">
          <span>${data.player2 || 'Player 2'}:</span>
          <strong>${p2Ans || 'No Answer'}</strong>
        </div>
      </div>
      <div class="breakdown-icon">${isMatch ? '✅' : '❌'}</div>
    `;
    breakdownContainer.appendChild(card);
  });
  
  // Celebration Popup for high compatibility
  if (data.compatibility >= 85) {
    const oldPopup = document.getElementById('celebration-popup');
    if (oldPopup) oldPopup.remove();
    
    const popup = document.createElement('div');
    popup.id = 'celebration-popup';
    popup.className = 'celebration-popup';
    popup.innerHTML = `
      <div class="celebration-icon">💖</div>
      <div>
        <h4>Perfect Match!</h4>
        <p>You two are incredibly synced up.</p>
      </div>
    `;
    document.body.appendChild(popup);
    
    // Auto-remove after 8 seconds
    setTimeout(() => {
      if (popup) {
        popup.style.animation = 'none';
        popup.style.transform = 'translateX(150%)';
        popup.style.transition = 'transform 0.5s ease-in, opacity 0.5s ease-in';
        popup.style.opacity = '0';
        setTimeout(() => popup.remove(), 500);
      }
    }, 8000);
  }
}

// ── Boot ───────────────────────────────────────────────────────
initTheme();bindThemeToggles();setRoomMode('manual');initIntroLoader();
