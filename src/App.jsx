import React, { useState, useEffect } from 'react';
import { Package, TrendingUp, Users, Plus, List, Trash2, Wallet, ShoppingCart, Info, Database, Layers, CheckCircle2, Clock, Smartphone, ArrowDownRight, ArrowUpRight, History } from 'lucide-react';
import { SalesForm } from './components/SalesForm';
import { BulkImport } from './components/BulkImport';
import { calculateCostoPesos, calculateGananciaNeta, splitProfit } from './utils/calculations';
import { supabase } from './supabase';
import { migrateToCloud } from './utils/migration';

const MOCK_ITEMS = [
    { id: 'm1', tandaId: 'T1', celular: 'DISPOSITIVO ALPHA', rom: '256GB', ram: '8GB', color: 'METAL', costoUsd: 1000, dolarDia: 1400, costoEnvio: 10000, costoExtra: 0, costoPesos: 1410000, status: 'SOLD', precioVenta: 2000000, plataRecibida: 1700000, canalVenta: 'CANAL X', gananciaNeta: 290000, gananciaSocioA: 145000, gananciaSocioB: 145000, pagadoSocioA: true, pagadoSocioB: false, fechaCompra: '2024-01-01', fechaVenta: '2024-01-05', quienTienePlata: 'SOCIO_A_EFT' },
    { id: 'm2', tandaId: 'T1', celular: 'DISPOSITIVO BETA', rom: '128GB', ram: '6GB', color: 'SPACE', costoUsd: 800, dolarDia: 1400, costoEnvio: 8000, costoExtra: 0, costoPesos: 1128000, status: 'STOCK', expectedProfit: 250000, fechaCompra: '2024-01-02' },
];

const MOCK_FUND_LOGS = [
    { id: 'f1', type: 'IN', currency: 'USD', amount: 5000, amountUsd: 5000, responsible: 'Socio A', date: '2024-01-01' },
    { id: 'f2', type: 'IN', currency: 'ARS', amount: 1000000, amountUsd: 682.59, rate: 1465, responsible: 'Socio B', date: '2024-01-05' },
    { id: 'f3', type: 'OUT', currency: 'USD', amount: 1000, amountUsd: 1000, responsible: 'Socio A', date: '2024-01-10' },
];

function App() {
    const [isAdmin, setIsAdmin] = useState(() => localStorage.getItem('sales_tracker_admin') === 'true');
    const [items, setItems] = useState([]);
    const [tandas, setTandas] = useState([]);
    const [currentTandaId, setCurrentTandaId] = useState('');
    const [activeTab, setActiveTab] = useState('TANDA');
    const [fundLogs, setFundLogs] = useState([]);
    const [partners, setPartners] = useState({ a: 'SOCIO A', b: 'SOCIO B' });
    const [modelHistory, setModelHistory] = useState({});
    const [isLoading, setIsLoading] = useState(true);

    // Initial Load & Migration
    useEffect(() => {
        const loadInitialData = async () => {
            setIsLoading(true);
            try {
                // 1. Fetch Tandas
                const { data: tData } = await supabase.from('tandas').select('*');

                // If cloud is empty, migrate from localStorage
                if (!tData || tData.length === 0) {
                    const localItems = JSON.parse(localStorage.getItem('sales_tracker_v4_data') || '[]');
                    const localTandas = JSON.parse(localStorage.getItem('sales_tracker_v4_tandas') || '[{"id":"T1","name":"TANDA 1"}]');
                    const localLogs = JSON.parse(localStorage.getItem('sales_tracker_v4_fundlogs') || '[]');
                    const localPartners = JSON.parse(localStorage.getItem('sales_tracker_v4_partners') || '{"a":"SOCIO A","b":"SOCIO B"}');
                    const localModels = JSON.parse(localStorage.getItem('sales_tracker_v4_models') || '{}');

                    if (localItems.length > 0 || localLogs.length > 0) {
                        await migrateToCloud(localItems, localTandas, localLogs, localPartners, localModels);
                        // Reload after migration
                        window.location.reload();
                        return;
                    } else {
                        // Seed empty cloud if nothing to migrate
                        const { data: seededTanda } = await supabase.from('tandas').insert([{ name: 'TANDA 1 - INICIAL' }]).select();
                        setTandas(seededTanda);
                        setCurrentTandaId(seededTanda[0].id);
                    }
                } else {
                    setTandas(tData);
                    setCurrentTandaId(tData[0].id);

                    // 2. Fetch Items
                    const { data: iData } = await supabase.from('items').select('*');
                    // Map snake_case from DB to camelCase for frontend compatibility
                    setItems((iData || []).map(item => ({
                        ...item,
                        costoUsd: item.costo_usd,
                        dolarDia: item.dolar_dia,
                        costoEnvio: item.costo_envio,
                        costoExtra: item.costo_extra,
                        fechaCompra: item.fecha_compra,
                        fechaVenta: item.fecha_venta,
                        canalVenta: item.canal_venta,
                        precioVenta: item.precio_venta,
                        plataRecibida: item.plata_recibida,
                        quienTienePlata: item.quien_tiene_plata,
                        splitSocioA: item.split_socio_a,
                        splitSocioB: item.split_socio_b,
                        pagadoSocioA: item.pagado_socio_a,
                        pagadoSocioB: item.pagado_socio_b,
                        comisionPagada: item.comision_pagada,
                        costoPesos: item.costo_pesos,
                        gananciaNeta: item.ganancia_neta,
                        gananciaSocioA: item.ganancia_socio_a,
                        gananciaSocioB: item.ganancia_socio_b
                    })));

                    // 3. Fetch Logs
                    const { data: lData } = await supabase.from('fund_logs').select('*');
                    setFundLogs((lData || []).map(l => ({
                        ...l,
                        rate: l.usd_at_time
                    })));

                    // 4. Fetch Settings
                    const { data: sData } = await supabase.from('settings').select('*');
                    const pSett = sData?.find(s => s.key === 'partners');
                    if (pSett) setPartners(pSett.value);
                    const mSett = sData?.find(s => s.key === 'model_history');
                    if (mSett) setModelHistory(mSett.value);
                }
            } catch (err) {
                console.error("Error loading cloud data:", err);
            } finally {
                setIsLoading(false);
            }
        };

        loadInitialData();
    }, []);

    if (isLoading) {
        return (
            <div className="min-h-screen bg-zinc-950 flex items-center justify-center">
                <div className="text-center space-y-4">
                    <Database size={48} className="text-accent animate-pulse mx-auto" />
                    <p className="font-display text-xl text-zinc-500 uppercase tracking-[0.5em] italic animate-pulse">Sincronizando con la nube...</p>
                </div>
            </div>
        );
    }

    const partnerA = isAdmin ? partners.a : 'SOCIO A';
    const partnerB = isAdmin ? partners.b : 'SOCIO B';

    const handleAuth = () => {
        if (isAdmin) {
            setIsAdmin(false);
        } else {
            setShowAuth(true);
            setAuthError('');
        }
    };

    const attemptAuth = (password) => {
        if (password === 'via') {
            setIsAdmin(true);
            setShowAuth(false);
        } else {
            setAuthError('CLAVE INCORRECTA');
        }
    };

    const displayItems = isAdmin ? items : MOCK_ITEMS;

    const handleShowAlert = (title, message) => {
        setAlertData({ title, message });
        setShowAlert(true);
    };

    const handleSaveItem = async (formData) => {
        let finalTandaId = formData.tandaId;

        if (formData.tandaId === 'NEW') {
            const { data: newTanda, error: tError } = await supabase
                .from('tandas')
                .insert([{ name: `TANDA ${tandas.length + 1}` }])
                .select();

            if (tError) {
                console.error("Error creating tanda:", tError);
                return;
            }
            setTandas([...tandas, newTanda[0]]);
            finalTandaId = newTanda[0].id;
        }

        const costoPesos = calculateCostoPesos(formData.costoUsd, formData.dolarDia, formData.costoEnvio, formData.costoExtra);
        let gananciaNeta = 0;
        let splitResult = { socioA: 0, socioB: 0 };

        if (formData.status === 'SOLD') {
            gananciaNeta = calculateGananciaNeta(formData.plataRecibida, costoPesos);
            splitResult = splitProfit(gananciaNeta, {
                socioA: Number(formData.splitSocioA),
                socioB: Number(formData.splitSocioB)
            });
        }

        const dbItem = {
            tanda_id: finalTandaId,
            fecha_compra: formData.fechaCompra,
            celular: formData.celular,
            rom: formData.rom,
            ram: formData.ram,
            imei1: formData.imei1,
            imei2: formData.imei2,
            color: formData.color,
            costo_usd: formData.costoUsd,
            dolar_dia: formData.dolarDia,
            costo_envio: formData.costoEnvio,
            costo_extra: formData.costoExtra,
            status: formData.status,
            fecha_venta: formData.fechaVenta,
            canal_venta: formData.canalVenta,
            precio_venta: formData.precioVenta,
            ml_precio1: formData.mlPrecio1,
            ml_precio3: formData.mlPrecio3,
            ml_precio6: formData.mlPrecio6,
            plata_recibida: formData.plataRecibida,
            quien_tiene_plata: formData.quienTienePlata,
            split_socio_a: formData.splitSocioA,
            split_socio_b: formData.splitSocioB,
            pagado_socio_a: formData.pagadoSocioA,
            pagado_socio_b: formData.pagadoSocioB,
            comision_pagada: formData.comisionPagada,
            costo_pesos: costoPesos,
            ganancia_neta: gananciaNeta,
            ganancia_socio_a: splitResult.socioA,
            ganancia_socio_b: splitResult.socioB
        };

        let result;
        if (editingItem) {
            result = await supabase.from('items').update(dbItem).eq('id', editingItem.id).select();
        } else {
            result = await supabase.from('items').insert([dbItem]).select();
        }

        if (result.error) {
            console.error("Error saving item:", result.error);
            return;
        }

        // Map back to frontend camelCase
        const savedItem = {
            ...result.data[0],
            costoUsd: result.data[0].costo_usd,
            dolarDia: result.data[0].dolar_dia,
            costoEnvio: result.data[0].costo_envio,
            costoExtra: result.data[0].costo_extra,
            fechaCompra: result.data[0].fecha_compra,
            fechaVenta: result.data[0].fecha_venta,
            canalVenta: result.data[0].canal_venta,
            precioVenta: result.data[0].precio_venta,
            plataRecibida: result.data[0].plata_recibida,
            quienTienePlata: result.data[0].quien_tiene_plata,
            splitSocioA: result.data[0].split_socio_a,
            splitSocioB: result.data[0].split_socio_b,
            pagadoSocioA: result.data[0].pagado_socio_a,
            pagadoSocioB: result.data[0].pagado_socio_b,
            comisionPagada: result.data[0].comision_pagada,
            costoPesos: result.data[0].costo_pesos,
            gananciaNeta: result.data[0].ganancia_neta,
            gananciaSocioA: result.data[0].ganancia_socio_a,
            gananciaSocioB: result.data[0].ganancia_socio_b
        };

        if (editingItem) {
            setItems(items.map(i => i.id === editingItem.id ? savedItem : i));
        } else {
            setItems([savedItem, ...items]);
        }

        // Update Model History in Settings
        if (formData.celular) {
            const newHistory = {
                ...modelHistory,
                [formData.celular.toUpperCase()]: {
                    rom: formData.rom,
                    ram: formData.ram,
                    costoUsd: formData.costoUsd
                }
            };
            setModelHistory(newHistory);
            await supabase.from('settings').upsert({ key: 'model_history', value: newHistory });
        }

        setShowForm(false);
        setEditingItem(null);
    };

    const handleDeleteFundLog = (id) => {
        setConfirmData({
            title: 'CONFIRMAR ELIMINACIÓN',
            message: '¿Estás seguro de que deseas borrar este registro de fondos? Esta acción no se puede deshacer.',
            action: async () => {
                const { error } = await supabase.from('fund_logs').delete().eq('id', id);
                if (!error) setFundLogs(fundLogs.filter(f => f.id !== id));
            }
        });
        setShowConfirm(true);
    };

    const metrics = displayItems.reduce((acc, item) => {
        const isCurrentTanda = item.tandaId === currentTandaId;

        acc.totalCostoPesos += (item.costoPesos || 0);
        if (item.status === 'SOLD') {
            acc.totalGananciaNeta += (item.gananciaNeta || 0);
            if (item.quienTienePlata === 'SOCIO_A_EFT') acc.cajaAna += Number(item.plataRecibida || 0);
            if (item.quienTienePlata === 'SOCIO_B_EFT') acc.cajaGabi += Number(item.plataRecibida || 0);
            if (item.quienTienePlata === 'SOCIO_A_ML') acc.cajaMLAna += Number(item.plataRecibida || 0);
            if (item.quienTienePlata === 'SOCIO_B_ML') acc.cajaMLGabi += Number(item.plataRecibida || 0);
        }

        if (isCurrentTanda) {
            acc.tandaInversion += (item.costoPesos || 0);
            if (item.status === 'SOLD') {
                acc.tandaGanancia += (item.gananciaNeta || 0);
                if (!item.pagadoSocioA) acc.porPagarAna += (item.gananciaSocioA || 0);
                if (!item.pagadoSocioB) acc.porPagarGabi += (item.gananciaSocioB || 0);
            } else {
                acc.tandaStockUnits += 1;
            }
        }

        return acc;
    }, {
        totalCostoPesos: 0, totalGananciaNeta: 0,
        cajaAna: 0, cajaGabi: 0, cajaMLAna: 0, cajaMLGabi: 0,
        tandaInversion: 0, tandaGanancia: 0, tandaStockUnits: 0,
        porPagarAna: 0, porPagarGabi: 0
    });

    const displayFundLogs = isAdmin ? fundLogs : MOCK_FUND_LOGS;

    const globalFund = displayFundLogs.reduce((acc, log) => {
        const sign = log.type === 'IN' ? 1 : -1;
        const value = Number(log.amount) * sign;
        const valueUsd = Number(log.amountUsd || 0) * sign;

        if (log.currency === 'USD') acc.usd += value;
        else acc.ars += value;

        acc.totalUsd += valueUsd;
        return acc;
    }, { ars: 0, usd: 0, totalUsd: 0 });

    const tandaSummaries = tandas.map(t => {
        const tItems = displayItems.filter(i => i.tandaId === t.id);
        return {
            ...t,
            inversion: tItems.reduce((sum, i) => sum + (i.costoPesos || 0), 0),
            ganancia: tItems.reduce((sum, i) => sum + (i.gananciaNeta || 0), 0),
            unidades: tItems.length
        };
    });

    const filteredItems = displayItems.filter(i => i.tandaId === currentTandaId || !isAdmin);

    return (
        <div className="min-h-screen p-4 md:p-8 space-y-8 max-w-[1600px] mx-auto pb-24">
            <header className="flex flex-col xl:flex-row justify-between items-start xl:items-end gap-12 mb-24">
                <div>
                    <div className="flex items-center gap-8 mb-6">
                        <div className="w-20 h-20 bg-accent industrial-border flex items-center justify-center transform -rotate-3 cursor-pointer shadow-2xl shadow-accent/20" onClick={() => setActiveTab('TANDA')}>
                            <Package size={42} className="text-white" />
                        </div>
                        <div>
                            <h1 className="font-display text-6xl md:text-8xl tracking-tighter uppercase italic leading-[0.6] text-white cursor-pointer select-none" onClick={() => setActiveTab('TANDA')}>
                                CG <span className="text-accent underline decoration-white/10 underline-offset-[12px]">Soluciones</span>
                            </h1>
                            <p className="font-mono text-[10px] text-zinc-600 uppercase tracking-[0.6em] mt-5 ml-2">
                                Control de Ventas & Logística // v4.5
                            </p>
                        </div>
                    </div>
                </div>

                <div className="flex flex-wrap gap-6 w-full xl:w-auto items-center">
                    <div className="flex bg-zinc-900 industrial-border p-1.5 shadow-xl">
                        <button onClick={() => setActiveTab('TANDA')} className={`px-8 py-3 font-display text-xl uppercase italic tracking-tighter transition-all ${activeTab === 'TANDA' ? 'bg-accent text-white' : 'text-zinc-600 hover:text-zinc-400'}`}>MI TANDA</button>
                        <button onClick={() => setActiveTab('GLOBAL')} className={`px-8 py-3 font-display text-xl uppercase italic tracking-tighter transition-all ${activeTab === 'GLOBAL' ? 'bg-white/10 text-white' : 'text-zinc-600 hover:text-zinc-400'}`}>FONDO & GLOBAL</button>
                    </div>

                    {activeTab === 'TANDA' && (
                        <div className="min-w-[240px] bg-white/5 industrial-border p-5 flex items-center gap-5 shadow-lg">
                            <Layers size={28} className="text-zinc-500" />
                            <select
                                className="bg-transparent font-display text-3xl uppercase outline-none text-white italic w-full cursor-pointer hover:text-accent transition-colors"
                                value={currentTandaId}
                                onChange={e => setCurrentTandaId(e.target.value)}
                            >
                                {tandas.map(t => <option key={t.id} value={t.id} className="bg-zinc-900">{t.name}</option>)}
                            </select>
                        </div>
                    )}
                    {!isAdmin && (
                        <div className="bg-orange-500/10 text-orange-400 px-8 py-5 industrial-border font-display text-base flex items-center gap-3 uppercase italic animate-pulse border-orange-500/30">
                            <Info size={20} /> MODO DEMO ACTIVO
                        </div>
                    )}
                    <button
                        onClick={handleAuth}
                        className={`px-10 py-5 font-display text-2xl industrial-border flex items-center justify-center gap-4 transition-all shadow-xl active:scale-95 ${isAdmin ? 'bg-zinc-800 text-green-400 border-green-400/30' : 'bg-accent text-white border-accent'}`}
                    >
                        {isAdmin ? <CheckCircle2 size={28} /> : <Database size={28} />} {isAdmin ? 'ADMIN ACTIVADO' : 'ACTIVAR ADMIN'}
                    </button>

                    {isAdmin && (
                        <>
                            <button onClick={() => setShowImport(true)} className="bg-white/5 hover:bg-white/10 text-zinc-400 px-10 py-5 font-display text-2xl industrial-border flex items-center justify-center gap-4 transition-all shadow-lg">
                                <Database size={28} /> IMPORTAR
                            </button>
                        </>
                    )}
                </div>
            </header>

            {activeTab === 'TANDA' ? (
                <>
                    <div className="flex flex-col lg:flex-row gap-12">
                        <div className="flex-1 min-w-[320px] space-y-10">
                            <h3 className="font-display text-4xl uppercase text-accent/60 tracking-widest flex items-center gap-4 italic font-bold">
                                <Layers size={28} /> Métricas de la Tanda
                            </h3>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                <MetricBox title="Inversión en Tanda" value={`$${(metrics.tandaInversion || 0).toLocaleString()}`} icon={<Wallet size={32} />} highlight />
                                <MetricBox title="Ganancia Generada" value={`$${(metrics.tandaGanancia || 0).toLocaleString()}`} icon={<TrendingUp size={32} />} highlight />

                                <div className="glass p-10 md:p-12 industrial-border space-y-8 bg-black/20">
                                    <div className="flex justify-between items-center border-b border-white/10 pb-6">
                                        <span className="font-display text-xl text-zinc-500 uppercase tracking-tighter">A Liquidar: {partnerA}</span>
                                        <span className="font-mono text-4xl text-orange-400 font-bold">${(metrics.porPagarAna || 0).toLocaleString()}</span>
                                    </div>
                                    <div className="flex justify-between items-center">
                                        <span className="font-display text-xl text-zinc-500 uppercase tracking-tighter">A Liquidar: {partnerB}</span>
                                        <span className="font-mono text-4xl text-orange-400 font-bold">${(metrics.porPagarGabi || 0).toLocaleString()}</span>
                                    </div>
                                </div>

                                <div className="glass p-12 industrial-border flex flex-col justify-between overflow-hidden relative min-h-[220px] bg-zinc-900/40">
                                    <div className="absolute -bottom-10 -right-10 opacity-5 pointer-events-none scale-150">
                                        <Smartphone size={160} />
                                    </div>
                                    <span className="font-display text-base text-zinc-500 uppercase tracking-[0.2em] italic font-black">Stock Actual</span>
                                    <div className="flex items-baseline gap-4 relative z-10 mt-6">
                                        <span className="text-6xl md:text-7xl font-display leading-none text-white tracking-tighter italic font-black">{metrics.tandaStockUnits}</span>
                                        <span className="font-mono text-[9px] text-accent uppercase tracking-[0.3em] font-black border-l border-white/10 pl-4">Unidades<br />Disponibles</span>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div className="flex-1 min-w-[320px] lg:max-w-[500px] 2xl:max-w-none space-y-10">
                            <h3 className="font-display text-4xl uppercase text-zinc-700 tracking-widest flex items-center gap-4 italic font-bold">
                                <TrendingUp size={28} /> Resultados de Inversión
                            </h3>
                            <div className="glass industrial-border p-12 py-16 space-y-12 flex flex-col justify-center bg-zinc-900/40 relative min-h-[300px]">
                                <div className="absolute top-0 right-0 p-8 opacity-10">
                                    <TrendingUp size={120} />
                                </div>
                                <LargeMetric label="Inversión Total en esta Tanda" value={metrics.tandaInversion} />
                                <LargeMetric label="Retorno / Ganancia Real" value={metrics.tandaGanancia} highlight />
                            </div>
                        </div>
                    </div>

                    <div className="pt-32 mt-20 border-t border-white/10">
                        <div className="glass industrial-border p-12 md:p-20 bg-black/40 relative z-10 w-full overflow-hidden shadow-2xl">
                            <div className="flex items-center justify-between mb-16 border-b border-white/10 pb-12">
                                <div className="flex items-center gap-10">
                                    <List size={56} className="text-accent" />
                                    <h2 className="font-display text-5xl md:text-7xl uppercase tracking-tighter italic leading-none">Detalle Tanda <span className="text-accent underline decoration-white/5 underline-offset-8">{currentTandaId}</span></h2>
                                </div>
                                {isAdmin && (
                                    <button
                                        onClick={() => { setEditingItem(null); setShowForm(true); }}
                                        className="bg-accent hover:bg-accent/80 text-white px-12 py-6 font-display text-3xl industrial-border flex items-center gap-4 transition-all shadow-xl active:scale-95 italic uppercase"
                                    >
                                        <Plus size={32} /> Nuevo Equipo
                                    </button>
                                )}
                            </div>

                            <div className="overflow-x-auto">
                                <table className="w-full border-collapse font-mono text-xs uppercase whitespace-nowrap">
                                    <thead>
                                        <tr className="text-zinc-600 text-left border-b border-white/10">
                                            <th className="p-6 font-bold tracking-widest">Estado / Equipo</th>
                                            <th className="p-6 font-bold tracking-widest">Carga (Costos)</th>
                                            <th className="p-6 font-bold tracking-widest">Salida (Venta)</th>
                                            <th className="p-6 font-bold tracking-widest">Liquidación</th>
                                            <th className="p-6"></th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {filteredItems.map(item => (
                                            <tr key={item.id} className="border-b border-white/5 hover:bg-white/[0.03] transition-colors group">
                                                <td className="p-6">
                                                    <div className="flex flex-col gap-2">
                                                        <span className={`w-fit px-3 py-1 text-[10px] font-bold industrial-border ${item.status === 'SOLD' ? 'bg-green-500/10 text-green-500 border-green-500/20' : 'bg-zinc-800 text-zinc-500 border-white/10'}`}>
                                                            {item.status === 'SOLD' ? 'VENDIDO' : 'STOCK'}
                                                        </span>
                                                        <span className="text-lg font-display text-white italic">{item.celular}</span>
                                                        <span className="text-[10px] text-zinc-500">{item.rom} | {item.ram} | {item.color}</span>
                                                    </div>
                                                </td>
                                                <td className="p-6">
                                                    <div className="space-y-1">
                                                        <div className="text-zinc-400">USD {item.costoUsd} <span className="text-[10px] text-zinc-600">@ {item.dolarDia}</span></div>
                                                        <div className="text-lg font-display text-zinc-500 leading-none">${(item.costoPesos || 0).toLocaleString()}</div>
                                                    </div>
                                                </td>
                                                <td className="p-6">
                                                    {item.status === 'SOLD' ? (
                                                        <div className="space-y-1">
                                                            <div className="text-accent font-bold text-lg leading-none">${(Number(item.precioVenta) || 0).toLocaleString()}</div>
                                                            <div className="text-[10px] text-zinc-500 flex items-center gap-2">
                                                                NETO: ${(Number(item.plataRecibida) || 0).toLocaleString()} <span className="opacity-30">|</span> {item.canalVenta}
                                                            </div>
                                                        </div>
                                                    ) : (
                                                        <div className="space-y-1 opacity-40">
                                                            <div className="text-zinc-700 italic">Ganancia Esperada</div>
                                                            <div className="font-display text-lg text-zinc-500">${(item.expectedProfit || 0).toLocaleString()}</div>
                                                        </div>
                                                    )}
                                                </td>
                                                <td className="p-6">
                                                    {item.status === 'SOLD' ? (
                                                        <div className="space-y-3">
                                                            <div className="text-green-400 font-display text-2xl leading-none">+${(item.gananciaNeta || 0).toLocaleString()}</div>
                                                            <div className="flex gap-4">
                                                                <StatusBadge label="SOCIO A" active={item.pagadoSocioA} />
                                                                <StatusBadge label="SOCIO B" active={item.pagadoSocioB} />
                                                            </div>
                                                        </div>
                                                    ) : <span className="text-zinc-800 italic tracking-widest text-[10px]">EN INVENTARIO</span>}
                                                </td>
                                                <td className="p-6 text-right">
                                                    {isAdmin && (
                                                        <div className="flex gap-4 justify-end opacity-0 group-hover:opacity-100 transition-all transform group-hover:translate-x-[-10px]">
                                                            <button onClick={() => { setEditingItem(item); setShowForm(true); }} className="hover:text-accent transform hover:scale-125 transition-all outline-none">
                                                                <Info size={20} />
                                                            </button>
                                                            <button
                                                                onClick={() => {
                                                                    setConfirmData({
                                                                        title: 'ELIMINAR EQUIPO',
                                                                        message: `¿Estás seguro de que deseas borrar el ${item.celular}? Esta operación es irreversible.`,
                                                                        action: async () => {
                                                                            const { error } = await supabase.from('items').delete().eq('id', item.id);
                                                                            if (!error) setItems(items.filter(i => i.id !== item.id));
                                                                        }
                                                                    });
                                                                    setShowConfirm(true);
                                                                }}
                                                                className="hover:text-red-500 transform hover:scale-125 transition-all outline-none"
                                                            >
                                                                <Trash2 size={24} />
                                                            </button>
                                                        </div>
                                                    )}
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    </div>
                </>
            ) : (
                <div className="grid grid-cols-1 lg:grid-cols-2 2xl:grid-cols-4 gap-12 animate-in slide-in-from-right-4 duration-500">
                    <div className="lg:col-span-2 space-y-10">
                        <h3 className="font-display text-3xl uppercase text-zinc-700 tracking-widest flex items-center gap-4 italic font-bold">
                            <Wallet size={24} /> Historial del Fondo Común
                        </h3>
                        <div className="glass industrial-border overflow-hidden bg-black/40 shadow-2xl">
                            <div className="max-h-[700px] overflow-y-auto">
                                <table className="w-full text-sm font-mono uppercase">
                                    <thead className="sticky top-0 bg-zinc-900 border-b border-white/10 z-10">
                                        <tr className="text-zinc-500 text-left">
                                            <th className="p-6 font-bold tracking-widest text-sm">Fecha</th>
                                            <th className="p-6 font-bold tracking-widest text-sm">Tipo</th>
                                            <th className="p-6 font-bold tracking-widest text-sm">Monto</th>
                                            <th className="p-6 font-bold tracking-widest text-sm">Conversión @ USD</th>
                                            <th className="p-6 font-bold tracking-widest text-sm">Residuo</th>
                                            <th className="p-6"></th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {displayFundLogs.length === 0 ? (
                                            <tr><td colSpan="6" className="p-20 text-center text-zinc-700 italic uppercase font-display text-4xl opacity-20">Sin movimientos</td></tr>
                                        ) : displayFundLogs.map(log => (
                                            <tr key={log.id} className="border-b border-white/5 hover:bg-white/5 transition-all group">
                                                <td className="p-6 text-zinc-500">{log.date}</td>
                                                <td className="p-6">
                                                    <span className={`px-3 py-1 rounded-none text-[10px] font-bold ${log.type === 'IN' ? 'bg-green-500/20 text-green-500' : 'bg-red-500/20 text-red-500'}`}>
                                                        {log.type === 'IN' ? 'INGRESO' : 'RETIRO'}
                                                    </span>
                                                </td>
                                                <td className="p-6 font-bold text-lg text-white">
                                                    {log.currency === 'USD' ? 'U$D' : '$'} {Number(log.amount).toLocaleString()}
                                                </td>
                                                <td className="p-6">
                                                    {log.currency === 'ARS' && log.rate ? (
                                                        <div className="flex flex-col gap-1">
                                                            <span className="text-zinc-600 italic text-[10px] tracking-widest">BLUE @ {log.rate}</span>
                                                            <span className="text-green-400 font-bold text-sm">U$D {Number(log.amountUsd || 0).toLocaleString()}</span>
                                                        </div>
                                                    ) : log.currency === 'USD' ? (
                                                        <span className="text-zinc-700 italic text-[10px] uppercase">Directo USD</span>
                                                    ) : '-'}
                                                </td>
                                                <td className="p-6 text-zinc-400 font-display text-base italic">{log.responsible}</td>
                                                <td className="p-6 text-right">
                                                    {isAdmin && (
                                                        <button onClick={() => handleDeleteFundLog(log.id)} className="text-zinc-700 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-all p-3 hover:bg-red-500/10 active:scale-90">
                                                            <Trash2 size={18} />
                                                        </button>
                                                    )}
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    </div>

                    <div className="space-y-12">
                        <h3 className="font-display text-4xl uppercase text-zinc-700 tracking-widest flex items-center gap-4 italic font-bold">
                            <Wallet size={28} /> Capital Actual
                        </h3>
                        <div className="glass industrial-border p-10 py-12 space-y-10 bg-gradient-to-br from-zinc-900/50 to-black/50 shadow-2xl relative overflow-hidden group">
                            <div className="absolute top-0 right-0 p-6 opacity-5 group-hover:opacity-10 transition-opacity">
                                <Wallet size={120} />
                            </div>
                            <div className="flex justify-between items-end border-b border-white/5 pb-8 relative z-10">
                                <span className="font-display text-xl text-zinc-500 uppercase tracking-[0.2em] leading-none">Capital ARS</span>
                                <span className="font-display text-5xl text-blue-400 tracking-tighter italic font-black text-right">${(globalFund.ars || 0).toLocaleString()}</span>
                            </div>
                            <div className="flex justify-between items-end border-b border-white/5 pb-8 relative z-10">
                                <div className="flex flex-col">
                                    <span className="font-display text-xl text-zinc-500 uppercase tracking-[0.2em] leading-none">Capital USD</span>
                                    <span className="font-mono text-[10px] text-zinc-600 mt-2 uppercase italic tracking-widest">Reserva Líquida</span>
                                </div>
                                <span className="font-display text-5xl text-green-400 tracking-tighter italic font-black text-right">U$D {(globalFund.usd || 0).toLocaleString()}</span>
                            </div>
                            <div className="flex justify-between items-end border-b border-white/5 pb-8 relative z-10 bg-accent/5 p-4 -mx-4">
                                <div className="flex flex-col">
                                    <span className="font-display text-xl text-accent uppercase tracking-[0.2em] leading-none">VALOR TOTAL</span>
                                    <span className="font-mono text-[10px] text-zinc-500 mt-2 uppercase italic tracking-widest">USD EQUIVALENTE</span>
                                </div>
                                <span className="font-display text-6xl text-white tracking-tighter italic font-black text-right">U$D {(globalFund.totalUsd || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                            </div>
                            {isAdmin && (
                                <button onClick={() => setShowFundForm(true)} className="w-full bg-accent hover:bg-accent/80 text-white py-6 font-display text-2xl industrial-border uppercase italic flex items-center justify-center gap-4 transition-all active:scale-95 shadow-xl relative z-10">
                                    <Plus size={32} /> REGISTRAR MOVIMIENTO
                                </button>
                            )}
                        </div>

                        <h3 className="font-display text-3xl uppercase text-zinc-700 tracking-widest flex items-center gap-4 italic font-bold pt-8">
                            <History size={24} /> Resumen por Lotes
                        </h3>
                        <div className="glass industrial-border p-8 bg-black/40 shadow-xl max-h-[400px] overflow-y-auto">
                            <div className="space-y-8">
                                {tandaSummaries.length === 0 ? (
                                    <div className="text-zinc-700 font-display uppercase italic text-center py-10 opacity-30">Sin tandas activas</div>
                                ) : tandaSummaries.map(t => (
                                    <div key={t.id} className="flex justify-between items-center border-b border-white/5 pb-6 hover:bg-white/5 transition-colors p-2 -mx-2">
                                        <div>
                                            <div className="font-display text-2xl text-white tracking-tighter italic uppercase">{t.name}</div>
                                            <div className="font-mono text-[10px] text-zinc-600 mt-2 uppercase tracking-widest">{t.unidades} UNIDADES CARGADAS</div>
                                        </div>
                                        <div className="text-right">
                                            <div className="font-mono text-xl text-green-400 font-bold">+${t.ganancia.toLocaleString()}</div>
                                            <div className="font-mono text-[10px] text-zinc-600 mt-2 uppercase italic tracking-widest">INV: ${t.inversion.toLocaleString()}</div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>

                    <div className="space-y-12">
                        <h3 className="font-display text-3xl uppercase text-zinc-700 tracking-widest flex items-center gap-4 italic font-bold">
                            <TrendingUp size={24} /> Totales Generales
                        </h3>
                        <div className="glass industrial-border p-10 py-12 space-y-12 bg-black/60 shadow-2xl">
                            <LargeMetric label="Inversión Histórica Total (Lotes)" value={metrics.totalCostoPesos} />
                            <LargeMetric label="Ganancia Neta Acumulada" value={metrics.totalGananciaNeta} highlight />

                            <div className="pt-10 border-t border-white/10 space-y-6">
                                <CajaRow label={`Efectivo ${partnerA}`} value={metrics.cajaAna} color="text-blue-400" />
                                <CajaRow label={`Efectivo ${partnerB}`} value={metrics.cajaGabi} color="text-green-400" />
                                <CajaRow label={`ML Cuenta ${partnerA}`} value={metrics.cajaMLAna} color="text-orange-300" />
                                <CajaRow label={`ML Cuenta ${partnerB}`} value={metrics.cajaMLGabi} color="text-orange-400" />
                            </div>

                            {isAdmin && (
                                <div className="pt-12 mt-12 border-t border-white/20 space-y-8 bg-white/5 -mx-10 p-10">
                                    <h4 className="font-display text-xl uppercase text-zinc-500 tracking-[0.3em] flex items-center gap-3 italic font-bold">
                                        <Users size={20} className="text-accent" /> Configuración de Socios
                                    </h4>
                                    <div className="space-y-6">
                                        <div className="space-y-4">
                                            <label className="font-mono text-[10px] text-accent uppercase font-bold tracking-[0.4em] block">Label Socio A</label>
                                            <input
                                                className="w-full bg-black/40 border border-white/10 p-5 font-display text-2xl uppercase italic text-white outline-none focus:border-accent transition-all shadow-inner"
                                                value={partners.a}
                                                onChange={async (e) => {
                                                    const newP = { ...partners, a: e.target.value.toUpperCase() };
                                                    setPartners(newP);
                                                    await supabase.from('settings').upsert({ key: 'partners', value: newP });
                                                }}
                                                placeholder="P. EJ. ANA"
                                            />
                                        </div>
                                        <div className="space-y-4">
                                            <label className="font-mono text-[10px] text-accent uppercase font-bold tracking-[0.4em] block">Label Socio B</label>
                                            <input
                                                className="w-full bg-black/40 border border-white/10 p-5 font-display text-2xl uppercase italic text-white outline-none focus:border-accent transition-all shadow-inner"
                                                value={partners.b}
                                                onChange={async (e) => {
                                                    const newP = { ...partners, b: e.target.value.toUpperCase() };
                                                    setPartners(newP);
                                                    await supabase.from('settings').upsert({ key: 'partners', value: newP });
                                                }}
                                                placeholder="P. EJ. GABI"
                                            />
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )
            }

            {showForm && (
                <SalesForm
                    onClose={() => { setShowForm(false); setEditingItem(null); }}
                    onSave={handleSaveItem}
                    initialData={editingItem}
                    tandas={tandas}
                    partnerA={partnerA}
                    partnerB={partnerB}
                    modelHistory={modelHistory}
                />
            )}
            {showImport && (
                <BulkImport
                    onClose={() => setShowImport(false)}
                    onImport={async (data) => {
                        const dbItems = data.map(i => ({
                            tanda_id: currentTandaId,
                            celular: i.celular,
                            rom: i.rom,
                            ram: i.ram,
                            imei1: i.imei1,
                            imei2: i.imei2,
                            color: i.color,
                            costo_usd: i.costoUsd,
                            dolar_dia: i.dolarDia,
                            costo_envio: i.costoEnvio,
                            costo_extra: i.costoExtra,
                            status: i.status,
                            costo_pesos: i.costoPesos
                        }));
                        const { data: saved, error } = await supabase.from('items').insert(dbItems).select();
                        if (!error) {
                            // Map back to camelCase
                            const mapped = saved.map(s => ({ ...s, costoUsd: s.costo_usd, dolarDia: s.dolar_dia, costoEnvio: s.costo_envio, costoExtra: s.costo_extra, costoPesos: s.costo_pesos }));
                            setItems([...mapped, ...items]);
                        }
                        setShowImport(false);
                    }}
                    currentTandaId={currentTandaId}
                />
            )}
            {
                showFundForm && <FundForm
                    onClose={() => setShowFundForm(false)}
                    onSave={async (log) => {
                        const dbLog = {
                            type: log.type,
                            amount: log.amount,
                            currency: log.currency,
                            date: log.date,
                            description: `Movimiento de ${log.responsible}`,
                            usd_at_time: log.rate || log.amountUsd
                        };
                        const { data: saved, error } = await supabase.from('fund_logs').insert([dbLog]).select();
                        if (!error) {
                            setFundLogs([{ ...saved[0], rate: saved[0].usd_at_time }, ...fundLogs]);
                        }
                        setShowFundForm(false);
                    }}
                    currentBalance={globalFund}
                    partnerA={partnerA}
                    partnerB={partnerB}
                    showAlert={handleShowAlert}
                />
            }

            {showAuth && <AuthModal onClose={() => setShowAuth(false)} onConfirm={attemptAuth} error={authError} />}
            {
                showConfirm && (
                    <ConfirmModal
                        title={confirmData.title}
                        message={confirmData.message}
                        onConfirm={() => { confirmData.action(); setShowConfirm(false); }}
                        onClose={() => setShowConfirm(false)}
                    />
                )
            }
            {
                showAlert && (
                    <AlertModal
                        title={alertData.title}
                        message={alertData.message}
                        onClose={() => setShowAlert(false)}
                    />
                )
            }
        </div >
    );
}

function FundForm({ onClose, onSave, currentBalance, partnerA, partnerB, showAlert }) {
    const [data, setData] = useState({ type: 'IN', currency: 'USD', amount: '', rate: '1465', responsible: partnerA, date: new Date().toISOString().split('T')[0] });
    const [error, setError] = useState('');

    // Sugerencia de conversión ARS -> USD
    const calculatedUsd = data.currency === 'ARS' && data.amount && data.rate ? (Number(data.amount) / Number(data.rate)).toFixed(2) : null;

    const handleSave = () => {
        const amt = Number(data.amount);
        if (!amt) return setError('INGRESE UN MONTO VÁLIDO');

        if (data.type === 'OUT') {
            const balance = data.currency === 'USD' ? currentBalance.usd : currentBalance.ars;
            if (amt > balance) {
                return setError(`FONDOS INSUFICIENTES. SALDO: ${data.currency === 'USD' ? 'U$D' : '$'} ${balance.toLocaleString()}`);
            }
        }

        const logEntry = {
            ...data,
            amountUsd: data.currency === 'ARS' ? (amt / Number(data.rate)) : amt
        };

        onSave(logEntry);
    };

    return (
        <div className="fixed inset-0 bg-black/95 backdrop-blur-md flex items-center justify-center p-4 z-[60]">
            <div className="glass industrial-border w-full max-w-md p-8 space-y-6 animate-in zoom-in-95 duration-200">
                <h3 className="font-display text-3xl uppercase italic tracking-tighter">Registrar <span className="text-accent">Movimiento</span></h3>
                <div className="space-y-4">
                    <div className="flex gap-2">
                        <button onClick={() => setData({ ...data, type: 'IN' })} className={`flex-1 py-3 font-display text-sm border transition-all ${data.type === 'IN' ? 'bg-green-500 border-green-500 text-white' : 'border-white/10 text-zinc-500 hover:border-white/30'}`}>INGRESO</button>
                        <button onClick={() => setData({ ...data, type: 'OUT' })} className={`flex-1 py-3 font-display text-sm border transition-all ${data.type === 'OUT' ? 'bg-red-500 border-red-500 text-white' : 'border-white/10 text-zinc-500 hover:border-white/30'}`}>RETIRO</button>
                    </div>
                    <div className="flex gap-2">
                        <button onClick={() => setData({ ...data, currency: 'USD' })} className={`flex-1 py-3 font-display text-sm border transition-all ${data.currency === 'USD' ? 'border-accent text-accent' : 'border-white/10 text-zinc-500 hover:border-white/30'}`}>DÓLARES (USD)</button>
                        <button onClick={() => setData({ ...data, currency: 'ARS' })} className={`flex-1 py-3 font-display text-sm border transition-all ${data.currency === 'ARS' ? 'border-accent text-accent' : 'border-white/10 text-zinc-500 hover:border-white/30'}`}>PESOS (ARS)</button>
                    </div>

                    <div className="space-y-4">
                        <div className="grid grid-cols-2 gap-3">
                            <input type="number" placeholder="Monto" className="w-full bg-white/5 border border-white/10 p-5 font-mono text-3xl text-white outline-none focus:border-accent transition-colors" value={data.amount} onChange={e => setData({ ...data, amount: e.target.value })} />
                            {data.currency === 'ARS' ? (
                                <input type="number" placeholder="Dolar @ 1465" className="w-full bg-white/5 border border-white/10 p-5 font-mono text-3xl text-accent outline-none focus:border-accent transition-colors" value={data.rate} onChange={e => setData({ ...data, rate: e.target.value })} title="Tipo de cambio" />
                            ) : (
                                <div className="bg-white/5 border border-white/10 p-5 flex items-center justify-center font-display text-zinc-600 text-xs uppercase italic">No aplica tasa</div>
                            )}
                        </div>
                        {calculatedUsd && (
                            <div className="text-right font-mono text-[10px] text-zinc-500 uppercase tracking-widest italic">
                                Equivalente Final: <span className="text-green-400">U$D {calculatedUsd}</span>
                            </div>
                        )}
                        {error && <p className="text-red-500 font-mono text-[10px] uppercase text-center mt-2 tracking-tighter italic animate-pulse">{error}</p>}
                    </div>

                    <select className="w-full bg-zinc-900 border border-white/10 p-5 font-display text-xl uppercase outline-none text-white italic" value={data.responsible} onChange={e => setData({ ...data, responsible: e.target.value })}>
                        <option value={partnerA}>{partnerA}</option>
                        <option value={partnerB}>{partnerB}</option>
                        <option value="ANÓNIMO">ANÓNIMO</option>
                    </select>
                </div>
                <button onClick={handleSave} className="w-full bg-accent hover:opacity-90 py-5 font-display text-2xl uppercase italic mt-4 industrial-border">Guardar Movimiento</button>
                <button onClick={onClose} className="w-full text-zinc-600 font-display text-xs uppercase tracking-[0.3em] mt-2 hover:text-white transition-colors">Cancelar Operación</button>
            </div>
        </div>
    );
}

function AuthModal({ onClose, onConfirm, error }) {
    const [password, setPassword] = useState('');

    const handleSubmit = (e) => {
        e.preventDefault();
        onConfirm(password);
    };

    return (
        <div className="fixed inset-0 bg-black/95 backdrop-blur-xl flex items-center justify-center p-4 z-[100] animate-in fade-in duration-300">
            <div className="glass industrial-border w-full max-w-sm p-12 space-y-10 text-center relative overflow-hidden">
                <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-accent to-transparent opacity-50" />
                <div className="space-y-4">
                    <Database size={48} className="mx-auto text-accent mb-4" />
                    <h3 className="font-display text-4xl uppercase italic tracking-tighter text-white">Acceso <span className="text-accent underline decoration-white/10 underline-offset-8">Admin</span></h3>
                    <p className="font-mono text-[10px] text-zinc-500 uppercase tracking-[0.4em]">Muestra de Identificación Requerida</p>
                </div>

                <form onSubmit={handleSubmit} className="space-y-6">
                    <div className="space-y-2 text-left">
                        <label className="font-mono text-[10px] text-zinc-600 uppercase font-bold tracking-widest block ml-1">Clave Maestra</label>
                        <input
                            autoFocus
                            type="password"
                            className={`w-full bg-white/5 border ${error ? 'border-red-500' : 'border-white/10'} p-5 font-mono text-3xl text-center text-white outline-none focus:border-accent transition-all shadow-2xl`}
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            placeholder="****"
                        />
                        {error && <p className="text-red-500 font-mono text-[10px] uppercase text-center mt-4 tracking-tighter italic">{error}</p>}
                    </div>
                    <button type="submit" className="w-full bg-accent hover:bg-accent/80 text-white py-6 font-display text-2xl uppercase italic industrial-border transition-all active:scale-95 shadow-xl shadow-accent/20">
                        Confirmar Identidad
                    </button>
                    <button type="button" onClick={onClose} className="w-full text-zinc-600 font-display text-sm uppercase tracking-[0.4em] hover:text-white transition-colors">Abortar Operación</button>
                </form>
            </div>
        </div>
    );
}

function ConfirmModal({ title, message, onConfirm, onClose }) {
    return (
        <div className="fixed inset-0 bg-black/90 backdrop-blur-md flex items-center justify-center p-4 z-[100] animate-in fade-in zoom-in-95 duration-200">
            <div className="glass industrial-border w-full max-w-md p-10 space-y-8 bg-zinc-900/90 relative overflow-hidden">
                <div className="absolute top-0 right-0 p-4 text-accent/5 pointer-events-none">
                    <Info size={120} />
                </div>
                <div className="space-y-3 relative z-10">
                    <h3 className="font-display text-3xl uppercase italic tracking-tighter text-red-500">{title}</h3>
                    <p className="font-display text-zinc-400 text-lg uppercase leading-tight italic">{message}</p>
                </div>
                <div className="flex gap-4 relative z-10 pt-4">
                    <button onClick={onClose} className="flex-1 border border-white/10 hover:border-white/30 text-white py-5 font-display text-xl uppercase italic transition-all active:scale-95">
                        Cancelar
                    </button>
                    <button onClick={onConfirm} className="flex-1 bg-red-600 hover:bg-red-500 text-white py-5 font-display text-xl uppercase italic industrial-border transition-all active:scale-95 shadow-xl shadow-red-500/10">
                        Confirmar
                    </button>
                </div>
            </div>
        </div>
    );
}

function AlertModal({ title, message, onClose }) {
    return (
        <div className="fixed inset-0 bg-black/95 backdrop-blur-md flex items-center justify-center p-4 z-[110] animate-in fade-in zoom-in-95 duration-200">
            <div className="glass industrial-border w-full max-w-sm p-12 space-y-8 bg-zinc-900/90 shadow-2xl relative overflow-hidden text-center">
                <div className="space-y-4">
                    <div className="w-20 h-20 bg-accent/10 rounded-full flex items-center justify-center mx-auto mb-6">
                        <Info size={40} className="text-accent" />
                    </div>
                    <h3 className="font-display text-3xl uppercase italic tracking-tighter text-white">{title}</h3>
                    <p className="font-display text-zinc-400 text-base uppercase leading-tight italic">{message}</p>
                </div>
                <button onClick={onClose} className="w-full bg-accent hover:bg-accent/80 text-white py-6 font-display text-2xl uppercase italic industrial-border transition-all active:scale-95 shadow-xl shadow-accent/20">
                    Entendido
                </button>
            </div>
        </div>
    );
}

function MetricBox({ title, value, icon, highlight = false }) {
    return (
        <div className={`glass p-8 md:p-10 industrial-border flex flex-col justify-between relative overflow-hidden group transition-all hover:scale-[1.02] duration-500 ${highlight ? 'bg-gradient-to-br from-accent/20 to-black/40 border-accent/40 shadow-2xl shadow-accent/5' : 'bg-black/20 hover:bg-black/40 shadow-xl'}`}>
            <div className="absolute top-0 right-0 w-32 h-32 bg-accent/5 blur-3xl rounded-full opacity-0 group-hover:opacity-100 transition-opacity" />
            <div className="flex justify-between items-start relative z-10">
                <span className="font-display text-base md:text-xl uppercase text-zinc-500 tracking-widest italic font-bold">{title}</span>
                <div className={`p-3 industrial-border ${highlight ? 'bg-accent/10 text-accent' : 'bg-white/5 text-zinc-600'}`}>{icon}</div>
            </div>
            <div className={`text-5xl md:text-6xl font-display mt-10 italic tracking-tighter relative z-10 ${highlight ? 'text-white' : 'text-zinc-300'}`}>{value}</div>
        </div>
    );
}

function CajaRow({ label, value, color }) {
    return (
        <div className="flex justify-between items-end border-b border-white/5 pb-3 hover:bg-white/5 transition-colors p-1 rounded-sm">
            <span className="font-display text-base text-zinc-500 uppercase tracking-widest italic">{label}</span>
            <span className={`font-mono text-2xl font-bold ${color}`}>${(value || 0).toLocaleString()}</span>
        </div>
    );
}

function LargeMetric({ label, value, highlight = false }) {
    return (
        <div className="group space-y-1">
            <span className="font-display text-xs text-zinc-500 uppercase block tracking-[0.4em] font-black group-hover:text-accent transition-colors">{label}</span>
            <span className={`text-6xl md:text-8xl font-display leading-tight italic tracking-tighter ${highlight ? 'text-green-400 drop-shadow-[0_0_15px_rgba(74,222,128,0.3)]' : 'text-white'}`}>
                ${(value || 0).toLocaleString()}
            </span>
        </div>
    );
}

function StatusBadge({ label, active }) {
    return (
        <div className={`flex items-center gap-3 px-3 py-1.5 rounded-none border-2 transition-all ${active ? 'bg-green-500/10 border-green-500/50 text-green-400 shadow-[0_0_10px_rgba(34,197,94,0.2)]' : 'bg-red-500/10 border-red-500/50 text-red-500 shadow-[0_0_10px_rgba(239,68,68,0.2)]'} text-[10px] font-black tracking-widest uppercase`}>
            {active ? <CheckCircle2 size={12} className="animate-pulse" /> : <div className="w-[12px] h-[12px] border-2 border-current rounded-full" />}
            {label}
        </div>
    );
}

export default App;
