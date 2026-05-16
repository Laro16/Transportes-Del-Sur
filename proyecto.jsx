const { useState, useEffect, useRef } = React;

const STORAGE_KEY = "transportes_del_sur_borrador_v4";
const SUPABASE_BUCKET = "Instalaciones";
const SUPABASE_TABLE = "instalaciones";

const INITIAL_FORM = {
    tipo_movimiento: "Instalación",
    fecha: "", transportista: "", placa: "", negocio: "", cliente: "",
    telefono: "", ubicacion: "", municipio: "", departamento: "", 
    contrato: "", codigo: "", serie: "", modelo: "", tipo: ""
};

const getPhotoLabels = (tipoMovimiento) => {
    if (tipoMovimiento === "Retiro") {
        return {
            fachada: "Fachada Exterior",
            contrato: "Orden de Retiro / Conformidad",
            etiqueta: "Etiqueta Técnica",
            equipo: "Estado Físico del Equipo"
        };
    }
    return {
        fachada: "Fachada Exterior",
        contrato: "Documento de Contrato",
        etiqueta: "Etiqueta Técnica",
        equipo: "Equipo Final Instalado"
    };
};

const getSupabase = () => {
    if (!window.supabaseClient) throw new Error("Supabase no está inicializado. Revisa supabase.js.");
    return window.supabaseClient;
};

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
const InputForm = ({ label, type = "text", name, req = true, opts, value, onChange, error, readOnly = false }) => (
    <div className="mb-5">
        <label className="block text-[11px] font-bold text-slate-500 mb-2 uppercase tracking-widest">{label}</label>
        {opts ? (
            <select name={name} value={value} onChange={onChange} disabled={readOnly} className="w-full p-3.5 border border-slate-200 rounded-xl bg-slate-50 focus:bg-white focus:ring-2 focus:ring-slate-800 outline-none transition-all text-slate-700 text-sm disabled:opacity-70" required={req}>
                <option value="">Seleccionar...</option>{opts.map((o, i) => <option key={i} value={o}>{o}</option>)}
            </select>
        ) : (
            <input type={type} name={name} value={value} onChange={onChange} readOnly={readOnly} className="w-full p-3.5 border border-slate-200 rounded-xl bg-slate-50 focus:bg-white focus:ring-2 focus:ring-slate-800 outline-none transition-all text-slate-700 text-sm readOnly:bg-slate-100 readOnly:text-slate-500 readOnly:focus:ring-0" required={req} />
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
                    Cámara
                    <input type="file" accept="image/*" capture="environment" className="hidden" onChange={(e) => onFotoChange(e, nameKey)} />
                </label>
                <label className="flex-1 text-center bg-slate-50 text-slate-700 py-3 rounded-xl border border-slate-200 cursor-pointer hover:bg-slate-100 hover:border-slate-300 text-sm font-medium transition-all shadow-sm">
                    Galería
                    <input type="file" accept="image/*" className="hidden" onChange={(e) => onFotoChange(e, nameKey)} />
                </label>
            </div>
        ) : (
            <div className="space-y-3">
                <div className="rounded-xl overflow-hidden border border-slate-200 bg-slate-100">
                    <img src={fotoValue} className="w-full h-48 object-cover opacity-90" alt={titulo} />
                </div>
                <div className="flex gap-3">
                    <label className="flex-1 text-center bg-slate-800 text-white py-2.5 rounded-xl cursor-pointer hover:bg-slate-900 text-xs font-bold tracking-widest transition-colors">
                        REPETIR
                        <input type="file" accept="image/*" capture="environment" className="hidden" onChange={(e) => onFotoChange(e, nameKey)} />
                    </label>
                    <button type="button" onClick={() => onRemove(nameKey)} className="flex-1 text-center bg-rose-50 text-rose-700 py-2.5 rounded-xl border border-rose-200 hover:bg-rose-100 text-xs font-bold tracking-widest transition-colors">
                        BORRAR
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
    const [registrosBD, setRegistrosBD] = useState([]);
    const [registrosFiltrados, setRegistrosFiltrados] = useState([]);
    const [cargando, setCargando] = useState(true);
    const [descargandoZip, setDescargandoZip] = useState(false);

    const [busquedaGlobal, setBusquedaGlobal] = useState("");
    const [fechaDesde, setFechaDesde] = useState("");
    const [fechaHasta, setFechaHasta] = useState("");
    const [vistaActiva, setVistaActiva] = useState("Todas");

    const cargarRecientes = async () => {
        setCargando(true);
        try {
            const supabase = getSupabase();
            const { data, error } = await supabase.from(SUPABASE_TABLE).select('*').order('fecha', { ascending: false }).limit(2000);
            if (error) throw error;
            setRegistrosBD(data || []);
        } catch (error) {
            console.error(error); alert("Error al cargar la base de datos.");
        } finally {
            setCargando(false);
        }
    };

    useEffect(() => {
        cargarRecientes();
    }, []);

    const buscarEnNube = async (e) => {
        e.preventDefault();
        setCargando(true);
        try {
            const supabase = getSupabase();
            const { data, error } = await supabase.from(SUPABASE_TABLE)
                .select('*')
                .gte('fecha', fechaDesde)
                .lte('fecha', fechaHasta)
                .order('fecha', { ascending: false });
            
            if (error) throw error;
            setRegistrosBD(data || []);
        } catch (error) {
            console.error(error); alert("Error al buscar en el archivo histórico de la nube.");
        } finally {
            setCargando(false);
        }
    };

    useEffect(() => {
        let resultado = registrosBD;

        if (vistaActiva !== "Todas") {
            resultado = resultado.filter(r => {
                const tipo = r.tipo_movimiento || "Instalación";
                return tipo === vistaActiva;
            });
        }

        if (busquedaGlobal.trim()) {
            const termino = busquedaGlobal.toLowerCase();
            resultado = resultado.filter(r => 
                (r.negocio && r.negocio.toLowerCase().includes(termino)) ||
                (r.cliente && r.cliente.toLowerCase().includes(termino)) ||
                (r.transportista && r.transportista.toLowerCase().includes(termino)) ||
                (r.placa && r.placa.toLowerCase().includes(termino)) ||
                (r.municipio && r.municipio.toLowerCase().includes(termino)) ||
                (r.departamento && r.departamento.toLowerCase().includes(termino)) ||
                (r.codigo && r.codigo.toLowerCase().includes(termino)) ||
                (r.telefono && r.telefono.toLowerCase().includes(termino)) ||
                (r.contrato && r.contrato.toLowerCase().includes(termino))
            );
        }

        setRegistrosFiltrados(resultado);
    }, [busquedaGlobal, registrosBD, vistaActiva]);

    const limpiarTodo = () => {
        setBusquedaGlobal(""); setFechaDesde(""); setFechaHasta(""); setVistaActiva("Todas");
        cargarRecientes();
    };

    const descargarExcelMaestro = () => {
        if (registrosFiltrados.length === 0) return alert("No hay registros en pantalla para descargar.");
        const wb = window.XLSX.utils.book_new();
        const datosMaestros = registrosFiltrados.map(r => ({
            "ID Registro": r.registro_id, 
            "Fecha": formatearFechaDisplay(r.fecha), 
            "Tipo Movimiento": r.tipo_movimiento || "Instalación",
            "Transportista": r.transportista,
            "Placa": r.placa, 
            "Negocio": r.negocio, 
            "Cliente": r.cliente, 
            "Teléfono": r.telefono,
            "Documento/Boleta": r.contrato, 
            "Código Equipo": r.codigo, 
            "Serie Equipo": r.serie,
            "Modelo Equipo": r.modelo, 
            "Tipo Equipo": r.tipo, 
            "Municipio": r.municipio,
            "Departamento": r.departamento,
            "GPS Exacto": r.ubicacion,
            "Latitud": r.latitud, 
            "Longitud": r.longitud, 
            "PDF": r.pdf_url,
            "IMAGEN": r.imagen_url, 
            "EXCEL INDIVIDUAL": r.excel_url
        }));
        const ws = window.XLSX.utils.json_to_sheet(datosMaestros);
        window.XLSX.utils.book_append_sheet(wb, ws, "Reporte Maestro");
        const sufijoTipo = vistaActiva === "Todas" ? "General" : vistaActiva;
        window.XLSX.writeFile(wb, `Reporte_${sufijoTipo}_${formatearFechaDisplay(fechaDesde) || 'Historico'}.xlsx`);
    };

    const descargarZip = async () => {
        if (registrosFiltrados.length === 0) return alert("No hay registros en pantalla para empaquetar.");
        setDescargandoZip(true);
        try {
            const zip = new window.JSZip();
            for (const reg of registrosFiltrados) {
                const idCorto = reg.registro_id.slice(0, 5);
                const tipo = reg.tipo_movimiento === "Retiro" ? "Retiro" : "Instalacion";
                const nombreCarpeta = `${tipo}_${reg.negocio}_${formatearFechaDisplay(reg.fecha)}_${idCorto}`.replace(/[^a-z0-9_]/gi, '_');
                const carpetaRegistro = zip.folder(nombreCarpeta);
                
                const agregarArchivo = async (url, nombre) => {
                    if (!url) return;
                    try {
                        const res = await fetch(url);
                        const blob = await res.blob();
                        carpetaRegistro.file(nombre, blob);
                    } catch (e) { console.error(e); }
                };
                await agregarArchivo(reg.pdf_url, `Reporte_${tipo}.pdf`);
                await agregarArchivo(reg.imagen_url, `Evidencia_${tipo}.jpg`);
                await agregarArchivo(reg.excel_url, `Datos_${tipo}.xlsx`);
            }
            const contenidoZip = await zip.generateAsync({ type: "blob" });
            const sufijoTipo = vistaActiva === "Todas" ? "Completos" : vistaActiva;
            window.saveAs(contenidoZip, `Archivos_ZIP_${sufijoTipo}_${formatearFechaDisplay(fechaDesde) || 'Historico'}.zip`);
        } catch (error) {
            console.error(error); alert("Hubo un problema al generar el archivo ZIP.");
        } finally {
            setDescargandoZip(false);
        }
    };

    return (
        <div className="bg-slate-50 min-h-screen font-sans flex flex-col">
            
            {/* CABECERA OSCURA TIPO SOFTWARE DE ESCRITORIO */}
            <header className="bg-slate-900 text-white w-full shadow-md py-4 px-6 md:px-8 flex justify-between items-center z-10 relative">
                <div>
                    <h1 className="text-2xl font-light tracking-tight mb-0.5 text-white">TRANSPORTES DEL SUR</h1>
                    <p className="text-slate-400 text-[10px] tracking-widest uppercase">Dashboard Administrativo</p>
                </div>
                <button onClick={onLogout} className="text-slate-300 hover:text-white hover:bg-slate-800 text-xs font-bold uppercase tracking-wider transition-all px-4 py-2 rounded-lg border border-slate-700">
                    Cerrar Sesión
                </button>
            </header>

            {/* CONTENEDOR PRINCIPAL */}
            <div className="max-w-[1600px] w-full mx-auto p-4 md:p-6 flex-1 flex flex-col">
                
                <div className="bg-white p-4 md:p-5 rounded-xl shadow-sm border border-slate-200 mb-5 mt-2">
                    
                    {/* CABECERA DE CONTROLES */}
                    <div className="flex flex-col xl:flex-row justify-between items-center gap-4 mb-4 border-b border-slate-100 pb-4">
                        <h2 className="text-xs font-bold text-slate-800 uppercase tracking-widest flex items-center gap-2">
                            <span className="text-amber-500 text-base">⚡</span> CONTROL DE BÚSQUEDA
                        </h2>
                        
                        <div className="bg-slate-100 p-1 rounded-lg inline-flex shadow-inner overflow-x-auto w-full xl:w-auto justify-start xl:justify-center">
                            <button type="button" onClick={() => setVistaActiva("Todas")} className={`flex-1 xl:flex-none px-5 py-2 rounded-md text-[10px] font-bold uppercase tracking-widest transition-all whitespace-nowrap ${vistaActiva === 'Todas' ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}>
                                Todas las Operaciones
                            </button>
                            <button type="button" onClick={() => setVistaActiva("Instalación")} className={`flex-1 xl:flex-none px-5 py-2 rounded-md text-[10px] font-bold uppercase tracking-widest transition-all whitespace-nowrap ${vistaActiva === 'Instalación' ? 'bg-indigo-600 text-white shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}>
                                Solo Instalaciones
                            </button>
                            <button type="button" onClick={() => setVistaActiva("Retiro")} className={`flex-1 xl:flex-none px-5 py-2 rounded-md text-[10px] font-bold uppercase tracking-widest transition-all whitespace-nowrap ${vistaActiva === 'Retiro' ? 'bg-rose-600 text-white shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}>
                                Solo Retiros
                            </button>
                        </div>

                        <button type="button" onClick={limpiarTodo} className="text-[11px] text-slate-400 hover:text-slate-800 transition-colors font-medium flex items-center gap-1">
                            ↻ Reiniciar Todo
                        </button>
                    </div>

                    {/* FILTROS EN REJILLA COMPACTA */}
                    <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-end">
                        <div className="lg:col-span-5">
                            <label className="block text-[9px] font-bold text-slate-400 mb-1.5 uppercase tracking-wider">1. Filtro Rápido en Pantalla</label>
                            <input type="text" placeholder="Busca por Cliente, Placa, Municipio..." value={busquedaGlobal} onChange={e => setBusquedaGlobal(e.target.value)} className="w-full p-2.5 border border-slate-200 rounded-lg text-sm text-slate-700 focus:ring-1 focus:ring-slate-800 outline-none transition-all shadow-inner bg-slate-50" />
                            <p className="text-[9px] text-slate-400 mt-1.5">Filtra instantáneamente sobre los resultados cargados abajo.</p>
                        </div>

                        <form onSubmit={buscarEnNube} className="lg:col-span-7 bg-slate-50 p-3 rounded-xl border border-slate-200 flex flex-col sm:flex-row gap-3 items-end">
                            <div className="w-full sm:w-auto mb-auto sm:mb-0 hidden sm:block">
                                <label className="block text-[9px] font-bold text-slate-400 mb-1 uppercase tracking-wider text-slate-700 whitespace-nowrap">2. Histórico Nube</label>
                            </div>
                            <div className="flex-1 w-full">
                                <label className="block text-[9px] font-semibold text-slate-500 mb-1 uppercase tracking-wider">Fecha Desde</label>
                                <input type="date" required value={fechaDesde} onChange={e => setFechaDesde(e.target.value)} className="w-full p-2 border border-slate-300 rounded-lg text-sm text-slate-700 focus:ring-1 focus:ring-slate-800 outline-none bg-white" />
                            </div>
                            <div className="flex-1 w-full">
                                <label className="block text-[9px] font-semibold text-slate-500 mb-1 uppercase tracking-wider">Fecha Hasta</label>
                                <input type="date" required value={fechaHasta} onChange={e => setFechaHasta(e.target.value)} className="w-full p-2 border border-slate-300 rounded-lg text-sm text-slate-700 focus:ring-1 focus:ring-slate-800 outline-none bg-white" />
                            </div>
                            <button type="submit" disabled={cargando} className="bg-slate-800 text-white px-5 py-2 rounded-lg text-[11px] font-bold tracking-widest uppercase hover:bg-slate-900 transition-colors shadow-sm w-full sm:w-auto h-[38px] whitespace-nowrap">
                                {cargando ? "⏳..." : "Buscar"}
                            </button>
                        </form>
                    </div>
                </div>

                {/* CABECERA DE LA TABLA + BOTONES DE DESCARGA */}
                <div className="flex flex-col md:flex-row justify-between items-end mb-3 gap-3">
                    <div className="flex items-center gap-2 px-1">
                        <span className="text-[11px] font-bold text-slate-500 uppercase tracking-widest bg-slate-200 px-2 py-1 rounded">
                            Resultados: {registrosFiltrados.length}
                        </span>
                        <span className="text-[10px] text-slate-400 uppercase tracking-wider">
                            ({vistaActiva})
                        </span>
                    </div>
                    
                    {registrosFiltrados.length > 0 && !cargando && (
                        <div className="flex gap-2 w-full md:w-auto">
                            <button onClick={descargarExcelMaestro} className="flex-1 md:flex-none px-4 py-2 text-[10px] font-bold tracking-wider uppercase text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 hover:border-slate-400 transition-all shadow-sm flex items-center justify-center gap-1.5">
                                <span className="text-emerald-600">📊</span> Descargar Excel
                            </button>
                            <button onClick={descargarZip} disabled={descargandoZip} className={`flex-1 md:flex-none px-4 py-2 text-[10px] font-bold tracking-wider uppercase bg-slate-900 text-white rounded-lg hover:bg-slate-800 transition-all shadow-sm flex items-center justify-center gap-1.5 ${descargandoZip ? 'opacity-50' : ''}`}>
                                <span className="text-amber-500">📦</span> {descargandoZip ? "Creando ZIP..." : `Descargar ZIP`}
                            </button>
                        </div>
                    )}
                </div>

                {/* TABLA CON ENCABEZADO OSCURO Y DIVISIONES */}
                <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden flex-1">
                    <div className="overflow-x-auto h-full">
                        <table className="w-full text-left border-collapse min-w-[1250px] border border-slate-200">
                            <thead>
                                <tr className="bg-slate-100 text-slate-700 text-[10px] uppercase tracking-widest border-b-2 border-slate-300">
                                    <th className="p-3 font-bold border-r border-slate-200 w-28">Movimiento</th>
                                    <th className="p-3 font-bold border-r border-slate-200">Negocio / Cliente</th>
                                    <th className="p-3 font-bold border-r border-slate-200">Transportista (Placa)</th>
                                    <th className="p-3 font-bold border-r border-slate-200">Eq. Código / Detalle</th>
                                    <th className="p-3 font-bold border-r border-slate-200">Depto / Municipio</th>
                                    <th className="p-3 font-bold text-center w-36">Acciones</th>
                                </tr>
                            </thead>
                            <tbody>
                                {cargando ? (
                                    <tr><td colSpan="6" className="p-12 text-center text-slate-500 text-sm font-medium border-t border-slate-200"><div className="animate-pulse">Sincronizando base de datos...</div></td></tr>
                                ) : registrosFiltrados.length === 0 ? (
                                    <tr><td colSpan="6" className="p-12 text-center text-slate-400 text-sm border-t border-slate-200">No hay registros en esta vista.</td></tr>
                                ) : (
                                    registrosFiltrados.map((reg) => {
                                        const tipoMov = reg.tipo_movimiento || "Instalación";
                                        return (
                                            <tr key={reg.registro_id} className="hover:bg-slate-50 transition-colors text-sm text-slate-600 border-b border-slate-200 last:border-b-0">
                                                <td className="p-3 border-r border-slate-200">
                                                    <p className="font-medium text-slate-900 text-xs mb-1.5">{formatearFechaDisplay(reg.fecha)}</p>
                                                    <span className={`px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider rounded-md border ${tipoMov === 'Retiro' ? 'bg-rose-50 text-rose-600 border-rose-200' : 'bg-indigo-50 text-indigo-600 border-indigo-200'}`}>
                                                        {tipoMov}
                                                    </span>
                                                </td>
                                                <td className="p-3 border-r border-slate-200">
                                                    <p className="font-semibold text-slate-900 text-xs">{reg.negocio}</p>
                                                    <p className="text-[11px] text-slate-500 mt-0.5">{reg.cliente} <span className="text-slate-300 mx-1">|</span> {reg.telefono}</p>
                                                </td>
                                                <td className="p-3 border-r border-slate-200">
                                                    <p className="font-medium text-slate-800 text-xs">{reg.transportista}</p>
                                                    <p className="text-[11px] text-slate-500 mt-0.5">{reg.placa}</p>
                                                </td>
                                                <td className="p-3 border-r border-slate-200">
                                                    <p className="font-mono text-[10px] bg-slate-100 px-1.5 py-0.5 rounded text-slate-700 inline-block mb-1 border border-slate-200">{reg.codigo}</p>
                                                    <p className="text-[11px] text-slate-500">{reg.modelo} ({reg.tipo})</p>
                                                </td>
                                                <td className="p-3 border-r border-slate-200">
                                                    <p className="font-medium text-slate-800 text-xs">{reg.departamento || "N/A"}</p>
                                                    <p className="text-[11px] text-slate-500 mt-0.5">{reg.municipio || "N/A"}</p>
                                                </td>
                                                <td className="p-3 flex justify-center gap-1.5 h-full items-center">
                                                    {reg.pdf_url ? <a href={reg.pdf_url} target="_blank" rel="noreferrer" className="text-slate-500 border border-slate-200 hover:text-slate-900 hover:bg-slate-100 px-2 py-1 rounded-md text-[9px] font-bold tracking-widest uppercase transition-all shadow-sm">PDF</a> : null}
                                                    {reg.excel_url ? <a href={reg.excel_url} target="_blank" rel="noreferrer" className="text-slate-500 border border-slate-200 hover:text-slate-900 hover:bg-slate-100 px-2 py-1 rounded-md text-[9px] font-bold tracking-widest uppercase transition-all shadow-sm">XLS</a> : null}
                                                    {reg.imagen_url ? <a href={reg.imagen_url} target="_blank" rel="noreferrer" className="text-slate-500 border border-slate-200 hover:text-slate-900 hover:bg-slate-100 px-2 py-1 rounded-md text-[9px] font-bold tracking-widest uppercase transition-all shadow-sm">IMG</a> : null}
                                                </td>
                                            </tr>
                                        );
                                    })
                                )}
                            </tbody>
                        </table>
                    </div>
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
        
        const etiquetas_fotos = getPhotoLabels(formData.tipo_movimiento);
        Object.keys(etiquetas_fotos).forEach((key) => { if (!fotos[key]) nextErrors[`foto_${key}`] = "Falta evidencia."; });
        
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
                
                const headerMovimiento = `TIPO: ${formData.tipo_movimiento.toUpperCase()}`;
                const rows = [headerMovimiento, `NEGOCIO: ${datos.negocio}`, `FECHA: ${datos.fecha}`, `HORA: ${datos.hora}`, `MUNICIPIO: ${datos.municipio}`, `DEPTO: ${datos.departamento}`, `GPS: ${datos.lat}, ${datos.lon}`].map(row => fitTextSingleLine(ctx, row, Math.round(canvas.width * 0.55)));
                
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
            const coords = gpsInfo.lat ? `${gpsInfo.lat}, ${gpsInfo.lon}` : "SIN UBICACIÓN";
            const final = await estamparDatosEnImagen(imgComp, { 
                negocio: formData.negocio?.trim() || "NEGOCIO", 
                fecha: formatearFechaDisplay(formData.fecha) || "Sin Fecha", 
                hora, 
                municipio: formData.municipio || "N/A",
                departamento: formData.departamento || "N/A",
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
        setObteniendoGPS(true); 
        setFormData(prev => ({ ...prev, ubicacion: "Obteniendo datos satelitales...", municipio: "", departamento: "" })); 
        setErrors(prev => ({ ...prev, ubicacion: "" }));
        
        navigator.geolocation.getCurrentPosition(
            async (pos) => {
                const lat = pos.coords.latitude; const lon = pos.coords.longitude; 
                const textoCoords = `${lat}, ${lon}`;
                let muni = ""; let depto = "";
                
                try {
                    const res = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lon}`);
                    const data = await res.json();
                    if (data?.address) {
                        muni = data.address.city || data.address.town || data.address.village || "";
                        depto = data.address.state || "";
                    }
                } catch (e) {}
                
                setGpsInfo({ lat: `${lat}`, lon: `${lon}`, direccion: textoCoords }); 
                setFormData(prev => ({ ...prev, ubicacion: textoCoords, municipio: muni, departamento: depto })); 
                setObteniendoGPS(false);
            },
            () => { alert("Activa el GPS en modo Alta Precisión."); setFormData(prev => ({ ...prev, ubicacion: "", municipio: "", departamento: "" })); setGpsInfo({ lat: "", lon: "", direccion: "" }); setObteniendoGPS(false); },
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
        const prefix = formData.tipo_movimiento === "Retiro" ? "Retiro" : "Instalacion";
        const pName = `Reporte_${prefix}_${sNeg}_${sFec}.pdf`; const xName = `Datos_${prefix}_${sNeg}_${sFec}.xlsx`; const iName = `Evidencia_${prefix}_${sNeg}_${sFec}.jpg`;

        try {
            const area = document.getElementById("molde-imagen-whatsapp");
            const canvas = await window.html2canvas(area, { scale: 3, useCORS: true, backgroundColor: "#ffffff" });
            const imageBlob = await new Promise(r => canvas.toBlob(r, "image/jpeg", 0.88));

            const doc = new window.jspdf.jsPDF(); doc.setFontSize(18); doc.text(`Reporte de ${formData.tipo_movimiento}`, 15, 20); doc.setFontSize(12);
            
            const dataParaPDF = Object.entries(formData).map(([k, v]) => [k.toUpperCase(), k === 'fecha' ? formatearFechaDisplay(v) : String(v || "")]);
            doc.autoTable({ startY: 30, head: [["Campo", "Información"]], body: dataParaPDF });
            
            const etiquetas_fotos = getPhotoLabels(formData.tipo_movimiento);
            for (const [k, b64] of Object.entries(fotos)) {
                if (!b64) continue; doc.addPage(); doc.text(`Evidencia: ${etiquetas_fotos[k] || k}`, 15, 20);
                const props = doc.getImageProperties(b64); const w = doc.internal.pageSize.getWidth(); const h = doc.internal.pageSize.getHeight();
                let fw = w - 30; let fh = (props.height * fw) / props.width;
                if (fh > h - 45) { fh = h - 45; fw = (props.width * fh) / props.height; }
                doc.addImage(b64, "JPEG", (w - fw) / 2, 30, fw, fh);
            }
            const pdfBlob = doc.output("blob");

            const wb = window.XLSX.utils.book_new();
            const registroParaExcel = { ...formData, fecha: formatearFechaDisplay(formData.fecha) };
            window.XLSX.utils.book_append_sheet(wb, window.XLSX.utils.json_to_sheet([registroParaExcel]), "Registro");
            window.XLSX.utils.book_append_sheet(wb, window.XLSX.utils.json_to_sheet(Object.entries(etiquetas_fotos).map(([k, l]) => ({ Evidencia: l, Estado: fotos[k] ? "Adjunta" : "Pendiente" }))), "Evidencias");
            const xlsxBlob = new Blob([window.XLSX.write(wb, { bookType: "xlsx", type: "array" })], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });

            const [p, x, i] = await Promise.all([
                uploadBlobToSupabase(pdfBlob, `Pdfs/${pName}`, "application/pdf"),
                uploadBlobToSupabase(xlsxBlob, `Excel/${xName}`, "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"),
                uploadBlobToSupabase(imageBlob, `Imagenes/${iName}`, "image/jpeg")
            ]);

            const { error: insErr } = await getSupabase().from(SUPABASE_TABLE).insert([{
                registro_id: regId, fecha: formData.fecha, tipo_movimiento: formData.tipo_movimiento,
                negocio: formData.negocio, cliente: formData.cliente,
                transportista: formData.transportista, placa: formData.placa, contrato: formData.contrato,
                codigo: formData.codigo, serie: formData.serie, modelo: formData.modelo, tipo: formData.tipo,
                telefono: formData.telefono, ubicacion: formData.ubicacion, 
                municipio: formData.municipio, departamento: formData.departamento,
                latitud: gpsInfo.lat, longitud: gpsInfo.lon,
                pdf_url: p.publicUrl, excel_url: x.publicUrl, imagen_url: i.publicUrl, pdf_path: p.path, excel_path: x.path, imagen_path: i.path
            }]);
            if (insErr) throw insErr;

            // ===============================================
            // INYECCIÓN DE WHATSAPP AUTOMÁTICO
            // ===============================================
            
            // Construimos la ubicación completa si existe el municipio
            const ubicacionParaWhatsApp = formData.municipio 
                ? `${formData.municipio}, ${formData.departamento} (${formData.ubicacion})`
                : formData.ubicacion;

            // Creamos el mensaje con la estructura idéntica a tu foto de referencia
            const mensajeWhatsApp = `*${formData.tipo_movimiento} de equipo frío*
*Contrato/Orden:* ${formData.contrato}

*Cliente:* ${formData.cliente}
*Encargado:* ${formData.transportista}
*Nombre del Negocio:* ${formData.negocio}

*Dirección:* ${ubicacionParaWhatsApp}

*Tel:* ${formData.telefono}

*Modelo:* ${formData.modelo}
*Serie:* ${formData.serie}
*Código:* ${formData.codigo}

📄 *Ver PDF:*
${p.publicUrl}

📊 *Ver Excel:*
${x.publicUrl}

🖼️ *Ver Imagen Resumen:*
${i.publicUrl}`;

            // Abrimos WhatsApp con el mensaje codificado
            window.open(`https://api.whatsapp.com/send?text=${encodeURIComponent(mensajeWhatsApp)}`, '_blank');
            
            // ===============================================

            skipDraftSaveRef.current = true; clearDraft(); resetForm();
            setTimeout(() => { skipDraftSaveRef.current = false; }, 0);
            alert(`¡Éxito! Reporte de ${formData.tipo_movimiento} guardado en la nube.`);
        } catch (e) { console.error(e); alert("Error al guardar en la nube."); } finally { setGenerando(false); }
    };

    const etiquetasActuales = getPhotoLabels(formData.tipo_movimiento);

    return (
        <div className="bg-slate-100 min-h-screen font-sans">
            <div id="molde-imagen-whatsapp" className="fixed top-0 left-[-9999px] bg-white p-10 w-[1200px]">
                <div className="bg-slate-900 text-white p-6 text-center rounded-xl mb-8"><h2 className="text-4xl font-bold mb-2">Transportes Del Sur</h2><p className="text-xl font-light tracking-widest uppercase">Reporte de {formData.tipo_movimiento}</p></div>
                <div className="grid grid-cols-2 gap-6 mb-8 bg-slate-50 p-6 rounded-xl border-2 border-slate-200 text-xl text-slate-700">
                    <p><span className="font-bold text-slate-900">Fecha:</span> {formatearFechaDisplay(formData.fecha)}</p><p><span className="font-bold text-slate-900">Transportista:</span> {formData.transportista}</p>
                    <p><span className="font-bold text-slate-900">Placa:</span> {formData.placa}</p><p><span className="font-bold text-slate-900">Negocio:</span> {formData.negocio}</p>
                    <p><span className="font-bold text-slate-900">Cliente:</span> {formData.cliente}</p><p><span className="font-bold text-slate-900">Teléfono:</span> {formData.telefono}</p>
                    <p><span className="font-bold text-slate-900">Municipio:</span> {formData.municipio || "N/A"}</p><p><span className="font-bold text-slate-900">Depto:</span> {formData.departamento || "N/A"}</p>
                    <p className="col-span-2"><span className="font-bold text-slate-900">GPS Exacto:</span> {formData.ubicacion}</p>
                    <p><span className="font-bold text-slate-900">Contrato/Orden:</span> {formData.contrato}</p><p><span className="font-bold text-slate-900">Código Eq:</span> {formData.codigo}</p>
                    <p><span className="font-bold text-slate-900">Serie Eq:</span> {formData.serie}</p><p><span className="font-bold text-slate-900">Modelo Eq:</span> {formData.modelo} ({formData.tipo})</p>
                </div>
                <div className="grid grid-cols-2 gap-6">
                    {Object.entries(etiquetasActuales).map(([k, t]) => fotos[k] && (<div key={k} className="border-2 border-slate-200 p-6 rounded-xl text-center bg-white"><p className="font-bold text-slate-800 mb-4 text-2xl uppercase">{t}</p><img src={fotos[k]} className="w-full h-[500px] object-cover rounded-lg" alt={t} /></div>))}
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

                    <div className="bg-slate-50 p-3 rounded-2xl flex gap-2 border border-slate-200 shadow-inner">
                        <label className={`flex-1 text-center py-3 rounded-xl text-xs font-bold uppercase tracking-wider cursor-pointer transition-all ${formData.tipo_movimiento === 'Instalación' ? 'bg-indigo-600 text-white shadow-md' : 'text-slate-500 hover:bg-slate-200'}`}>
                            <input type="radio" name="tipo_movimiento" value="Instalación" checked={formData.tipo_movimiento === 'Instalación'} onChange={handleChange} className="hidden" />
                            Instalación
                        </label>
                        <label className={`flex-1 text-center py-3 rounded-xl text-xs font-bold uppercase tracking-wider cursor-pointer transition-all ${formData.tipo_movimiento === 'Retiro' ? 'bg-rose-600 text-white shadow-md' : 'text-slate-500 hover:bg-slate-200'}`}>
                            <input type="radio" name="tipo_movimiento" value="Retiro" checked={formData.tipo_movimiento === 'Retiro'} onChange={handleChange} className="hidden" />
                            Retiro
                        </label>
                    </div>
                    
                    <div>
                        <h3 className="text-sm font-bold text-slate-800 mb-4 uppercase tracking-widest flex items-center gap-2"><span className="bg-slate-200 w-6 h-6 rounded-full flex items-center justify-center text-slate-600 text-xs">1</span> Transporte</h3>
                        <InputForm label="Fecha" type="date" name="fecha" value={formData.fecha} onChange={handleChange} error={errors.fecha} />
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
                            <div className="flex gap-2 mb-2">
                                <button type="button" onClick={obtenerUbicacion} disabled={obteniendoGPS} className={`w-full py-3 text-sm font-bold tracking-widest uppercase rounded-xl shadow-sm transition-colors flex items-center justify-center gap-2 ${obteniendoGPS ? "bg-slate-200 text-slate-400" : "bg-slate-800 text-white hover:bg-slate-900"}`}>
                                    📍 Obtener Coordenadas
                                </button>
                            </div>
                            <div className="grid grid-cols-2 gap-3 mb-3">
                                <InputForm label="Municipio" name="municipio" value={formData.municipio} onChange={handleChange} readOnly={true} req={false} />
                                <InputForm label="Departamento" name="departamento" value={formData.departamento} onChange={handleChange} readOnly={true} req={false} />
                            </div>
                            <textarea name="ubicacion" value={formData.ubicacion} readOnly placeholder="Coordenadas exactas..." className="w-full p-3 border border-slate-200 rounded-xl bg-slate-50 text-xs h-14 resize-none text-slate-500 focus:outline-none"></textarea>
                            {errors.ubicacion && <p className="text-xs text-rose-500 mt-1.5 font-medium">{errors.ubicacion}</p>}
                        </div>
                        <InputForm label={formData.tipo_movimiento === 'Retiro' ? 'No. Boleta / Orden' : 'Número de Contrato'} name="contrato" value={formData.contrato} onChange={handleChange} error={errors.contrato} />
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
                        <EvidenciaInput titulo={etiquetasActuales.fachada} nameKey="fachada" fotoValue={fotos.fachada} onFotoChange={handleFoto} onRemove={quitarFoto} error={errors.foto_fachada} />
                        <EvidenciaInput titulo={etiquetasActuales.contrato} nameKey="contrato" fotoValue={fotos.contrato} onFotoChange={handleFoto} onRemove={quitarFoto} error={errors.foto_contrato} />
                        <EvidenciaInput titulo={etiquetasActuales.etiqueta} nameKey="etiqueta" fotoValue={fotos.etiqueta} onFotoChange={handleFoto} onRemove={quitarFoto} error={errors.foto_etiqueta} />
                        <EvidenciaInput titulo={etiquetasActuales.equipo} nameKey="equipo" fotoValue={fotos.equipo} onFotoChange={handleFoto} onRemove={quitarFoto} error={errors.foto_equipo} />
                    </div>

                    <button type="submit" disabled={generando} className={`w-full ${generando ? "bg-slate-400" : formData.tipo_movimiento === 'Retiro' ? "bg-rose-700 hover:bg-rose-800" : "bg-indigo-700 hover:bg-indigo-800"} text-white font-bold tracking-widest py-5 rounded-2xl shadow-xl transition-all text-sm uppercase`}>
                        {generando ? "Procesando Archivos..." : `Registrar ${formData.tipo_movimiento}`}
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
                            <input type="text" value={username} onChange={e => setUsername(e.target.value)} className="w-full p-4 border border-slate-200 rounded-2xl bg-slate-50 focus:bg-white focus:ring-2 focus:ring-slate-800 outline-none transition-all text-slate-800" required />
                        </div>
                        <div>
                            <label className="block text-xs font-semibold text-slate-500 mb-2 uppercase tracking-wide">Contraseña</label>
                            <input type="password" value={password} onChange={e => setPassword(e.target.value)} className="w-full p-4 border border-slate-200 rounded-2xl bg-slate-50 focus:bg-white focus:ring-2 focus:ring-slate-800 outline-none transition-all text-slate-800" required />
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
