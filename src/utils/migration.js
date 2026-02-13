import { supabase } from '../supabase';

export const migrateToCloud = async (items, tandas, fundLogs, partners, modelHistory) => {
    console.log('🚀 Iniciando migración a la nube...');

    try {
        // 1. Migrar Tandas
        if (tandas.length > 0) {
            const { error: tError } = await supabase.from('tandas').upsert(
                tandas.map(t => ({ id: t.id.includes('-') ? t.id : undefined, name: t.name })),
                { onConflict: 'name' }
            );
            if (tError) throw tError;
        }

        // 2. Migrar Items
        if (items.length > 0) {
            // Need to map frontend keys to DB snake_case keys if necessary
            // For now I'll assume they match or I'll map them
            const { error: iError } = await supabase.from('items').upsert(
                items.map(item => ({
                    celular: item.celular,
                    rom: item.rom,
                    ram: item.ram,
                    color: item.color,
                    imei1: item.imei1,
                    imei2: item.imei2,
                    costo_usd: item.costoUsd,
                    dolar_dia: item.dolarDia,
                    costo_envio: item.costoEnvio,
                    costo_extra: item.costoExtra,
                    status: item.status,
                    fecha_compra: item.fechaCompra,
                    fecha_venta: item.fechaVenta,
                    canal_venta: item.canalVenta,
                    precio_venta: item.precioVenta,
                    plata_recibida: item.plataRecibida,
                    quien_tiene_plata: item.quienTienePlata,
                    split_socio_a: item.splitSocioA,
                    split_socio_b: item.splitSocioB,
                    pagado_socio_a: item.pagadoSocioA,
                    pagado_socio_b: item.pagadoSocioB,
                    comision_pagada: item.comisionPagada,
                    costo_pesos: item.costoPesos,
                    ganancia_neta: item.gananciaNeta,
                    ganancia_socio_a: item.gananciaSocioA,
                    ganancia_socio_b: item.gananciaSocioB
                }))
            );
            if (iError) throw iError;
        }

        // 3. Migrar Fund Logs
        if (fundLogs.length > 0) {
            const { error: fError } = await supabase.from('fund_logs').upsert(
                fundLogs.map(f => ({
                    type: f.type,
                    amount: f.amount,
                    currency: f.currency,
                    date: f.date,
                    description: f.description || `Movimiento de ${f.responsible}`,
                    usd_at_time: f.rate || f.amountUsd // using what's available
                }))
            );
            if (fError) throw fError;
        }

        // 4. Migrar Settings
        await supabase.from('settings').upsert({ key: 'partners', value: partners });
        await supabase.from('settings').upsert({ key: 'model_history', value: modelHistory });

        console.log('✅ Migración completada con éxito.');
        return true;
    } catch (err) {
        console.error('❌ Error en migración:', err);
        return false;
    }
};
