const categories = [
  "Orders","Maintenance","Menswear","Computer Embroidery","Retail","W Designs",
  "Print Team + PE","Milake","WREET","Marketing","Surya Da","AI","Bridal",
  "Onaya Studio","Onaya Production","ALFA","Hydroponics","Personal",
  "Staff Planning","Personal Finance","Waiting","Ideas"
];
let currentFilter = "all";
const todayKey = () => new Date().toISOString().slice(0,10);
const niceDate = (dateString) => new Date(dateString+"T00:00:00").toLocaleDateString("en-IN",{weekday:"long",year:"numeric",month:"long",day:"numeric"});
let currentDate = localStorage.getItem("atelier_currentDate") || todayKey();
localStorage.setItem("atelier_currentDate", currentDate);
function emptyDay(date){ return { date, tasks: [], log: [] }; }
function loadDay(date=currentDate){ return JSON.parse(localStorage.getItem("atelier_day_"+date) || JSON.stringify(emptyDay(date))); }
function saveDay(day){ localStorage.setItem("atelier_day_"+day.date, JSON.stringify(day)); }
function writeLog(day, text){ day.log.unshift({time:new Date().toLocaleTimeString("en-IN",{hour:"2-digit",minute:"2-digit"}), text}); }
function classifyCategory(text){
  const t = text.toLowerCase();
  const map = [
    ["menswear","Menswear"],["coat","Menswear"],["sherwani","Menswear"],["anwar","Menswear"],
    ["bridal","Bridal"],["lehenga","Bridal"],["khakha","Bridal"],["uttam","Bridal"],["torani","Bridal"],
    ["wreet","WREET"],["milake","Milake"],["retail","Retail"],["hanger","Retail"],["tank","Retail"],["trial","Retail"],
    ["embroidery","Computer Embroidery"],["beads","Computer Embroidery"],["machine guy","Computer Embroidery"],
    ["hydroponics","Hydroponics"],["farm","Hydroponics"],["agricluster","Hydroponics"],
    ["alfa","ALFA"],["2p2","Personal Finance"],["trust","Personal Finance"],["llp","Personal Finance"],["huf","Personal Finance"],
    ["staff","Staff Planning"],["rinki","Staff Planning"],["payal","Staff Planning"],
    ["surya","Surya Da"],["marketing","Marketing"],["reel","Marketing"],["whatsapp","Marketing"],
    ["maintenance","Maintenance"],["ac change","Maintenance"],["godown","Maintenance"],
    ["waiting","Waiting"],["idea","Ideas"],["research","Ideas"]
  ];
  for (const [k,v] of map) if(t.includes(k)) return v;
  return "Personal";
}
function explicitCategory(raw){
  const m = raw.match(/(?:under|in)\s+([a-zA-Z &+]+)[:\-]/i);
  if(!m) return null;
  const req = m[1].trim().toLowerCase();
  return categories.find(c=>c.toLowerCase()===req) || null;
}
function extractPerson(text){
  const m = text.match(/(?:waiting on|from|ask|speak to|call|with|follow up with)\s+([A-Z][a-zA-Z]+(?:\s+[A-Z][a-zA-Z]+)?)/i);
  return m ? m[1] : "";
}
function cleanTaskText(command){
  return command.replace(/^(add|create|note|put|please add)\s+/i,"")
    .replace(/^task\s+/i,"")
    .replace(/^(under|in)\s+[a-z &+]+[:\-]\s*/i,"")
    .replace(/^that\s+/i,"")
    .trim();
}
function parseCommand(command){
  const raw = command.trim(); if(!raw) return;
  const lower = raw.toLowerCase(); let day = loadDay();
  if(lower.includes("mark") && lower.includes("done")){
    const target = lower.replace("mark","").replace("as","").replace("done","").trim();
    let found = false;
    day.tasks.forEach(t=>{ if(t.text.toLowerCase().includes(target)){ t.status="done"; t.completedAt=new Date().toISOString(); found=true; }});
    writeLog(day, found ? `Completed: ${target}` : `Could not find task: ${target}`); saveDay(day); render(); return;
  }
  if(lower.startsWith("delete") || lower.startsWith("remove")){
    const target = lower.replace(/^delete|^remove/,"").trim(); const before = day.tasks.length;
    day.tasks = day.tasks.filter(t=>!t.text.toLowerCase().includes(target));
    writeLog(day, before!==day.tasks.length ? `Deleted: ${target}` : `Could not find item: ${target}`); saveDay(day); render(); return;
  }
  const category = explicitCategory(raw) || classifyCategory(raw);
  const status = lower.includes("waiting") || lower.includes("follow up") || lower.includes("chase") ? "waiting" : "open";
  const person = extractPerson(raw);
  const text = cleanTaskText(raw);
  day.tasks.push({id:crypto.randomUUID ? crypto.randomUUID() : String(Date.now()+Math.random()),createdAt:new Date().toISOString(),category,status,person,text});
  writeLog(day, `Added under ${category}: ${text}`); saveDay(day); render();
}
function toggleDone(id){ const day=loadDay(); const t=day.tasks.find(x=>x.id===id); if(t){t.status=t.status==="done"?"open":"done"; writeLog(day, `${t.status==="done"?"Completed":"Reopened"}: ${t.text}`);} saveDay(day); render(); }
function moveToWaiting(id){ const day=loadDay(); const t=day.tasks.find(x=>x.id===id); if(t){t.status="waiting"; t.category="Waiting"; writeLog(day, `Moved to Waiting: ${t.text}`);} saveDay(day); render(); }
function deleteTask(id){ const day=loadDay(); const t=day.tasks.find(x=>x.id===id); day.tasks=day.tasks.filter(x=>x.id!==id); if(t) writeLog(day, `Deleted: ${t.text}`); saveDay(day); render(); }
function createTomorrow(){ const today=loadDay(); const d=new Date(currentDate+"T00:00:00"); d.setDate(d.getDate()+1); const tomorrowDate=d.toISOString().slice(0,10); const tomorrow=loadDay(tomorrowDate); const existing = new Set(tomorrow.tasks.map(t=>t.text+"|"+t.category)); const carry=today.tasks.filter(t=>t.status!=="done" && !existing.has(t.text+"|"+t.category)).map(t=>({...t,id:(crypto.randomUUID?crypto.randomUUID():String(Date.now()+Math.random())),carriedFrom:currentDate})); tomorrow.tasks=[...tomorrow.tasks,...carry]; writeLog(tomorrow,`Carried forward ${carry.length} open/waiting tasks from ${currentDate}`); saveDay(tomorrow); currentDate=tomorrowDate; localStorage.setItem("atelier_currentDate",currentDate); render(); }
function exportToday(){ const day=loadDay(); let text=`Atelier OS — ${day.date}\n\n`; categories.forEach(cat=>{ const items=day.tasks.filter(t=>t.category===cat); if(items.length){ text+=`\n${cat}\n`; items.forEach(t=>text+=`- [${t.status}] ${t.text}${t.person?` — ${t.person}`:""}\n`); }}); text+=`\nDaily Log\n`; day.log.forEach(l=>text+=`- ${l.time}: ${l.text}\n`); navigator.clipboard?.writeText(text); document.getElementById("status").textContent="Copied today’s list to clipboard."; }
function addSampleList(){ [
  "Add under Menswear: call Anwar Ahmed for coat and shirt fabric",
  "Add under Bridal: follow up with Uttam Hazra PC",
  "Add under WREET: prepare colour swatches for all",
  "Add under Retail: hire one proper cleaning staff",
  "Add under Personal Finance: speak to Ankit Bhaiya about Trust and LLP",
  "Add under Hydroponics: review Agricluster and Sandeep Reddy material"
].forEach(parseCommand); }
function applyFilter(items){ if(currentFilter==="all") return items.filter(t=>t.status!=="done"); if(currentFilter==="waiting") return items.filter(t=>t.status==="waiting" || t.category==="Waiting"); if(currentFilter==="done") return items.filter(t=>t.status==="done"); return items; }
function render(){
  const day=loadDay(); document.getElementById("todayLabel").textContent=niceDate(day.date);
  const open=day.tasks.filter(t=>t.status==="open").length, waiting=day.tasks.filter(t=>t.status==="waiting"||t.category==="Waiting").length, done=day.tasks.filter(t=>t.status==="done").length;
  const activeCats=new Set(day.tasks.filter(t=>t.status!=="done").map(t=>t.category)).size;
  document.getElementById("openCount").textContent=open; document.getElementById("waitingCount").textContent=waiting; document.getElementById("doneCount").textContent=done; document.getElementById("categoryCount").textContent=activeCats;
  const board=document.getElementById("board"), logPanel=document.getElementById("logPanel"); board.innerHTML="";
  logPanel.classList.toggle("hidden", currentFilter!=="log"); board.classList.toggle("hidden", currentFilter==="log");
  if(currentFilter!=="log"){
    let has=false;
    categories.forEach(cat=>{ const items=applyFilter(day.tasks).filter(t=>t.category===cat); if(!items.length) return; has=true; const sec=document.createElement("section"); sec.className="category"; sec.innerHTML=`<div class="category-head"><h2>${cat}</h2><span class="count">${items.length}</span></div>`; items.forEach(t=>{ const div=document.createElement("div"); div.className="task "+(t.status==="done"?"done":""); div.innerHTML=`<input class="check" type="checkbox" ${t.status==="done"?"checked":""} onchange="toggleDone('${t.id}')"/><div class="task-text">${escapeHtml(t.text)}<div class="meta"><span class="pill ${t.status}">${t.status}</span>${t.person?`<span class="pill">${escapeHtml(t.person)}</span>`:""}${t.carriedFrom?`<span class="pill">from ${t.carriedFrom}</span>`:""}</div></div><div class="actions"><button onclick="moveToWaiting('${t.id}')">Waiting</button><button onclick="deleteTask('${t.id}')">Delete</button></div>`; sec.appendChild(div); }); board.appendChild(sec); });
    if(!has) board.innerHTML=`<div class="empty"><h2>No active tasks here.</h2><p>Speak a command to start today’s list.</p></div>`;
  }
  document.getElementById("logList").innerHTML=day.log.map(l=>`<div class="log-entry"><b>${l.time}</b>${escapeHtml(l.text)}</div>`).join("") || `<p class="status">No log entries yet.</p>`;
  document.querySelectorAll(".nav").forEach(b=>b.classList.toggle("active", b.dataset.filter===currentFilter));
}
function escapeHtml(s){ return String(s).replace(/[&<>'"]/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;","'":"&#39;",'"':"&quot;"}[c])); }
document.getElementById("runBtn").onclick=()=>parseCommand(document.getElementById("commandBox").value);
document.getElementById("rolloverBtn").onclick=createTomorrow; document.getElementById("exportBtn").onclick=exportToday; document.getElementById("sampleBtn").onclick=addSampleList;
document.getElementById("clearDoneBtn").onclick=()=>{ const day=loadDay(); const count=day.tasks.filter(t=>t.status==="done").length; day.tasks=day.tasks.filter(t=>t.status!=="done"); writeLog(day,`Archived ${count} completed tasks from active board.`); saveDay(day); render(); };
document.querySelectorAll(".quickbar button").forEach(b=>b.onclick=()=>{ document.getElementById("commandBox").value=b.dataset.quick; document.getElementById("commandBox").focus(); });
document.querySelectorAll(".nav").forEach(b=>b.onclick=()=>{ currentFilter=b.dataset.filter; render(); });
const SpeechRecognition=window.SpeechRecognition||window.webkitSpeechRecognition; const mic=document.getElementById("micBtn");
if(SpeechRecognition){ const rec=new SpeechRecognition(); rec.lang="en-IN"; rec.interimResults=false; rec.continuous=false; mic.onclick=()=>{ mic.classList.add("listening"); document.getElementById("status").textContent="Listening..."; rec.start(); }; rec.onresult=e=>{ const text=e.results[0][0].transcript; document.getElementById("commandBox").value=text; document.getElementById("status").textContent=`Heard: ${text}`; parseCommand(text); mic.classList.remove("listening"); }; rec.onerror=e=>{ document.getElementById("status").textContent="Voice error: "+e.error; mic.classList.remove("listening"); }; rec.onend=()=>mic.classList.remove("listening"); } else { mic.onclick=()=>document.getElementById("status").textContent="Voice recognition is not supported here. Type the command instead."; }
if("serviceWorker" in navigator){ window.addEventListener("load",()=>navigator.serviceWorker.register("service-worker.js").catch(()=>{})); }
render();
