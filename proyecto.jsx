const { useState, useEffect, useRef } = React;

const STORAGE_KEY = "transportes_del_sur_borrador_v4";
const SUPABASE_BUCKET = "Instalaciones";
const SUPABASE_TABLE = "instalaciones";

const INITIAL_FORM = {
    fecha: "",
    transportista: "",
    placa: "",
    negocio: "",
    cliente: "",
    telefono: "",
    ubicacion: "",
    contrato: "",
    codigo: "",
    serie: "",
    modelo: "",
    tipo: ""
};

const PHOTO_LABELS = {
    fachada: "Fachada del negocio",
    contrato: "Contrato firmado",
    etiqueta: "Etiqueta del equipo",
    equipo: "Equipo instalado"
};

const getSupabase = () => {
    if (!window.supabaseClient) {
        throw new Error("Supabase no está inicializado. Revisa supabase.js.");
    }
    return window.supabaseClient;
};


// ==========================================
// 1. COMPONENTE: PANEL DE ADMINISTRADOR (NUEVO)
// ==========================================
const PanelAdmin = ({ onLogout }) => {
    const [registros, setRegistros] = useState([]);
    const [fechaDesde, setFechaDesde] = useState("");
    const [fechaHasta, setFechaHasta] = useState("");
    const [cargando, setCargando] = useState(false);
    const [descargandoZip, setDescargandoZip] = useState(false);

    // Buscar registros en la nube según las fechas
    const buscarRegistros = async (e) => {
        e.preventDefault();
        setCargando(true);
        try {
            const supabase = getSupabase();
            let query = supabase.from(SUPABASE_TABLE).select('*');

            if (fechaDesde) query = query.gte('fecha', fechaDesde);
            if (fechaHasta) query = query.lte('fecha', fechaHasta);

            // Ordenar por fecha más reciente
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

    // Generar el Excel Maestro
    const descargarExcelMaestro = () => {
        if (registros.length === 0) {
            alert("No hay registros para descargar.");
            return;
        }

        const wb = window.XLSX.utils.book_new();
        
        // Mapeamos los datos de Supabase a columnas limpias para el cliente
        const datosMaestros = registros.map(r => ({
            "ID Registro": r.registro_id,
            "Fecha": r.fecha,
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
        
        const nombreArchivo = `Reporte_TransportesDelSur_${fechaDesde || 'Todo'}_a_${fechaHasta || 'Todo'}.xlsx`;
        window.XLSX.writeFile(wb, nombreArchivo);
    };

    // Generar y empaquetar todo en un ZIP
    const descargarZip = async () => {
        if (registros.length === 0) {
            alert("No hay registros para empaquetar en ZIP.");
            return;
        }

        setDescargandoZip(true);
        try {
            const zip = new window.JSZip();

            for (const reg of registros) {
                // Crea una carpeta por cada cliente dentro del ZIP
                const idCorto = reg.registro_id.slice(0, 5);
                const nombreCarpeta = `Instalacion_${reg.negocio}_${reg.fecha}_${idCorto}`.replace(/[^a-z0-9_]/gi, '_');
                const carpetaRegistro = zip.folder(nombreCarpeta);

                // Función auxiliar para descargar los archivos de Supabase a la memoria RAM
                const agregarArchivo = async (url, nombre) => {
                    if (!url) return;
                    try {
                        const res = await fetch(url);
                        const blob = await res.blob();
                        carpetaRegistro.file(nombre, blob);
                    } catch (e) {
                        console.error(`No se pudo descargar ${url}`, e);
                    }
                };

                await agregarArchivo(reg.pdf_url, `Reporte_${reg.negocio}.pdf`);
                await agregarArchivo(reg.imagen_url, `Evidencia_${reg.negocio}.jpg`);
                await agregarArchivo(reg.excel_url, `Datos_${reg.negocio}.xlsx`);
            }

            const contenidoZip = await zip.generateAsync({ type: "blob" });
            const nombreZip = `Archivos_Completos_${fechaDesde || 'Todo'}.zip`;
            window.saveAs(contenidoZip, nombreZip);
            
        } catch (error) {
            console.error("Error al generar ZIP", error);
            alert("Hubo un problema al generar el archivo ZIP. Revisa la consola.");
        } finally {
            setDescargandoZip(false);
        }
    };

    return (
        <div className="max-w-6xl mx-auto p-4 md:p-6 bg-white min-h-screen">
            <header className="flex flex-col md:flex-row justify-between items-center bg-blue-900 text-white p-6 rounded-xl mb-6 shadow-lg gap-4">
                <div className="text-center md:text-left">
                    <h1 className="text-2xl font-bold uppercase">Reporte Dinámico Ordenes de Servicio</h1>
                    <p className="text-sm text-blue-200">Panel de Administración - Transportes Del Sur</p>
                </div>
                <button onClick={onLogout} className="bg-red-600 hover:bg-red-700 px-6 py-2 rounded-lg text-sm font-bold shadow-md transition-colors w-full md:w-auto">
                    Cerrar Sesión
                </button>
            </header>

            <div className="bg-gray-50 p-6 rounded-xl border border-gray-200 shadow-sm mb-6">
                <h2 className="text-lg font-bold text-gray-700 mb-4 border-b pb-2">Filtros de Búsqueda</h2>
                <form onSubmit={buscarRegistros} className="flex flex-wrap gap-4 items-end">
                    <div className="flex-1 min-w-[200px]">
                        <label className="block text-sm font-bold text-gray-600 mb-1">Fecha Desde *</label>
                        <input type="date" value={fechaDesde} onChange={e => setFechaDesde(e.target.value)} className="w-full p-3 border rounded-lg bg-white shadow-inner focus:ring-2 focus:ring-blue-500 outline-none" />
                    </div>
                    <div className="flex-1 min-w-[200px]">
                        <label className="block text-sm font-bold text-gray-600 mb-1">Fecha Hasta *</label>
                        <input type="date" value={fechaHasta} onChange={e => setFechaHasta(e.target.value)} className="w-full p-3 border rounded-lg bg-white shadow-inner focus:ring-2 focus:ring-blue-500 outline-none" />
                    </div>
                    <button type="submit" disabled={cargando} className="bg-blue-800 text-white px-8 py-3 rounded-lg font-bold shadow-md hover:bg-blue-900 w-full md:w-auto min-w-[150px] transition-colors">
                        {cargando ? "Buscando..." : "Buscar"}
                    </button>
                </form>
            </div>

            {registros.length > 0 && (
                <div className="flex flex-col md:flex-row gap-4 mb-6">
                    <button onClick={descargarExcelMaestro} className="flex-1 bg-green-600 text-white font-bold py-4 rounded-xl shadow-md hover:bg-green-700 transition transform hover:-translate-y-1">
                        📊 Descargar Excel Maestro (Todas las columnas)
                    </button>
                    <button onClick={descargarZip} disabled={descargandoZip} className={`flex-1 ${descargandoZip ? 'bg-orange-400' : 'bg-orange-600 hover:bg-orange-700'} text-white font-bold py-4 rounded-xl shadow-md transition transform hover:-translate-y-1`}>
                        {descargandoZip ? "Empaquetando archivos... (Espera)" : "📦 Descargar TODO en ZIP (PDFs e Imágenes)"}
                    </button>
                </div>
            )}

            <div className="bg-white rounded-xl shadow-md border border-gray-200 overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse min-w-[900px]">
                        <thead>
                            <tr className="bg-gray-100 text-gray-700 border-b-2 border-gray-200 text-sm uppercase tracking-wider">
                                <th className="p-4 font-bold">Fecha</th>
                                <th className="p-4 font-bold">Negocio</th>
                                <th className="p-4 font-bold">Cliente</th>
                                <th className="p-4 font-bold">Transportista</th>
                                <th className="p-4 font-bold">Ubicación GPS</th>
                                <th className="p-4 font-bold text-center">Ver Archivos</th>
                            </tr>
                        </thead>
                        <tbody>
                            {registros.length === 0 ? (
                                <tr>
                                    <td colSpan="6" className="p-12 text-center text-gray-500 text-lg">
                                        No hay registros en pantalla. Usa el filtro de arriba para buscar instalaciones.
                                    </td>
                                </tr>
                            ) : (
                                registros.map((reg) => (
                                    <tr key={reg.registro_id} className="border-b border-gray-100 hover:bg-blue-50 transition-colors text-sm">
                                        <td className="p-4 text-gray-600">{reg.fecha}</td>
                                        <td className="p-4 font-bold text-blue-900">{reg.negocio}</td>
                                        <td className="p-4 text-gray-700">{reg.cliente}</td>
                                        <td className="p-4 text-gray-600"><span className="bg-gray-200 px-2 py-1 rounded text-xs">{reg.transportista}</span></td>
                                        <td className="p-4 text-gray-500 text-xs max-w-[200px] truncate" title={reg.ubicacion}>{reg.ubicacion}</td>
                                        <td className="p-4 flex justify-center gap-2">
                                            {reg.pdf_url ? <a href={reg.pdf_url} target="_blank" rel="noreferrer" className="bg-red-100 text-red-700 px-3 py-1.5 rounded shadow-sm text-xs font-bold hover:bg-red-200 transition">PDF</a> : <span className="text-gray-300 text-xs">-</span>}
                                            {reg.excel_url ? <a href={reg.excel_url} target="_blank" rel="noreferrer" className="bg-green-100 text-green-700 px-3 py-1.5 rounded shadow-sm text-xs font-bold hover:bg-green-200 transition">XLS</a> : <span className="text-gray-300 text-xs">-</span>}
                                            {reg.imagen_url ? <a href={reg.imagen_url} target="_blank" rel="noreferrer" className="bg-blue-100 text-blue-700 px-3 py-1.5 rounded shadow-sm text-xs font-bold hover:bg-blue-200 transition">FOTO</a> : <span className="text-gray-300 text-xs">-</span>}
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
// 2. COMPONENTE: VISTA TECNICO (TU FORMULARIO ORIGINAL INTACTO)
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
        fetch("products.json")
            .then(res => res.json())
            .then(data => setOpciones(data))
            .catch(err => console.error("Error al cargar JSON", err));
    }, []);

    useEffect(() => {
        try {
            const saved = localStorage.getItem(STORAGE_KEY);
            if (!saved) return;
            const parsed = JSON.parse(saved);
            if (parsed?.formData) setFormData(prev => ({ ...prev, ...parsed.formData }));
            if (parsed?.fotos) setFotos(parsed.fotos);
            if (parsed?.gpsInfo) setGpsInfo(prev => ({ ...prev, ...parsed.gpsInfo }));
        } catch (error) {
            console.error("No se pudo cargar el borrador", error);
        }
    }, []);

    useEffect(() => {
        if (skipDraftSaveRef.current) return;
        try {
            localStorage.setItem(STORAGE_KEY, JSON.stringify({ formData, fotos, gpsInfo }));
        } catch (error) {
            console.error("No se pudo guardar el borrador", error);
        }
    }, [formData, fotos, gpsInfo]);

    const resetForm = () => {
        setFormData(INITIAL_FORM);
        setFotos({});
        setGpsInfo({ lat: "", lon: "", direccion: "" });
        setErrors({});
        setObteniendoGPS(false);
    };

    const clearDraft = () => {
        try {
            localStorage.removeItem(STORAGE_KEY);
        } catch (error) {
            console.error("No se pudo limpiar el borrador", error);
        }
    };

    const sanitizeFileName = (value) => {
        return String(value || "registro")
            .trim()
            .replace(/[\\/:*?"<>|]/g, "-")
            .replace(/\s+/g, "_")
            .slice(0, 80) || "registro";
    };

    const buildRegistroId = () => {
        if (window.crypto && typeof window.crypto.randomUUID === "function") {
            return window.crypto.randomUUID();
        }
        return `reg_${Date.now()}_${Math.random().toString(16).slice(2)}`;
    };

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
        setErrors(prev => ({ ...prev, [name]: "" }));
    };

    const validarFormulario = () => {
        const nextErrors = {};
        const requiredFields = [
            "fecha", "transportista", "placa", "negocio", "cliente",
            "telefono", "ubicacion", "contrato", "codigo", "serie",
            "modelo", "tipo"
        ];

        requiredFields.forEach((field) => {
            if (!String(formData[field] || "").trim()) {
                nextErrors[field] = "Este campo es obligatorio.";
            }
        });

        const soloDigitos = String(formData.telefono || "").replace(/\D/g, "");
        if (formData.telefono && soloDigitos.length < 8) {
            nextErrors.telefono = "El teléfono debe tener al menos 8 dígitos.";
        }

        if (formData.fecha) {
            const fechaValida = !Number.isNaN(new Date(formData.fecha).getTime());
            if (!fechaValida) nextErrors.fecha = "La fecha no es válida.";
        }

        if (formData.ubicacion && /obteniendo datos satelitales/i.test(String(formData.ubicacion))) {
            nextErrors.ubicacion = "Aún se está obteniendo la ubicación.";
        }

        Object.keys(PHOTO_LABELS).forEach((key) => {
            if (!fotos[key]) nextErrors[`foto_${key}`] = "Debes adjuntar esta fotografía.";
        });

        return nextErrors;
    };

    const comprimirImagen = (file) => {
        return new Promise((resolve, reject) => {
            const objectUrl = URL.createObjectURL(file);
            const img = new Image();
            img.onload = () => {
                URL.revokeObjectURL(objectUrl);
                const canvas = document.createElement("canvas");
                const MAX_WIDTH = 1200;
                let scaleSize = 1;
                if (img.width > MAX_WIDTH) scaleSize = MAX_WIDTH / img.width;
                canvas.width = Math.round(img.width * scaleSize);
                canvas.height = Math.round(img.height * scaleSize);
                const ctx = canvas.getContext("2d");
                ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
                const compressedDataUrl = canvas.toDataURL("image/jpeg", 0.85);
                resolve(compressedDataUrl);
            };
            img.onerror = () => {
                URL.revokeObjectURL(objectUrl);
                reject(new Error("No se pudo leer la imagen."));
            };
            img.src = objectUrl;
        });
    };

    const formatearFechaHora = (date = new Date()) => {
        const fecha = new Intl.DateTimeFormat("es-GT", { day: "2-digit", month: "2-digit", year: "numeric" }).format(date);
        const hora = new Intl.DateTimeFormat("es-GT", { hour: "2-digit", minute: "2-digit", second: "2-digit", hour12: false }).format(date);
        return { fecha, hora };
    };

    const fitTextSingleLine = (ctx, text, maxWidth) => {
        const value = String(text || "");
        if (ctx.measureText(value).width <= maxWidth) return value;
        const ellipsis = "…";
        let low = 0; let high = value.length; let best = ellipsis;
        while (low <= high) {
            const mid = Math.floor((low + high) / 2);
            const candidate = value.slice(0, mid).trimEnd() + ellipsis;
            if (ctx.measureText(candidate).width <= maxWidth) { best = candidate; low = mid + 1; } 
            else { high = mid - 1; }
        }
        return best;
    };

    const estamparDatosEnImagen = (base64, datos) => {
        return new Promise((resolve, reject) => {
            const img = new Image();
            img.crossOrigin = "anonymous";
            img.onload = () => {
                const canvas = document.createElement("canvas");
                canvas.width = img.width;
                canvas.height = img.height;
                const ctx = canvas.getContext("2d");
                ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

                const margin = Math.max(20, Math.round(canvas.width * 0.02));
                const fontSize = Math.max(14, Math.round(canvas.width * 0.013));
                const lineHeight = Math.round(fontSize * 1.45);

                ctx.font = `bold ${fontSize}px Arial`;
                ctx.textBaseline = "top";
                ctx.textAlign = "right";
                ctx.fillStyle = "#FFFFFF";
                ctx.strokeStyle = "rgba(0,0,0,0.75)";
                ctx.lineWidth = Math.max(2, Math.round(fontSize * 0.15));
                ctx.shadowColor = "rgba(0,0,0,0.45)";
                ctx.shadowBlur = 4;
                ctx.shadowOffsetX = 1;
                ctx.shadowOffsetY = 1;

                const rows = [
                    `NEGOCIO: ${datos.negocio}`,
                    `FECHA: ${datos.fecha}`,
                    `HORA: ${datos.hora}`,
                    `DIRECCIÓN: ${datos.direccion}`,
                    `GPS: ${datos.lat}, ${datos.lon}`
                ].map(row => fitTextSingleLine(ctx, row, Math.round(canvas.width * 0.55)));

                const totalHeight = rows.length * lineHeight;
                let y = canvas.height - margin - totalHeight;
                const x = canvas.width - margin;

                rows.forEach((linea) => {
                    ctx.strokeText(linea, x, y);
                    ctx.fillText(linea, x, y);
                    y += lineHeight;
                });

                resolve(canvas.toDataURL("image/jpeg", 0.88));
            };
            img.onerror = reject;
            img.src = base64;
        });
    };

    const getTextoUbicacionSegura = () => {
        const candidata = gpsInfo.direccion || formData.ubicacion || "";
        if (!candidata || /obteniendo datos satelitales/i.test(String(candidata))) return "SIN UBICACIÓN REGISTRADA";
        return candidata;
    };

    const handleFoto = async (e, nombre) => {
        const file = e.target.files[0];
        if (!file) return;

        try {
            const imagenComprimida = await comprimirImagen(file);
            const { fecha, hora } = formatearFechaHora(new Date());

            const datosMarca = {
                negocio: formData.negocio?.trim() || "NEGOCIO",
                fecha, hora,
                direccion: getTextoUbicacionSegura(),
                lat: gpsInfo.lat || "N/D", lon: gpsInfo.lon || "N/D"
            };

            const imagenFinal = await estamparDatosEnImagen(imagenComprimida, datosMarca);

            setFotos(prev => ({ ...prev, [nombre]: imagenFinal }));
            setErrors(prev => ({ ...prev, [`foto_${nombre}`]: "" }));
        } catch (error) {
            console.error(error);
            alert("No se pudo procesar la imagen.");
        } finally {
            e.target.value = "";
        }
    };

    const quitarFoto = (nombre) => {
        setFotos(prev => { const copia = { ...prev }; delete copia[nombre]; return copia; });
        setErrors(prev => ({ ...prev, [`foto_${nombre}`]: "" }));
    };

    const obtenerUbicacion = (e) => {
        e.preventDefault();
        if (!navigator.geolocation) {
            alert("Tu dispositivo no soporta geolocalización.");
            return;
        }

        setObteniendoGPS(true);
        setFormData(prev => ({ ...prev, ubicacion: "Obteniendo datos satelitales..." }));
        setErrors(prev => ({ ...prev, ubicacion: "" }));

        navigator.geolocation.getCurrentPosition(
            async (pos) => {
                const lat = pos.coords.latitude;
                const lon = pos.coords.longitude;
                let textoUbicacion = `${lat}, ${lon}`;

                try {
                    const response = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lon}`);
                    const data = await response.json();
                    if (data?.address) {
                        const municipio = data.address.city || data.address.town || data.address.county || data.address.village || "";
                        const departamento = data.address.state || "";
                        const lugar = [municipio, departamento].filter(Boolean).join(", ");
                        if (lugar) textoUbicacion = `${lugar} (${lat}, ${lon})`;
                    }
                } catch (error) {
                    console.error("No se pudo obtener el municipio", error);
                }

                setGpsInfo({ lat: `${lat}`, lon: `${lon}`, direccion: textoUbicacion });
                setFormData(prev => ({ ...prev, ubicacion: textoUbicacion }));
                setObteniendoGPS(false);
            },
            (error) => {
                console.error("Error GPS", error);
                alert("Asegúrate de tener el GPS encendido y en modo 'Alta Precisión'.");
                setFormData(prev => ({ ...prev, ubicacion: "" }));
                setGpsInfo({ lat: "", lon: "", direccion: "" });
                setObteniendoGPS(false);
            },
            { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 }
        );
    };

    const descargarBlob = (blob, filename) => {
        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.href = url; link.download = filename;
        document.body.appendChild(link); link.click(); document.body.removeChild(link);
        URL.revokeObjectURL(url);
    };

    const uploadBlobToSupabase = async (blob, path, contentType) => {
        const supabase = getSupabase();
        const { error: uploadError } = await supabase.storage.from(SUPABASE_BUCKET).upload(path, blob, { upsert: true, contentType });
        if (uploadError) throw uploadError;
        const { data } = supabase.storage.from(SUPABASE_BUCKET).getPublicUrl(path);
        return { path, publicUrl: data.publicUrl };
    };

    const generarImagenWhatsAppBlob = async () => {
        const areaCaptura = document.getElementById("molde-imagen-whatsapp");
        if (!areaCaptura) return null;
        const canvas = await window.html2canvas(areaCaptura, { scale: 3, useCORS: true, backgroundColor: "#ffffff" });
        return await new Promise((resolve) => canvas.toBlob((blob) => resolve(blob), "image/jpeg", 0.88));
    };

    const generarPDFBlob = () => {
        const { jsPDF } = window.jspdf;
        const doc = new jsPDF();
        doc.setFontSize(18);
        doc.text("Reporte de Instalación - Transportes Del Sur", 15, 20);
        doc.setFontSize(12);

        const tablaDatos = Object.entries(formData).map(([key, val]) => [key.toUpperCase(), String(val ?? "")]);
        doc.autoTable({ startY: 30, head: [["Campo", "Información"]], body: tablaDatos });

        for (const [key, base64] of Object.entries(fotos)) {
            if (!base64) continue;
            doc.addPage();
            doc.setFontSize(14);
            doc.text(`Evidencia: ${PHOTO_LABELS[key] || key}`, 15, 20);

            const imgProps = doc.getImageProperties(base64);
            const pdfPageWidth = doc.internal.pageSize.getWidth();
            const pdfPageHeight = doc.internal.pageSize.getHeight();
            const marginX = 15; const marginY = 30;
            const maxPdfWidth = pdfPageWidth - (marginX * 2);
            const maxPdfHeight = pdfPageHeight - marginY - 15;

            let finalWidth = maxPdfWidth;
            let finalHeight = (imgProps.height * maxPdfWidth) / imgProps.width;

            if (finalHeight > maxPdfHeight) {
                finalHeight = maxPdfHeight;
                finalWidth = (imgProps.width * maxPdfHeight) / imgProps.height;
            }

            const xOffset = (pdfPageWidth - finalWidth) / 2;
            doc.addImage(base64, "JPEG", xOffset, marginY, finalWidth, finalHeight);
        }
        return doc.output("blob");
    };

    const generarXLSXBlob = () => {
        const wb = window.XLSX.utils.book_new();
        const registro = {
            Fecha: formData.fecha, Transportista: formData.transportista, Placa: formData.placa,
            Negocio: formData.negocio, Cliente: formData.cliente, Telefono: formData.telefono,
            Ubicacion: formData.ubicacion, Contrato: formData.contrato, Codigo: formData.codigo,
            Serie: formData.serie, Modelo: formData.modelo, Tipo: formData.tipo
        };
        const wsRegistro = window.XLSX.utils.json_to_sheet([registro]);
        window.XLSX.utils.book_append_sheet(wb, wsRegistro, "Registro");

        const evidencias = Object.entries(PHOTO_LABELS).map(([key, label]) => ({ Evidencia: label, Estado: fotos[key] ? "Adjunta" : "Pendiente" }));
        const wsEvidencias = window.XLSX.utils.json_to_sheet(evidencias);
        window.XLSX.utils.book_append_sheet(wb, wsEvidencias, "Evidencias");

        const xlsxArray = window.XLSX.write(wb, { bookType: "xlsx", type: "array" });
        return new Blob([xlsxArray], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });
    };

    const generarDocumentos = async (e) => {
        e.preventDefault();
        const validacion = validarFormulario();
        if (Object.keys(validacion).length > 0) {
            setErrors(validacion);
            const primerMensaje = validacion[Object.keys(validacion)[0]];
            alert(`Revisa el formulario antes de continuar.\n\n${primerMensaje}`);
            return;
        }

        setGenerando(true);
        const registroId = buildRegistroId();
        const safeNegocio = sanitizeFileName(formData.negocio);
        const safeFecha = sanitizeFileName(formData.fecha || "sin_fecha");
        
        // --- AQUI MODIFICAMOS PARA NO CREAR LA CARPETA "registros" ---
        const pdfName = `Instalacion_${safeNegocio}_${safeFecha}.pdf`;
        const xlsxName = `registro_${safeNegocio}_${safeFecha}.xlsx`;
        const imageName = `Resumen_${safeNegocio}_${safeFecha}.jpg`;

        try {
            const imageBlob = await generarImagenWhatsAppBlob();
            const pdfBlob = generarPDFBlob();
            const xlsxBlob = generarXLSXBlob();

            if (!imageBlob) throw new Error("No se pudo generar la imagen para WhatsApp.");

            descargarBlob(imageBlob, imageName);
            descargarBlob(pdfBlob, pdfName);
            descargarBlob(xlsxBlob, xlsxName);

            // Subimos directamente a las carpetas base de Supabase
            const uploads = await Promise.all([
                uploadBlobToSupabase(pdfBlob, `Pdfs/${pdfName}`, "application/pdf"),
                uploadBlobToSupabase(xlsxBlob, `Excel/${xlsxName}`, "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"),
                uploadBlobToSupabase(imageBlob, `Imagenes/${imageName}`, "image/jpeg")
            ]);

            const [pdfFile, xlsxFile, imageFile] = uploads;
            const supabase = getSupabase();

            const { error: insertError } = await supabase.from(SUPABASE_TABLE).insert([{
                registro_id: registroId, fecha: formData.fecha, negocio: formData.negocio,
                cliente: formData.cliente, transportista: formData.transportista, placa: formData.placa,
                contrato: formData.contrato, codigo: formData.codigo, serie: formData.serie,
                modelo: formData.modelo, tipo: formData.tipo, telefono: formData.telefono,
                ubicacion: formData.ubicacion, latitud: gpsInfo.lat, longitud: gpsInfo.lon,
                pdf_url: pdfFile.publicUrl, excel_url: xlsxFile.publicUrl, imagen_url: imageFile.publicUrl,
                pdf_path: pdfFile.path, excel_path: xlsxFile.path, imagen_path: imageFile.path
            }]);

            if (insertError) throw insertError;

            skipDraftSaveRef.current = true;
            clearDraft();
            resetForm();
            setTimeout(() => { skipDraftSaveRef.current = false; }, 0);
            alert("¡Éxito! Se generaron los archivos y se subieron a la nube.");
        } catch (error) {
            console.error("Error al generar documentos", error);
            alert("Hubo un error al guardar en la nube o generar los archivos. Revisa la consola.");
        } finally {
            setGenerando(false);
        }
    };

    const FieldError = ({ text }) => {
        if (!text) return null;
        return <p className="text-xs text-red-600 mt-1 font-medium">{text}</p>;
    };

    const EvidenciaInput = ({ titulo, nameKey }) => (
        <div className="mb-4 bg-white p-3 rounded-lg border border-gray-200 shadow-sm">
            <label className="text-sm block font-bold mb-2 text-gray-700">{titulo}</label>
            {!fotos[nameKey] ? (
                <div className="flex gap-2">
                    <label className="flex-1 text-center bg-blue-100 text-blue-800 py-2 px-1 rounded border border-blue-300 cursor-pointer hover:bg-blue-200 text-sm font-medium transition-colors">
                        📸 Cámara
                        <input type="file" accept="image/*" capture="environment" className="hidden" onChange={(e) => handleFoto(e, nameKey)} />
                    </label>
                    <label className="flex-1 text-center bg-gray-100 text-gray-800 py-2 px-1 rounded border border-gray-300 cursor-pointer hover:bg-gray-200 text-sm font-medium transition-colors">
                        🖼️ Galería
                        <input type="file" accept="image/*" className="hidden" onChange={(e) => handleFoto(e, nameKey)} />
                    </label>
                </div>
            ) : (
                <div className="space-y-3">
                    <div className="rounded-lg overflow-hidden border border-gray-200 bg-gray-50">
                        <img src={fotos[nameKey]} alt={titulo} className="w-full h-56 object-contain bg-white" />
                    </div>
                    <div className="flex gap-2">
                        <label className="flex-1 text-center bg-blue-100 text-blue-800 py-2 px-1 rounded border border-blue-300 cursor-pointer hover:bg-blue-200 text-sm font-medium transition-colors">
                            🔄 Cambiar
                            <input type="file" accept="image/*" capture="environment" className="hidden" onChange={(e) => handleFoto(e, nameKey)} />
                        </label>
                        <button type="button" onClick={() => quitarFoto(nameKey)} className="flex-1 text-center bg-red-100 text-red-700 py-2 px-1 rounded border border-red-300 hover:bg-red-200 text-sm font-medium transition-colors">
                            🗑️ Quitar
                        </button>
                    </div>
                </div>
            )}
            {fotos[nameKey] ? (
                <p className="text-xs text-green-600 mt-2 font-bold flex items-center gap-1"><span>✅</span> Imagen capturada y optimizada</p>
            ) : (
                <p className="text-xs text-red-500 mt-2">Falta adjuntar evidencia</p>
            )}
            <FieldError text={errors[`foto_${nameKey}`]} />
        </div>
    );

    return (
        <div>
            <div id="molde-imagen-whatsapp" className="fixed top-0 left-[-9999px] bg-white p-10 w-[1200px] shadow-2xl">
                <div className="bg-blue-800 text-white p-6 text-center rounded-xl mb-8">
                    <h2 className="text-4xl font-bold mb-2">Transportes Del Sur</h2>
                    <p className="text-xl">Reporte Oficial de Instalación</p>
                </div>
                <div className="grid grid-cols-2 gap-6 mb-8 bg-gray-50 p-6 rounded-xl border-2 border-gray-200 text-xl">
                    <p><span className="font-bold text-blue-800">Fecha:</span> {formData.fecha}</p>
                    <p><span className="font-bold text-blue-800">Transportista:</span> {formData.transportista}</p>
                    <p><span className="font-bold text-blue-800">Placa:</span> {formData.placa}</p>
                    <p><span className="font-bold text-blue-800">Negocio:</span> {formData.negocio}</p>
                    <p><span className="font-bold text-blue-800">Cliente:</span> {formData.cliente}</p>
                    <p><span className="font-bold text-blue-800">Teléfono:</span> {formData.telefono}</p>
                    <p className="col-span-2"><span className="font-bold text-blue-800">Ubicación/GPS:</span> {formData.ubicacion}</p>
                    <p><span className="font-bold text-blue-800">Contrato:</span> {formData.contrato}</p>
                    <p><span className="font-bold text-blue-800">Código Eq:</span> {formData.codigo}</p>
                    <p><span className="font-bold text-blue-800">Serie Eq:</span> {formData.serie}</p>
                    <p><span className="font-bold text-blue-800">Modelo Eq:</span> {formData.modelo}</p>
                    <p><span className="font-bold text-blue-800">Tipo Eq:</span> {formData.tipo}</p>
                </div>
                <div className="grid grid-cols-2 gap-6">
                    {Object.entries(PHOTO_LABELS).map(([key, titulo]) => (
                        fotos[key] && (
                            <div key={key} className="border-2 border-gray-200 p-6 rounded-xl text-center bg-white flex flex-col h-full">
                                <p className="font-bold text-gray-700 mb-4 text-2xl">{titulo}</p>
                                <div className="flex-1 w-full bg-gray-50 rounded-lg flex items-center justify-center p-2">
                                    <img src={fotos[key]} className="w-full h-[500px] object-contain rounded-md" alt={titulo} />
                                </div>
                            </div>
                        )
                    ))}
                </div>
            </div>

            <div className="max-w-md mx-auto bg-white min-h-screen shadow-xl pb-10">
                <header className="bg-blue-800 text-white p-6 text-center rounded-b-3xl mb-6 relative">
                    <button type="button" onClick={onLogout} className="absolute top-4 right-4 text-xs bg-red-600 px-3 py-1 rounded shadow">
                        Salir
                    </button>
                    <h1 className="text-xl font-bold">Transportes Del Sur</h1>
                    <p className="text-sm opacity-80">Control de Instalaciones</p>
                    <p className="text-[11px] opacity-70 mt-2">El borrador se guarda automáticamente.</p>
                </header>

                <form onSubmit={generarDocumentos} className="px-6 space-y-6">
                    <div className="bg-gray-50 p-4 rounded-xl border border-gray-200">
                        <h3 className="font-bold text-blue-800 mb-3 border-b pb-1">1. TRANSPORTE</h3>
                        <div className="mb-3">
                            <input type="date" name="fecha" value={formData.fecha} onChange={handleChange} className="w-full p-2 border rounded" required />
                            <FieldError text={errors.fecha} />
                        </div>
                        <div className="mb-3">
                            <select name="transportista" value={formData.transportista} onChange={handleChange} className="w-full p-2 border rounded" required>
                                <option value="">Transportista...</option>
                                {opciones.transportistas.map((t, i) => <option key={i} value={t}>{t}</option>)}
                            </select>
                            <FieldError text={errors.transportista} />
                        </div>
                        <div>
                            <select name="placa" value={formData.placa} onChange={handleChange} className="w-full p-2 border rounded" required>
                                <option value="">Placa...</option>
                                {opciones.placas.map((p, i) => <option key={i} value={p}>{p}</option>)}
                            </select>
                            <FieldError text={errors.placa} />
                        </div>
                    </div>

                    <div className="bg-gray-50 p-4 rounded-xl border border-gray-200">
                        <h3 className="font-bold text-blue-800 mb-3 border-b pb-1">2. CLIENTE</h3>
                        <div className="mb-3">
                            <input type="text" name="negocio" placeholder="Nombre del Negocio" value={formData.negocio} onChange={handleChange} className="w-full p-2 border rounded" required />
                            <FieldError text={errors.negocio} />
                        </div>
                        <div className="mb-3">
                            <input type="text" name="cliente" placeholder="Nombre del Cliente" value={formData.cliente} onChange={handleChange} className="w-full p-2 border rounded" required />
                            <FieldError text={errors.cliente} />
                        </div>
                        <div className="mb-3">
                            <input type="tel" name="telefono" placeholder="Teléfono" value={formData.telefono} onChange={handleChange} className="w-full p-2 border rounded" required />
                            <FieldError text={errors.telefono} />
                        </div>
                        <div className="mb-3 flex gap-2">
                            <textarea name="ubicacion" value={formData.ubicacion} placeholder="GPS y Dirección" readOnly className="w-full p-2 border rounded bg-gray-100 text-sm h-16 resize-none" required></textarea>
                            <button type="button" onClick={obtenerUbicacion} disabled={obteniendoGPS} className={`${obteniendoGPS ? "bg-gray-400" : "bg-blue-600"} text-white px-4 rounded shadow`}>📍</button>
                        </div>
                        <FieldError text={errors.ubicacion} />
                        <div className="mb-3 mt-3">
                            <input type="text" name="contrato" placeholder="Número de contrato" value={formData.contrato} onChange={handleChange} className="w-full p-2 border rounded" required />
                            <FieldError text={errors.contrato} />
                        </div>
                    </div>

                    <div className="bg-gray-50 p-4 rounded-xl border border-gray-200">
                        <h3 className="font-bold text-blue-800 mb-3 border-b pb-1">3. EQUIPO INSTALADO</h3>
                        <div className="mb-3">
                            <input type="text" name="codigo" placeholder="Código de Equipo" value={formData.codigo} onChange={handleChange} className="w-full p-2 border rounded" required />
                            <FieldError text={errors.codigo} />
                        </div>
                        <div className="mb-3">
                            <input type="text" name="serie" placeholder="Serie de equipo" value={formData.serie} onChange={handleChange} className="w-full p-2 border rounded" required />
                            <FieldError text={errors.serie} />
                        </div>
                        <div className="mb-3">
                            <input type="text" name="modelo" placeholder="Modelo del equipo" value={formData.modelo} onChange={handleChange} className="w-full p-2 border rounded" required />
                            <FieldError text={errors.modelo} />
                        </div>
                        <div>
                            <select name="tipo" value={formData.tipo} onChange={handleChange} className="w-full p-2 border rounded" required>
                                <option value="">Selecciona el tipo de equipo...</option>
                                <option value="1 cuerpo">1 cuerpo</option>
                                <option value="2 cuerpos">2 cuerpos</option>
                                <option value="3 cuerpos">3 cuerpos</option>
                                <option value="4 cuerpos">4 cuerpos</option>
                            </select>
                            <FieldError text={errors.tipo} />
                        </div>
                    </div>

                    <div className="bg-gray-50 p-4 rounded-xl border border-gray-200">
                        <h3 className="font-bold text-blue-800 mb-3 border-b pb-1">4. FOTOS (EVIDENCIA)</h3>
                        <EvidenciaInput titulo="Fachada del negocio" nameKey="fachada" />
                        <EvidenciaInput titulo="Contrato firmado" nameKey="contrato" />
                        <EvidenciaInput titulo="Etiqueta del equipo" nameKey="etiqueta" />
                        <EvidenciaInput titulo="Equipo instalado" nameKey="equipo" />
                    </div>

                    <button type="submit" disabled={generando} className={`w-full ${generando ? "bg-green-400" : "bg-green-600"} text-white font-bold py-4 rounded-2xl shadow-lg active:scale-95 transition-transform text-lg`}>
                        {generando ? "GENERANDO..." : "GENERAR 3 REPORTES (PDF, EXCEL, IMAGEN)"}
                    </button>
                </form>
            </div>
        </div>
    );
};


// ==========================================
// 3. COMPONENTE PRINCIPAL (RUTEO DE LOGIN)
// ==========================================
const AppProyecto = () => {
    const [isLoggedIn, setIsLoggedIn] = useState(false);
    const [username, setUsername] = useState("");
    const [password, setPassword] = useState("");
    const [role, setRole] = useState(""); 

    useEffect(() => {
        if (!isLoggedIn) return;

        const handleBeforeUnload = (e) => {
            e.preventDefault();
            e.returnValue = "";
        };

        const handlePopState = () => {
            const confirmar = window.confirm("¿Estás seguro de regresar? Se cerrará tu sesión.");
            if (confirmar) {
                setIsLoggedIn(false);
                setRole("");
            } else {
                window.history.pushState(null, null, window.location.href);
            }
        };

        window.addEventListener("beforeunload", handleBeforeUnload);
        window.addEventListener("popstate", handlePopState);
        window.history.pushState(null, null, window.location.href);

        return () => {
            window.removeEventListener("beforeunload", handleBeforeUnload);
            window.removeEventListener("popstate", handlePopState);
        };
    }, [isLoggedIn]);

    const handleLogin = (e) => {
        e.preventDefault();

        // Admin
        if (username === "admin" && password === "123") {
            setRole("admin");
            setIsLoggedIn(true);
        } 
        // Tecnico
        else if (username === "tec" && password === "123") {
            setRole("tecnico");
            setIsLoggedIn(true);
        } else {
            alert("Usuario o contraseña incorrectos.\n\nPrueba con:\n- tec / 123 (Para llenar formulario)\n- admin / 123 (Para ver el panel de reportes)");
        }
    };

    const handleLogout = () => {
        const salir = window.confirm("¿Deseas salir del sistema?");
        if (!salir) return;
        setIsLoggedIn(false);
        setRole("");
        setPassword("");
    };

    // Pantalla de Login
    if (!isLoggedIn) {
        return (
            <div className="max-w-sm mx-auto bg-white p-8 shadow-xl rounded-2xl mt-20 border-t-4 border-blue-800">
                <div className="text-center mb-8">
                    <h1 className="text-2xl font-bold text-blue-900 mb-1">Transportes Del Sur</h1>
                    <p className="text-gray-500 text-sm">Acceso al sistema</p>
                </div>

                <form onSubmit={handleLogin} className="space-y-6">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Usuario</label>
                        <input type="text" value={username} onChange={e => setUsername(e.target.value)} className="w-full p-3 border rounded-lg bg-gray-50 focus:ring-2 focus:ring-blue-500 outline-none" required />
                        <p className="text-[11px] text-gray-400 mt-2">Prueba "tec" o "admin"</p>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Contraseña</label>
                        <input type="password" value={password} onChange={e => setPassword(e.target.value)} className="w-full p-3 border rounded-lg bg-gray-50 focus:ring-2 focus:ring-blue-500 outline-none" required />
                    </div>

                    <button type="submit" className="w-full bg-blue-800 text-white font-bold py-3 rounded-lg hover:bg-blue-900 transition-colors shadow-md">
                        Entrar
                    </button>
                </form>
            </div>
        );
    }

    // Pantalla de Administrador (Panel / Dashboard)
    if (role === "admin") {
        return <PanelAdmin onLogout={handleLogout} />;
    }

    // Pantalla de Tecnico (Formulario)
    return <VistaTecnico onLogout={handleLogout} />;
};
