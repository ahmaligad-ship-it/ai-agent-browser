
/**
 * Gemini File Commander - 100% metadata-only, privacy first
 * Latest models: gemini-3.8-flash (newest agentic), gemini-3.6-flash, gemini-3.5-flash-lite
 * No file content is ever uploaded - only {name, path, source, dates, size, opens, hash}
 */

const MODELS = {
  "gemini-3.8-flash": {label:"3.8 Flash ⚡ newest", cost:"$0.10/$0.40", context:"1M", desc:"long-horizon coding & agents GA 2026-09-02"},
  "gemini-3.6-flash": {label:"3.6 Flash", cost:"$0.10/$0.40", context:"1M", desc:"balanced GA 2026-07-21"},
  "gemini-3.5-flash-lite": {label:"3.5 Flash-Lite 💰 cheapest", cost:"$0.075/$0.30", context:"1M", desc:"lowest-cost GA 2026-07-21"},
  "gemini-3.5-flash": {label:"3.5 Flash", cost:"$0.10/$0.40", context:"1M"}
};

const LS_KEY = "gfmc_api_key";
const LS_MODEL = "gfmc_model";
const LS_PERM = "gfmc_perm"; // partial | full
const LS_TRASH = "gfmc_trash";
const LS_LEARN = "gfmc_learn"; // user keep decisions to teach Gemini

// Mock file system - in real Android WebView this would be filled by native bridge
let MOCK_FILES = [
  {name:"ticket_cairo_2025-08-10.pdf", path:"/Download/", source:"Chrome - egyptair.com", created:"2025-08-01", last_opened:"2025-08-09", opens:3, size:"2.1MB", sizeBytes:2100000, type:"pdf", hash:"a1b2"},
  {name:"physics_final_2024.pdf", path:"/Download/", source:"Telegram - Uni Group", created:"2024-12-10", last_opened:"2024-12-20", opens:2, size:"5.4MB", sizeBytes:5400000, type:"pdf", hash:"c3d4"},
  {name:"IMG_20231201_123456.jpg", path:"/DCIM/Camera/", source:"Camera", created:"2023-12-01", last_opened:"2024-01-02", opens:12, size:"3.2MB", sizeBytes:3200000, type:"image", hash:"e5f6"},
  {name:"Ramadan_2024_photos.zip", path:"/Pictures/", source:"WhatsApp", created:"2024-04-10", last_opened:"2024-04-15", opens:1, size:"120MB", sizeBytes:120000000, type:"zip", hash:"g7h8"},
  {name:"resume_ahmed_old.pdf", path:"/Download/", source:"Chrome - wuzzuf.net", created:"2024-01-10", last_opened:"2024-01-11", opens:2, size:"1.2MB", sizeBytes:1200000, type:"pdf", hash:"i9j0"},
  {name:"VID_20250601_183000.mp4", path:"/DCIM/Camera/", source:"Camera", created:"2025-06-01", last_opened:"2025-06-02", opens:5, size:"45MB", sizeBytes:45000000, type:"video", hash:"k1l2"},
  {name:"document.pdf", path:"/Download/", source:"Chrome", created:"2026-09-10", last_opened:"", opens:0, size:"0.8MB", sizeBytes:800000, type:"pdf", hash:"m3n4"},
  {name:"download (1).pdf", path:"/Download/", source:"Chrome", created:"2026-09-12", last_opened:"", opens:0, size:"0.8MB", sizeBytes:800000, type:"pdf", hash:"m3n4_dup"},
  {name:"Screenshot_2025-02-15_22-10-05.png", path:"/Pictures/Screenshots/", source:"System", created:"2025-02-15", last_opened:"2025-02-16", opens:1, size:"1.1MB", sizeBytes:1100000, type:"image", hash:"o5p6"},
  {name:"temp_cache_123.tmp", path:"/Download/", source:"App - com.example", created:"2026-09-20", last_opened:"", opens:0, size:"0.02MB", sizeBytes:20000, type:"tmp", hash:"q7r8"},
  {name:"wedding_invite_2024.jpg", path:"/Download/", source:"WhatsApp", created:"2024-06-01", last_opened:"2024-06-02", opens:8, size:"2.5MB", sizeBytes:2500000, type:"image", hash:"s9t0"},
  {name:"my_id_card.jpg", path:"/Pictures/", source:"Camera", created:"2023-05-01", last_opened:"2026-09-01", opens:30, size:"1.8MB", sizeBytes:1800000, type:"image", hash:"u1v2_protected"}
];

let queue = [];
let trash = JSON.parse(localStorage.getItem(LS_TRASH) || "[]");
let learn = JSON.parse(localStorage.getItem(LS_LEARN) || "{}");

function init(){
  const key = localStorage.getItem(LS_KEY);
  const model = localStorage.getItem(LS_MODEL) || "gemini-3.8-flash";
  const perm = localStorage.getItem(LS_PERM) || "partial";
  if(key){
    document.getElementById("api-gate").style.display="none";
    document.getElementById("modelLabel").textContent = model;
    document.getElementById("settingsApiKey").value = key;
    fillModelSelects(model);
    setPerm(perm);
  } else {
    fillModelSelects(model);
  }
  bindEvents();
  renderAll();
  if(key) addBotMsg(`أهلاً! أنا Gemini Commander 🧠\nأعمل فقط على الميتاداتا - لا أرفع أي محتوى.\nالنموذج الحالي: **${model}** (${MODELS[model]?.desc||""})\nالصلاحيات: ${perm==="full"?"🔴 كاملة - أحذف بنفسي":"🟡 جزئية - أنتظر إذنك"}\nجرب: "افحص Download القديم" أو "سمّي الصور بالتاريخ"`);
}

function fillModelSelects(current){
  const sel = document.getElementById("modelSelect");
  const s2 = document.getElementById("settingsModel");
  [sel, s2].forEach(el=>{
    if(!el) return;
    el.innerHTML="";
    Object.keys(MODELS).forEach(m=>{
      const o=document.createElement("option");
      o.value=m; o.textContent=`${m} - ${MODELS[m].label}`;
      if(m===current) o.selected=true;
      el.appendChild(o);
    });
  });
}

function bindEvents(){
  document.getElementById("saveKeyBtn").onclick=()=>{
    const k=document.getElementById("apiKeyInput").value.trim();
    const m=document.getElementById("modelSelect").value;
    if(k.length<20) return toast("المفتاح قصير جداً");
    localStorage.setItem(LS_KEY,k);
    localStorage.setItem(LS_MODEL,m);
    document.getElementById("api-gate").style.display="none";
    toast("تم الحفظ - نبدأ 🚀");
    init();
  };
  document.getElementById("pasteBtn").onclick=async()=>{
    try{ const t=await navigator.clipboard.readText(); document.getElementById("apiKeyInput").value=t; }catch(e){ toast("الصق يدوياً"); }
  };
  document.getElementById("settingsBtn").onclick=()=> document.getElementById("settingsDrawer").classList.add("open");
  document.getElementById("closeSettings").onclick=()=> document.getElementById("settingsDrawer").classList.remove("open");
  document.getElementById("updateKey").onclick=()=>{
    const k=document.getElementById("settingsApiKey").value.trim();
    const m=document.getElementById("settingsModel").value;
    if(k) localStorage.setItem(LS_KEY,k);
    localStorage.setItem(LS_MODEL,m);
    document.getElementById("modelLabel").textContent=m;
    toast("تم التحديث");
  };
  document.getElementById("permPartial").onclick=()=> setPerm("partial");
  document.getElementById("permFull").onclick=()=> setPerm("full");
  document.querySelectorAll(".tabs button").forEach(b=> b.onclick=()=>{
    document.querySelectorAll(".tabs button").forEach(x=>x.classList.remove("active"));
    b.classList.add("active");
    document.querySelectorAll(".tab").forEach(t=>t.classList.remove("active"));
    document.getElementById("tab-"+b.dataset.tab).classList.add("active");
  });
  document.getElementById("scanBtn").onclick=()=> runExpiryScan();
  document.getElementById("searchInput").oninput=(e)=> renderExplorer(e.target.value);
  document.getElementById("sortSelect").onchange=(e)=> renderExplorer(document.getElementById("searchInput").value, e.target.value);
  document.getElementById("renameChronoBtn").onclick=()=> renameChrono();
  document.getElementById("createFolderBtn").onclick=()=> geminiCreateFolders();
  document.getElementById("organizeBtn").onclick=()=> geminiOrganize();
  document.getElementById("sendChatBtn").onclick=()=> handleChat();
  document.getElementById("chatInput").addEventListener("keydown", e=>{ if(e.key==="Enter") handleChat(); });
  document.querySelectorAll(".quick-prompts button").forEach(b=> b.onclick=()=>{ document.getElementById("chatInput").value=b.dataset.prompt; handleChat(); });
  document.getElementById("approveAllBtn").onclick=()=> approveAll();
  document.getElementById("rejectAllBtn").onclick=()=>{ queue=[]; renderQueue(); toast("تم الرفض"); };
  document.getElementById("emptyTrash").onclick=()=>{ trash=[]; localStorage.setItem(LS_TRASH, JSON.stringify(trash)); renderTrash(); toast("السلة فاضية"); };
}

function setPerm(p){
  localStorage.setItem(LS_PERM,p);
  document.getElementById("permPartial").classList.toggle("active", p==="partial");
  document.getElementById("permFull").classList.toggle("active", p==="full");
  toast(p==="full"?"🔴 صلاحيات كاملة - سأحذف مباشرة":"🟡 جزئية - سأنتظر موافقتك");
}

function toast(msg){
  const t=document.getElementById("toast");
  t.textContent=msg; t.classList.add("show"); setTimeout(()=>t.classList.remove("show"),2500);
}

// --- Local Scanner Intelligence (no upload) ---
function localExpiryScore(f){
  const now = new Date();
  const created = new Date(f.created);
  const last = f.last_opened ? new Date(f.last_opened) : null;
  const ageDays = (now - created)/(1000*3600*24);
  const idleDays = last ? (now-last)/(1000*3600*24) : ageDays;

  let score=0;
  let reasons=[];

  // Rule 1: Download never opened 7 days
  if(f.path.includes("Download") && f.opens===0 && ageDays>7){ score+=0.4; reasons.push(`لم يُفتح منذ ${Math.floor(ageDays)} يوم - نزّلته بالغلط؟`); }

  // Rule 2: Ticket with date in name expired
  const dateInName = f.name.match(/20\d{2}-\d{2}-\d{2}/);
  if(dateInName){
    const d=new Date(dateInName[0]);
    if(d < now){ score+=0.5; reasons.push(`تاريخ في الاسم ${dateInName[0]} انتهى منذ ${Math.floor((now-d)/86400000)} يوم`); }
  }

  // Rule 3: Exam / old semester
  if(/final|exam|physics|midterm/i.test(f.name) && ageDays>180){ score+=0.6; reasons.push("ملف امتحان قديم - صلاحيته انتهت بعد الامتحان"); }

  // Rule 4: Screenshots idle 90 days
  if(f.path.includes("Screenshots") && idleDays>90){ score+=0.5; reasons.push(`سكرين شوت لم يُفتح من ${Math.floor(idleDays)} يوم`); }

  // Rule 5: tmp/cache
  if(["tmp","log","cache"].includes(f.type)){ score+=0.9; reasons.push("ملف مؤقت - آمن للحذف"); }

  // Rule 6: Duplicates via hash
  const sameHash = MOCK_FILES.filter(x=>x.hash===f.hash && x.name!==f.name);
  if(sameHash.length>0){ score+=0.7; reasons.push(`مكرر - يوجد نسخة أخرى: ${sameHash[0].name}`); }

  // Rule 7: WhatsApp old
  if(f.source.includes("WhatsApp") && idleDays>90){ score+=0.3; reasons.push("من واتساب ولم يُفتح من فترة"); }

  // Protected - never delete
  if(f.hash.includes("protected") || f.name.includes("id_card")){ score=-1; reasons=["🔴 محمي - ممنوع لمسه"]; }

  // Learning: if user kept similar before, reduce score
  const key = f.type+"_"+f.source;
  if(learn[key] && learn[key].kept>learn[key].deleted) score*=0.3;

  return {score: Math.min(1, Math.max(0,score)), reasons, ageDays, idleDays};
}

function trustLevel(score, f){
  if(score<0) return {level:"red", label:"محظور"};
  if(score>=0.8) return {level:"green", label:"آمن"};
  if(score>=0.4) return {level:"yellow", label:"اسألني"};
  return {level:"green", label:"منخفض"};
}

// --- Gemini Integration - metadata only ---
async function callGemini(prompt, filesMeta){
  const key = localStorage.getItem(LS_KEY);
  const model = localStorage.getItem(LS_MODEL) || "gemini-3.8-flash";
  if(!key){ toast("ضع مفتاح API أولاً"); return null; }

  // Build safe prompt - ONLY metadata
  const system = `أنت Gemini File Commander - مدير ملفات ذكي يعمل فقط على الميتاداتا.
مهمتك: تحليل أسماء وميتاداتا الملفات فقط - ممنوع طلب محتوى.
أرجع JSON فقط بهذا الشكل:
{
  "actions": [
    {"file":"ticket_cairo_2025-08-10.pdf","action":"suggest_delete","reason":"تذكرة طيران تاريخها 2025-08-10 منتهي منذ شهور","expiry_score":0.92,"trust":"yellow","new_name":null},
    {"file":"VID_20250601_183000.mp4","action":"suggest_rename","reason":"فيديو بدون اسم واضح","new_name":"2025-06-01_18-30-00_Camera.mp4","expiry_score":0.1,"trust":"green"}
  ],
  "folders_to_create": ["Travel_Expired","Uni_2024"],
  "summary": "وجدت 2 ملف منتهي"
}
القواعد:
- لا تلمس الملفات المحظورة (id_card, DCIM/Camera عائلية كثيرة الفتح)
- expiry_score 0-1
- trust: green (احذف وانت مغمض), yellow (اسأل), red (ممنوع)
- لإعادة التسمية استخدم الترتيب الزمني YYYY-MM-DD_HH-MM-SS + المصدر
`;

  const userContent = `المستخدم قال: "${prompt}"

ملفات (ميتاداتا فقط - لا محتوى):
${JSON.stringify(filesMeta.slice(0,40), null, 2)}

السياق الزمني: اليوم ${new Date().toISOString().slice(0,10)}
تعلم من المستخدم: ${JSON.stringify(learn)}
`;

  try{
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${key}`;
    const res = await fetch(url, {
      method:"POST",
      headers:{"Content-Type":"application/json"},
      body: JSON.stringify({
        contents:[{role:"user", parts:[{text: system + "\n\n" + userContent}]}],
        generationConfig:{temperature:0.3, maxOutputTokens:2000, responseMimeType:"application/json"}
      })
    });
    const data = await res.json();
    if(!res.ok) throw new Error(data.error?.message || "Gemini error");
    const text = data.candidates?.[0]?.content?.parts?.[0]?.text || "{}";
    // Try parse JSON from text
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    const parsed = JSON.parse(jsonMatch? jsonMatch[0] : text);
    return parsed;
  }catch(e){
    console.error(e);
    // Fallback to local logic if API fails
    addBotMsg(`⚠️ Gemini لم يرد (${e.message}) - استخدمت الذكاء المحلي بدلاً.`);
    return localFallback(prompt, filesMeta);
  }
}

function localFallback(prompt, filesMeta){
  // Simple heuristic fallback
  let actions=[];
  filesMeta.forEach(f=>{
    const {score, reasons} = localExpiryScore(f);
    if(score>0.4){
      actions.push({file:f.name, action:"suggest_delete", reason:reasons.join("، "), expiry_score:score, trust: trustLevel(score,f).level});
    }
    if(f.name.startsWith("IMG_") || f.name.startsWith("VID_") || f.name==="document.pdf"){
      const d=new Date(f.created);
      const newName = `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}_${f.type}_${f.source.split(" ")[0]}.${f.type==="video"?"mp4":f.type}`;
      actions.push({file:f.name, action:"suggest_rename", reason:"اسم عام - إعادة تسمية زمنية", new_name:newName, expiry_score:0.1, trust:"green"});
    }
  });
  return {actions, folders_to_create:[], summary:"تحليل محلي"};
}

// --- Rendering ---
function renderAll(){
  runExpiryScan(false);
  renderExplorer();
  renderQueue();
  renderTrash();
}

function runExpiryScan(showToast=true){
  const scored = MOCK_FILES.map(f=>{
    const {score, reasons, ageDays, idleDays} = localExpiryScore(f);
    return {...f, expiry_score:score, reasons, ageDays, idleDays, trust: trustLevel(score,f)};
  }).filter(f=>f.expiry_score>0.35).sort((a,b)=>b.expiry_score-a.expiry_score);

  document.getElementById("expiredCount").textContent = scored.length;
  document.getElementById("spaceSave").textContent = (scored.reduce((s,f)=>s+f.sizeBytes,0)/1000000).toFixed(1)+" MB";
  document.getElementById("dupCount").textContent = MOCK_FILES.filter(f=> MOCK_FILES.filter(x=>x.hash===f.hash).length>1).length;

  const list = document.getElementById("expiredList");
  list.innerHTML="";
  scored.slice(0,10).forEach(f=> list.appendChild(fileCard(f, true)));

  if(showToast) toast(`🔍 وجدت ${scored.length} ملف منتهي`);
}

function renderExplorer(filter="", sort="expiry_desc"){
  let files = [...MOCK_FILES];
  if(filter){
    files = files.filter(f=> f.name.toLowerCase().includes(filter.toLowerCase()) || f.source.toLowerCase().includes(filter.toLowerCase()));
  }
  files = files.map(f=>{
    const {score, reasons} = localExpiryScore(f);
    return {...f, expiry_score:score, reasons, trust: trustLevel(score,f)};
  });
  if(sort==="expiry_desc") files.sort((a,b)=>b.expiry_score-a.expiry_score);
  if(sort==="date_desc") files.sort((a,b)=> new Date(b.created)-new Date(a.created));
  if(sort==="date_asc") files.sort((a,b)=> new Date(a.created)-new Date(b.created));
  if(sort==="size_desc") files.sort((a,b)=> b.sizeBytes-a.sizeBytes);

  const list=document.getElementById("explorerList");
  list.innerHTML="";
  files.forEach(f=> list.appendChild(fileCard(f, false)));
}

function fileCard(f, isExpired){
  const div=document.createElement("div");
  div.className="file-item";
  const icon = f.type==="image"?"🖼️": f.type==="video"?"🎬": f.type==="pdf"?"📄": f.type==="zip"?"🗜️": f.type==="tmp"?"🧹":"📦";
  const trust = f.trust;
  div.innerHTML=`
    <div class="thumb">${icon}</div>
    <div class="meta">
      <b>${f.name}</b>
      <small>📍 ${f.path} • ${f.source} • ${f.created} • فتح ${f.opens} مرة • ${f.size}</small>
      ${f.reasons? `<span class="reason">💡 ${f.reasons.join("، ")}</span>` : ""}
      <div style="margin-top:6px"><span class="trust ${trust.level}">${trust.level==="green"?"🟢":trust.level==="yellow"?"🟡":"🔴"} ${trust.label} ${isExpired? `• انتهاء ${Math.round(f.expiry_score*100)}%`:""}</span></div>
    </div>
    <div class="actions">
      <button class="btn-keep">🛡️ احتفظ</button>
      <button class="btn-rename">✏️ سمّي</button>
      <button class="btn-delete">🗑️ ${localStorage.getItem(LS_PERM)==="full"?"احذف":"للطابور"}</button>
    </div>
  `;
  div.querySelector(".btn-keep").onclick=()=>{
    const key = f.type+"_"+f.source;
    if(!learn[key]) learn[key]={kept:0, deleted:0};
    learn[key].kept++;
    localStorage.setItem(LS_LEARN, JSON.stringify(learn));
    toast("تم - سأتعلم أن هذا النوع مهم لك 🧠");
    // lower its score
    f.expiry_score*=0.2;
    renderAll();
  };
  div.querySelector(".btn-rename").onclick=()=> promptRename(f);
  div.querySelector(".btn-delete").onclick=()=>{
    if(localStorage.getItem(LS_PERM)==="full"){
      if(f.trust.level==="red"){ toast("🔴 محظور - لا يمكن حذفه"); return; }
      moveToTrash(f);
    } else {
      if(!queue.find(x=>x.name===f.name)) queue.push(f);
      renderQueue();
      toast("أُضيف للطابور ⏳");
    }
  };
  return div;
}

function promptRename(f){
  const d=new Date(f.created);
  const suggested = `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}_${String(d.getHours()).padStart(2,'0')}-${String(d.getMinutes()).padStart(2,'0')}_${f.source.split(" ")[0].replace(/[^a-zA-Z0-9]/g,"")}.${f.name.split(".").pop()}`;
  const newName = prompt(`إعادة تسمية زمنية لـ ${f.name}:`, suggested);
  if(newName && newName!==f.name){
    const idx=MOCK_FILES.findIndex(x=>x.name===f.name);
    if(idx>=0) MOCK_FILES[idx].name=newName;
    toast(`✅ تمت إعادة التسمية إلى ${newName}`);
    renderAll();
  }
}

function renameChrono(){
  // Chronological rename for all images/videos
  let count=0;
  const sorted=[...MOCK_FILES].filter(f=>["image","video"].includes(f.type)).sort((a,b)=> new Date(a.created)-new Date(b.created));
  sorted.forEach((f,i)=>{
    const d=new Date(f.created);
    const newName = `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}_${String(d.getHours()).padStart(2,'0')}${String(d.getMinutes()).padStart(2,'0')}_${String(i+1).padStart(3,'0')}.${f.name.split(".").pop()}`;
    const idx=MOCK_FILES.findIndex(x=>x.name===f.name && x.path===f.path);
    if(idx>=0){ MOCK_FILES[idx].name=newName; count++; }
  });
  toast(`✏️ تمت إعادة تسمية ${count} صورة/فيديو زمنياً`);
  renderExplorer();
}

// Trash & Queue
function moveToTrash(f){
  trash.push({...f, deletedAt:new Date().toISOString()});
  localStorage.setItem(LS_TRASH, JSON.stringify(trash));
  MOCK_FILES = MOCK_FILES.filter(x=> x.name!==f.name || x.path!==f.path);
  queue = queue.filter(x=> x.name!==f.name);
  renderAll();
  toast(`🗑️ حُذف - موجود في السلة 30 يوم`);
}

function renderQueue(){
  document.getElementById("queueCount").textContent=queue.length;
  const list=document.getElementById("queueList");
  list.innerHTML="";
  if(queue.length===0){ list.innerHTML="<p style='text-align:center;color:var(--muted);padding:20px'>لا يوجد ملفات في الطابور 🟢</p>"; return; }
  queue.forEach(f=>{
    const card=fileCard(f,false);
    // override delete button to approve
    const delBtn=card.querySelector(".btn-delete");
    delBtn.textContent="✅ موافقة حذف";
    delBtn.onclick=()=>{ moveToTrash(f); };
    list.appendChild(card);
  });
}
function approveAll(){
  const toDelete=[...queue];
  toDelete.forEach(f=> moveToTrash(f));
  toast(`✅ تم حذف ${toDelete.length} ملف`);
}
function renderTrash(){
  const list=document.getElementById("trashList");
  if(!list) return;
  list.innerHTML="";
  trash.slice(-10).reverse().forEach(f=>{
    const d=document.createElement("div");
    d.className="file-item";
    d.innerHTML=`<div class="thumb">♻️</div><div class="meta"><b>${f.name}</b><small>حُذف ${new Date(f.deletedAt).toLocaleDateString()}</small></div><div class="actions"><button class="btn-keep">↩️ استرجاع</button></div>`;
    d.querySelector("button").onclick=()=>{
      MOCK_FILES.push(f);
      trash=trash.filter(x=> x.name!==f.name || x.deletedAt!==f.deletedAt);
      localStorage.setItem(LS_TRASH, JSON.stringify(trash));
      renderAll();
      toast("↩️ تم الاسترجاع");
    };
    list.appendChild(d);
  });
}

// --- Gemini Chat Control ---
async function handleChat(){
  const input=document.getElementById("chatInput");
  const text=input.value.trim();
  if(!text) return;
  addUserMsg(text);
  input.value="";
  addBotMsg("⏳ Gemini يفكر... (يرسل ميتاداتا فقط)");
  const meta = MOCK_FILES.map(f=> ({name:f.name, path:f.path, source:f.source, created:f.created, last_opened:f.last_opened, opens:f.opens, size:f.size, type:f.type, hash:f.hash.slice(0,6)}));
  const result = await callGemini(text, meta);
  if(!result){ addBotMsg("❌ فشل الاتصال - تأكد من المفتاح"); return; }

  // Process actions
  let msg = result.summary ? `📋 ${result.summary}\n` : "";
  if(result.folders_to_create?.length) msg+=`📁 سيُنشئ مجلدات: ${result.folders_to_create.join(", ")}\n`;

  (result.actions||[]).forEach(a=>{
    const file = MOCK_FILES.find(f=> f.name===a.file);
    if(!file) return;
    msg+=`\n• ${a.file}: ${a.action} - ${a.reason} ${a.new_name? `→ ${a.new_name}`:""} (ثقة ${a.trust} - ${Math.round((a.expiry_score||0)*100)}%)\n`;
    if(a.action==="suggest_delete"){
      if(a.trust==="red"){ msg+=`  🔴 محظور - لن ألمسه\n`; return; }
      if(localStorage.getItem(LS_PERM)==="full" && a.trust==="green"){
        moveToTrash(file);
        msg+=`  ✅ حُذف تلقائياً (صلاحية كاملة)\n`;
      } else {
        if(!queue.find(x=>x.name===file.name)) queue.push({...file, geminiReason:a.reason, trust:{level:a.trust}});
        msg+=`  ⏳ أُضيف للطابور\n`;
      }
    }
    if(a.action==="suggest_rename" && a.new_name){
      const idx=MOCK_FILES.findIndex(f=> f.name===a.file);
      if(idx>=0){ MOCK_FILES[idx].name=a.new_name; msg+=`  ✏️ تمت إعادة التسمية\n`; }
    }
  });
  addBotMsg(msg || "لم أجد إجراء - جرب صياغة أخرى");
  renderAll();
}

function geminiCreateFolders(){
  handleChatWithPrompt("أنشئ هيكل مجلدات منظم حسب نوع الملفات وتاريخها");
}
function geminiOrganize(){
  handleChatWithPrompt("رتب الملفات تلقائياً: صور في Pictures/Organized، مستندات في Documents، مؤقت في Temp، وقديم في Archive - اقترح نقل فقط بدون حذف");
}
function handleChatWithPrompt(p){
  document.getElementById("chatInput").value=p;
  handleChat();
}

function addUserMsg(t){
  const box=document.getElementById("chatBox");
  const d=document.createElement("div");
  d.className="msg user"; d.textContent=t; box.appendChild(d); box.scrollTop=box.scrollHeight;
}
function addBotMsg(t){
  const box=document.getElementById("chatBox");
  const d=document.createElement("div");
  d.className="msg bot"; d.textContent=t; box.appendChild(d); box.scrollTop=box.scrollHeight;
}

init();
