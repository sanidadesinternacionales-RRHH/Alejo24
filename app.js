// ALEJO 24 – prototipo funcional (sin backend). Datos en localStorage.
const LS_KEY = "alejo24-data-v1";

// ======== Datos base ========
const seed = {
  unidades: [
    {id:1, codigo:"DSMI", nombre:"DSMI"},
    {id:2, codigo:"DSAI", nombre:"DSAI"}
  ],
  personal: [
    {id:101, nombres:"Ana", apellidos:"Pérez", unidad:1},
    {id:102, nombres:"Juan", apellidos:"López", unidad:1},
    {id:201, nombres:"Ramos", apellidos:"Lucía", unidad:2},
    {id:202, nombres:"Vega", apellidos:"Mario", unidad:2}
  ],
  tipos: [
    {id:1, nombre:"Diurno", horas:8},
    {id:2, nombre:"Nocturno", horas:8}
  ],
  reglas: [
    {id_unidad:1, cobertura_minima:3, horas_max_semana:48, descanso_min_horas:12, activa:true},
    {id_unidad:2, cobertura_minima:3, horas_max_semana:48, descanso_min_horas:12, activa:true}
  ],
  asignaciones: [
    {id:1, id_personal:101, id_unidad:1, id_tipo:1, fecha:"2025-10-07", estado:"PUBLICADO"},
    {id:2, id_personal:102, id_unidad:1, id_tipo:1, fecha:"2025-10-07", estado:"PLANIFICADO"},
    {id:3, id_personal:201, id_unidad:2, id_tipo:2, fecha:"2025-10-07", estado:"PUBLICADO"},
    {id:4, id_personal:202, id_unidad:2, id_tipo:1, fecha:"2025-10-07", estado:"PUBLICADO"}
  ],
  bitacora: [
    {id:1, fecha_hora:"2025-10-06T09:00:00Z", accion:"PUBLICADO", detalle:"Carga inicial", id_usuario:1, id_asignacion:1}
  ],
  notificaciones: [
    {id:1, id_usuario:101, titulo:"Recordatorio", mensaje:"Tu turno inicia 08:00", fecha_hora:"2025-10-07T06:00:00Z", leido:false},
    {id:2, id_usuario:101, titulo:"Reprogramación", mensaje:"Turno cambiado a Diurno", fecha_hora:"2025-10-05T12:00:00Z", leido:false}
  ]
};

function load() {
  const raw = localStorage.getItem(LS_KEY);
  if (!raw) { localStorage.setItem(LS_KEY, JSON.stringify(seed)); return seed; }
  try { return JSON.parse(raw); } catch { return seed; }
}
function save(db) { localStorage.setItem(LS_KEY, JSON.stringify(db)); }
let db = load();

// Utilidades
const fmt = d => dayjs(d).format("YYYY-MM-DD");
function find(arr, id) { return arr.find(x => x.id === id); }
function personaName(id) {
  const p = find(db.personal, id); return p ? `${p.apellidos}, ${p.nombres}` : id;
}
function unidadName(id) {
  const u = db.unidades.find(x => x.id === id); return u ? u.nombre : id;
}
function tipoName(id) {
  const t = db.tipos.find(x => x.id === id); return t ? t.nombre : id;
}

// ======== RENDER: USUARIO ========
const U = {
  userId: 101, // prototipo: usuario fijo Ana Pérez

  kpis() {
    const hoy = fmt(new Date());
    const mias = db.asignaciones.filter(a => a.id_personal === this.userId);
    const next = mias.sort((a,b)=>a.fecha.localeCompare(b.fecha))[0];
    const asigHoyUnidad = db.asignaciones.filter(a => a.fecha===hoy && a.id_unidad=== (mias[0]?.id_unidad||1));
    const regla = db.reglas.find(r => r.id_unidad === (mias[0]?.id_unidad||1));
    // KPIs
    const kpi = [
      {t:"Cobertura hoy", v: `${asigHoyUnidad.length*100/Math.max(1, regla.cobertura_minima)}%`, s:`Meta ${regla.cobertura_minima} · Asignados ${asigHoyUnidad.length}`},
      {t:"Próximo turno", v: next? `${tipoName(next.id_tipo)} ${next.fecha}` : "—", s:`Unidad: ${unidadName(mias[0]?.id_unidad||1)`},
      {t:"Alertas", v:"0", s:"Todo en orden"},
      {t:"Notificaciones", v: String(db.notificaciones.filter(n=>n.id_usuario===this.userId && !n.leido).length)+" nuevas", s:""}
    ];
    const cont = document.getElementById("u-kpis");
    cont.innerHTML = kpi.map(k=>`<div class="card"><div class="card-title">${k.t}</div><div style="font-size:24px;font-weight:800">${k.v}</div><div class="hint">${k.s}</div></div>`).join("");
  },

  notificaciones() {
    const list = document.getElementById("u-notif-list");
    const items = db.notificaciones.filter(n=>n.id_usuario===this.userId).sort((a,b)=>b.fecha_hora.localeCompare(a.fecha_hora));
    list.innerHTML = items.map(n=>`<li><b>${n.titulo}</b> – ${n.mensaje} <span class="hint">(${n.leido?"leído":"nuevo"})</span></li>`).join("");
    // página
    document.getElementById("u-notif-page").innerHTML = list.innerHTML;
    document.getElementById("u-markall").onclick = ()=>{
      db.notificaciones.forEach(n=>{ if(n.id_usuario===this.userId) n.leido=true; });
      save(db); this.notificaciones();
    };
  },

  bitacora() {
    const table = document.getElementById("u-bitacora");
    const myAsig = db.asignaciones.filter(a=>a.id_personal===this.userId).map(a=>a.id);
    const rows = db.bitacora.filter(b=>myAsig.includes(b.id_asignacion)).sort((a,b)=>b.fecha_hora.localeCompare(a.fecha_hora));
    table.innerHTML = `<tr><th>Fecha</th><th>Acción</th><th>Detalle</th></tr>` + 
      rows.map(r=>`<tr><td>${r.fecha_hora.replace("T"," ")}</td><td>${r.accion}</td><td>${r.detalle||""}</td></tr>`).join("");
  },

  agenda() {
    const grid = document.getElementById("u-agenda-grid");
    grid.innerHTML = ""; // simple week
    const start = dayjs().startOf("week").add(1, "day"); // lunes
    for (let i=0;i<7;i++){
      const d = start.add(i,"day");
      const dayAsig = db.asignaciones.filter(a=>a.id_personal===this.userId && a.fecha===d.format("YYYY-MM-DD"));
      const slots = dayAsig.map(a=>`<div class="slot"><div class="day">${d.format("DD MMM")}</div>${tipoName(a.id_tipo)} ${unidadName(a.id_unidad)}</div>`).join("");
      grid.innerHTML += `<div>${slots || `<div class="slot"><div class="day">${d.format("DD MMM")}</div>—</div>`}</div>`;
    }
    document.getElementById("u-agenda-date").value = dayjs().format("YYYY-MM-DD");
  },

  charts() {
    const ctx = document.getElementById("u-week-chart");
    if (!window.Chart) return;
    const days = Array.from({length:7}, (_,i)=>dayjs().startOf("week").add(1+i,"day").format("DD/MM"));
    const horas = days.map(()=>Math.floor(Math.random()*8));
    new Chart(ctx, {type:"bar", data:{labels:days, datasets:[{label:"Horas", data:horas, backgroundColor:"#3b82f6"}]},
                   options:{plugins:{legend:{display:false}}, scales:{y:{beginAtZero:true}}}});
  },

  solicitudCambio() {
    const f = document.getElementById("form-solicitud");
    f.onsubmit = (e)=>{
      e.preventDefault();
      const data = Object.fromEntries(new FormData(f).entries());
      const noti = {id: Date.now(), id_usuario: this.userId, titulo:"Solicitud de cambio", mensaje:`Fecha ${data.fecha} – ${data.motivo}`, fecha_hora: new Date().toISOString(), leido:false};
      db.notificaciones.push(noti);
      save(db);
      alert("Solicitud enviada. RR.HH. ha sido notificado.");
      f.reset(); this.notificaciones();
    };
  },

  render() { this.kpis(); this.notificaciones(); this.bitacora(); this.agenda(); this.charts(); this.solicitudCambio(); }
};

// ======== RENDER: ADMIN ========
const A = {
  filtro: {fecha: dayjs().format("YYYY-MM-DD"), unidad:"", turno:""},
  seleccion: new Set(),
  initCombos(){
    const uSel = document.getElementById("a-unidad");
    uSel.innerHTML = `<option value="">Todas</option>` + db.unidades.map(u=>`<option value="${u.id}">${u.nombre}</option>`).join("");
    const tSel = document.getElementById("a-turno");
    tSel.innerHTML = `<option value="">Todos</option>` + db.tipos.map(t=>`<option value="${t.id}">${t.nombre}</option>`).join("");
    document.getElementById("a-fecha").value = this.filtro.fecha;
  },
  renderTabla(){
    const tbl = document.getElementById("a-tabla");
    const f = this.filtro;
    let rows = db.asignaciones.slice();
    if (f.fecha) rows = rows.filter(r=>r.fecha===f.fecha);
    if (f.unidad) rows = rows.filter(r=>r.id_unidad==f.unidad);
    if (f.turno) rows = rows.filter(r=>r.id_tipo==f.turno);
    tbl.innerHTML = `<tr><th></th><th>Personal</th><th>Unidad</th><th>Turno</th><th>Fecha</th><th>Estado</th></tr>` +
      rows.map(r=>`<tr>
        <td><input type="checkbox" data-id="${r.id}" ${this.seleccion.has(r.id)?"checked":""}></td>
        <td>${personaName(r.id_personal)}</td>
        <td>${unidadName(r.id_unidad)}</td>
        <td>${tipoName(r.id_tipo)}</td>
        <td>${r.fecha}</td>
        <td>${r.estado}</td>
      </tr>`).join("");

    tbl.querySelectorAll("input[type=checkbox]").forEach(cb=>{
      cb.onchange = () => { const id = Number(cb.dataset.id); cb.checked ? this.seleccion.add(id) : this.seleccion.delete(id); };
    });
  },
  acciones(){
    document.getElementById("a-filtrar").onclick = ()=>{
      this.filtro.fecha = document.getElementById("a-fecha").value;
      this.filtro.unidad = document.getElementById("a-unidad").value;
      this.filtro.turno  = document.getElementById("a-turno").value;
      this.renderTabla();
    };
    document.getElementById("a-clear").onclick = ()=>{
      this.filtro = {fecha:"", unidad:"", turno:""}; this.initCombos(); this.renderTabla();
    };
    document.getElementById("a-publicar").onclick = ()=>{
      this.seleccion.forEach(id=>{
        const r = db.asignaciones.find(a=>a.id===id); if(r){ r.estado="PUBLICADO";
          db.bitacora.push({id:Date.now()+id, fecha_hora:new Date().toISOString(), accion:"PUBLICADO", detalle:`Asignación ${id}`, id_usuario:0, id_asignacion:id});
        }
      });
      save(db); this.renderTabla(); alert("Publicado.");
    };
    document.getElementById("a-reprogramar").onclick = ()=>{
      this.seleccion.forEach(id=>{
        const r = db.asignaciones.find(a=>a.id===id); if(r){ r.id_tipo = (r.id_tipo===1?2:1); r.estado="REPROGRAMADO";
          db.bitacora.push({id:Date.now()+id, fecha_hora:new Date().toISOString(), accion:"REPROGRAMADO", detalle:`Asignación ${id}`, id_usuario:0, id_asignacion:id});
        }
      });
      save(db); this.renderTabla(); alert("Reprogramado.");
    };
    document.getElementById("a-anular").onclick = ()=>{
      this.seleccion.forEach(id=>{
        const r = db.asignaciones.find(a=>a.id===id); if(r){ r.estado="ANULADO";
          db.bitacora.push({id:Date.now()+id, fecha_hora:new Date().toISOString(), accion:"ANULADO", detalle:`Asignación ${id}`, id_usuario:0, id_asignacion:id});
        }
      });
      save(db); this.renderTabla(); alert("Anulado.");
    };
    document.getElementById("a-export").onclick = ()=>{
      const rows = [["Personal","Unidad","Turno","Fecha","Estado"]].concat(
        db.asignaciones.map(a=>[personaName(a.id_personal), unidadName(a.id_unidad), tipoName(a.id_tipo), a.fecha, a.estado])
      );
      const csv = rows.map(r=>r.map(x=>`"${String(x).replaceAll('"','""')}"`).join(",")).join("\n");
      const blob = new Blob([csv], {type:"text/csv"}); const url = URL.createObjectURL(blob);
      const a = document.createElement("a"); a.href=url; a.download="asignaciones.csv"; a.click(); URL.revokeObjectURL(url);
    };
  },
  busqueda(){
    const form = document.getElementById("form-busqueda");
    const res = document.getElementById("a-resultados");
    form.onsubmit = (e)=>{
      e.preventDefault();
      const data = Object.fromEntries(new FormData(form).entries());
      let rows = db.asignaciones.slice();
      if(data.q){
        const q = data.q.toLowerCase();
        rows = rows.filter(a => personaName(a.id_personal).toLowerCase().includes(q) ||
                                unidadName(a.id_unidad).toLowerCase().includes(q) ||
                                tipoName(a.id_tipo).toLowerCase().includes(q));
      }
      if(data.estado) rows = rows.filter(a=>a.estado===data.estado);
      if(data.rango && data.rango.includes("..")){
        const [d1,d2] = data.rango.split("..").map(s=>s.trim());
        rows = rows.filter(a=>a.fecha>=d1 && a.fecha<=d2);
      }
      res.innerHTML = `<tr><th>Fecha</th><th>Unidad</th><th>Persona</th><th>Turno</th><th>Estado</th></tr>`+
        rows.map(r=>`<tr><td>${r.fecha}</td><td>${unidadName(r.id_unidad)}</td><td>${personaName(r.id_personal)}</td><td>${tipoName(r.id_tipo)}</td><td>${r.estado}</td></tr>`).join("");
    };
  },
  registro(){
    // combos
    const pSel = document.getElementById("r-personal");
    pSel.innerHTML = db.personal.map(p=>`<option value="${p.id}">${p.apellidos}, ${p.nombres}</option>`).join("");
    const uSel = document.getElementById("r-unidad");
    uSel.innerHTML = db.unidades.map(u=>`<option value="${u.id}">${u.nombre}</option>`).join("");
    const tSel = document.getElementById("r-tipo");
    tSel.innerHTML = db.tipos.map(t=>`<option value="${t.id}">${t.nombre}</option>`).join("");

    // preview
    const prev = document.getElementById("r-preview");
    const f = document.getElementById("form-registro");
    f.oninput = ()=>{
      const d = Object.fromEntries(new FormData(f).entries());
      prev.innerHTML = `• ${personaName(Number(d.id_personal||101))}<br>• Unidad: ${unidadName(Number(d.id_unidad||1))}<br>• Turno: ${tipoName(Number(d.id_tipo_turno||1))}<br>• Fecha: ${d.fecha||"—"}`;
    };
    f.onsubmit = (e)=>{
      e.preventDefault();
      const d = Object.fromEntries(new FormData(f).entries());
      const rec = {
        id: Date.now(), id_personal: Number(d.id_personal), id_unidad: Number(d.id_unidad),
        id_tipo: Number(d.id_tipo_turno), fecha: d.fecha, estado:"PLANIFICADO"
      };
      db.asignaciones.push(rec);
      db.bitacora.push({id:Date.now()+1, fecha_hora:new Date().toISOString(), accion:"PLANIFICADO", detalle:`Alta por registro`, id_usuario:0, id_asignacion:rec.id});
      save(db); alert("Guardado."); f.reset(); this.renderTabla();
    };
  },
  reglas(){
    const tab = document.getElementById("a-reglas-tab");
    tab.innerHTML = `<tr><th>Unidad</th><th>Cobertura mínima</th><th>Horas máx/sem</th><th>Descanso mín (h)</th><th>Activa</th></tr>` +
      db.reglas.map(r=>`<tr>
        <td>${unidadName(r.id_unidad)}</td>
        <td contenteditable="true" data-f="cobertura_minima" data-u="${r.id_unidad}">${r.cobertura_minima}</td>
        <td contenteditable="true" data-f="horas_max_semana" data-u="${r.id_unidad}">${r.horas_max_semana}</td>
        <td contenteditable="true" data-f="descanso_min_horas" data-u="${r.id_unidad}">${r.descanso_min_horas}</td>
        <td><input type="checkbox" data-f="activa" data-u="${r.id_unidad}" ${r.activa?"checked":""}></td>
      </tr>`).join("");
    document.getElementById("a-guardar-reglas").onclick = ()=>{
      tab.querySelectorAll("[contenteditable=true]").forEach(td=>{
        const r = db.reglas.find(x=>x.id_unidad==td.dataset.u);
        r[td.dataset.f] = Number(td.textContent.trim());
      });
      tab.querySelectorAll("input[type=checkbox]").forEach(ch=>{
        const r = db.reglas.find(x=>x.id_unidad==ch.dataset.u);
        r.activa = ch.checked;
      });
      save(db); alert("Reglas guardadas.");
    };
  },
  reportes(){
    if(!window.Chart) return;
    // Cobertura vs meta (hoy)
    const hoy = dayjs().format("YYYY-MM-DD");
    const unidades = db.unidades.map(u=>u.nombre);
    const asignados = db.unidades.map(u=>db.asignaciones.filter(a=>a.fecha===hoy && a.id_unidad===u.id).length);
    const metas = db.unidades.map(u=>db.reglas.find(r=>r.id_unidad===u.id).cobertura_minima);
    new Chart(document.getElementById("chart-cobertura"), {type:"bar", data:{labels:unidades, datasets:[
      {label:"Asignados", data:asignados, backgroundColor:"#3b82f6"},
      {label:"Meta", data:metas, backgroundColor:"#22c55e"}]},
      options:{responsive:true}});
    // Estados del día
    const estados = ["PLANIFICADO","PUBLICADO","REPROGRAMADO","ANULADO"];
    const cuenta = estados.map(e=>db.asignaciones.filter(a=>a.fecha===hoy && a.estado===e).length);
    new Chart(document.getElementById("chart-estados"), {type:"doughnut", data:{labels:estados, datasets:[{data:cuenta, backgroundColor:["#3b82f6","#22c55e","#f59e0b","#ef4444"]}]}});
    // Horas por persona / mes (demo)
    const personas = db.personal.map(p=>`${p.apellidos}, ${p.nombres}`);
    const horas = db.personal.map(p=>db.asignaciones.filter(a=>a.id_personal===p.id).reduce((acc,a)=>acc+(db.tipos.find(t=>t.id===a.id_tipo).horas),0));
    new Chart(document.getElementById("chart-horas"), {type:"bar", data:{labels:personas, datasets:[{label:"Horas", data:horas, backgroundColor:"#64748b"}]},
      options:{plugins:{legend:{display:false}}, scales:{y:{beginAtZero:true}}}});
  },
  render(){ this.initCombos(); this.renderTabla(); this.acciones(); this.busqueda(); this.registro(); this.reglas(); this.reportes(); }
};

// ======== Tabs y navegación ========
function showSection(role){
  document.getElementById("view-user").classList.toggle("hidden", role!=="user");
  document.getElementById("view-admin").classList.toggle("hidden", role!=="admin");
}
function tabBehavior(prefix){
  const container = document.querySelector(`[id^="view-${prefix==='u'?'user':'admin'}"]`);
  const tabs = container.querySelectorAll(`button[data-${prefix}-tab]`);
  tabs.forEach(btn => btn.addEventListener("click", ()=>{
    tabs.forEach(b=>b.classList.remove("active"));
    btn.classList.add("active");
    const target = btn.getAttribute(`data-${prefix}-tab`);
    container.querySelectorAll(".tab-section").forEach(sec => sec.classList.remove("show"));
    container.querySelector(`#${target}`).classList.add("show");
  }));
}

document.getElementById("btnUser").onclick = ()=>{ document.getElementById("btnUser").classList.add("active"); document.getElementById("btnAdmin").classList.remove("active"); showSection("user"); };
document.getElementById("btnAdmin").onclick = ()=>{ document.getElementById("btnAdmin").classList.add("active"); document.getElementById("btnUser").classList.remove("active"); showSection("admin"); };

// init
tabBehavior("u"); tabBehavior("a"); U.render(); A.render();
