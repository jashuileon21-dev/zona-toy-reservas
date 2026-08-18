const cfg=window.ZONA_TOY_CONFIG;
const sb=supabase.createClient(window.SUPABASE_URL,window.SUPABASE_PUBLISHABLE_KEY);
const $=id=>document.getElementById(id);
function todayLocal(){const d=new Date();return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}`;}
function fmtTime(t){const [h,m]=String(t).slice(0,5).split(":").map(Number);return new Date(2000,0,1,h,m).toLocaleTimeString("es-MX",{hour:"numeric",minute:"2-digit"});}
function resourceName(id){return cfg.resources.find(r=>r.id===id)?.name||id;}
cfg.resources.forEach(r=>{const o=document.createElement("option");o.value=r.id;o.textContent=r.name;$("adminResource").appendChild(o);});
$("adminDate").value=todayLocal();

async function checkSession(){const {data:{session}}=await sb.auth.getSession();if(session){$("loginCard").classList.add("hidden");$("adminPanel").classList.remove("hidden");loadReservations();}else{$("loginCard").classList.remove("hidden");$("adminPanel").classList.add("hidden");}}
$("loginForm").addEventListener("submit",async e=>{e.preventDefault();$("loginError").textContent="";const {error}=await sb.auth.signInWithPassword({email:$("email").value.trim(),password:$("password").value});if(error){$("loginError").textContent="No se pudo entrar. Revisa correo y contraseña.";return;}await checkSession();});
$("logoutBtn").addEventListener("click",async()=>{await sb.auth.signOut();await checkSession();});

async function loadReservations(){
  const date=$("adminDate").value,resource=$("adminResource").value;
  let q=sb.from("reservations").select("id,reservation_date,start_time,end_time,resource,customer_name,phone,notes,status,created_at").eq("reservation_date",date).order("start_time",{ascending:true});
  if(resource)q=q.eq("resource",resource);
  const {data,error}=await q;
  if(error){$("reservations").innerHTML=`<p class="error">No se pudieron cargar las reservas: ${error.message}</p>`;return;}
  $("count").textContent=data.length;
  if(!data.length){$("reservations").innerHTML='<div class="empty">No hay reservas para este día.</div>';return;}
  $("reservations").innerHTML="";
  data.forEach(r=>{
    const el=document.createElement("article");el.className="reservation";
    el.innerHTML=`<div class="time">${fmtTime(r.start_time)}–${fmtTime(r.end_time)}</div><div><strong>${escapeHtml(r.customer_name)}</strong><div class="meta">${escapeHtml(resourceName(r.resource))} · WhatsApp: ${escapeHtml(r.phone)}</div>${r.notes?`<div class="meta">Nota: ${escapeHtml(r.notes)}</div>`:""}<div class="meta">Estado: ${escapeHtml(r.status)}</div></div><div class="actions">${r.status!=="completed"?`<button class="done" data-action="complete" data-id="${r.id}">Atendida</button>`:""}${r.status!=="cancelled"?`<button class="danger" data-action="cancel" data-id="${r.id}">Cancelar</button>`:""}</div>`;
    $("reservations").appendChild(el);
  });
  document.querySelectorAll("[data-action]").forEach(btn=>btn.addEventListener("click",()=>changeStatus(btn.dataset.id,btn.dataset.action)));
}
async function changeStatus(id,action){const status=action==="complete"?"completed":"cancelled";if(status==="cancelled"&&!confirm("¿Cancelar esta reserva? Solo empleados pueden hacerlo."))return;const {error}=await sb.from("reservations").update({status}).eq("id",id);if(error){alert("No se pudo actualizar.");return;}loadReservations();}
function escapeHtml(v=""){return String(v).replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;"}[c]));}
$("refreshBtn").addEventListener("click",loadReservations);$("adminDate").addEventListener("change",loadReservations);$("adminResource").addEventListener("change",loadReservations);checkSession();
