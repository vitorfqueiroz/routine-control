const STORAGE_KEY = "meuControleDiario.v1";
const ALL_DAYS = [0,1,2,3,4,5,6]; // 0 = domingo; 6 = sábado
const WEEK_DAYS = [
  {value:1,label:"Seg"},{value:2,label:"Ter"},{value:3,label:"Qua"},
  {value:4,label:"Qui"},{value:5,label:"Sex"},{value:6,label:"Sáb"},{value:0,label:"Dom"}
];
const defaultSupplements = [
  {id: crypto.randomUUID(), name:"Vitamina B12", dose:"", time:"08:00", taken:false, days:[...ALL_DAYS]},
  {id: crypto.randomUUID(), name:"Vitamina D3", dose:"", time:"08:00", taken:false, days:[...ALL_DAYS]},
  {id: crypto.randomUUID(), name:"Zinco", dose:"", time:"", taken:false, days:[...ALL_DAYS]},
  {id: crypto.randomUUID(), name:"Magnésio", dose:"", time:"20:00", taken:false, days:[...ALL_DAYS]},
  {id: crypto.randomUUID(), name:"Ômega-3", dose:"", time:"08:00", taken:false, days:[...ALL_DAYS]},
  {id: crypto.randomUUID(), name:"Creatina", dose:"", time:"", taken:false, days:[...ALL_DAYS]}
];
const dateKey = (d=new Date()) => `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}`;
const todayKey = () => dateKey();
const freshState = () => ({
  goal:2500, water:0, waterEntries:[], supplements:defaultSupplements,
  days:{}, reminders:{waterInterval:60,start:"08:00",end:"21:00",lastWaterNotice:0},
  lastDate:todayKey(), lastSupplementNotice:{}
});
let state = loadState();
let deferredInstallPrompt = null;
let toastTimer = null;
function loadState(){
  try{
    const parsed = JSON.parse(localStorage.getItem(STORAGE_KEY));
    if(!parsed) return freshState();
    return {...freshState(),...parsed, supplements:normalizeSupplements(parsed.supplements||freshState().supplements), reminders:{...freshState().reminders,...parsed.reminders}, lastSupplementNotice:parsed.lastSupplementNotice||{}};
  }catch{return freshState();}
}
function normalizeSupplements(items){
  return (Array.isArray(items)?items:[]).map(s=>({...s,days:Array.isArray(s.days)&&s.days.length?s.days.filter(d=>ALL_DAYS.includes(d)):[...ALL_DAYS]}));
}
function isScheduledToday(s){return normalizeDays(s.days).includes(new Date().getDay());}
function normalizeDays(days){return Array.isArray(days)?days.filter(d=>ALL_DAYS.includes(d)):[...ALL_DAYS];}
function saveState(){ localStorage.setItem(STORAGE_KEY,JSON.stringify(state)); }
function ensureToday(){
  const key=todayKey();
  if(state.lastDate!==key){
    state.days[state.lastDate]={water:state.water,goal:state.goal,supplements:state.supplements.map(s=>({...s}))};
    state.water=0; state.waterEntries=[];
    state.supplements=state.supplements.map(s=>({...s,taken:false}));
    state.lastDate=key; saveState();
  }
}
function toast(message){
  const el=document.getElementById("toast");el.textContent=message;el.classList.add("show");
  clearTimeout(toastTimer);toastTimer=setTimeout(()=>el.classList.remove("show"),2400);
}
function escapeHTML(value){return String(value).replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));}
function render(){
  ensureToday();
  document.getElementById("todayLabel").textContent=new Date().toLocaleDateString("pt-BR",{weekday:"long",day:"numeric",month:"long"});
  const liters=(state.water/1000).toFixed(2).replace(".",",");
  document.getElementById("waterLiters").textContent=liters;
  const pct=Math.min(100,Math.round(state.water/Math.max(1,state.goal)*100));
  document.getElementById("waterProgress").style.width=pct+"%";
  document.getElementById("waterPercent").textContent=pct+"% da meta";
  document.getElementById("waterRemaining").textContent=state.water>=state.goal?"Meta atingida":`Faltam ${(state.goal-state.water).toLocaleString("pt-BR")} ml`;
  const scheduledSupplements=state.supplements.filter(isScheduledToday);
  document.getElementById("supplementCount").textContent=`${scheduledSupplements.filter(s=>s.taken).length}/${scheduledSupplements.length}`;
  const list=document.getElementById("supplementList");
  list.innerHTML=scheduledSupplements.length?scheduledSupplements.map(s=>`
    <div class="supplement-item">
      <input class="check" type="checkbox" data-check="${s.id}" ${s.taken?"checked":""} aria-label="Marcar ${escapeHTML(s.name)} como tomado">
      <div class="supplement-info">
        <div class="supplement-name">${escapeHTML(s.name)}</div>
        <div class="supplement-detail">${escapeHTML([s.dose,s.time?`Lembrete ${s.time}`:"Sem horário"].filter(Boolean).join(" · "))}</div>
      </div>
      <span class="supplement-state">${s.taken?"Tomado":"Pendente"}</span>
      <button class="edit-item" data-edit="${s.id}" aria-label="Editar ${escapeHTML(s.name)}">⋯</button>
    </div>`).join(""):`<p class="muted">${state.supplements.length?"Nenhum suplemento programado para hoje.":"Nenhum suplemento cadastrado. Adicione o primeiro acima."}</p>`;
  document.getElementById("goalInput").value=state.goal;
  document.getElementById("waterReminderInterval").value=state.reminders.waterInterval;
  document.getElementById("reminderStart").value=state.reminders.start;
  document.getElementById("reminderEnd").value=state.reminders.end;
  renderHistory();
  updateNotificationStatus();
}
function addWater(amount){
  amount=Math.floor(Number(amount));
  if(!Number.isFinite(amount)||amount<=0||amount>5000){toast("Informe uma quantidade entre 1 e 5.000 ml.");return;}
  state.water+=amount;state.waterEntries.push({amount,time:Date.now()});saveState();render();toast(`${amount} ml registrados.`);
}
function renderHistory(){
  const records=[];
  for(let i=6;i>=0;i--){
    const d=new Date();d.setDate(d.getDate()-i);
    const key=dateKey(d);
    const data=key===todayKey()?{water:state.water,goal:state.goal,supplements:state.supplements}:state.days[key];
    records.push({key,label:d.toLocaleDateString("pt-BR",{weekday:"short",day:"2-digit",month:"2-digit"}),data});
  }
  const saved=records.filter(r=>r.data);
  const avg=saved.length?Math.round(saved.reduce((a,r)=>a+r.data.water,0)/saved.length):0;
  const waterDays=saved.filter(r=>r.data.water>=r.data.goal).length;
  document.getElementById("weeklyStats").innerHTML=`
    <div class="stat-box"><strong>${(avg/1000).toFixed(2).replace(".",",")} L</strong><span>Média diária registrada</span></div>
    <div class="stat-box"><strong>${waterDays}/${saved.length}</strong><span>Dias que atingiram a meta</span></div>`;
  document.getElementById("historyList").innerHTML=records.reverse().map(r=>{
    if(!r.data)return `<div class="history-row"><strong>${r.label}</strong><span>Sem registro salvo</span></div>`;
    const dayOfWeek=new Date(r.key+"T12:00:00").getDay();
    const scheduled=(r.data.supplements||[]).filter(s=>normalizeDays(s.days).includes(dayOfWeek));
    const taken=scheduled.filter(s=>s.taken).length;
    const total=scheduled.length;
    return `<div class="history-row"><strong>${r.label}</strong><span>${(r.data.water/1000).toFixed(2).replace(".",",")} L · ${taken}/${total} suplementos</span></div>`;
  }).join("");
}
function switchTab(name){
  document.querySelectorAll(".tab").forEach(b=>b.classList.toggle("active",b.dataset.tab===name));
  document.querySelectorAll(".page").forEach(p=>p.classList.toggle("active",p.id===name));
}
function openSupplement(id=null){
  const item=state.supplements.find(s=>s.id===id);
  document.getElementById("dialogTitle").textContent=item?"Editar suplemento":"Adicionar suplemento";
  document.getElementById("supplementId").value=item?.id||"";
  document.getElementById("supplementName").value=item?.name||"";
  document.getElementById("supplementDose").value=item?.dose||"";
  document.getElementById("supplementTime").value=item?.time||"";
  const selectedDays=normalizeDays(item?.days);
  document.querySelectorAll("[data-weekday]").forEach(input=>{input.checked=selectedDays.includes(Number(input.value));});
  document.getElementById("deleteSupplement").hidden=!item;
  document.getElementById("supplementDialog").showModal();
}
function closeDialog(){document.getElementById("supplementDialog").close();}
function saveSupplement(event){
  event.preventDefault();
  const id=document.getElementById("supplementId").value;
  const selectedDays=[...document.querySelectorAll("[data-weekday]:checked")].map(input=>Number(input.value));
  if(!selectedDays.length){toast("Selecione pelo menos um dia da semana.");return;}
  const previous=state.supplements.find(s=>s.id===id);
  const item={id:id||crypto.randomUUID(),name:document.getElementById("supplementName").value.trim(),dose:document.getElementById("supplementDose").value.trim(),time:document.getElementById("supplementTime").value,taken:previous?.taken||false,days:selectedDays};
  if(!item.name)return;
  if(id)state.supplements=state.supplements.map(s=>s.id===id?item:s);
  else state.supplements.push(item);
  saveState();closeDialog();render();toast("Suplemento salvo.");
}
function deleteSupplement(){
  const id=document.getElementById("supplementId").value;
  if(!id||!confirm("Excluir este suplemento da sua lista?"))return;
  state.supplements=state.supplements.filter(s=>s.id!==id);saveState();closeDialog();render();toast("Suplemento excluído.");
}
async function enableNotifications(){
  if(!("Notification" in window)){toast("Este navegador não oferece notificações.");return;}
  const result=await Notification.requestPermission();
  updateNotificationStatus();
  toast(result==="granted"?"Notificações autorizadas.":"Permissão de notificação não concedida.");
}
function updateNotificationStatus(){
  const el=document.getElementById("notificationStatus");
  if(!("Notification" in window))el.textContent="Notificações não são suportadas neste navegador.";
  else el.textContent=Notification.permission==="granted"?"Notificações permitidas neste dispositivo.":"Notificações ainda não autorizadas.";
}
function inReminderWindow(){
  const now=new Date(), current=now.getHours()*60+now.getMinutes();
  const [sh,sm]=state.reminders.start.split(":").map(Number),[eh,em]=state.reminders.end.split(":").map(Number);
  return current>=sh*60+sm&&current<=eh*60+em;
}
function notify(title,body,tag){
  if(Notification.permission==="granted"){
    if("serviceWorker" in navigator && navigator.serviceWorker.controller){
      navigator.serviceWorker.ready.then(reg=>reg.showNotification(title,{body,icon:"icons/icon-192.png",badge:"icons/icon-192.png",tag}));
    }else new Notification(title,{body,icon:"icons/icon-192.png",tag});
  }
}
function reminderCheck(){
  if(Notification.permission!=="granted"||!inReminderWindow())return;
  const now=Date.now(), interval=Number(state.reminders.waterInterval)*60000;
  if(now-state.reminders.lastWaterNotice>=interval){
    notify("Hora de beber água","Registre sua próxima quantidade de água no Meu Controle Diário.","water-reminder");
    state.reminders.lastWaterNotice=now;saveState();
  }
  const hm=new Date().toTimeString().slice(0,5);
  state.supplements.filter(s=>isScheduledToday(s)&&s.time===hm&&!s.taken).forEach(s=>{
    const noticeKey=s.id+"-"+todayKey();
    if(state.lastSupplementNotice?.[noticeKey]!==hm){
      notify("Lembrete de suplementação",`Está no horário registrado: ${s.name}.`,"supplement-"+noticeKey);
      state.lastSupplementNotice=state.lastSupplementNotice||{};
      state.lastSupplementNotice[noticeKey]=hm;
      saveState();
    }
  });
}
function exportData(){
  const blob=new Blob([JSON.stringify({app:"Meu Controle Diário",version:1,exportedAt:new Date().toISOString(),state},null,2)],{type:"application/json"});
  const url=URL.createObjectURL(blob),a=document.createElement("a");a.href=url;a.download=`meu-controle-diario-${todayKey()}.json`;a.click();URL.revokeObjectURL(url);toast("Backup exportado.");
}
function importData(file){
  const reader=new FileReader();
  reader.onload=()=>{
    try{
      const parsed=JSON.parse(reader.result),incoming=parsed.state||parsed;
      if(!incoming||!Array.isArray(incoming.supplements)||typeof incoming.goal!=="number")throw new Error();
      if(!confirm("A importação substituirá os dados atuais. Continuar?"))return;
      state={...freshState(),...incoming,supplements:normalizeSupplements(incoming.supplements),reminders:{...freshState().reminders,...incoming.reminders},lastSupplementNotice:incoming.lastSupplementNotice||{}};
      saveState();render();toast("Backup importado.");
    }catch{toast("Arquivo inválido ou incompatível.");}
  };
  reader.readAsText(file);
}
document.querySelectorAll(".tab").forEach(b=>b.addEventListener("click",()=>switchTab(b.dataset.tab)));
document.querySelectorAll("[data-water]").forEach(b=>b.addEventListener("click",()=>addWater(b.dataset.water)));
document.getElementById("addCustomWater").addEventListener("click",()=>{addWater(document.getElementById("customWater").value);document.getElementById("customWater").value="";});
document.getElementById("customWater").addEventListener("keydown",e=>{if(e.key==="Enter")document.getElementById("addCustomWater").click();});
document.getElementById("undoWater").addEventListener("click",()=>{
  const last=state.waterEntries.pop();if(!last){toast("Não há registro para desfazer.");return;}
  state.water=Math.max(0,state.water-last.amount);saveState();render();toast("Último registro desfeito.");
});
document.getElementById("supplementList").addEventListener("change",e=>{
  const id=e.target.dataset.check;if(!id)return;
  state.supplements=state.supplements.map(s=>s.id===id?{...s,taken:e.target.checked}:s);saveState();render();
});
document.getElementById("supplementList").addEventListener("click",e=>{
  const btn=e.target.closest("[data-edit]");if(btn)openSupplement(btn.dataset.edit);
});
document.getElementById("addSupplementOpen").addEventListener("click",()=>openSupplement());
document.getElementById("closeDialog").addEventListener("click",closeDialog);
document.getElementById("cancelDialog").addEventListener("click",closeDialog);
document.getElementById("supplementForm").addEventListener("submit",saveSupplement);
document.getElementById("deleteSupplement").addEventListener("click",deleteSupplement);
document.getElementById("saveGoal").addEventListener("click",()=>{
  const v=Math.floor(Number(document.getElementById("goalInput").value));
  if(v<250||v>10000){toast("A meta deve estar entre 250 e 10.000 ml.");return;}
  state.goal=v;saveState();render();toast("Meta atualizada.");
});
document.getElementById("enableNotifications").addEventListener("click",enableNotifications);
["waterReminderInterval","reminderStart","reminderEnd"].forEach(id=>document.getElementById(id).addEventListener("change",()=>{
  state.reminders.waterInterval=Number(document.getElementById("waterReminderInterval").value);
  state.reminders.start=document.getElementById("reminderStart").value;
  state.reminders.end=document.getElementById("reminderEnd").value;
  saveState();toast("Lembretes atualizados.");
}));
document.getElementById("exportData").addEventListener("click",exportData);
document.getElementById("importData").addEventListener("change",e=>{if(e.target.files[0])importData(e.target.files[0]);e.target.value="";});
document.getElementById("clearData").addEventListener("click",()=>{
  if(!confirm("Isso apagará todos os registros e configurações deste dispositivo. Deseja continuar?"))return;
  state=freshState();saveState();render();toast("Dados apagados.");
});
window.addEventListener("beforeinstallprompt",e=>{e.preventDefault();deferredInstallPrompt=e;document.getElementById("installBtn").hidden=false;});
document.getElementById("installBtn").addEventListener("click",async()=>{
  if(!deferredInstallPrompt){toast("Use o menu do Chrome e escolha 'Instalar aplicativo'.");return;}
  deferredInstallPrompt.prompt();await deferredInstallPrompt.userChoice;deferredInstallPrompt=null;document.getElementById("installBtn").hidden=true;
});
if("serviceWorker" in navigator && location.protocol!=="file:")navigator.serviceWorker.register("./sw.js").catch(()=>{});
ensureToday();render();
setInterval(reminderCheck,30000);
document.addEventListener("visibilitychange",()=>{if(!document.hidden){ensureToday();render();reminderCheck();}});
