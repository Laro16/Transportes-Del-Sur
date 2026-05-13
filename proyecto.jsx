const { useState, useEffect, useRef } = React;

const STORAGE_KEY = "transportes_del_sur_borrador_v1";

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

const AppProyecto = () => {
    const skipDraftSaveRef = useRef(false);

    const [isLoggedIn, setIsLoggedIn] = useState(false);
    const [username, setUsername] = useState("");
    const [password, setPassword] = useState("");

    const [opciones, setOpciones] = useState({ transportistas: [], placas: [] });
    const [formData, setFormData] = useState(INITIAL_FORM);
    const [fotos, setFotos] = useState({});
    const [gpsInfo, setGpsInfo] = useState({
        lat: "",
        lon: "",
        altitud: "",
        direccion: ""
    });
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

            if (parsed?.formData) {
                setFormData(prev => ({ ...prev, ...parsed.formData }));
            }

            if (parsed?.fotos) {
                setFotos(parsed.fotos);
            }

            if (parsed?.gpsInfo) {
                setGpsInfo(prev => ({ ...prev, ...parsed.gpsInfo }));
            }
        } catch (error) {
            console.error("No se pudo cargar el borrador", error);
        }
    }, []);

    useEffect(() => {
        if (!isLoggedIn) return;
        if (skipDraftSaveRef.current) return;

        try {
            localStorage.setItem(
                STORAGE_KEY,
                JSON.stringify({
                    formData,
                    fotos,
                    gpsInfo
                })
            );
        } catch (error) {
            console.error("No se pudo guardar el borrador", error);
        }
    }, [formData, fotos, gpsInfo, isLoggedIn]);

    useEffect(() => {
        if (!isLoggedIn) return;

        const handleBeforeUnload = (e) => {
            e.preventDefault();
            e.returnValue = "";
        };

        const handlePopState = () => {
            const confirmar = window.confirm(
                "¿Estás seguro de regresar? Se perderán los datos no guardados."
            );

            if (confirmar) {
                setIsLoggedIn(false);
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

    const resetForm = () => {
        setFormData(INITIAL_FORM);
        setFotos({});
        setGpsInfo({
            lat: "",
            lon: "",
            altitud: "",
            direccion: ""
        });
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

    const handleLogin = (e) => {
        e.preventDefault();

        if (username === "admin" && password === "123") {
            setIsLoggedIn(true);
        } else {
            alert("Usuario o contraseña incorrectos");
        }
    };

    const handleLogout = () => {
        const salir = window.confirm("¿Deseas salir del sistema?");
        if (!salir) return;

        setIsLoggedIn(false);
        setPassword("");
        setErrors({});
    };

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
        setErrors(prev => ({ ...prev, [name]: "" }));
    };

    const validarFormulario = () => {
        const nextErrors = {};

        const requiredFields = [
            "fecha",
            "transportista",
            "placa",
            "negocio",
            "cliente",
            "telefono",
            "ubicacion",
            "contrato",
            "codigo",
            "serie",
            "modelo",
            "tipo"
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
            if (!fechaValida) {
                nextErrors.fecha = "La fecha no es válida.";
            }
        }

        if (formData.ubicacion && formData.ubicacion.includes("Obteniendo datos satelitales")) {
            nextErrors.ubicacion = "Aún se está obteniendo la ubicación.";
        }

        Object.keys(PHOTO_LABELS).forEach((key) => {
            if (!fotos[key]) {
                nextErrors[`foto_${key}`] = "Debes adjuntar esta fotografía.";
            }
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
                if (img.width > MAX_WIDTH) {
                    scaleSize = MAX_WIDTH / img.width;
                }

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
        const fecha = new Intl.DateTimeFormat("es-GT", {
            day: "2-digit",
            month: "2-digit",
            year: "numeric"
        }).format(date);

        const hora = new Intl.DateTimeFormat("es-GT", {
            hour: "2-digit",
            minute: "2-digit",
            second: "2-digit",
            hour12: false
        }).format(date);

        return { fecha, hora };
    };

    const wrapText = (ctx, text, maxWidth) => {
        const words = String(text || "").split(" ");
        const lines = [];
        let line = "";

        for (let n = 0; n < words.length; n++) {
            const testLine = line + words[n] + " ";
            const metrics = ctx.measureText(testLine);
            const testWidth = metrics.width;

            if (testWidth > maxWidth && n > 0) {
                lines.push(line.trim());
                line = words[n] + " ";
            } else {
                line = testLine;
            }
        }

        if (line.trim()) lines.push(line.trim());
        return lines;
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
                const fontSize = Math.max(18, Math.round(canvas.width * 0.018));
                const lineHeight = Math.round(fontSize * 1.35);

                ctx.font = `bold ${fontSize}px Arial`;
                ctx.textBaseline = "top";

                const lineasBase = [
                    `NEGOCIO: ${datos.negocio}`,
                    `FECHA: ${datos.fecha}`,
                    `HORA: ${datos.hora}`,
                    `DIRECCIÓN: ${datos.direccion}`,
                    `GPS: ${datos.lat}, ${datos.lon}`,
                    `ALTITUD: ${datos.altitud}`
                ];

                const maxTextWidth = Math.round(canvas.width * 0.42);
                let lineas = [];

                lineasBase.forEach((linea) => {
                    const partes = wrapText(ctx, linea, maxTextWidth);
                    lineas.push(...partes);
                });

                const widest = lineas.length
                    ? Math.max(...lineas.map(l => ctx.measureText(l).width))
                    : 0;

                const boxWidth = Math.min(
                    canvas.width * 0.55,
                    widest + margin * 2
                );

                const boxHeight = lineas.length * lineHeight + margin * 2;

                const x = canvas.width - boxWidth - margin;
                const y = canvas.height - boxHeight - margin;

                ctx.fillStyle = "rgba(0,0,0,0.50)";
                ctx.fillRect(x, y, boxWidth, boxHeight);

                ctx.fillStyle = "#FFFFFF";
                ctx.shadowColor = "rgba(0,0,0,0.85)";
                ctx.shadowBlur = 4;
                ctx.shadowOffsetX = 1;
                ctx.shadowOffsetY = 1;

                lineas.forEach((linea, index) => {
                    ctx.fillText(linea, x + margin, y + margin + (index * lineHeight));
                });

                const finalBase64 = canvas.toDataURL("image/jpeg", 0.88);
                resolve(finalBase64);
            };

            img.onerror = reject;
            img.src = base64;
        });
    };

    const handleFoto = async (e, nombre) => {
        const file = e.target.files[0];
        if (!file) return;

        try {
            const imagenComprimida = await comprimirImagen(file);
            const ahora = new Date();
            const { fecha, hora } = formatearFechaHora(ahora);

            const datosMarca = {
                negocio: formData.negocio?.trim() || "NEGOCIO",
                fecha,
                hora,
                direccion: gpsInfo.direccion || formData.ubicacion || "SIN UBICACIÓN",
                lat: gpsInfo.lat || "N/D",
                lon: gpsInfo.lon || "N/D",
                altitud: gpsInfo.altitud || "N/D"
            };

            const imagenFinal = await estamparDatosEnImagen(imagenComprimida, datosMarca);

            setFotos(prev => ({
                ...prev,
                [nombre]: imagenFinal
            }));

            setErrors(prev => ({
                ...prev,
                [`foto_${nombre}`]: ""
            }));
        } catch (error) {
            console.error(error);
            alert("No se pudo procesar la imagen.");
        } finally {
            e.target.value = "";
        }
    };

    const quitarFoto = (nombre) => {
        setFotos(prev => {
            const copia = { ...prev };
            delete copia[nombre];
            return copia;
        });

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

                const altitud = pos.coords.altitude !== null && pos.coords.altitude !== undefined
                    ? `${pos.coords.altitude.toFixed(1)} m`
                    : "N/D";

                let textoUbicacion = `${lat}, ${lon}`;

                try {
                    const response = await fetch(
                        `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lon}`
                    );
                    const data = await response.json();

                    if (data?.address) {
                        const municipio =
                            data.address.city ||
                            data.address.town ||
                            data.address.county ||
                            data.address.village ||
                            "";

                        const departamento = data.address.state || "";

                        const lugar = [municipio, departamento].filter(Boolean).join(", ");
                        if (lugar) {
                            textoUbicacion = `${lugar} (${lat}, ${lon})`;
                        }
                    }
                } catch (error) {
                    console.error("No se pudo obtener el municipio", error);
                }

                setGpsInfo({
                    lat: `${lat}`,
                    lon: `${lon}`,
                    altitud,
                    direccion: textoUbicacion
                });

                setFormData(prev => ({ ...prev, ubicacion: textoUbicacion }));
                setObteniendoGPS(false);
            },
            (error) => {
                console.error("Error GPS", error);
                alert("Asegúrate de tener el GPS encendido y en modo 'Alta Precisión'.");
                setFormData(prev => ({ ...prev, ubicacion: "" }));
                setGpsInfo({
                    lat: "",
                    lon: "",
                    altitud: "",
                    direccion: ""
                });
                setObteniendoGPS(false);
            },
            { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 }
        );
    };

    const descargarArchivo = (dataUrl, filename) => {
        const link = document.createElement("a");
        link.href = dataUrl;
        link.download = filename;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    const generarImagenWhatsApp = async () => {
        const areaCaptura = document.getElementById("molde-imagen-whatsapp");
        if (!areaCaptura) return;

        const canvas = await window.html2canvas(areaCaptura, {
            scale: 3,
            useCORS: true,
            backgroundColor: "#ffffff"
        });

        const imagenFinalBase64 = canvas.toDataURL("image/jpeg", 0.88);
        const fileName = `Resumen_${sanitizeFileName(formData.negocio)}_${formData.fecha}.jpg`;
        descargarArchivo(imagenFinalBase64, fileName);
    };

    const generarPDF = () => {
        const { jsPDF } = window.jspdf;
        const doc = new jsPDF();

        doc.setFontSize(18);
        doc.text("Reporte de Instalación - Transportes Del Sur", 15, 20);
        doc.setFontSize(12);

        const tablaDatos = Object.entries(formData).map(([key, val]) => [
            key.toUpperCase(),
            String(val ?? "")
        ]);

        doc.autoTable({
            startY: 30,
            head: [["Campo", "Información"]],
            body: tablaDatos
        });

        for (const [key, base64] of Object.entries(fotos)) {
            if (!base64) continue;

            doc.addPage();
            doc.setFontSize(14);
            doc.text(`Evidencia: ${PHOTO_LABELS[key] || key}`, 15, 20);

            const imgProps = doc.getImageProperties(base64);
            const pdfPageWidth = doc.internal.pageSize.getWidth();
            const pdfPageHeight = doc.internal.pageSize.getHeight();

            const marginX = 15;
            const marginY = 30;

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

        const fileName = `Instalacion_${sanitizeFileName(formData.negocio)}_${formData.fecha}.pdf`;
        doc.save(fileName);
    };

    const generarXLSX = () => {
        if (!window.XLSX) {
            throw new Error("La librería XLSX no está cargada.");
        }

        const wb = window.XLSX.utils.book_new();

        const registro = {
            Fecha: formData.fecha,
            Transportista: formData.transportista,
            Placa: formData.placa,
            Negocio: formData.negocio,
            Cliente: formData.cliente,
            Telefono: formData.telefono,
            Ubicacion: formData.ubicacion,
            Contrato: formData.contrato,
            Codigo: formData.codigo,
            Serie: formData.serie,
            Modelo: formData.modelo,
            Tipo: formData.tipo
        };

        const wsRegistro = window.XLSX.utils.json_to_sheet([registro]);
        window.XLSX.utils.book_append_sheet(wb, wsRegistro, "Registro");

        const evidencias = Object.entries(PHOTO_LABELS).map(([key, label]) => ({
            Evidencia: label,
            Estado: fotos[key] ? "Adjunta" : "Pendiente"
        }));

        const wsEvidencias = window.XLSX.utils.json_to_sheet(evidencias);
        window.XLSX.utils.book_append_sheet(wb, wsEvidencias, "Evidencias");

        const fileName = `registro_${sanitizeFileName(formData.negocio)}_${formData.fecha}.xlsx`;
        window.XLSX.writeFile(wb, fileName);
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

        try {
            await generarImagenWhatsApp();
            generarPDF();
            generarXLSX();

            skipDraftSaveRef.current = true;
            clearDraft();
            resetForm();

            setTimeout(() => {
                skipDraftSaveRef.current = false;
            }, 0);

            alert("¡Éxito! Se han descargado la imagen para WhatsApp, el PDF y el archivo Excel.");
        } catch (error) {
            console.error("Error al generar documentos", error);
            alert("Hubo un error al generar los documentos. Revisa la consola para más detalle.");
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
                        <input
                            type="file"
                            accept="image/*"
                            capture="environment"
                            className="hidden"
                            onChange={(e) => handleFoto(e, nameKey)}
                        />
                    </label>
                    <label className="flex-1 text-center bg-gray-100 text-gray-800 py-2 px-1 rounded border border-gray-300 cursor-pointer hover:bg-gray-200 text-sm font-medium transition-colors">
                        🖼️ Galería
                        <input
                            type="file"
                            accept="image/*"
                            className="hidden"
                            onChange={(e) => handleFoto(e, nameKey)}
                        />
                    </label>
                </div>
            ) : (
                <div className="space-y-3">
                    <div className="rounded-lg overflow-hidden border border-gray-200 bg-gray-50">
                        <img
                            src={fotos[nameKey]}
                            alt={titulo}
                            className="w-full h-56 object-contain bg-white"
                        />
                    </div>
                    <div className="flex gap-2">
                        <label className="flex-1 text-center bg-blue-100 text-blue-800 py-2 px-1 rounded border border-blue-300 cursor-pointer hover:bg-blue-200 text-sm font-medium transition-colors">
                            🔄 Cambiar
                            <input
                                type="file"
                                accept="image/*"
                                capture="environment"
                                className="hidden"
                                onChange={(e) => handleFoto(e, nameKey)}
                            />
                        </label>
                        <button
                            type="button"
                            onClick={() => quitarFoto(nameKey)}
                            className="flex-1 text-center bg-red-100 text-red-700 py-2 px-1 rounded border border-red-300 hover:bg-red-200 text-sm font-medium transition-colors"
                        >
                            🗑️ Quitar
                        </button>
                    </div>
                </div>
            )}

            {fotos[nameKey] ? (
                <p className="text-xs text-green-600 mt-2 font-bold flex items-center gap-1">
                    <span>✅</span> Imagen capturada y optimizada
                </p>
            ) : (
                <p className="text-xs text-red-500 mt-2">Falta adjuntar evidencia</p>
            )}

            <FieldError text={errors[`foto_${nameKey}`]} />
        </div>
    );

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
                        <input
                            type="text"
                            value={username}
                            onChange={e => setUsername(e.target.value)}
                            className="w-full p-3 border rounded-lg bg-gray-50"
                            required
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Contraseña</label>
                        <input
                            type="password"
                            value={password}
                            onChange={e => setPassword(e.target.value)}
                            className="w-full p-3 border rounded-lg bg-gray-50"
                            required
                        />
                    </div>

                    <button
                        type="submit"
                        className="w-full bg-blue-800 text-white font-bold py-3 rounded-lg hover:bg-blue-900 transition-colors shadow-md"
                    >
                        Entrar
                    </button>
                </form>
            </div>
        );
    }

    return (
        <div>
            <div
                id="molde-imagen-whatsapp"
                className="fixed top-0 left-[-9999px] bg-white p-10 w-[1200px] shadow-2xl"
            >
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
                            <div
                                key={key}
                                className="border-2 border-gray-200 p-6 rounded-xl text-center bg-white flex flex-col h-full"
                            >
                                <p className="font-bold text-gray-700 mb-4 text-2xl">{titulo}</p>
                                <div className="flex-1 w-full bg-gray-50 rounded-lg flex items-center justify-center p-2">
                                    <img
                                        src={fotos[key]}
                                        className="w-full h-[500px] object-contain rounded-md"
                                        alt={titulo}
                                    />
                                </div>
                            </div>
                        )
                    ))}
                </div>
            </div>

            <div className="max-w-md mx-auto bg-white min-h-screen shadow-xl pb-10">
                <header className="bg-blue-800 text-white p-6 text-center rounded-b-3xl mb-6 relative">
                    <button
                        type="button"
                        onClick={handleLogout}
                        className="absolute top-4 right-4 text-xs bg-red-600 px-3 py-1 rounded shadow"
                    >
                        Salir
                    </button>
                    <h1 className="text-xl font-bold">Transportes Del Sur</h1>
                    <p className="text-sm opacity-80">Control de Instalaciones</p>
                    <p className="text-[11px] opacity-70 mt-2">
                        El borrador se guarda automáticamente mientras trabajas.
                    </p>
                </header>

                <form onSubmit={generarDocumentos} className="px-6 space-y-6">
                    <div className="bg-gray-50 p-4 rounded-xl border border-gray-200">
                        <h3 className="font-bold text-blue-800 mb-3 border-b pb-1">1. TRANSPORTE</h3>

                        <div className="mb-3">
                            <input
                                type="date"
                                name="fecha"
                                value={formData.fecha}
                                onChange={handleChange}
                                className="w-full p-2 border rounded"
                                required
                            />
                            <FieldError text={errors.fecha} />
                        </div>

                        <div className="mb-3">
                            <select
                                name="transportista"
                                value={formData.transportista}
                                onChange={handleChange}
                                className="w-full p-2 border rounded"
                                required
                            >
                                <option value="">Transportista...</option>
                                {opciones.transportistas.map((t, i) => (
                                    <option key={i} value={t}>{t}</option>
                                ))}
                            </select>
                            <FieldError text={errors.transportista} />
                        </div>

                        <div>
                            <select
                                name="placa"
                                value={formData.placa}
                                onChange={handleChange}
                                className="w-full p-2 border rounded"
                                required
                            >
                                <option value="">Placa...</option>
                                {opciones.placas.map((p, i) => (
                                    <option key={i} value={p}>{p}</option>
                                ))}
                            </select>
                            <FieldError text={errors.placa} />
                        </div>
                    </div>

                    <div className="bg-gray-50 p-4 rounded-xl border border-gray-200">
                        <h3 className="font-bold text-blue-800 mb-3 border-b pb-1">2. CLIENTE</h3>

                        <div className="mb-3">
                            <input
                                type="text"
                                name="negocio"
                                placeholder="Nombre del Negocio"
                                value={formData.negocio}
                                onChange={handleChange}
                                className="w-full p-2 border rounded"
                                required
                            />
                            <FieldError text={errors.negocio} />
                        </div>

                        <div className="mb-3">
                            <input
                                type="text"
                                name="cliente"
                                placeholder="Nombre del Cliente"
                                value={formData.cliente}
                                onChange={handleChange}
                                className="w-full p-2 border rounded"
                                required
                            />
                            <FieldError text={errors.cliente} />
                        </div>

                        <div className="mb-3">
                            <input
                                type="tel"
                                name="telefono"
                                placeholder="Teléfono"
                                value={formData.telefono}
                                onChange={handleChange}
                                className="w-full p-2 border rounded"
                                required
                            />
                            <FieldError text={errors.telefono} />
                        </div>

                        <div className="mb-3 flex gap-2">
                            <textarea
                                name="ubicacion"
                                value={formData.ubicacion}
                                placeholder="GPS y Dirección"
                                readOnly
                                className="w-full p-2 border rounded bg-gray-100 text-sm h-16 resize-none"
                                required
                            ></textarea>

                            <button
                                type="button"
                                onClick={obtenerUbicacion}
                                disabled={obteniendoGPS}
                                className={`${obteniendoGPS ? "bg-gray-400" : "bg-blue-600"} text-white px-4 rounded shadow`}
                            >
                                📍
                            </button>
                        </div>

                        <FieldError text={errors.ubicacion} />

                        <div className="mb-3 mt-3">
                            <input
                                type="text"
                                name="contrato"
                                placeholder="Número de contrato"
                                value={formData.contrato}
                                onChange={handleChange}
                                className="w-full p-2 border rounded"
                                required
                            />
                            <FieldError text={errors.contrato} />
                        </div>
                    </div>

                    <div className="bg-gray-50 p-4 rounded-xl border border-gray-200">
                        <h3 className="font-bold text-blue-800 mb-3 border-b pb-1">3. EQUIPO INSTALADO</h3>

                        <div className="mb-3">
                            <input
                                type="text"
                                name="codigo"
                                placeholder="Código de Equipo"
                                value={formData.codigo}
                                onChange={handleChange}
                                className="w-full p-2 border rounded"
                                required
                            />
                            <FieldError text={errors.codigo} />
                        </div>

                        <div className="mb-3">
                            <input
                                type="text"
                                name="serie"
                                placeholder="Serie de equipo"
                                value={formData.serie}
                                onChange={handleChange}
                                className="w-full p-2 border rounded"
                                required
                            />
                            <FieldError text={errors.serie} />
                        </div>

                        <div className="mb-3">
                            <input
                                type="text"
                                name="modelo"
                                placeholder="Modelo del equipo"
                                value={formData.modelo}
                                onChange={handleChange}
                                className="w-full p-2 border rounded"
                                required
                            />
                            <FieldError text={errors.modelo} />
                        </div>

                        <div>
                            <select
                                name="tipo"
                                value={formData.tipo}
                                onChange={handleChange}
                                className="w-full p-2 border rounded"
                                required
                            >
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

                    <button
                        type="submit"
                        disabled={generando}
                        className={`w-full ${generando ? "bg-green-400" : "bg-green-600"} text-white font-bold py-4 rounded-2xl shadow-lg active:scale-95 transition-transform text-lg`}
                    >
                        {generando ? "GENERANDO..." : "GENERAR 3 REPORTES (PDF, EXCEL, IMAGEN)"}
                    </button>
                </form>
            </div>
        </div>
    );
};
