// Very small Glen AI frontend — local only (no server). Keeps UI and simple canned replies.
const chatbotBtn = document.getElementById('chatbotBtn');
const chatWindow = document.getElementById('chatWindow');
const closeChat = document.getElementById('closeChat');
const chatMessages = document.getElementById('chatMessages');
const chatText = document.getElementById('chatText');
const chatSend = document.getElementById('chatSend');
const glenLoader = document.getElementById('glenLoader');

chatbotBtn.onclick = ()=> chatWindow.classList.toggle('hidden');
closeChat.onclick = ()=> chatWindow.classList.add('hidden');

function appendMessage(who, text){
  const el = document.createElement('div'); el.className = 'msg '+who; el.textContent = text; chatMessages.appendChild(el); chatMessages.scrollTop = chatMessages.scrollHeight;
}

async function respondTo(text){
  glenLoader.classList.remove('hidden');
  appendMessage('user', text);
  // simple simulated processing delay
  await new Promise(r=>setTimeout(r, 700));
  // simple heuristics
  let reply = "I can help you search movies — type a title or ask for categories.";
  if(/search|find|play|watch/i.test(text)) reply = 'Try typing the movie name in the search box above — or ask me to show Trending.';
  if(/premium|unlock/i.test(text)) reply = 'Click Unlock Premium in the sidebar to enable HD downloads and trailers.';
  appendMessage('glen', reply);
  // speak the reply
  if('speechSynthesis' in window){ const u = new SpeechSynthesisUtterance(reply); speechSynthesis.speak(u); }
  glenLoader.classList.add('hidden');
}

chatSend.onclick = ()=>{ const t = chatText.value.trim(); if(!t) return; chatText.value=''; respondTo(t); };
chatText.addEventListener('keypress', (e)=>{ if(e.key==='Enter') chatSend.click(); });
