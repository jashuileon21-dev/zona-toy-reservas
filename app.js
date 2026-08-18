const cfg = window.ZONA_TOY_CONFIG;
const sb = supabase.createClient(window.SUPABASE_URL, window.SUPABASE_PUBLISHABLE_KEY);
const $ = id => document.getElementById(id);
const resourceEl=$("resource"), dateEl=$("date"), durationEl=$("duration"), slotsEl=$("slots"), statusEl=$("availabilityStatus");
const bookingCard=$("bookingCard"), successCard=$("successCard"), selectedSlotText=$("selectedSlotText");
let selectedStart=null;

function todayLocal(){const d=new Date();return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}`;}
function minutes(hhmm){const [h,m]=hhmm.split(":").map(Number);return h*60+m;}
function hhmm(total){return `${String(Math.floor(total/60)).padStart(2,"0")}:${String(total%60).padStart(2,"0")}`;}
function formatTime(t){const [h,m]=String(t).slice(0,5).split(":").map(Number);return new Date(2000,0,1,h,m).toLocaleTimeString("es-MX",{hour:"numeric",minute:"2-digit"});}
function resourceName(id){return cfg.resources.find(r=>r.id===id)?.name||id;}
function durationLabel(mins){return mins===60?"1 hora":mins===90?"1 hora 30 min":"2 horas";}
function overlaps(startA,endA,startB,endB){return startA<endB && endA>startB;}

cfg.resources.forEach(r=>{const o=document.createElement("option");o.value=r.id;o.textContent=r.name;resourceEl.appendChild(o);});
cfg.durationOptions.forEach(m=>{const o=document.createElement("option");o.value=m;o.textContent=durationLabel(m);durationEl.appendChild(o);});
dateEl.min=todayLocal(); dateEl.value=todayLocal();

async function loadSlots(){
  selectedStart=null; bookingCard.classList.add("hidden"); slotsEl.innerHTML=""; statusEl.textContent="Cargando…";
  const date=dateEl.value, resource=resourceEl.value, duration=Number(durationEl.value);
  if(!date||!resource||!duration)return;

  const day=new Date(`${date}T12:00:00`).getDay(), hours=cfg.hours[day];
  const {data:booked,error}=await sb.rpc("get_booked_slots",{p_date:date,p_resource:resource});
  if(error){console.error(error);statusEl.textContent="Error";slotsEl.innerHTML='<p class="error">Falta conectar/configurar Supabase. Revisa README.md.</p>';return;}

  const reservations=(booked||[]).map(x=>({start:minutes(String(x.start_time).slice(0,5)),end:minutes(String(x.end_time).slice(0,5))}));
  const open=minutes(hours.open), close=minutes(hours.close);
  let available=0;

  for(let t=open;t+duration<=close;t+=cfg.slotStepMinutes){
    const end=t+duration;
    const blocked=reservations.some(r=>overlaps(t,end,r.start,r.end));
    const b=document.createElement("button");
    b.className="slot"; b.type="button"; b.textContent=formatTime(hhmm(t));
    if(blocked){b.classList.add("busy");b.disabled=true;}
    else{
      available++;
      b.addEventListener("click",()=>{
        document.querySelectorAll(".slot.selected").forEach(x=>x.classList.remove("selected"));
        b.classList.add("selected"); selectedStart=hhmm(t);
        selectedSlotText.textContent=`${resourceName(resource)} · ${date} · ${formatTime(hhmm(t))} a ${formatTime(hhmm(end))} · ${durationLabel(duration)}`;
        bookingCard.classList.remove("hidden"); bookingCard.scrollIntoView({behavior:"smooth",block:"start"});
      });
    }
    slotsEl.appendChild(b);
  }
  statusEl.textContent=`${available} horario(s) disponible(s)`;
}

resourceEl.addEventListener("change",loadSlots); dateEl.addEventListener("change",loadSlots); durationEl.addEventListener("change",loadSlots);

$("bookingForm").addEventListener("submit",async e=>{
  e.preventDefault(); if(!selectedStart)return;
  const btn=$("submitBtn"); btn.disabled=true; btn.textContent="Registrando…";
  const payload={p_resource:resourceEl.value,p_date:dateEl.value,p_start_time:selectedStart,p_duration_minutes:Number(durationEl.value),p_customer_name:$("name").value.trim(),p_phone:$("phone").value.trim(),p_notes:$("notes").value.trim()};
  const {data,error}=await sb.rpc("create_reservation",payload);
  btn.disabled=false; btn.textContent="Confirmar reserva";
  if(error){
    console.error(error);
    alert(error.message.includes("slot_unavailable")?"Ese horario acaba de ocuparse. Elige otro, por favor.":"No pudimos registrar la reserva. Intenta de nuevo.");
    await loadSlots(); return;
  }
  const end=hhmm(minutes(payload.p_start_time)+payload.p_duration_minutes);
  $("successText").textContent=`${payload.p_customer_name}, te esperamos el ${payload.p_date}, de ${formatTime(payload.p_start_time)} a ${formatTime(end)}, en ${resourceName(payload.p_resource)}.`;
  bookingCard.classList.add("hidden"); successCard.classList.remove("hidden"); successCard.scrollIntoView({behavior:"smooth"});
});

$("newBooking").addEventListener("click",async()=>{$("bookingForm").reset();successCard.classList.add("hidden");await loadSlots();window.scrollTo({top:0,behavior:"smooth"});});
loadSlots();
