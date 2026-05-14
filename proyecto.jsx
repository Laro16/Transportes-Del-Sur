const { useState, useEffect, useRef } = React;

const STORAGE_KEY = "transportes_del_sur_borrador_v4";
const SUPABASE_BUCKET = "Instalaciones";
const SUPABASE_TABLE = "instalaciones";

const INITIAL_FORM = {
    fecha: "", transportista: "", placa: "", negocio: "", cliente: "",
    telefono: "", ubicacion: "", contrato: "", codigo: "", serie: "", modelo: "", tipo: ""
};

const PHOTO_LABELS = {
    fachada: "Fachada del negocio", contrato: "Contrato firmado",
    etiqueta: "Etiqueta del equipo", equipo: "Equipo instalado"
};

const getSupabase = () => {
    if (!window.supabaseClient) throw new Error("Supabase no está inicializado. Revisa supabase.js.");
    return window.supabaseClient;
};

// Función global para voltear la fecha a Día/Mes/Año en todo el sistema
const formatearFechaDisplay = (fechaISO) => {
    if (!fechaISO) return "";
    const partes = fechaISO.split("-");
    if (partes.length !== 3) return fechaISO;
    const [anio, mes, dia] = partes;
    return `${dia}/${mes}/${anio}`;
};

// ==========================================
// COMPONENTES DE INTERFAZ EXTERNOS
// ==========================================
const InputForm = ({ label, type = "text", name, req = true, opts, value, onChange, error }) => (
    <div className="mb-5">
        <label className="block text-xs font-semibold text-slate-500 mb-2 uppercase tracking-wide">{label}</label>
        {opts ? (
            <select name={name} value={value} onChange={onChange} className="w-full p-3.5 border border-slate-200 rounded-xl bg-slate-50 focus:bg-white focus:ring-2 focus:ring-slate-800 outline-none transition-all text-slate-700" required={req}>
                <option value="">Seleccionar...</option>{opts.map((o, i) => <option key={i} value={o}>{o}</option>)}
            </select>
        ) : (
            <input type={type} name={name} value={value} onChange={onChange} className="w-full p-3.5 border border-slate-200 rounded-xl bg-slate-50 focus:bg-white focus:ring-2 focus:ring-slate-800 outline-none transition-all text-slate-700" required={req} />
        )}
        {error && <p className="text-xs text-rose-500 mt-1.5 font-medium">{error}</p>}
    </div>
);

const EvidenciaInput = ({ titulo, nameKey, fotoValue, onFotoChange, onRemove, error }) => (
    <div className="mb-5 bg-white p-5 rounded-2xl border border-slate-100 shadow-sm">
        <label className="text-sm block font-bold mb-3 text-slate-700">{titulo}</label>
        {!fotoValue ? (
            <div className="flex gap-3">
                <label className="flex-1 text-center bg-slate-50 text-slate-700 py-3 rounded-xl border border-slate-200 cursor-pointer hover:bg-slate-100 hover:border-slate-300 text-sm font-medium transition-all shadow-sm">
                    📸 Cámara
                    <input type="file" accept="image/*" capture="environment" className="hidden" onChange={(e) => onFotoChange(e, nameKey)} />
                </label>
                <label className="flex-1 text-center bg-slate-50 text-slate-700 py-3 rounded-xl border border-slate-200 cursor-pointer hover:bg-slate-100 hover:border-slate-300 text-sm font-medium transition-all shadow-sm">
                    🖼️ Galería
                    <input type="file" accept="image/*" className="hidden" onChange={(e) => onFotoChange(e, nameKey)} />
                </label>
            </div>
        ) : (
            <div className="space-y-3">
                <div className="rounded-xl overflow-hidden border border-slate-200 bg-slate-100">
                    <img src={fotoValue} className="w-full h-48 object-cover opacity-90" alt={titulo} />
                </div>
                <div className="flex gap-3">
                    <label className="flex-1 text-center bg-indigo-50 text-indigo-700 py-2.5 rounded-xl border border-indigo-200 cursor-pointer hover:bg-indigo-100 text-xs font-bold transition-colors">
                        🔄 REPETIR
                        <input type="file" accept="image/*" capture="environment" className="hidden" onChange={(e) => onFotoChange(e, nameKey)} />
                    </label>
                    <button type="button" onClick={() => onRemove(nameKey)} className="flex-1 text-center bg-rose-50 text-rose-700 py-2.5 rounded-xl border border-rose-200 hover:bg-rose-100 text-xs font-bold transition-colors">
                        🗑️ BORRAR
                    </button>
                </div>
            </div>
        )}
        {error && <p className="text-xs text-rose-500 mt-2 font-medium">{error}</p>}
    </div>
);


// ==========================================
// 1. COMPONENTE: PANEL DE ADMINISTRADOR
// ==========================================
const PanelAdmin = ({ onLogout }) => {
    const [registros, setRegistros] = useState([]);
    const [fechaDesde, setFechaDesde] = useState("");
    const [fechaHasta, setFechaHasta] = useState("");
    const [cargando, setCargando] = useState(false);
    const [descargandoZip, setDescargandoZip] = useState(false);

    const buscarRegistros = async (e) => {
        e.preventDefault();
        setCargando(true);
        try {
            const supabase = getSupabase();
            let query = supabase.from(SUPABASE_TABLE).select('*');
            if (fechaDesde) query = query.gte('fecha', fechaDesde);
            if (fechaHasta) query = query.lte('fecha', fechaHasta);
            query = query.order('fecha', { ascending: false });

            const { data, error } = await query;
            if (error) throw error;
            setRegistros(data || []);
        } catch (error) {
            console.error(error);
            alert("Error al buscar los datos en la nube.");
        } finally {
            setCargando(false);
        }
    };

    const descargarExcelMaestro = () => {
        if (registros.length === 0) return alert("No hay registros para descargar.");
        const wb = window.XLSX.utils.book_new();
        const datosMaestros = registros.map(r => ({
            "ID Registro": r.registro_id, 
            "Fecha": formatearFechaDisplay(r.fecha), 
            "Transportista": r.transportista,
            "Placa": r.placa, 
            "Negocio": r.negocio, 
            "Cliente": r.cliente, 
            "Teléfono": r.telefono,
            "Contrato": r.contrato, 
            "Código Equipo": r.codigo, 
            "Serie Equipo": r.serie,
            "Modelo Equipo": r.modelo, 
            "Tipo Equipo": r.tipo, 
            "Ubicación / GPS": r.ubicacion,
            "Latitud": r.latitud, 
            "Longitud": r.longitud, 
            "Enlace Reporte PDF": r.pdf_url,
            "Enlace Evidencia JPG": r.imagen_url, 
            "Enlace Excel Individual": r.excel_url
        }));
        const ws = window.XLSX.utils.json_to_sheet(datosMaestros);
        window.XLSX.utils.book_append_sheet(wb, ws, "Reporte Maestro");
        window.XLSX.writeFile(wb, `Reporte_TransportesDelSur_${formatearFechaDisplay(fechaDesde) || 'Todo'}_a_${formatearFechaDisplay(fechaHasta) || 'Todo'}.xlsx`);
    };

    const descargarZip = async () => {
        if (registros.length === 0) return alert("No hay registros para empaquetar en ZIP.");
        setDescargandoZip(true);
        try {
            const zip = new window.JSZip();
            for (const reg of registros) {
                const idCorto = reg.registro_id.slice(0, 5);
                const nombreCarpeta = `Instalacion_${reg.negocio}_${formatearFechaDisplay(reg.fecha)}_${idCorto}`.replace(/[^a-z0-9_]/gi, '_');
                const carpetaRegistro = zip.folder(nombreCarpeta);
                const agregarArchivo = async (url, nombre) => {
                    if (!url) return;
                    try {
                        const res = await fetch(url);
                        const blob = await res.blob();
                        carpetaRegistro.file(nombre, blob);
                    } catch (e) { console.error(e); }
                };
                await agregarArchivo(reg.pdf_url, `Reporte_${reg.negocio}.pdf`);
                await agregarArchivo(reg.imagen_url, `Evidencia_${reg.negocio}.jpg`);
                await agregarArchivo(reg.excel_url, `Datos_${reg.negocio}.xlsx`);
            }
            const contenidoZip = await zip.generateAsync({ type: "blob" });
            window.saveAs(contenidoZip, `Archivos_Completos_${formatearFechaDisplay(fechaDesde) || 'Todo'}.zip`);
        } catch (error) {
            console.error(error); alert("Hubo un problema al generar el archivo ZIP.");
        } finally {
            setDescargandoZip(false);
        }
    };

    return (
        <div className="max-w-7xl mx-auto p-4 md:p-8 bg-slate-50 min-h-screen font-sans">
            <header className="flex flex-col md:flex-row justify-between items-center bg-slate-900 text-white p-8 rounded-3xl mb-8 shadow-xl gap-4">
                <div className="text-center md:text-left">
                    <h1 className="text-3xl font-light tracking-wide mb-1">TRANSPORTES DEL SUR</h1>
                    <p className="text-slate-400 text-sm tracking-widest uppercase">Dashboard Administrativo</p>
                </div>
                <button onClick={onLogout} className="border border-slate-600 hover:bg-slate-800 text-white px-6 py-2.5 rounded-full text-sm font-medium transition-all w-full md:w-auto">
                    Cerrar Sesión
                </button>
            </header>

            <div className="bg-white p-6 md:p-8 rounded-3xl shadow-sm border border-slate-200 mb-8">
                <h2 className="text-sm font-semibold text-slate-400 uppercase tracking-widest mb-6">Filtros de Búsqueda</h2>
                <form onSubmit={buscarRegistros} className="flex flex-wrap gap-5 items-end">
                    <div className="flex-1 min-w-[200px]">
                        <label className="block text-xs font-semibold text-slate-500 mb-2 uppercase tracking-wide">Fecha Desde</label>
                        <input type="date" value={fechaDesde} onChange={e => setFechaDesde(e.target.value)} className="w-full p-3 border border-slate-200 rounded-xl bg-slate-50 focus:bg-white focus:ring-2 focus:ring-slate-800 focus:border-transparent outline-none transition-all text-slate-700" />
                    </div>
                    <div className="flex-1 min-w-[200px]">
                        <label className="block text-xs font-semibold text-slate-500 mb-2 uppercase tracking-wide">Fecha Hasta</label>
                        <input type="date" value={fechaHasta} onChange={e => setFechaHasta(e.target.value)} className="w-full p-3 border border-slate-200 rounded-xl bg-slate-50 focus:bg-white focus:ring-2 focus:ring-slate-800 focus:border-transparent outline-none transition-all text-slate-700" />
                    </div>
                    <button type="submit" disabled={cargando} className="bg-slate-900 text-white px-10 py-3.5 rounded-xl font-medium shadow-lg shadow-slate-900/20 hover:bg-slate-800 hover:-translate-y-0.5 w-full md:w-auto min-w-[160px] transition-all">
                        {cargando ? "Buscando..." : "Buscar Registros"}
                    </button>
                </form>
            </div>

            {registros.length > 0 && (
                <div className="flex flex-col md:flex-row gap-5 mb-8">
                    <button onClick={descargarExcelMaestro} className="flex-1 bg-white border border-slate-200 text-slate-700 font-medium py-3.5 px-6 rounded-xl shadow-sm hover:shadow-md hover:border-slate-300 transition-all flex items-center justify-center gap-3">
                        <span className="text-emerald-600 text-lg">📊</span> Excel Maestro (Todas las columnas)
                    </button>
                    <button onClick={descargarZip} disabled={descargandoZip} className={`flex-1 bg-white border border-slate-200 text-slate-700 font-medium py-3.5 px-6 rounded-xl shadow-sm hover:shadow-md hover:border-slate-300 transition-all flex items-center justify-center gap-3 ${descargandoZip ? 'opacity-60 cursor-not-allowed' : ''}`}>
                        <span className="text-indigo-600 text-lg">📦</span> {descargandoZip ? "Empaquetando ZIP..." : "Descargar Todo en ZIP"}
                    </button>
                </div>
            )}

            <div className="bg-white rounded-3xl shadow-sm border border-slate-200 overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse min-w-[1200px]">
                        <thead>
                            <tr className="bg-slate-50 text-slate-500 text-xs uppercase tracking-wider border-b-2 border-slate-200">
                                <th className="p-5 font-semibold">Fecha</th>
                                <th className="p-5 font-semibold">Negocio / Cliente</th>
                                <th className="p-5 font-semibold">Contacto</th>
                                <th className="p-5 font-semibold">Transportista (Placa)</th>
                                <th className="p-5 font-semibold">Equipo Instalado</th>
                                <th className="p-5 font-semibold">Ubicación GPS</th>
                                <th className="p-5 font-semibold text-center">Archivos</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-200">
                            {registros.length === 0 ? (
                                <tr>
                                    <td colSpan="7" className="p-16 text-center text-slate-400">
                                        <p className="text-lg mb-1">Sin resultados</p>
                                        <p className="text-sm font-light">Usa el filtro superior para mostrar las instalaciones.</p>
                                    </td>
                                </tr>
                            ) : (
                                registros.map((reg) => (
                                    <tr key={reg.registro_id} className="hover:bg-slate-50/70 transition-colors text-sm text-slate-600">
                                        <td className="p-5 font-medium text-slate-900">{formatearFechaDisplay(reg.fecha)}</td>
                                        <td className="p-5">
                                            <p className="font-semibold text-slate-900">{reg.negocio}</p>
                                            <p className="text-xs text-slate-500 mt-0.5">{reg.cliente}</p>
                                        </td>
                                        <td className="p-5">
                                            <p>{reg.telefono}</p>
                                            <p className="text-xs text-slate-400 mt-0.5">Contrato: {reg.contrato}</p>
                                        </td>
                                        <td className="p-5">
                                            <span className="inline-flex items-center px-2.5 py-1 rounded-md text-xs font-medium bg-slate-100 text-slate-700 mb-1 border border-slate-200">
                                                {reg.transportista}
                                            </span>
                                            <p className="text-xs text-slate-500 mt-1">{reg.placa}</p>
                                        </td>
                                        <td className="p-5">
                                            <p className="font-medium text-slate-800">{reg.modelo}</p>
                                            <p className="text-xs text-slate-500 mt-0.5">{reg.tipo}</p>
                                        </td>
                                        <td className="p-5 text-xs text-slate-500 max-w-[200px] truncate" title={reg.ubicacion}>
                                            {reg.ubicacion}
                                        </td>
                                        <td className="p-5 flex justify-center gap-2">
                                            {reg.pdf_url ? <a href={reg.pdf_url} target="_blank" rel="noreferrer" className="text-rose-600 bg-rose-50 border border-rose-100 hover:bg-rose-100 px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors shadow-sm">PDF</a> : <span className="text-slate-200 text-xs px-3 py-1.5">-</span>}
                                            {reg.excel_url ? <a href={reg.excel_url} target="_blank" rel="noreferrer" className="text-emerald-600 bg-emerald-50 border border-emerald-100 hover:bg-emerald-100 px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors shadow-sm">XLS</a> : <span className="text-slate-200 text-xs px-3 py-1.5">-</span>}
                                            {reg.imagen_url ? <a href={reg.imagen_url} target="_blank" rel="noreferrer" className="text-indigo-600 bg-indigo-50 border border-indigo-100 hover:bg-indigo-100 px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors shadow-sm">IMG</a> : <span className="text-slate-200 text-xs px-3 py-1.5">-</span>}
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
};


// ==========================================
// 2. COMPONENTE: VISTA TECNICO
// ==========================================
const VistaTecnico = ({ onLogout }) => {
    const skipDraftSaveRef = useRef(false);
    const [opciones, setOpciones] = useState({ transportistas: [], placas: [] });
    const [formData, setFormData] = useState(INITIAL_FORM);
    const [fotos, setFotos] = useState({});
    const [gpsInfo, setGpsInfo] = useState({ lat: "", lon: "", direccion: "" });
    const [errors, setErrors] = useState({});
    const [obteniendoGPS, setObteniendoGPS] = useState(false);
    const [generando, setGenerando] = useState(false);

    useEffect(() => {
        fetch("products.json").then(res => res.json()).then(data => setOpciones(data)).catch(err => console.error(err));
    }, []);

    useEffect(() => {
        try {
            const saved = localStorage.getItem(STORAGE_KEY);
            if (!saved) return;
            const parsed = JSON.parse(saved);
            if (parsed?.formData) setFormData(prev => ({ ...prev, ...parsed.formData }));
            if (parsed?.fotos) setFotos(parsed.fotos);
            if (parsed?.gpsInfo) setGpsInfo(prev => ({ ...prev, ...parsed.gpsInfo }));
        } catch (error) { console.error(error); }
    }, []);

    useEffect(() => {
        if (skipDraftSaveRef.current) return;
        try { localStorage.setItem(STORAGE_KEY, JSON.stringify({ formData, fotos, gpsInfo })); } catch (error) { console.error(error); }
    }, [formData, fotos, gpsInfo]);

    const resetForm = () => { setFormData(INITIAL_FORM); setFotos({}); setGpsInfo({ lat: "", lon: "", direccion: "" }); setErrors({}); setObteniendoGPS(false); };
    const clearDraft = () => { try { localStorage.removeItem(STORAGE_KEY); } catch (error) {} };

    const sanitizeFileName = (value) => String(value || "registro").trim().replace(/[\\/:*?"<>|]/g, "-").replace(/\s+/g, "_").slice(0, 80) || "registro";
    const buildRegistroId = () => window.crypto && typeof window.crypto.randomUUID === "function" ? window.crypto.randomUUID() : `reg_${Date.now()}_${Math.random().toString(16).slice(2)}`;

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
        setErrors(prev => ({ ...prev, [name]: "" }));
    };

    const validarFormulario = () => {
        const nextErrors = {};
        const requiredFields = ["fecha", "transportista", "placa", "negocio", "cliente", "telefono", "ubicacion", "contrato", "codigo", "serie", "modelo", "tipo"];
        requiredFields.forEach((field) => { if (!String(formData[field] || "").trim()) nextErrors[field] = "Requerido."; });
        const soloDigitos = String(formData.telefono || "").replace(/\D/g, "");
        if (formData.telefono && soloDigitos.length < 8) nextErrors.telefono = "Mínimo 8 dígitos.";
        if (formData.fecha && Number.isNaN(new Date(formData.fecha).getTime())) nextErrors.fecha = "Fecha inválida.";
        if (formData.ubicacion && /obteniendo datos satelitales/i.test(String(formData.ubicacion))) nextErrors.ubicacion = "Esperando GPS...";
        Object.keys(PHOTO_LABELS).forEach((key) => { if (!fotos[key]) nextErrors[`foto_${key}`] = "Falta evidencia."; });
        return nextErrors;
    };

    const comprimirImagen = (file) => {
        return new Promise((resolve, reject) => {
            const objectUrl = URL.createObjectURL(file);
            const img = new Image();
            img.onload = () => {
                URL.revokeObjectURL(objectUrl);
                const canvas = document.createElement("canvas");
                let scaleSize = 1; if (img.width > 1200) scaleSize = 1200 / img.width;
                canvas.width = Math.round(img.width * scaleSize); canvas.height = Math.round(img.height * scaleSize);
                canvas.getContext("2d").drawImage(img, 0, 0, canvas.width, canvas.height);
                resolve(canvas.toDataURL("image/jpeg", 0.85));
            };
            img.onerror = reject; img.src = objectUrl;
        });
    };

    const formatearHoraSolo = (date = new Date()) => {
        return new Intl.DateTimeFormat("es-GT", { hour: "2-digit", minute: "2-digit", second: "2-digit", hour12: false }).format(date);
    };

    const fitTextSingleLine = (ctx, text, maxWidth) => {
        const value = String(text || ""); if (ctx.measureText(value).width <= maxWidth) return value;
        let low = 0; let high = value.length; let best = "…";
        while (low <= high) {
            const mid = Math.floor((low + high) / 2);
            const candidate = value.slice(0, mid).trimEnd() + "…";
            if (ctx.measureText(candidate).width <= maxWidth) { best = candidate; low = mid + 1; } else { high = mid - 1; }
        }
        return best;
    };

    const estamparDatosEnImagen = (base64, datos) => {
        return new Promise((resolve, reject) => {
            const img = new Image(); img.crossOrigin = "anonymous";
            img.onload = () => {
                const canvas = document.createElement("canvas");
                canvas.width = img.width; canvas.height = img.height;
                const ctx = canvas.getContext("2d"); ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
                const margin = Math.max(20, Math.round(canvas.width * 0.02));
                const fontSize = Math.max(14, Math.round(canvas.width * 0.013));
                const lineHeight = Math.round(fontSize * 1.45);
                ctx.font = `bold ${fontSize}px Arial`; ctx.textBaseline = "top"; ctx.textAlign = "right";
                ctx.fillStyle = "#FFFFFF"; ctx.strokeStyle = "rgba(0,0,0,0.75)"; ctx.lineWidth = Math.max(2, Math.round(fontSize * 0.15));
                ctx.shadowColor = "rgba(0,0,0,0.45)"; ctx.shadowBlur = 4; ctx.shadowOffsetX = 1; ctx.shadowOffsetY = 1;
                const rows = [`NEGOCIO: ${datos.negocio}`, `FECHA: ${datos.fecha}`, `HORA: ${datos.hora}`, `DIRECCIÓN: ${datos.direccion}`, `GPS: ${datos.lat}, ${datos.lon}`].map(row => fitTextSingleLine(ctx, row, Math.round(canvas.width * 0.55)));
                let y = canvas.height - margin - (rows.length * lineHeight); const x = canvas.width - margin;
                rows.forEach((linea) => { ctx.strokeText(linea, x, y); ctx.fillText(linea, x, y); y += lineHeight; });
                resolve(canvas.toDataURL("image/jpeg", 0.88));
            };
            img.onerror = reject; img.src = base64;
        });
    };

    const handleFoto = async (e, nombre) => {
        const file = e.target.files[0]; if (!file) return;
        try {
            const imgComp = await comprimirImagen(file);
            const hora = formatearHoraSolo(new Date());
            const cand = gpsInfo.direccion || formData.ubicacion || "";
            const final = await estamparDatosEnImagen(imgComp, { 
                negocio: formData.negocio?.trim() || "NEGOCIO", 
                fecha: formatearFechaDisplay(formData.fecha) || "Sin Fecha", 
                hora, 
                direccion: (!cand || /obteniendo/i.test(String(cand))) ? "SIN UBICACIÓN" : cand, 
                lat: gpsInfo.lat || "N/D", 
                lon: gpsInfo.lon || "N/D" 
            });
            setFotos(prev => ({ ...prev, [nombre]: final }));
            setErrors(prev => ({ ...prev, [`foto_${nombre}`]: "" }));
        } catch (error) { alert("Error al procesar imagen."); } finally { e.target.value = ""; }
    };

    const quitarFoto = (nombre) => { setFotos(prev => { const c = { ...prev }; delete c[nombre]; return c; }); setErrors(prev => ({ ...prev, [`foto_${nombre}`]: "" })); };

    const obtenerUbicacion = (e) => {
        e.preventDefault();
        if (!navigator.geolocation) return alert("Tu dispositivo no soporta GPS.");
        setObteniendoGPS(true); setFormData(prev => ({ ...prev, ubicacion: "Obteniendo datos satelitales..." })); setErrors(prev => ({ ...prev, ubicacion: "" }));
        navigator.geolocation.getCurrentPosition(
            async (pos) => {
                const lat = pos.coords.latitude; const lon = pos.coords.longitude; let texto = `${lat}, ${lon}`;
                try {
                    const res = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lon}`);
                    const data = await res.json();
                    if (data?.address) {
                        const lugar = [data.address.city || data.address.town || data.address.village || "", data.address.state || ""].filter(Boolean).join(", ");
                        if (lugar) texto = `${lugar} (${lat}, ${lon})`;
                    }
                } catch (e) {}
                setGpsInfo({ lat: `${lat}`, lon: `${lon}`, direccion: texto }); setFormData(prev => ({ ...prev, ubicacion: texto })); setObteniendoGPS(false);
            },
            () => { alert("Activa el GPS en modo Alta Precisión."); setFormData(prev => ({ ...prev, ubicacion: "" })); setGpsInfo({ lat: "", lon: "", direccion: "" }); setObteniendoGPS(false); },
            { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 }
        );
    };

    const uploadBlobToSupabase = async (blob, path, contentType) => {
        const supabase = getSupabase();
        const { error } = await supabase.storage.from(SUPABASE_BUCKET).upload(path, blob, { upsert: true, contentType });
        if (error) throw error;
        return { path, publicUrl: supabase.storage.from(SUPABASE_BUCKET).getPublicUrl(path).data.publicUrl };
    };

    const generarDocumentos = async (e) => {
        e.preventDefault();
        const validacion = validarFormulario();
        if (Object.keys(validacion).length > 0) {
            setErrors(validacion);
            return alert(`Faltan datos requeridos.\n\n${validacion[Object.keys(validacion)[0]]}`);
        }
        setGenerando(true);
        const regId = buildRegistroId(); const sNeg = sanitizeFileName(formData.negocio); const sFec = sanitizeFileName(formData.fecha);
        const pName = `Instalacion_${sNeg}_${sFec}.pdf`; const xName = `registro_${sNeg}_${sFec}.xlsx`; const iName = `Resumen_${sNeg}_${sFec}.jpg`;

        try {
            const area = document.getElementById("molde-imagen-whatsapp");
            const canvas = await window.html2canvas(area, { scale: 3, useCORS: true, backgroundColor: "#ffffff" });
            const imageBlob = await new Promise(r => canvas.toBlob(r, "image/jpeg", 0.88));

            const doc = new window.jspdf.jsPDF(); doc.setFontSize(18); doc.text("Reporte de Instalación", 15, 20); doc.setFontSize(12);
            
            // Voltear la fecha en el PDF 
            const dataParaPDF = Object.entries(formData).map(([k, v]) => [k.toUpperCase(), k === 'fecha' ? formatearFechaDisplay(v) : String(v || "")]);
            doc.autoTable({ startY: 30, head: [["Campo", "Información"]], body: dataParaPDF });
            
            for (const [k, b64] of Object.entries(fotos)) {
                if (!b64) continue; doc.addPage(); doc.text(`Evidencia: ${PHOTO_LABELS[k] || k}`, 15, 20);
                const props = doc.getImageProperties(b64); const w = doc.internal.pageSize.getWidth(); const h = doc.internal.pageSize.getHeight();
                let fw = w - 30; let fh = (props.height * fw) / props.width;
                if (fh > h - 45) { fh = h - 45; fw = (props.width * fh) / props.height; }
                doc.addImage(b64, "JPEG", (w - fw) / 2, 30, fw, fh);
            }
            const pdfBlob = doc.output("blob");

            const wb = window.XLSX.utils.book_new();
            
            // Voltear la fecha en el Excel individual
            const registroParaExcel = { ...formData, fecha: formatearFechaDisplay(formData.fecha) };
            window.XLSX.utils.book_append_sheet(wb, window.XLSX.utils.json_to_sheet([registroParaExcel]), "Registro");
            window.XLSX.utils.book_append_sheet(wb, window.XLSX.utils.json_to_sheet(Object.entries(PHOTO_LABELS).map(([k, l]) => ({ Evidencia: l, Estado: fotos[k] ? "Adjunta" : "Pendiente" }))), "Evidencias");
            const xlsxBlob = new Blob([window.XLSX.write(wb, { bookType: "xlsx", type: "array" })], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });

            const dl = (b, n) => { const u = URL.createObjectURL(b); const a = document.createElement("a"); a.href = u; a.download = n; a.click(); URL.revokeObjectURL(u); };
            dl(imageBlob, iName); dl(pdfBlob, pName); dl(xlsxBlob, xName);

            const [p, x, i] = await Promise.all([
                uploadBlobToSupabase(pdfBlob, `Pdfs/${pName}`, "application/pdf"),
                uploadBlobToSupabase(xlsxBlob, `Excel/${xName}`, "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"),
                uploadBlobToSupabase(imageBlob, `Imagenes/${iName}`, "image/jpeg")
            ]);

            const { error: insErr } = await getSupabase().from(SUPABASE_TABLE).insert([{
                registro_id: regId, fecha: formData.fecha, negocio: formData.negocio, cliente: formData.cliente,
                transportista: formData.transportista, placa: formData.placa, contrato: formData.contrato,
                codigo: formData.codigo, serie: formData.serie, modelo: formData.modelo, tipo: formData.tipo,
                telefono: formData.telefono, ubicacion: formData.ubicacion, latitud: gpsInfo.lat, longitud: gpsInfo.lon,
                pdf_url: p.publicUrl, excel_url: x.publicUrl, imagen_url: i.publicUrl, pdf_path: p.path, excel_path: x.path, imagen_path: i.path
            }]);
            if (insErr) throw insErr;

            skipDraftSaveRef.current = true; clearDraft(); resetForm();
            setTimeout(() => { skipDraftSaveRef.current = false; }, 0);
            alert("¡Éxito! Archivos generados y subidos a la nube.");
        } catch (e) { console.error(e); alert("Error al guardar en la nube."); } finally { setGenerando(false); }
    };

    return (
        <div className="bg-slate-100 min-h-screen font-sans">
            <div id="molde-imagen-whatsapp" className="fixed top-0 left-[-9999px] bg-white p-10 w-[1200px]">
                <div className="bg-slate-900 text-white p-6 text-center rounded-xl mb-8"><h2 className="text-4xl font-bold mb-2">Transportes Del Sur</h2><p className="text-xl font-light tracking-widest uppercase">Reporte de Instalación</p></div>
                <div className="grid grid-cols-2 gap-6 mb-8 bg-slate-50 p-6 rounded-xl border-2 border-slate-200 text-xl text-slate-700">
                    <p><span className="font-bold text-slate-900">Fecha:</span> {formatearFechaDisplay(formData.fecha)}</p><p><span className="font-bold text-slate-900">Transportista:</span> {formData.transportista}</p>
                    <p><span className="font-bold text-slate-900">Placa:</span> {formData.placa}</p><p><span className="font-bold text-slate-900">Negocio:</span> {formData.negocio}</p>
                    <p><span className="font-bold text-slate-900">Cliente:</span> {formData.cliente}</p><p><span className="font-bold text-slate-900">Teléfono:</span> {formData.telefono}</p>
                    <p className="col-span-2"><span className="font-bold text-slate-900">Ubicación:</span> {formData.ubicacion}</p>
                    <p><span className="font-bold text-slate-900">Contrato:</span> {formData.contrato}</p><p><span className="font-bold text-slate-900">Código Eq:</span> {formData.codigo}</p>
                    <p><span className="font-bold text-slate-900">Serie Eq:</span> {formData.serie}</p><p><span className="font-bold text-slate-900">Modelo Eq:</span> {formData.modelo} ({formData.tipo})</p>
                </div>
                <div className="grid grid-cols-2 gap-6">
                    {Object.entries(PHOTO_LABELS).map(([k, t]) => fotos[k] && (<div key={k} className="border-2 border-slate-200 p-6 rounded-xl text-center bg-white"><p className="font-bold text-slate-800 mb-4 text-2xl uppercase">{t}</p><img src={fotos[k]} className="w-full h-[500px] object-cover rounded-lg" alt={t} /></div>))}
                </div>
            </div>

            <div className="max-w-lg mx-auto bg-white min-h-screen shadow-2xl pb-12 border-x border-slate-200">
                <header className="bg-slate-900 text-white p-8 rounded-b-[40px] mb-8 shadow-xl relative">
                    <button type="button" onClick={onLogout} className="absolute top-6 right-6 text-xs bg-white/10 hover:bg-white/20 px-4 py-2 rounded-full backdrop-blur-sm transition-all font-medium">
                        Cerrar Sesión
                    </button>
                    <h1 className="text-2xl font-light tracking-wide mt-4">Transportes Del Sur</h1>
                    <p className="text-sm text-slate-400 font-medium tracking-widest uppercase mt-1">Registro Operativo</p>
                </header>

                <form onSubmit={generarDocumentos} className="px-6 space-y-8">
                    
                    <div>
                        <h3 className="text-sm font-bold text-slate-800 mb-4 uppercase tracking-widest flex items-center gap-2"><span className="bg-slate-200 w-6 h-6 rounded-full flex items-center justify-center text-slate-600 text-xs">1</span> Transporte</h3>
                        <InputForm label="Fecha de Instalación" type="date" name="fecha" value={formData.fecha} onChange={handleChange} error={errors.fecha} />
                        <InputForm label="Transportista Asignado" name="transportista" opts={opciones.transportistas} value={formData.transportista} onChange={handleChange} error={errors.transportista} />
                        <InputForm label="Placa del Vehículo" name="placa" opts={opciones.placas} value={formData.placa} onChange={handleChange} error={errors.placa} />
                    </div>

                    <hr className="border-slate-100" />

                    <div>
                        <h3 className="text-sm font-bold text-slate-800 mb-4 uppercase tracking-widest flex items-center gap-2"><span className="bg-slate-200 w-6 h-6 rounded-full flex items-center justify-center text-slate-600 text-xs">2</span> Datos del Cliente</h3>
                        <InputForm label="Nombre del Negocio" name="negocio" value={formData.negocio} onChange={handleChange} error={errors.negocio} />
                        <InputForm label="Propietario / Cliente" name="cliente" value={formData.cliente} onChange={handleChange} error={errors.cliente} />
                        <InputForm label="Teléfono de Contacto" type="tel" name="telefono" value={formData.telefono} onChange={handleChange} error={errors.telefono} />
                        
                        <div className="mb-5">
                            <label className="block text-xs font-semibold text-slate-500 mb-2 uppercase tracking-wide">Ubicación GPS</label>
                            <div className="flex gap-2">
                                <textarea name="ubicacion" value={formData.ubicacion} readOnly className="w-full p-3 border border-slate-200 rounded-xl bg-slate-50 text-sm h-14 resize-none text-slate-600 focus:outline-none" required></textarea>
                                <button type="button" onClick={obtenerUbicacion} disabled={obteniendoGPS} className={`${obteniendoGPS ? "bg-slate-300" : "bg-slate-800 hover:bg-slate-900"} text-white px-5 rounded-xl shadow-md transition-colors flex items-center justify-center`}>
                                    📍
                                </button>
                            </div>
                            {errors.ubicacion && <p className="text-xs text-rose-500 mt-1.5 font-medium">{errors.ubicacion}</p>}
                        </div>
                        <InputForm label="Número de Contrato" name="contrato" value={formData.contrato} onChange={handleChange} error={errors.contrato} />
                    </div>

                    <hr className="border-slate-100" />

                    <div>
                        <h3 className="text-sm font-bold text-slate-800 mb-4 uppercase tracking-widest flex items-center gap-2"><span className="bg-slate-200 w-6 h-6 rounded-full flex items-center justify-center text-slate-600 text-xs">3</span> Especificaciones del Equipo</h3>
                        <InputForm label="Código de Equipo" name="codigo" value={formData.codigo} onChange={handleChange} error={errors.codigo} />
                        <InputForm label="Número de Serie" name="serie" value={formData.serie} onChange={handleChange} error={errors.serie} />
                        <InputForm label="Modelo" name="modelo" value={formData.modelo} onChange={handleChange} error={errors.modelo} />
                        <InputForm label="Tipo de Cuerpo" name="tipo" opts={["1 cuerpo", "2 cuerpos", "3 cuerpos", "4 cuerpos"]} value={formData.tipo} onChange={handleChange} error={errors.tipo} />
                    </div>

                    <div className="bg-slate-50 p-6 rounded-3xl border border-slate-100">
                        <h3 className="text-sm font-bold text-slate-800 mb-4 uppercase tracking-widest flex items-center gap-2"><span className="bg-slate-800 text-white w-6 h-6 rounded-full flex items-center justify-center text-xs">4</span> Evidencias Fotográficas</h3>
                        <EvidenciaInput titulo="Fachada Exterior" nameKey="fachada" fotoValue={fotos.fachada} onFotoChange={handleFoto} onRemove={quitarFoto} error={errors.foto_fachada} />
                        <EvidenciaInput titulo="Documento de Contrato" nameKey="contrato" fotoValue={fotos.contrato} onFotoChange={handleFoto} onRemove={quitarFoto} error={errors.foto_contrato} />
                        <EvidenciaInput titulo="Etiqueta Técnica" nameKey="etiqueta" fotoValue={fotos.etiqueta} onFotoChange={handleFoto} onRemove={quitarFoto} error={errors.foto_etiqueta} />
                        <EvidenciaInput titulo="Equipo Final Instalado" nameKey="equipo" fotoValue={fotos.equipo} onFotoChange={handleFoto} onRemove={quitarFoto} error={errors.foto_equipo} />
                    </div>

                    <button type="submit" disabled={generando} className={`w-full ${generando ? "bg-slate-400" : "bg-slate-900 hover:bg-slate-800 hover:-translate-y-1"} text-white font-medium tracking-wide py-5 rounded-2xl shadow-xl transition-all text-sm uppercase`}>
                        {generando ? "Procesando Archivos..." : "Generar y Subir Reportes"}
                    </button>
                    <p className="text-center text-slate-400 text-xs mt-4 pb-6">Los datos se sincronizan automáticamente.</p>
                </form>
            </div>
        </div>
    );
};


// ==========================================
// 3. COMPONENTE PRINCIPAL (LOGIN)
// ==========================================
const AppProyecto = () => {
    const [isLoggedIn, setIsLoggedIn] = useState(false);
    const [username, setUsername] = useState("");
    const [password, setPassword] = useState("");
    const [role, setRole] = useState(""); 

    useEffect(() => {
        if (!isLoggedIn) return;
        const handleBeforeUnload = (e) => { e.preventDefault(); e.returnValue = ""; };
        const handlePopState = () => { if (window.confirm("¿Cerrar sesión?")) { setIsLoggedIn(false); setRole(""); } else { window.history.pushState(null, null, window.location.href); } };
        window.addEventListener("beforeunload", handleBeforeUnload);
        window.addEventListener("popstate", handlePopState);
        window.history.pushState(null, null, window.location.href);
        return () => { window.removeEventListener("beforeunload", handleBeforeUnload); window.removeEventListener("popstate", handlePopState); };
    }, [isLoggedIn]);

    const handleLogin = (e) => {
        e.preventDefault();
        if (username === "admin" && password === "123") { setRole("admin"); setIsLoggedIn(true); } 
        else if (username === "tec" && password === "123") { setRole("tecnico"); setIsLoggedIn(true); } 
        else { alert("Credenciales incorrectas."); }
    };

    if (!isLoggedIn) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-slate-100 p-4 font-sans">
                <div className="w-full max-w-md bg-white p-10 rounded-[2.5rem] shadow-2xl border border-slate-100">
                    <div className="text-center mb-10">
                        <div className="bg-slate-900 w-16 h-16 rounded-2xl mx-auto mb-6 flex items-center justify-center shadow-lg">
                            <span className="text-white font-bold text-2xl">TS</span>
                        </div>
                        <h1 className="text-2xl font-light text-slate-800 tracking-wide mb-1">Transportes Del Sur</h1>
                        <p className="text-slate-400 text-sm font-medium tracking-widest uppercase">Portal de Acceso</p>
                    </div>

                    <form onSubmit={handleLogin} className="space-y-6">
                        <div>
                            <label className="block text-xs font-semibold text-slate-500 mb-2 uppercase tracking-wide">Usuario</label>
                            <input type="text" value={username} onChange={e => setUsername(e.target.value)} className="w-full p-4 border border-slate-200 rounded-2xl bg-slate-50 focus:bg-white focus:ring-2 focus:ring-slate-800 focus:border-transparent outline-none transition-all text-slate-800" required />
                        </div>
                        <div>
                            <label className="block text-xs font-semibold text-slate-500 mb-2 uppercase tracking-wide">Contraseña</label>
                            <input type="password" value={password} onChange={e => setPassword(e.target.value)} className="w-full p-4 border border-slate-200 rounded-2xl bg-slate-50 focus:bg-white focus:ring-2 focus:ring-slate-800 focus:border-transparent outline-none transition-all text-slate-800" required />
                        </div>
                        <div className="pt-4">
                            <button type="submit" className="w-full bg-slate-900 text-white font-medium tracking-wide py-4 rounded-2xl hover:bg-slate-800 hover:-translate-y-1 transition-all shadow-xl shadow-slate-900/20">
                                Iniciar Sesión
                            </button>
                        </div>
                    </form>
                </div>
            </div>
        );
    }

    if (role === "admin") return <PanelAdmin onLogout={() => {setIsLoggedIn(false); setRole(""); setPassword("");}} />;
    return <VistaTecnico onLogout={() => {setIsLoggedIn(false); setRole(""); setPassword("");}} />;
};
