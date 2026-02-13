import React, { useState } from 'react';
import { X, Upload, Database } from 'lucide-react';

export function BulkImport({ onClose, onImport, currentTandaId }) {
    const [csvData, setCsvData] = useState('');

    const cleanNumber = (val) => {
        if (!val) return 0;
        const cleaned = val.toString()
            .replace(/[^0-9,.-]/g, '')
            .replace(/\./g, '')
            .replace(/,/g, '.');
        const num = parseFloat(cleaned);
        return isNaN(num) ? 0 : num;
    };

    const handleProcess = () => {
        const lines = csvData.split('\n');
        if (lines.length < 2) return;

        const headers = lines[0].split(',').map(h => h.trim().toUpperCase());

        const mapped = lines.slice(1).filter(l => l.trim()).map(line => {
            const values = line.split(',');
            const row = {};
            headers.forEach((header, i) => {
                row[header] = values[i]?.trim() || '';
            });

            return {
                id: Math.random().toString(36).substr(2, 9),
                tandaId: currentTandaId,
                fechaCompra: row.FECHA || new Date().toISOString().split('T')[0],
                celular: row.CELULAR || 'MODELO DESCONOCIDO',
                rom: row.ROM || '',
                ram: row.RAM || '',
                color: row.COLOR || '',
                costoUsd: cleanNumber(row['COSTO USD']),
                dolarDia: cleanNumber(row['DOLAR DEL DIA']) || 1465,
                costoEnvio: cleanNumber(row['COSTO ENVIO']),
                costoExtra: cleanNumber(row['GASTO EXTRA']),
                status: row.ESTADO === 'VENDIDO' || row['PRECIO DE VENTA'] ? 'SOLD' : 'STOCK',
                precioVenta: cleanNumber(row['PRECIO DE VENTA']),
                plataRecibida: cleanNumber(row['PLATA RECIBIDA']),
                quienTienePlata: row['QUIEN TIENE LA PLATA?'] || '',
                splitSocioA: 50,
                splitSocioB: 50,
                pagadoSocioA: false,
                pagadoSocioB: false,
                comisionPagada: false
            };
        });

        onImport(mapped);
    };

    return (
        <div className="fixed inset-0 bg-black/90 backdrop-blur-md flex items-center justify-center p-4 z-50">
            <div className="glass industrial-border w-full max-w-4xl p-8 space-y-6 animate-in zoom-in-95 duration-200">
                <div className="flex justify-between items-center">
                    <div className="flex items-center gap-4">
                        <Database size={32} className="text-accent" />
                        <h2 className="font-display text-4xl uppercase italic tracking-tighter">Importación <span className="text-accent">Masiva</span></h2>
                    </div>
                    <button onClick={onClose} className="hover:text-accent transition-colors"><X size={32} /></button>
                </div>

                <div className="bg-white/5 p-4 border border-white/10 space-y-2">
                    <p className="font-mono text-[10px] text-zinc-500 uppercase tracking-widest">Formato sugerido (CSV):</p>
                    <code className="text-[10px] text-accent/70 block font-mono">FECHA, CELULAR, ROM, RAM, COSTO USD, DOLAR DEL DIA, PRECIO DE VENTA ...</code>
                </div>

                <textarea
                    className="w-full h-80 bg-black/40 border border-white/10 p-4 font-mono text-xs text-white focus:border-accent outline-none overflow-y-auto placeholder:text-zinc-700"
                    placeholder="Pegá tus filas de Excel aquí..."
                    value={csvData}
                    onChange={(e) => setCsvData(e.target.value)}
                />

                <button
                    onClick={handleProcess}
                    className="w-full bg-accent hover:bg-accent/80 text-white py-5 font-display text-2xl industrial-border flex items-center justify-center gap-3 uppercase italic transition-all"
                >
                    <Upload size={24} /> Ejecutar Procesamiento
                </button>
            </div>
        </div>
    );
}
