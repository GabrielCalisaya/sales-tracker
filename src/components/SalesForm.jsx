import React, { useState, useEffect } from 'react';
import { X, Save, ShieldCheck, DollarSign, Smartphone, Layers } from 'lucide-react';
import { calculateCostoPesos, getSuggestedPrices, getExpectedProfit } from '../utils/calculations';

const InputField = ({ label, name, type = "text", placeholder, value, onChange, className = "", list }) => (
    <div className={`space-y-2 ${className}`}>
        <label className="font-display text-base uppercase text-zinc-400 tracking-widest font-bold">{label}</label>
        <input
            name={name}
            type={type}
            className="w-full bg-white/5 border border-white/10 p-2 font-mono text-sm focus:border-accent outline-none transition-colors text-white"
            placeholder={placeholder}
            value={value}
            onChange={onChange}
            list={list}
        />
    </div>
);

export function SalesForm({ onClose, onSave, initialData, tandas = [], partnerA = "SOCIO A", partnerB = "SOCIO B", modelHistory = {} }) {
    const [formData, setFormData] = useState(initialData || {
        fechaCompra: new Date().toISOString().split('T')[0],
        tandaId: tandas[0]?.id || 'Default',
        celular: '',
        rom: '128GB',
        ram: '8GB',
        imei1: '',
        imei2: '',
        color: '',
        costoUsd: '',
        dolarDia: '1465',
        costoEnvio: '10000',
        costoExtra: '0',
        status: 'STOCK',
        suggestions: null,
        expectedProfit: 0,

        fechaVenta: '',
        canalVenta: 'Presencial',
        precioVenta: '',
        mlPrecio1: '',
        mlPrecio3: '',
        mlPrecio6: '',
        plataRecibida: '',
        quienTienePlata: '', // SOCIO_A_EFT, SOCIO_B_EFT, SOCIO_A_ML, SOCIO_B_ML
        splitSocioA: '50',
        splitSocioB: '50',
        pagadoSocioA: false,
        pagadoSocioB: false,
        comisionPagada: false
    });

    useEffect(() => {
        if (formData.costoUsd && formData.dolarDia) {
            const totalCost = calculateCostoPesos(formData.costoUsd, formData.dolarDia, formData.costoEnvio, formData.costoExtra);
            const suggestions = getSuggestedPrices(totalCost);
            const expected = formData.precioVenta ? getExpectedProfit(Number(formData.precioVenta), totalCost, formData.canalVenta) : 0;

            setFormData(prev => ({ ...prev, suggestions, expectedProfit: expected }));
        }
    }, [formData.costoUsd, formData.dolarDia, formData.costoEnvio, formData.costoExtra, formData.precioVenta, formData.canalVenta]);

    const handleModelChange = (e) => {
        const value = e.target.value;
        const upperValue = value.toUpperCase();

        // Basic update for the input
        let update = { celular: value };

        // If we have history for this EXACT model name, autofill
        if (modelHistory[upperValue]) {
            const history = modelHistory[upperValue];
            update.rom = history.rom;
            update.ram = history.ram;
            update.costoUsd = history.costoUsd;
        }

        setFormData(prev => ({ ...prev, ...update }));
    };

    const handleSubmit = (e) => {
        e.preventDefault();
        onSave(formData);
    };

    return (
        <div className="fixed inset-0 bg-black/95 backdrop-blur-md flex items-center justify-center p-4 z-50 overflow-y-auto">
            <div className="glass industrial-border w-full max-w-4xl p-6 md:p-10 my-auto animate-in fade-in slide-in-from-bottom-4 duration-300">
                <div className="flex justify-between items-start mb-8">
                    <div>
                        <h2 className="font-display text-6xl uppercase italic tracking-tighter leading-none">
                            Control de <span className="text-accent">Operaciones</span>
                        </h2>
                        <p className="font-mono text-xs text-zinc-500 mt-3 tracking-widest uppercase italic font-bold">Módulo de Gestión v4.2 // Localizado</p>
                    </div>
                    <button onClick={onClose} className="hover:text-accent transition-colors">
                        <X size={32} />
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="space-y-10">
                    <div className="space-y-6">
                        <div className="flex items-center gap-6 bg-white/5 p-6 border border-white/10">
                            <Layers size={32} className="text-accent" />
                            <div className="flex-1">
                                <label className="font-display text-sm uppercase text-zinc-500 block mb-2 font-bold tracking-widest">Tanda / Lote de Inversión</label>
                                <select
                                    className="w-full bg-transparent font-display text-2xl uppercase outline-none text-white italic"
                                    value={formData.tandaId}
                                    onChange={e => setFormData({ ...formData, tandaId: e.target.value })}
                                >
                                    {tandas.map(t => <option key={t.id} value={t.id} className="bg-zinc-900">{t.name}</option>)}
                                    <option value="NEW" className="bg-zinc-900 text-accent">+ CREAR NUEVA TANDA</option>
                                </select>
                            </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                            <InputField
                                label="Modelo"
                                value={formData.celular}
                                onChange={handleModelChange}
                                className="md:col-span-2"
                                placeholder="SAMSUNG A26 5G"
                                list="model-suggestions"
                            />
                            <datalist id="model-suggestions">
                                {Object.keys(modelHistory).map(m => <option key={m} value={m} />)}
                            </datalist>
                            <InputField label="Color" value={formData.color} onChange={e => setFormData({ ...formData, color: e.target.value })} placeholder="NEGRO" />
                            <InputField label="Fecha Compra" type="date" value={formData.fechaCompra} onChange={e => setFormData({ ...formData, fechaCompra: e.target.value })} />
                            <InputField label="ROM" value={formData.rom} onChange={e => setFormData({ ...formData, rom: e.target.value })} />
                            <InputField label="RAM" value={formData.ram} onChange={e => setFormData({ ...formData, ram: e.target.value })} />
                            <InputField label="IMEI 1" value={formData.imei1} onChange={e => setFormData({ ...formData, imei1: e.target.value })} />
                            <InputField label="IMEI 2" value={formData.imei2} onChange={e => setFormData({ ...formData, imei2: e.target.value })} />
                        </div>
                    </div>

                    <div className="h-px bg-border/50" />

                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">
                        <div className="space-y-6">
                            <h3 className="font-display text-2xl uppercase text-accent/80 flex items-center gap-2">
                                <DollarSign size={20} /> Estructura de Costos
                            </h3>
                            <div className="grid grid-cols-2 gap-4">
                                <InputField label="Costo USD" type="number" value={formData.costoUsd} onChange={e => setFormData({ ...formData, costoUsd: e.target.value })} />
                                <InputField label="Dólar" type="number" value={formData.dolarDia} onChange={e => setFormData({ ...formData, dolarDia: e.target.value })} />
                                <InputField label="Envío" type="number" value={formData.costoEnvio} onChange={e => setFormData({ ...formData, costoEnvio: e.target.value })} />
                                <InputField label="Extra" type="number" value={formData.costoExtra} onChange={e => setFormData({ ...formData, costoExtra: e.target.value })} />
                            </div>

                            <div className="bg-white/5 p-4 border border-dashed border-white/20">
                                <InputField
                                    label="Precio de Venta Planificado"
                                    value={formData.precioVenta}
                                    onChange={e => setFormData({ ...formData, precioVenta: e.target.value })}
                                    placeholder="Definí tu precio..."
                                />
                                <div className="mt-2 flex justify-between items-end">
                                    <span className="font-display text-xs text-zinc-500 uppercase">Ganancia Esperada</span>
                                    <span className={`font-display text-2xl ${(formData.expectedProfit || 0) > 0 ? 'text-green-400' : 'text-red-400'}`}>
                                        ${(formData.expectedProfit || 0).toLocaleString()}
                                    </span>
                                </div>
                            </div>
                        </div>

                        {formData.suggestions && (
                            <div className="space-y-6">
                                <div className="bg-accent/5 p-8 border border-accent/20 space-y-6">
                                    <h3 className="font-display text-3xl uppercase flex items-center gap-3 font-bold italic tracking-tighter">
                                        <Smartphone size={24} className="text-accent" /> Sugeridos del Sistema
                                    </h3>
                                    <div className="grid grid-cols-2 gap-10 text-sm font-mono">
                                        <div className="space-y-2">
                                            <p className="text-zinc-500 border-b border-border pb-1 uppercase font-bold">Cash / Local</p>
                                            <div className="flex justify-between"><span>Contado:</span> <span className="text-green-400">${(formData.suggestions.presencial.contado || 0).toLocaleString()}</span></div>
                                            <div className="flex justify-between"><span>3 Cuotas:</span> <span>${(formData.suggestions.presencial.cuotas3 || 0).toLocaleString()}</span></div>
                                            <div className="flex justify-between"><span>6 Cuotas:</span> <span>${(formData.suggestions.presencial.cuotas6 || 0).toLocaleString()}</span></div>
                                        </div>
                                        <div className="space-y-2">
                                            <p className="text-zinc-500 border-b border-border pb-1 uppercase font-bold">Mercado Libre (Ref)</p>
                                            <div className="flex justify-between"><span>1 Pago:</span> <span className="text-accent">${(formData.suggestions.ml.pago1 || 0).toLocaleString()}</span></div>
                                            <div className="flex justify-between"><span>3 Cuotas:</span> <span>${(formData.suggestions.ml.cuotas3 || 0).toLocaleString()}</span></div>
                                            <div className="flex justify-between"><span>6 Cuotas:</span> <span>${(formData.suggestions.ml.cuotas6 || 0).toLocaleString()}</span></div>
                                        </div>
                                    </div>
                                </div>

                                <div className="bg-white/5 p-8 border border-white/10 space-y-6">
                                    <h3 className="font-display text-2xl uppercase italic tracking-tighter text-zinc-400 font-bold">Precios Finales <span className="text-accent underline">Manuales</span> (ML)</h3>
                                    <div className="grid grid-cols-3 gap-4">
                                        <InputField label="ML 1 Pago" value={formData.mlPrecio1} onChange={e => setFormData({ ...formData, mlPrecio1: e.target.value })} placeholder="Ej: 2200000" />
                                        <InputField label="ML 3 Cuotas" value={formData.mlPrecio3} onChange={e => setFormData({ ...formData, mlPrecio3: e.target.value })} placeholder="Ej: 2500000" />
                                        <InputField label="ML 6 Cuotas" value={formData.mlPrecio6} onChange={e => setFormData({ ...formData, mlPrecio6: e.target.value })} placeholder="Ej: 2800000" />
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>

                    <div className="h-px bg-border/50" />

                    <div className="bg-white/2 p-6 border border-white/10 space-y-8">
                        <div className="flex justify-between items-center">
                            <h3 className="font-display text-2xl uppercase flex items-center gap-2">
                                <ShieldCheck size={20} /> Cierre & Liquidación
                            </h3>
                            <div className="flex gap-2 p-1 bg-black/40 border border-white/10">
                                <button
                                    type="button"
                                    onClick={() => setFormData({ ...formData, status: 'STOCK' })}
                                    className={`px-6 py-2 font-display text-xs tracking-widest ${formData.status === 'STOCK' ? 'bg-accent text-white' : 'text-zinc-500'}`}
                                >STOCK</button>
                                <button
                                    type="button"
                                    onClick={() => setFormData({ ...formData, status: 'SOLD' })}
                                    className={`px-6 py-2 font-display text-xs tracking-widest ${formData.status === 'SOLD' ? 'bg-green-600 text-white' : 'text-zinc-500'}`}
                                >VENDIDO</button>
                            </div>
                        </div>

                        {formData.status === 'SOLD' && (
                            <div className="space-y-8 animate-in slide-in-from-top-4">
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                                    <InputField label="Fecha Venta" type="date" value={formData.fechaVenta} onChange={e => setFormData({ ...formData, fechaVenta: e.target.value })} />
                                    <InputField label="Plata Recibida (Neto)" type="number" value={formData.plataRecibida} onChange={e => setFormData({ ...formData, plataRecibida: e.target.value })} />
                                    <div className="space-y-1">
                                        <label className="font-display text-sm uppercase text-zinc-500 tracking-wider font-bold">¿Quién tiene la plata?</label>
                                        <select
                                            className="w-full bg-white/5 border border-white/10 p-2 font-mono text-sm focus:border-accent outline-none text-white italic"
                                            value={formData.quienTienePlata}
                                            onChange={e => setFormData({ ...formData, quienTienePlata: e.target.value })}
                                        >
                                            <option value="" className="bg-zinc-900">Seleccionar...</option>
                                            <option value="SOCIO_B_EFT" className="bg-zinc-900">{partnerB} (EFECTIVO)</option>
                                            <option value="SOCIO_A_EFT" className="bg-zinc-900">{partnerA} (EFECTIVO)</option>
                                            <option value="SOCIO_A_ML" className="bg-zinc-900">ML (CUENTA {partnerA})</option>
                                            <option value="SOCIO_B_ML" className="bg-zinc-900">ML (CUENTA {partnerB})</option>
                                        </select>
                                    </div>
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-10 bg-white/5 p-8 border border-white/10">
                                    <div className="space-y-6">
                                        <h4 className="font-display text-base text-zinc-400 uppercase tracking-[0.2em] border-b border-white/10 pb-4 flex justify-between font-bold italic">
                                            Liquidación Socio: {partnerA}
                                            <span className="text-white">{formData.splitSocioA}%</span>
                                        </h4>
                                        <div className="flex items-center gap-4">
                                            <label className="flex-1 flex items-center gap-3 cursor-pointer group bg-black/30 p-3 border border-white/5 hover:border-accent transition-colors">
                                                <input
                                                    type="checkbox"
                                                    className="w-6 h-6 accent-accent"
                                                    checked={formData.pagadoSocioA}
                                                    onChange={e => setFormData({ ...formData, pagadoSocioA: e.target.checked })}
                                                />
                                                <span className={`font-display text-sm uppercase ${formData.pagadoSocioA ? 'text-green-400' : 'text-zinc-500'}`}>
                                                    {formData.pagadoSocioA ? 'GANANCIA PAGADA' : 'PAGO PENDIENTE'}
                                                </span>
                                            </label>
                                        </div>
                                    </div>

                                    <div className="space-y-4">
                                        <h4 className="font-display text-sm text-zinc-500 uppercase tracking-widest border-b border-white/10 pb-2 flex justify-between">
                                            Liquidación Socio: {partnerB}
                                            <span className="text-white">{formData.splitSocioB}%</span>
                                        </h4>
                                        <div className="flex items-center gap-4">
                                            <label className="flex-1 flex items-center gap-3 cursor-pointer group bg-black/30 p-3 border border-white/5 hover:border-accent transition-colors">
                                                <input
                                                    type="checkbox"
                                                    className="w-6 h-6 accent-accent"
                                                    checked={formData.pagadoSocioB}
                                                    onChange={e => setFormData({ ...formData, pagadoSocioB: e.target.checked })}
                                                />
                                                <span className={`font-display text-sm uppercase ${formData.pagadoSocioB ? 'text-green-400' : 'text-zinc-500'}`}>
                                                    {formData.pagadoSocioB ? 'GANANCIA PAGADA' : 'PAGO PENDIENTE'}
                                                </span>
                                            </label>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>

                    <button
                        type="submit"
                        className="w-full bg-accent hover:bg-accent/90 text-white py-6 font-display text-4xl industrial-border flex items-center justify-center gap-4 transition-all active:scale-[0.98] uppercase italic"
                    >
                        <Save size={36} /> {formData.status === 'STOCK' ? 'Guardar en Inventario' : 'Finalizar Venta'}
                    </button>
                </form>
            </div>
        </div>
    );
}
