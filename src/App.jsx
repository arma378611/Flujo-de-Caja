import { useState, useEffect, useRef } from "react";
import { supabase } from "./supabase.js";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

const fmx = n => new Intl.NumberFormat("es-MX", { style: "currency", currency: "MXN" }).format(n);
const fdate = iso => new Date(iso + "T12:00:00").toLocaleDateString("es-MX", { day: "2-digit", month: "short", year: "numeric" });
const hoy = () => new Date().toISOString().split("T")[0];
const PIN_CORRECTO = "123456"; // Cambia este PIN

function getLunes(date) {
  const d = new Date(date + "T12:00:00");
  const diff = d.getDay() === 0 ? -6 : 1 - d.getDay();
  d.setDate(d.getDate() + diff);
  return d.toISOString().split("T")[0];
}
function getDomingo(lunes) {
  const d = new Date(lunes + "T12:00:00");
  d.setDate(d.getDate() + 6);
  return d.toISOString().split("T")[0];
}
function semanaLabel(lunes) {
  return `${fdate(lunes)} — ${fdate(getDomingo(lunes))}`;
}

const INP = { width: "100%", padding: "11px 13px", borderRadius: 10, border: "1.5px solid #e2e8f0", fontSize: 15, outline: "none", boxSizing: "border-box", background: "#fff", fontFamily: "inherit" };
const GRAD_FC = "linear-gradient(135deg,#0f4c75,#1b6ca8)";
const GRAD_PR = "linear-gradient(135deg,#1a3a1a,#2d7a2d)";

function MontoField({ lbl, name, value, onChange }) {
  const display = value ? Number(value).toLocaleString("es-MX") : "";
  const handleChange = e => {
    const raw = e.target.value.replace(/,/g, "").replace(/[^0-9.]/g, "");
    const parts = raw.split(".");
    const clean = parts[0] + (parts.length > 1 ? "." + parts[1].slice(0, 2) : "");
    onChange({ target: { name, value: clean } });
  };
  return (
    <div style={{ marginBottom: 14 }}>
      <div style={{ fontSize: 13, fontWeight: 600, color: "#475569", marginBottom: 6 }}>{lbl}</div>
      <div style={{ position: "relative" }}>
        <span style={{ position: "absolute", left: 13, top: "50%", transform: "translateY(-50%)", color: "#94a3b8", fontSize: 15, pointerEvents: "none" }}>$</span>
        <input style={{ ...INP, paddingLeft: 26 }} type="text" inputMode="decimal" name={name} value={display} onChange={handleChange} placeholder="0.00" />
      </div>
    </div>
  );
}

function Field({ lbl, name, value, onChange, ph, type = "text", multi, children }) {
  return (
    <div style={{ marginBottom: 14 }}>
      <div style={{ fontSize: 13, fontWeight: 600, color: "#475569", marginBottom: 6 }}>{lbl}</div>
      {children ? children : multi
        ? <textarea style={{ ...INP, height: 72, resize: "vertical" }} name={name} value={value} onChange={onChange} placeholder={ph} />
        : <input style={INP} type={type} name={name} value={value} onChange={onChange} placeholder={ph} />}
    </div>
  );
}

function Toggle({ val, onClick, label, sub }) {
  return (
    <div style={{ background: "#f8fafc", borderRadius: 12, padding: "12px 14px", marginBottom: 14, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
      <div><div style={{ fontWeight: 600, fontSize: 14, color: "#1e293b" }}>{label}</div><div style={{ fontSize: 12, color: "#94a3b8" }}>{sub}</div></div>
      <div style={{ position: "relative", width: 48, height: 28, cursor: "pointer" }} onClick={onClick}>
        <div style={{ position: "absolute", inset: 0, borderRadius: 20, background: val ? "#1b6ca8" : "#cbd5e1", transition: "background 0.2s" }} />
        <div style={{ position: "absolute", top: 3, left: val ? 23 : 3, width: 22, height: 22, borderRadius: "50%", background: "#fff", transition: "left 0.2s" }} />
      </div>
    </div>
  );
}

function PinScreen({ onSuccess }) {
  const [pin, setPin] = useState("");
  const [error, setError] = useState(false);
  const [shake, setShake] = useState(false);

  function presionar(n) {
    if (pin.length >= 6) return;
    const nuevo = pin + n;
    setPin(nuevo);
    setError(false);
    if (nuevo.length === 6) {
      setTimeout(() => {
        if (nuevo === PIN_CORRECTO) {
          onSuccess();
        } else {
          setShake(true); setError(true);
          setTimeout(() => { setPin(""); setShake(false); }, 700);
        }
      }, 150);
    }
  }

  function borrar() { setPin(p => p.slice(0, -1)); setError(false); }
  const teclas = [1,2,3,4,5,6,7,8,9,"",0,"⌫"];

  return (
    <div style={{ fontFamily: "'Outfit',sans-serif", maxWidth: 480, margin: "0 auto", minHeight: "100vh", background: GRAD_FC, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: 24 }}>
      <div style={{ fontSize: 40, marginBottom: 8 }}>💰</div>
      <div style={{ fontSize: 22, fontWeight: 800, color: "#fff", marginBottom: 4 }}>Flujo de Caja</div>
      <div style={{ fontSize: 14, color: "#bfdbfe", marginBottom: 40 }}>Ingresa tu PIN para continuar</div>
      <div style={{ display: "flex", gap: 16, marginBottom: 32, animation: shake ? "shake 0.4s" : "none" }}>
        {[0,1,2,3,4,5].map(i => (
          <div key={i} style={{ width: 18, height: 18, borderRadius: "50%", background: i < pin.length ? (error ? "#ef4444" : "#fbbf24") : "rgba(255,255,255,0.3)", transition: "background 0.15s", border: "2px solid rgba(255,255,255,0.4)" }} />
        ))}
      </div>
      {error && <div style={{ color: "#fca5a5", fontSize: 13, marginBottom: 16, fontWeight: 600 }}>PIN incorrecto, intenta de nuevo</div>}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 12, width: "100%", maxWidth: 280 }}>
        {teclas.map((t, i) => (
          <button key={i} onClick={() => t === "⌫" ? borrar() : t !== "" ? presionar(String(t)) : null}
            style={{ padding: "18px 0", borderRadius: 14, border: "none", background: t === "" ? "transparent" : t === "⌫" ? "rgba(255,255,255,0.1)" : "rgba(255,255,255,0.15)", color: "#fff", fontSize: t === "⌫" ? 20 : 22, fontWeight: 700, cursor: t === "" ? "default" : "pointer" }}>
            {t}
          </button>
        ))}
      </div>
      <style>{`@keyframes shake{0%,100%{transform:translateX(0)}20%,60%{transform:translateX(-8px)}40%,80%{transform:translateX(8px)}}`}</style>
    </div>
  );
}

export default function App() {
  const [desbloqueado, setDesbloqueado] = useState(false);
  const [tab, setTab] = useState("fc");
  const [view, setView] = useState("home");
  const [sel, setSel] = useState(null);
  const [form, setForm] = useState({});
  const [editId, setEditId] = useState(null);
  const [msg, setMsg] = useState(null);
  const [semanaVer, setSemanaVer] = useState(getLunes(hoy()));
  const [loading, setLoading] = useState(true);
  const [proveedores, setProveedores] = useState([]);
  const [movFC, setMovFC] = useState([]);
  const [movProv, setMovProv] = useState([]);

  useEffect(() => { if (desbloqueado) loadAll(); }, [desbloqueado]);

  async function loadAll() {
    setLoading(true);
    const [p, mf, mp] = await Promise.all([
      supabase.from("proveedores").select("*").order("created_at"),
      supabase.from("mov_fc").select("*").order("fecha"),
      supabase.from("mov_prov").select("*").order("fecha"),
    ]);
    if (p.data) setProveedores(p.data);
    if (mf.data) setMovFC(mf.data);
    if (mp.data) setMovProv(mp.data);
    setLoading(false);
  }

  const toast = (m, e) => { setMsg({ m, e }); setTimeout(() => setMsg(null), 2200); };
  const hf = e => setForm(p => ({ ...p, [e.target.name]: e.target.value }));
  const go = v => setView(v);

  if (!desbloqueado) return <PinScreen onSuccess={() => setDesbloqueado(true)} />;
  if (loading) return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "100vh", fontFamily: "sans-serif", flexDirection: "column", gap: 12, color: "#94a3b8" }}>
      <div style={{ fontSize: 36 }}>💰</div><div>Cargando Flujo de Caja…</div>
    </div>
  );

  // ── Semanas FC ───────────────────────────────────────────────────
  function semanasFC() {
    const ls = [...new Set(movFC.map(m => getLunes(m.fecha)))].sort();
    if (ls.length === 0) ls.push(getLunes(hoy()));
    return ls;
  }

  function saldoAntesDeFC(lunes) {
    return movFC.filter(m => m.fecha < lunes).reduce((s, m) => {
      if (m.tipo === "entrada") return s + m.monto;
      if (m.afecta_flujo !== false) return s - m.monto;
      return s;
    }, 0);
  }

  function movsEnSemanaFC(lunes) {
    const dom = getDomingo(lunes);
    return movFC.filter(m => m.fecha >= lunes && m.fecha <= dom);
  }

  const totalEntradas = movFC.filter(m => m.tipo === "entrada").reduce((s, m) => s + m.monto, 0);
  const totalSalidas = movFC.filter(m => m.tipo !== "entrada" && m.afecta_flujo !== false).reduce((s, m) => s + m.monto, 0);
  const saldoFC = totalEntradas - totalSalidas;

  // ── Guardar movimiento FC ────────────────────────────────────────
  async function saveMovFC() {
    const t = form.tipo;
    if (!t) return toast("Elige el tipo de movimiento", true);
    if (!form.monto || +form.monto <= 0) return toast("Monto inválido", true);
    if (t === "entrada" && !form.procedencia?.trim()) return toast("Agrega la procedencia", true);
    if (t === "pago" && !form.proveedor_id) return toast("Elige un proveedor", true);

    const datos = { tipo: t, fecha: form.fecha || hoy(), monto: +form.monto, procedencia: form.procedencia || "", concepto: form.concepto || "", responsable: form.responsable || "", proveedor_id: form.proveedor_id || null, forma_pago: form.forma_pago || "Depósito", afecta_flujo: form.afecta_flujo !== false };

    if (editId) {
      const { data, error } = await supabase.from("mov_fc").update(datos).eq("id", editId).select().single();
      if (error) return toast("Error al guardar", true);
      setMovFC(p => p.map(m => m.id === editId ? data : m));
      await supabase.from("mov_prov").delete().eq("origen_fc_id", editId);
      setMovProv(p => p.filter(m => m.origen_fc_id !== editId));
      if (t === "pago" && form.proveedor_id) {
        const mp = { proveedor_id: form.proveedor_id, tipo: "pago", importe: +form.monto, fecha: form.fecha || hoy(), descripcion: `Pago ${form.forma_pago || "Depósito"}${form.concepto ? " — " + form.concepto : ""}`, origen_fc_id: editId };
        const { data: mpd } = await supabase.from("mov_prov").insert(mp).select().single();
        if (mpd) setMovProv(p => [...p, mpd]);
      }
    } else {
      const { data, error } = await supabase.from("mov_fc").insert(datos).select().single();
      if (error) return toast("Error al guardar", true);
      setMovFC(p => [...p, data]);
      if (t === "pago" && form.proveedor_id) {
        const mp = { proveedor_id: form.proveedor_id, tipo: "pago", importe: +form.monto, fecha: form.fecha || hoy(), descripcion: `Pago ${form.forma_pago || "Depósito"}${form.concepto ? " — " + form.concepto : ""}`, origen_fc_id: data.id };
        const { data: mpd } = await supabase.from("mov_prov").insert(mp).select().single();
        if (mpd) setMovProv(p => [...p, mpd]);
      }
    }
    setForm({}); setEditId(null); go("home"); toast(editId ? "Actualizado ✓" : "Guardado ✓");
  }

  async function deleteMovFC(id) {
    if (!confirm("¿Eliminar?")) return;
    await supabase.from("mov_prov").delete().eq("origen_fc_id", id);
    await supabase.from("mov_fc").delete().eq("id", id);
    setMovFC(p => p.filter(m => m.id !== id));
    setMovProv(p => p.filter(m => m.origen_fc_id !== id));
    toast("Eliminado");
  }

  function editMovFC(m) { setForm({ ...m, afecta_flujo: m.afecta_flujo !== false }); setEditId(m.id); go("nuevoMov"); }

  // ── Proveedores ──────────────────────────────────────────────────
  async function saveProv() {
    if (!form.nombre?.trim()) return toast("Nombre requerido", true);
    const datos = { nombre: form.nombre.trim(), contacto: form.contacto || "", tel: form.tel || "", notas: form.notas || "" };
    if (editId) {
      const { data, error } = await supabase.from("proveedores").update(datos).eq("id", editId).select().single();
      if (error) return toast("Error al guardar", true);
      setProveedores(p => p.map(x => x.id === editId ? data : x));
      if (sel?.id === editId) setSel(data);
    } else {
      const { data, error } = await supabase.from("proveedores").insert(datos).select().single();
      if (error) return toast("Error al guardar", true);
      setProveedores(p => [...p, data]);
    }
    setEditId(null); setForm({}); go("home"); toast(editId ? "Actualizado ✓" : "Guardado ✓");
  }

  function editProv(p) { setForm({ ...p }); setEditId(p.id); go("nuevoProv"); }

  async function saveNota() {
    if (!form.importe || +form.importe <= 0) return toast("Importe inválido", true);
    if (!form.descripcion?.trim()) return toast("Agrega una descripción", true);
    const datos = { proveedor_id: sel.id, tipo: "nota", folio: form.folio || "", importe: +form.importe, fecha: form.fecha || hoy(), descripcion: form.descripcion.trim() };
    if (editId) {
      const { data, error } = await supabase.from("mov_prov").update(datos).eq("id", editId).select().single();
      if (error) return toast("Error al guardar", true);
      setMovProv(p => p.map(m => m.id === editId ? data : m));
    } else {
      const { data, error } = await supabase.from("mov_prov").insert(datos).select().single();
      if (error) return toast("Error al guardar", true);
      setMovProv(p => [...p, data]);
    }
    setEditId(null); setForm({}); go("detProv"); toast(editId ? "Nota actualizada ✓" : "Nota guardada ✓");
  }

  function editNota(n) { setForm({ ...n }); setEditId(n.id); go("nuevaNota"); }

  async function deleteNota(id) {
    if (!confirm("¿Eliminar?")) return;
    await supabase.from("mov_prov").delete().eq("id", id);
    setMovProv(p => p.filter(m => m.id !== id));
    toast("Eliminado");
  }

  const movsDeProv = id => movProv.filter(m => m.proveedor_id === id);
  const saldoProv = id => {
    const ms = movsDeProv(id);
    return ms.filter(m => m.tipo === "nota").reduce((s, m) => s + m.importe, 0)
           - ms.filter(m => m.tipo === "pago").reduce((s, m) => s + m.importe, 0);
  };
  function movsEnSemanaProv(movs, lunes) { const dom = getDomingo(lunes); return movs.filter(m => m.fecha >= lunes && m.fecha <= dom); }
  function saldoAntesDeSemana(provId, lunes) {
    const ms = movsDeProv(provId).filter(m => m.fecha < lunes);
    return ms.filter(m => m.tipo === "nota").reduce((s, m) => s + m.importe, 0)
           - ms.filter(m => m.tipo === "pago").reduce((s, m) => s + m.importe, 0);
  }

  // ── PDF Flujo de Caja ────────────────────────────────────────────
  function generarPDFFC(lunes) {
    const ms = movsEnSemanaFC(lunes).sort((a, b) => a.fecha.localeCompare(b.fecha));
    const saldoInicial = saldoAntesDeFC(lunes);
    const entSem = ms.filter(m => m.tipo === "entrada").reduce((s, m) => s + m.monto, 0);
    const gastSem = ms.filter(m => m.tipo === "gasto" && m.afecta_flujo !== false).reduce((s, m) => s + m.monto, 0);
    const pagSem = ms.filter(m => m.tipo === "pago" && m.afecta_flujo !== false).reduce((s, m) => s + m.monto, 0);
    const saldoFinal = saldoInicial + entSem - gastSem - pagSem;
    const doc = new jsPDF();
    const fechaHoy = new Date().toLocaleDateString("es-MX", { day: "2-digit", month: "long", year: "numeric" });
    doc.setFillColor(15,76,117); doc.rect(0,0,210,35,"F");
    doc.setTextColor(255,255,255); doc.setFontSize(20); doc.setFont("helvetica","bold"); doc.text("Flujo de Caja",14,15);
    doc.setFontSize(10); doc.setFont("helvetica","normal"); doc.text("Resumen Semanal",14,23); doc.text(`Generado: ${fechaHoy}`,14,30);
    doc.setTextColor(30,41,59); doc.setFontSize(12); doc.setFont("helvetica","bold"); doc.text(`Semana: ${semanaLabel(lunes)}`,14,47);
    const y = 55;
    const cajas = [["Saldo inicial",saldoInicial,saldoInicial>=0?[22,163,74]:[239,68,68],saldoInicial>=0?[240,253,244]:[254,242,242]],["Entradas",entSem,[22,163,74],[240,253,244]],["Salidas",gastSem+pagSem,[239,68,68],[254,242,242]],["Saldo final",saldoFinal,saldoFinal>=0?[22,163,74]:[239,68,68],saldoFinal>=0?[240,253,244]:[254,242,242]]];
    cajas.forEach(([lbl,val,col,bg],i)=>{const x=14+i*47;doc.setFillColor(...bg);doc.roundedRect(x,y,44,22,3,3,"F");doc.setTextColor(100,116,139);doc.setFontSize(8);doc.setFont("helvetica","normal");doc.text(lbl,x+3,y+8);doc.setTextColor(...col);doc.setFontSize(9);doc.setFont("helvetica","bold");doc.text(fmx(val),x+3,y+17);});
    const rows = ms.map(m=>{const pn=m.proveedor_id?(proveedores.find(p=>p.id===m.proveedor_id)?.nombre||""):"";const desc=m.procedencia||m.concepto||pn||"-";const noAf=m.afecta_flujo===false?" (no afecta)":"";return[fdate(m.fecha),m.tipo==="entrada"?"Entrada":m.tipo==="gasto"?"Gasto Op.":"Pago Prov.",desc+noAf,m.tipo==="entrada"?fmx(m.monto):"",m.tipo!=="entrada"?fmx(m.monto):""];});
    autoTable(doc,{startY:y+30,head:[["Fecha","Tipo","Descripción","Entrada","Salida"]],body:rows,headStyles:{fillColor:[15,76,117],textColor:255,fontStyle:"bold",fontSize:9},bodyStyles:{fontSize:8,textColor:[30,41,59]},alternateRowStyles:{fillColor:[248,250,252]},columnStyles:{0:{cellWidth:22},1:{cellWidth:28},2:{cellWidth:86},3:{cellWidth:25,textColor:[22,163,74],fontStyle:"bold"},4:{cellWidth:25,textColor:[239,68,68],fontStyle:"bold"}}});
    const fy=doc.lastAutoTable.finalY+6;doc.setFontSize(11);doc.setFont("helvetica","bold");doc.setTextColor(saldoFinal>=0?22:239,saldoFinal>=0?163:68,saldoFinal>=0?74:68);doc.text(`Saldo final: ${fmx(saldoFinal)}`,14,fy);
    const pages=doc.internal.getNumberOfPages();for(let i=1;i<=pages;i++){doc.setPage(i);doc.setFontSize(8);doc.setTextColor(148,163,184);doc.setFont("helvetica","normal");doc.text("Flujo de Caja — Resumen semanal",14,290);doc.text(`Pág. ${i}/${pages}`,185,290);}
    doc.save(`FlujoCaja_${lunes}.pdf`);
  }

  // ── PDF Proveedor (5 semanas) ────────────────────────────────────
  function generarPDFProv(semActual) {
    const todosMovs = movsDeProv(sel.id);
    const todasLuneses = [...new Set(todosMovs.map(m => getLunes(m.fecha)))].sort();
    const idxActual = todasLuneses.indexOf(semActual);
    const desde = Math.max(0, idxActual - 4);
    const semanas = todasLuneses.slice(desde, idxActual + 1);
    if (semanas.length === 0) semanas.push(semActual);
    const doc = new jsPDF();
    const fechaHoy = new Date().toLocaleDateString("es-MX",{day:"2-digit",month:"long",year:"numeric"});
    doc.setFillColor(26,58,26);doc.rect(0,0,210,35,"F");doc.setTextColor(255,255,255);doc.setFontSize(20);doc.setFont("helvetica","bold");doc.text("Flujo de Caja",14,15);
    doc.setFontSize(10);doc.setFont("helvetica","normal");doc.text("Resumen de Proveedor — Últimas 5 semanas",14,23);doc.text(`Generado: ${fechaHoy}`,14,30);
    doc.setTextColor(30,41,59);doc.setFontSize(14);doc.setFont("helvetica","bold");doc.text(sel.nombre,14,48);
    if(sel.tel){doc.setFontSize(10);doc.setFont("helvetica","normal");doc.setTextColor(100,116,139);doc.text(`Tel: ${sel.tel}`,14,55);}
    let curY = sel.tel ? 62 : 55;
    semanas.forEach((lunes,si)=>{
      const msem=movsEnSemanaProv(todosMovs,lunes).sort((a,b)=>a.fecha.localeCompare(b.fecha));
      const saldoAnt=saldoAntesDeSemana(sel.id,lunes);
      const notasSem=msem.filter(m=>m.tipo==="nota").reduce((s,m)=>s+m.importe,0);
      const pagosSem=msem.filter(m=>m.tipo==="pago").reduce((s,m)=>s+m.importe,0);
      const saldoFin=saldoAnt+notasSem-pagosSem;
      doc.setFontSize(10);doc.setFont("helvetica","bold");doc.setTextColor(26,58,26);doc.text(`Semana ${si+1}: ${semanaLabel(lunes)}`,14,curY+7);curY+=10;
      const miniCajas=[["Saldo anterior",saldoAnt,saldoAnt>0?[239,68,68]:[22,163,74]],["Notas",notasSem,[180,83,9]],["Pagos",pagosSem,[22,163,74]],["Saldo final",saldoFin,saldoFin>0?[239,68,68]:[22,163,74]]];
      miniCajas.forEach(([lbl,val,col],i)=>{const x=14+i*47;doc.setFillColor(248,250,252);doc.roundedRect(x,curY,44,16,2,2,"F");doc.setTextColor(100,116,139);doc.setFontSize(7);doc.setFont("helvetica","normal");doc.text(lbl,x+3,curY+6);doc.setTextColor(...col);doc.setFontSize(8);doc.setFont("helvetica","bold");doc.text(fmx(val),x+3,curY+13);});
      curY+=20;
      if(msem.length>0){
        const rows=msem.map(m=>[fdate(m.fecha),m.tipo==="nota"?"Nota":"Pago",m.folio||"-",m.descripcion||"-",m.tipo==="nota"?fmx(m.importe):"",m.tipo==="pago"?fmx(m.importe):""]);
        autoTable(doc,{startY:curY,head:[["Fecha","Tipo","Folio","Descripción","Cargo","Abono"]],body:rows,headStyles:{fillColor:[26,58,26],textColor:255,fontStyle:"bold",fontSize:7},bodyStyles:{fontSize:7,textColor:[30,41,59]},alternateRowStyles:{fillColor:[248,250,252]},columnStyles:{0:{cellWidth:20},1:{cellWidth:18},2:{cellWidth:16},3:{cellWidth:78},4:{cellWidth:22,textColor:[180,83,9],fontStyle:"bold"},5:{cellWidth:22,textColor:[22,163,74],fontStyle:"bold"}},margin:{left:14,right:14}});
        curY=doc.lastAutoTable.finalY+6;
      } else {
        doc.setFontSize(7);doc.setTextColor(148,163,184);doc.setFont("helvetica","italic");doc.text("Sin movimientos esta semana",14,curY+4);curY+=10;
      }
      if(si<semanas.length-1){doc.setDrawColor(226,232,240);doc.setLineWidth(0.3);doc.line(14,curY,196,curY);curY+=6;}
    });
    const saldoTotal=saldoProv(sel.id);curY+=4;doc.setFontSize(11);doc.setFont("helvetica","bold");doc.setTextColor(saldoTotal>0?239:22,saldoTotal>0?68:163,saldoTotal>0?68:74);doc.text(`Saldo total pendiente: ${fmx(saldoTotal)}`,14,curY);
    const pages=doc.internal.getNumberOfPages();for(let i=1;i<=pages;i++){doc.setPage(i);doc.setFontSize(8);doc.setTextColor(148,163,184);doc.setFont("helvetica","normal");doc.text("Flujo de Caja — Resumen de proveedor",14,290);doc.text(`Pág. ${i}/${pages}`,185,290);}
    doc.save(`Proveedor_${sel.nombre.replace(/ /g,"_")}_${semActual}.pdf`);
  }

  // ── UI helpers ───────────────────────────────────────────────────
  const root = { fontFamily:"'Outfit',sans-serif", maxWidth:480, margin:"0 auto", minHeight:"100vh", background:"#f1f5f9", paddingBottom:40 };
  const bkFC = { background:"none", border:"none", color:"#bfdbfe", fontSize:13, cursor:"pointer", padding:0 };
  const bkPR = { background:"none", border:"none", color:"#bbf7d0", fontSize:13, cursor:"pointer", padding:0 };
  const yb = { background:"#fbbf24", border:"none", borderRadius:10, padding:"9px 14px", fontWeight:800, fontSize:13, cursor:"pointer", color:"#1e293b" };
  const ToastEl = msg ? <div style={{position:"fixed",top:20,left:"50%",transform:"translateX(-50%)",background:msg.e?"#ef4444":"#16a34a",color:"#fff",padding:"10px 22px",borderRadius:100,fontWeight:700,fontSize:14,zIndex:999,whiteSpace:"nowrap"}}>{msg.m}</div> : null;
  const AccBtns = ({onEdit,onDel}) => (
    <div style={{display:"flex",gap:6,marginTop:8}}>
      <button onClick={onEdit} style={{flex:1,padding:"6px 0",borderRadius:8,border:"1.5px solid #e2e8f0",background:"#f8fafc",fontSize:12,fontWeight:700,color:"#475569",cursor:"pointer"}}>✏️ Editar</button>
      <button onClick={onDel} style={{flex:1,padding:"6px 0",borderRadius:8,border:"1.5px solid #fecaca",background:"#fef2f2",fontSize:12,fontWeight:700,color:"#ef4444",cursor:"pointer"}}>🗑️ Eliminar</button>
    </div>
  );

  // ══════════════════════════════════════════════════════════════════
  // RESUMEN SEMANAL FC
  // ══════════════════════════════════════════════════════════════════
  if (view === "resumenFC") {
    const luneses = semanasFC();
    const semActual = semanaVer || luneses[luneses.length-1];
    const ms = movsEnSemanaFC(semActual).sort((a,b)=>a.fecha.localeCompare(b.fecha));
    const saldoInicial = saldoAntesDeFC(semActual);
    const entSem = ms.filter(m=>m.tipo==="entrada").reduce((s,m)=>s+m.monto,0);
    const gastSem = ms.filter(m=>m.tipo==="gasto"&&m.afecta_flujo!==false).reduce((s,m)=>s+m.monto,0);
    const pagSem = ms.filter(m=>m.tipo==="pago"&&m.afecta_flujo!==false).reduce((s,m)=>s+m.monto,0);
    const saldoFinal = saldoInicial+entSem-gastSem-pagSem;
    return (
      <div style={root}>
        {ToastEl}
        <div style={{background:GRAD_FC,color:"#fff",padding:"18px 16px 20px",borderRadius:"0 0 20px 20px"}}>
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:8}}>
            <button style={bkFC} onClick={()=>go("home")}>← Regresar</button>
            <span style={{fontSize:16,fontWeight:700}}>Resumen Semanal</span>
            <button style={{...yb,fontSize:11}} onClick={()=>generarPDFFC(semActual)}>⬇️ PDF</button>
          </div>
          <div style={{fontSize:13,color:"#bfdbfe",marginBottom:10}}>💰 Flujo de Caja · {semanaLabel(semActual)}</div>
          <div style={{display:"flex",gap:6,overflowX:"auto",paddingBottom:4}}>
            {luneses.map(l=>(
              <button key={l} onClick={()=>setSemanaVer(l)} style={{flexShrink:0,padding:"5px 12px",borderRadius:20,border:"none",background:l===semActual?"#fbbf24":"rgba(255,255,255,.15)",color:l===semActual?"#1e293b":"#fff",fontSize:11,fontWeight:700,cursor:"pointer"}}>
                {new Date(l+"T12:00:00").toLocaleDateString("es-MX",{day:"2-digit",month:"short"})}
              </button>
            ))}
          </div>
        </div>
        <div style={{padding:14}}>
          <div style={{background:saldoInicial>=0?"#eff6ff":"#fef2f2",borderRadius:12,padding:"10px 16px",marginBottom:10,display:"flex",justifyContent:"space-between",alignItems:"center",border:`1px solid ${saldoInicial>=0?"#bfdbfe":"#fecaca"}`}}>
            <div><div style={{fontSize:12,color:"#64748b",fontWeight:600}}>Saldo inicial (semana anterior)</div><div style={{fontSize:11,color:"#94a3b8"}}>Arrastrado automáticamente</div></div>
            <div style={{fontSize:17,fontWeight:800,color:saldoInicial>=0?"#1b6ca8":"#ef4444"}}>{fmx(saldoInicial)}</div>
          </div>
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10,marginBottom:10}}>
            {[["💰 Entradas",entSem,"#16a34a","#f0fdf4"],["📤 Gastos Op.",gastSem,"#ef4444","#fef2f2"],["🏢 Pagos Prov.",pagSem,"#b45309","#fffbeb"],["📤 Total salidas",gastSem+pagSem,"#ef4444","#fef2f2"]].map(([l,v,c,b])=>(
              <div key={l} style={{background:b,borderRadius:12,padding:"12px 14px"}}>
                <div style={{fontSize:12,color:"#64748b"}}>{l}</div>
                <div style={{fontSize:17,fontWeight:800,color:c,marginTop:2}}>{fmx(v)}</div>
              </div>
            ))}
          </div>
          <div style={{background:saldoFinal>=0?"#f0fdf4":"#fef2f2",borderRadius:14,padding:"14px 16px",marginBottom:14,display:"flex",justifyContent:"space-between",alignItems:"center"}}>
            <div><div style={{fontSize:12,color:"#94a3b8"}}>Saldo final · pasa a siguiente semana</div><div style={{fontSize:24,fontWeight:800,color:saldoFinal>=0?"#16a34a":"#ef4444"}}>{fmx(saldoFinal)}</div></div>
            <div style={{fontSize:32}}>{saldoFinal>=0?"✅":"⚠️"}</div>
          </div>
          <div style={{fontSize:13,fontWeight:700,color:"#475569",marginBottom:8}}>Movimientos ({ms.length})</div>
          {ms.length===0?<div style={{textAlign:"center",color:"#94a3b8",padding:30,background:"#fff",borderRadius:14}}>Sin movimientos esta semana</div>
          :ms.map(m=>{
            const cfg=m.tipo==="entrada"?{l:"Entrada",ic:"💰",c:"#16a34a",b:"#f0fdf4"}:m.tipo==="gasto"?{l:"Gasto Operativo",ic:"📤",c:"#ef4444",b:"#fef2f2"}:{l:"Pago Proveedor",ic:"🏢",c:"#b45309",b:"#fffbeb"};
            const pn=m.proveedor_id?(proveedores.find(p=>p.id===m.proveedor_id)?.nombre||""):"";
            return(<div key={m.id} style={{background:"#fff",borderRadius:12,padding:"12px 14px",marginBottom:8,borderLeft:`4px solid ${cfg.c}`,boxShadow:"0 1px 3px rgba(0,0,0,.06)"}}>
              <div style={{display:"flex",justifyContent:"space-between"}}>
                <div>
                  <span style={{fontSize:12,fontWeight:700,padding:"2px 9px",borderRadius:20,background:cfg.b,color:cfg.c}}>{cfg.ic} {cfg.l}</span>
                  <div style={{fontSize:13,color:"#334155",marginTop:3}}>{m.procedencia||m.concepto||pn||"-"}</div>
                  {pn&&<div style={{fontSize:12,color:"#b45309"}}>🏢 {pn} · {m.forma_pago}</div>}
                  {m.responsable&&<div style={{fontSize:11,color:"#64748b"}}>👤 {m.responsable}</div>}
                  {m.afecta_flujo===false&&<div style={{fontSize:11,color:"#94a3b8",fontStyle:"italic"}}>No afecta flujo</div>}
                  <div style={{fontSize:11,color:"#94a3b8"}}>{fdate(m.fecha)}</div>
                </div>
                <div style={{textAlign:"right",flexShrink:0,marginLeft:10}}>
                  <div style={{fontWeight:800,color:m.afecta_flujo===false?"#94a3b8":cfg.c}}>{m.tipo==="entrada"?"+":"-"}{fmx(m.monto)}</div>
                </div>
              </div>
            </div>);
          })}
        </div>
      </div>
    );
  }

  // ══════════════════════════════════════════════════════════════════
  // NUEVO / EDITAR MOVIMIENTO FC
  // ══════════════════════════════════════════════════════════════════
  if (view === "nuevoMov") return (
    <div style={root}>
      {ToastEl}
      <div style={{background:GRAD_FC,color:"#fff",padding:"18px 16px 20px",borderRadius:"0 0 20px 20px"}}>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center"}}>
          <button style={bkFC} onClick={()=>{setForm({});setEditId(null);go("home");}}>← Cancelar</button>
          <span style={{fontSize:18,fontWeight:700}}>{editId?"Editar Movimiento":"Nuevo Movimiento"}</span>
          <span/>
        </div>
      </div>
      <div style={{padding:16}}>
        <div style={{fontSize:13,fontWeight:600,color:"#475569",marginBottom:8}}>Tipo *</div>
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:8,marginBottom:16}}>
          {[["entrada","💰","Entrada","#16a34a"],["gasto","📤","Gasto Op.","#ef4444"],["pago","🏢","Pago Prov.","#b45309"]].map(([k,ic,lb,col])=>(
            <button key={k} style={{padding:"12px 6px",borderRadius:10,border:`1.5px solid ${form.tipo===k?col:"#e2e8f0"}`,background:form.tipo===k?col:"#fff",color:form.tipo===k?"#fff":"#334155",fontSize:12,fontWeight:700,cursor:"pointer",lineHeight:1.5}}
              onClick={()=>setForm(p=>({...p,tipo:k,afecta_flujo:p.afecta_flujo!==false}))}>
              <div style={{fontSize:20}}>{ic}</div>{lb}
            </button>
          ))}
        </div>
        {form.tipo&&<>
          <Field lbl="Fecha *" name="fecha" value={form.fecha||hoy()} onChange={hf} type="date"/>
          <MontoField lbl="Monto *" name="monto" value={form.monto||""} onChange={hf}/>
          {form.tipo==="entrada"&&<Field lbl="Procedencia *" name="procedencia" value={form.procedencia||""} onChange={hf} ph="Ej. Venta, Cliente, Cobro…"/>}
          {form.tipo==="gasto"&&<>
            <Field lbl="Concepto *" name="concepto" value={form.concepto||""} onChange={hf} ph="Ej. Renta, Luz, Gasolina…"/>
            <Field lbl="Responsable (opcional)" name="responsable" value={form.responsable||""} onChange={hf} ph="Nombre de quien realizó el gasto"/>
          </>}
          {form.tipo==="pago"&&<>
            <Field lbl="Proveedor *" name="proveedor_id" value={form.proveedor_id||""} onChange={hf}>
              <select style={INP} name="proveedor_id" value={form.proveedor_id||""} onChange={hf}>
                <option value="">Selecciona un proveedor…</option>
                {proveedores.map(p=><option key={p.id} value={p.id}>{p.nombre}</option>)}
              </select>
            </Field>
            <Field lbl="Forma de pago *" name="forma_pago" value={form.forma_pago||"Depósito"} onChange={hf}>
              <select style={INP} name="forma_pago" value={form.forma_pago||"Depósito"} onChange={hf}>
                <option>Depósito</option><option>Efectivo</option><option>Descuento</option>
              </select>
            </Field>
            <Field lbl="Concepto (opcional)" name="concepto" value={form.concepto||""} onChange={hf} ph="Notas del pago…"/>
          </>}
          {form.tipo!=="entrada"&&
            <Toggle val={form.afecta_flujo!==false} onClick={()=>setForm(p=>({...p,afecta_flujo:p.afecta_flujo===false}))}
              label="¿Afecta el flujo de efectivo?" sub={form.afecta_flujo===false?"No se descontará del saldo":"Se descontará del saldo"}/>
          }
          <button style={{width:"100%",background:GRAD_FC,color:"#fff",border:"none",borderRadius:12,padding:16,fontWeight:800,fontSize:16,cursor:"pointer",marginTop:4}} onClick={saveMovFC}>
            {editId?"Guardar Cambios":"Guardar Movimiento"}
          </button>
        </>}
      </div>
    </div>
  );

  // ══════════════════════════════════════════════════════════════════
  // NUEVO / EDITAR PROVEEDOR
  // ══════════════════════════════════════════════════════════════════
  if (view === "nuevoProv") return (
    <div style={root}>
      {ToastEl}
      <div style={{background:GRAD_PR,color:"#fff",padding:"18px 16px 20px",borderRadius:"0 0 20px 20px"}}>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center"}}>
          <button style={bkPR} onClick={()=>{setForm({});setEditId(null);go("home");}}>← Cancelar</button>
          <span style={{fontSize:18,fontWeight:700}}>{editId?"Editar Proveedor":"Nuevo Proveedor"}</span>
          <span/>
        </div>
      </div>
      <div style={{padding:16}}>
        <Field lbl="Nombre *" name="nombre" value={form.nombre||""} onChange={hf} ph="Nombre del proveedor"/>
        <Field lbl="Contacto" name="contacto" value={form.contacto||""} onChange={hf} ph="Nombre de contacto"/>
        <Field lbl="Teléfono" name="tel" value={form.tel||""} onChange={hf} ph="55 1234 5678" type="tel"/>
        <Field lbl="Notas" name="notas" value={form.notas||""} onChange={hf} ph="Dirección, referencias…" multi/>
        <button style={{width:"100%",background:GRAD_PR,color:"#fff",border:"none",borderRadius:12,padding:16,fontWeight:800,fontSize:16,cursor:"pointer",marginTop:4}} onClick={saveProv}>
          {editId?"Guardar Cambios":"Guardar Proveedor"}
        </button>
      </div>
    </div>
  );

  // ══════════════════════════════════════════════════════════════════
  // NUEVA / EDITAR NOTA
  // ══════════════════════════════════════════════════════════════════
  if (view === "nuevaNota" && sel) return (
    <div style={root}>
      {ToastEl}
      <div style={{background:GRAD_PR,color:"#fff",padding:"18px 16px 20px",borderRadius:"0 0 20px 20px"}}>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center"}}>
          <button style={bkPR} onClick={()=>{setForm({});setEditId(null);go("detProv");}}>← Cancelar</button>
          <span style={{fontSize:18,fontWeight:700}}>{editId?"Editar Nota":"Nueva Nota de Trabajo"}</span>
          <span/>
        </div>
        <div style={{color:"#bbf7d0",fontSize:13,marginTop:4}}>{sel.nombre}</div>
      </div>
      <div style={{padding:16}}>
        <Field lbl="Folio" name="folio" value={form.folio||""} onChange={hf} ph="Ej. NT-001"/>
        <Field lbl="Fecha *" name="fecha" value={form.fecha||hoy()} onChange={hf} type="date"/>
        <MontoField lbl="Importe *" name="importe" value={form.importe||""} onChange={hf}/>
        <Field lbl="Descripción *" name="descripcion" value={form.descripcion||""} onChange={hf} ph="Descripción del trabajo realizado…" multi/>
        <button style={{width:"100%",background:GRAD_PR,color:"#fff",border:"none",borderRadius:12,padding:16,fontWeight:800,fontSize:16,cursor:"pointer",marginTop:4}} onClick={saveNota}>
          {editId?"Guardar Cambios":"Guardar Nota"}
        </button>
      </div>
    </div>
  );

  // ══════════════════════════════════════════════════════════════════
  // DETALLE PROVEEDOR
  // ══════════════════════════════════════════════════════════════════
  if (view === "detProv" && sel) {
    const movs = movsDeProv(sel.id).sort((a,b)=>b.fecha.localeCompare(a.fecha));
    const saldo = saldoProv(sel.id);
    const luneses = [...new Set(movs.map(m=>getLunes(m.fecha)))].sort();
    return (
      <div style={root}>
        {ToastEl}
        <div style={{background:GRAD_PR,color:"#fff",padding:"18px 16px 20px",borderRadius:"0 0 20px 20px"}}>
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:10}}>
            <button style={bkPR} onClick={()=>go("home")}>← Regresar</button>
            <div style={{display:"flex",gap:6}}>
              <button style={{background:"rgba(255,255,255,.15)",border:"none",borderRadius:10,padding:"9px 12px",fontWeight:700,fontSize:12,color:"#fff",cursor:"pointer"}} onClick={()=>editProv(sel)}>✏️ Editar</button>
              <button style={{background:"rgba(255,255,255,.15)",border:"none",borderRadius:10,padding:"9px 12px",fontWeight:700,fontSize:12,color:"#fff",cursor:"pointer"}} onClick={()=>{setSemanaVer(luneses[luneses.length-1]||getLunes(hoy()));go("resumenProv");}}>📊 Resumen</button>
              <button style={{background:"#fbbf24",border:"none",borderRadius:10,padding:"9px 12px",fontWeight:800,fontSize:12,color:"#1e293b",cursor:"pointer"}} onClick={()=>{setForm({fecha:hoy()});setEditId(null);go("nuevaNota");}}>+ Nota</button>
            </div>
          </div>
          <div style={{display:"flex",alignItems:"center",gap:12}}>
            <div style={{width:50,height:50,borderRadius:14,background:"rgba(255,255,255,.2)",display:"flex",alignItems:"center",justifyContent:"center",fontWeight:800,fontSize:22}}>{sel.nombre[0]}</div>
            <div>
              <div style={{fontSize:18,fontWeight:800}}>{sel.nombre}</div>
              {sel.tel&&<div style={{fontSize:12,color:"#bbf7d0"}}>📱 {sel.tel}</div>}
              {sel.contacto&&<div style={{fontSize:12,color:"#bbf7d0"}}>👤 {sel.contacto}</div>}
            </div>
          </div>
          <div style={{marginTop:12,background:saldo>0?"#fef2f2":"#f0fdf4",borderRadius:14,padding:"12px 16px",display:"flex",justifyContent:"space-between",alignItems:"center"}}>
            <div>
              <div style={{fontSize:11,color:"#94a3b8"}}>Saldo pendiente</div>
              <div style={{fontSize:22,fontWeight:800,color:saldo>0?"#ef4444":"#16a34a"}}>{fmx(saldo)}</div>
              <div style={{fontSize:12,color:"#94a3b8"}}>{saldo>0?"⚠️ Deuda pendiente":"✅ Al corriente"}</div>
            </div>
            <div style={{fontSize:28}}>{saldo>0?"⚠️":"✅"}</div>
          </div>
        </div>
        <div style={{padding:"12px 14px",display:"flex",flexDirection:"column",gap:10}}>
          {movs.length===0&&<div style={{textAlign:"center",color:"#94a3b8",padding:40}}>Sin movimientos aún.</div>}
          {movs.map(m=>(
            <div key={m.id} style={{background:"#fff",borderRadius:14,padding:"13px 15px",borderLeft:`4px solid ${m.tipo==="nota"?"#b45309":"#16a34a"}`,boxShadow:"0 1px 4px rgba(0,0,0,.06)"}}>
              <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:4}}>
                <span style={{fontSize:12,fontWeight:700,padding:"3px 10px",borderRadius:20,background:m.tipo==="nota"?"#fffbeb":"#f0fdf4",color:m.tipo==="nota"?"#b45309":"#16a34a"}}>
                  {m.tipo==="nota"?"📋 Nota de Trabajo":"💳 Pago"}
                </span>
                <span style={{fontWeight:800,color:m.tipo==="nota"?"#b45309":"#16a34a",fontSize:16}}>{m.tipo==="nota"?"-":"+"}{fmx(m.importe)}</span>
              </div>
              {m.folio&&<div style={{fontSize:12,color:"#64748b"}}>Folio: {m.folio}</div>}
              <div style={{fontSize:14,color:"#334155"}}>{m.descripcion}</div>
              <div style={{fontSize:12,color:"#94a3b8"}}>{fdate(m.fecha)}</div>
              {m.tipo==="nota"
                ?<AccBtns onEdit={()=>editNota(m)} onDel={()=>deleteNota(m.id)}/>
                :<div style={{fontSize:11,color:"#94a3b8",marginTop:6,fontStyle:"italic"}}>Pago registrado desde Flujo de Caja</div>}
            </div>
          ))}
        </div>
      </div>
    );
  }

  // ══════════════════════════════════════════════════════════════════
  // RESUMEN SEMANAL PROVEEDOR
  // ══════════════════════════════════════════════════════════════════
  if (view === "resumenProv" && sel) {
    const todosMovs = movsDeProv(sel.id);
    const luneses = [...new Set(todosMovs.map(m=>getLunes(m.fecha)))].sort();
    if(luneses.length===0) luneses.push(getLunes(hoy()));
    const semActual = semanaVer||luneses[luneses.length-1];
    const msem = movsEnSemanaProv(todosMovs,semActual).sort((a,b)=>a.fecha.localeCompare(b.fecha));
    const saldoAnterior = saldoAntesDeSemana(sel.id,semActual);
    const notasSem = msem.filter(m=>m.tipo==="nota").reduce((s,m)=>s+m.importe,0);
    const pagosSem = msem.filter(m=>m.tipo==="pago").reduce((s,m)=>s+m.importe,0);
    const saldoFinal = saldoAnterior+notasSem-pagosSem;
    return (
      <div style={root}>
        {ToastEl}
        <div style={{background:GRAD_PR,color:"#fff",padding:"18px 16px 20px",borderRadius:"0 0 20px 20px"}}>
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:8}}>
            <button style={bkPR} onClick={()=>go("detProv")}>← Regresar</button>
            <span style={{fontSize:16,fontWeight:700}}>Resumen Semanal</span>
            <button style={{...yb,fontSize:11}} onClick={()=>generarPDFProv(semActual)}>⬇️ PDF</button>
          </div>
          <div style={{fontSize:14,fontWeight:700}}>{sel.nombre}</div>
          <div style={{fontSize:12,color:"#bbf7d0",marginTop:2}}>{semanaLabel(semActual)}</div>
          <div style={{display:"flex",gap:6,marginTop:10,overflowX:"auto",paddingBottom:4}}>
            {luneses.map(l=>(
              <button key={l} onClick={()=>setSemanaVer(l)} style={{flexShrink:0,padding:"5px 12px",borderRadius:20,border:"none",background:l===semActual?"#fbbf24":"rgba(255,255,255,.15)",color:l===semActual?"#1e293b":"#fff",fontSize:11,fontWeight:700,cursor:"pointer"}}>
                {new Date(l+"T12:00:00").toLocaleDateString("es-MX",{day:"2-digit",month:"short"})}
              </button>
            ))}
          </div>
        </div>
        <div style={{padding:14}}>
          <div style={{background:"#fff",borderRadius:14,padding:14,marginBottom:14,boxShadow:"0 1px 4px rgba(0,0,0,.07)"}}>
            {[["Saldo anterior",saldoAnterior,saldoAnterior>0?"#ef4444":"#64748b"],["Notas de trabajo",notasSem,"#b45309"],["Pagos realizados",pagosSem,"#16a34a"]].map(([l,v,c])=>(
              <div key={l} style={{display:"flex",justifyContent:"space-between",padding:"5px 0",borderBottom:"1px solid #f1f5f9"}}>
                <span style={{color:"#64748b",fontSize:14}}>{l}</span><span style={{fontWeight:700,color:c}}>{fmx(v)}</span>
              </div>
            ))}
            <div style={{display:"flex",justifyContent:"space-between",padding:"8px 0 2px"}}>
              <span style={{fontWeight:700,fontSize:15}}>Saldo final</span>
              <span style={{fontWeight:800,fontSize:18,color:saldoFinal>0?"#ef4444":"#16a34a"}}>{fmx(saldoFinal)}</span>
            </div>
          </div>
          <div style={{fontSize:13,fontWeight:700,color:"#475569",marginBottom:8}}>Movimientos de la semana</div>
          {msem.length===0?<div style={{textAlign:"center",color:"#94a3b8",padding:30,background:"#fff",borderRadius:14}}>Sin movimientos esta semana</div>
          :msem.map(m=>(
            <div key={m.id} style={{background:"#fff",borderRadius:12,padding:"12px 14px",marginBottom:8,borderLeft:`4px solid ${m.tipo==="nota"?"#b45309":"#16a34a"}`,boxShadow:"0 1px 3px rgba(0,0,0,.06)"}}>
              <div style={{display:"flex",justifyContent:"space-between"}}>
                <div>
                  <span style={{fontSize:12,fontWeight:700,padding:"2px 9px",borderRadius:20,background:m.tipo==="nota"?"#fffbeb":"#f0fdf4",color:m.tipo==="nota"?"#b45309":"#16a34a"}}>{m.tipo==="nota"?"📋 Nota":"💳 Pago"}</span>
                  {m.folio&&<div style={{fontSize:11,color:"#94a3b8",marginTop:3}}>Folio: {m.folio}</div>}
                  <div style={{fontSize:13,color:"#334155",marginTop:3}}>{m.descripcion}</div>
                  <div style={{fontSize:11,color:"#94a3b8"}}>{fdate(m.fecha)}</div>
                </div>
                <div style={{textAlign:"right",flexShrink:0,marginLeft:10}}>
                  <div style={{fontWeight:800,color:m.tipo==="nota"?"#b45309":"#16a34a"}}>{m.tipo==="nota"?"-":"+"}{fmx(m.importe)}</div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  // ══════════════════════════════════════════════════════════════════
  // HOME
  // ══════════════════════════════════════════════════════════════════
  return (
    <div style={root}>
      {ToastEl}
      <div style={{display:"flex",background:"#fff",borderBottom:"1.5px solid #e2e8f0"}}>
        {[["fc","💰 Flujo de Caja","#1b6ca8"],["prov","🏢 Proveedores","#2d7a2d"]].map(([v,l,col])=>(
          <button key={v} onClick={()=>setTab(v)} style={{flex:1,padding:"13px 0",background:"none",border:"none",borderBottom:`3px solid ${tab===v?col:"transparent"}`,fontSize:13,fontWeight:700,color:tab===v?col:"#94a3b8",cursor:"pointer"}}>{l}</button>
        ))}
      </div>

      {tab==="fc"&&<>
        <div style={{background:GRAD_FC,color:"#fff",padding:"18px 16px 20px",borderRadius:"0 0 20px 20px"}}>
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:12}}>
            <div><div style={{fontSize:20,fontWeight:800}}>💰 Flujo de Caja</div><div style={{fontSize:11,color:"#bfdbfe"}}>Entradas y salidas de dinero</div></div>
            <div style={{display:"flex",gap:6}}>
              <button style={{background:"rgba(255,255,255,.15)",border:"none",borderRadius:10,padding:"9px 12px",fontWeight:700,fontSize:12,color:"#fff",cursor:"pointer"}}
                onClick={()=>{setSemanaVer(semanasFC()[semanasFC().length-1]||getLunes(hoy()));go("resumenFC");}}>📊 Resumen</button>
              <button style={yb} onClick={()=>{setForm({afecta_flujo:true});setEditId(null);go("nuevoMov");}}>+ Movimiento</button>
            </div>
          </div>
          <div style={{display:"flex",gap:8}}>
            {[[fmx(totalEntradas),"Entradas"],[fmx(totalSalidas),"Salidas"],[fmx(saldoFC),"Saldo",true]].map(([v,l,hl],i)=>(
              <div key={i} style={{flex:1,background:"rgba(255,255,255,.12)",borderRadius:12,padding:"10px 6px",textAlign:"center"}}>
                <div style={{fontSize:13,fontWeight:800,color:hl?(saldoFC>=0?"#bbf7d0":"#fecaca"):"#fff"}}>{v}</div>
                <div style={{fontSize:10,color:"#bfdbfe",marginTop:2}}>{l}</div>
              </div>
            ))}
          </div>
        </div>
        <div style={{padding:"12px 14px",display:"flex",flexDirection:"column",gap:10}}>
          {movFC.length===0&&<div style={{textAlign:"center",color:"#94a3b8",padding:40}}>Sin movimientos.<br/>Toca "+ Movimiento" para empezar.</div>}
          {[...movFC].sort((a,b)=>b.fecha.localeCompare(a.fecha)).map(m=>{
            const cfg=m.tipo==="entrada"?{l:"Entrada",ic:"💰",c:"#16a34a",b:"#f0fdf4"}:m.tipo==="gasto"?{l:"Gasto Operativo",ic:"📤",c:"#ef4444",b:"#fef2f2"}:{l:"Pago a Proveedor",ic:"🏢",c:"#b45309",b:"#fffbeb"};
            const pn=m.proveedor_id?(proveedores.find(p=>p.id===m.proveedor_id)?.nombre||""):"";
            return(<div key={m.id} style={{background:"#fff",borderRadius:14,padding:"13px 15px",borderLeft:`4px solid ${m.afecta_flujo===false?"#cbd5e1":cfg.c}`,boxShadow:"0 1px 4px rgba(0,0,0,.06)"}}>
              <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:4}}>
                <span style={{fontSize:12,fontWeight:700,padding:"3px 10px",borderRadius:20,background:cfg.b,color:cfg.c}}>{cfg.ic} {cfg.l}</span>
                <span style={{fontWeight:800,color:m.afecta_flujo===false?"#94a3b8":cfg.c,fontSize:16}}>{m.tipo==="entrada"?"+":"-"}{fmx(m.monto)}</span>
              </div>
              {m.procedencia&&<div style={{fontSize:14,color:"#334155"}}>{m.procedencia}</div>}
              {m.concepto&&<div style={{fontSize:14,color:"#334155"}}>{m.concepto}</div>}
              {pn&&<div style={{fontSize:13,color:"#b45309"}}>🏢 {pn} · {m.forma_pago}</div>}
              {m.responsable&&<div style={{fontSize:12,color:"#64748b"}}>👤 {m.responsable}</div>}
              {m.afecta_flujo===false&&<div style={{fontSize:11,color:"#94a3b8",fontStyle:"italic"}}>⚪ No afecta flujo de efectivo</div>}
              <div style={{fontSize:12,color:"#94a3b8"}}>{fdate(m.fecha)}</div>
              <AccBtns onEdit={()=>editMovFC(m)} onDel={()=>deleteMovFC(m.id)}/>
            </div>);
          })}
        </div>
      </>}

      {tab==="prov"&&<>
        <div style={{background:GRAD_PR,color:"#fff",padding:"18px 16px 20px",borderRadius:"0 0 20px 20px"}}>
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:12}}>
            <div><div style={{fontSize:20,fontWeight:800}}>🏢 Proveedores</div><div style={{fontSize:11,color:"#bbf7d0"}}>Notas de trabajo y pagos</div></div>
            <button style={yb} onClick={()=>{setForm({});setEditId(null);go("nuevoProv");}}>+ Proveedor</button>
          </div>
          <div style={{display:"flex",gap:8}}>
            {[[proveedores.length,"Proveedores"],[proveedores.filter(p=>saldoProv(p.id)>0).length,"Con deuda",true],[fmx(proveedores.reduce((s,p)=>s+Math.max(0,saldoProv(p.id)),0)),"Total deuda",true]].map(([v,l,w],i)=>(
              <div key={i} style={{flex:1,background:"rgba(255,255,255,.12)",borderRadius:12,padding:"10px 6px",textAlign:"center"}}>
                <div style={{fontSize:13,fontWeight:800,color:w?"#fbbf24":"#fff"}}>{v}</div>
                <div style={{fontSize:10,color:"#bbf7d0",marginTop:2}}>{l}</div>
              </div>
            ))}
          </div>
        </div>
        <div style={{padding:"12px 14px",display:"flex",flexDirection:"column",gap:10}}>
          {proveedores.length===0&&<div style={{textAlign:"center",color:"#94a3b8",padding:40}}>Sin proveedores.<br/>Toca "+ Proveedor" para agregar.</div>}
          {proveedores.map(p=>{
            const saldo=saldoProv(p.id);
            return(<div key={p.id} style={{background:"#fff",borderRadius:14,padding:"13px 15px",display:"flex",justifyContent:"space-between",alignItems:"center",cursor:"pointer",boxShadow:"0 1px 4px rgba(0,0,0,.07)"}}
              onClick={()=>{setSel(p);go("detProv");}}>
              <div style={{display:"flex",alignItems:"center",gap:12}}>
                <div style={{width:44,height:44,borderRadius:12,background:saldo>0?"linear-gradient(135deg,#b45309,#d97706)":"linear-gradient(135deg,#334155,#64748b)",color:"#fff",display:"flex",alignItems:"center",justifyContent:"center",fontWeight:800,fontSize:18}}>{p.nombre[0]}</div>
                <div><div style={{fontWeight:600,fontSize:15}}>{p.nombre}</div><div style={{fontSize:12,color:"#94a3b8"}}>{p.tel||p.contacto||"Sin datos"}</div></div>
              </div>
              <div style={{textAlign:"right"}}>
                <div style={{fontWeight:800,color:saldo>0?"#ef4444":"#16a34a"}}>{fmx(saldo)}</div>
                <div style={{fontSize:11,color:"#94a3b8"}}>{saldo>0?"pendiente":"al corriente"}</div>
              </div>
            </div>);
          })}
        </div>
      </>}
    </div>
  );
}
