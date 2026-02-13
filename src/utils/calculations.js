export const splitProfit = (profit, investments) => {
    const total = Number(investments.socioA) + Number(investments.socioB);
    if (total === 0) return { socioA: profit / 2, socioB: profit / 2 };

    return {
        socioA: (Number(investments.socioA) / total) * profit,
        socioB: (Number(investments.socioB) / total) * profit
    };
};

export const calculateCostoPesos = (costoUsd, conversionRate, envio, gastoExtra = 0) => {
    return (Number(costoUsd) * Number(conversionRate)) + Number(envio) + Number(gastoExtra);
};

export const calculateGananciaNeta = (receivedAmount, totalCost) => {
    return Number(receivedAmount) - Number(totalCost);
};

export const getExpectedProfit = (manualSalePrice, totalCostPesos, canal = 'Presencial') => {
    // Estimated net for manual price
    const estimatedNet = canal === 'ML' ? manualSalePrice * 0.75 : manualSalePrice;
    return estimatedNet - totalCostPesos;
};

export const getSuggestedPrices = (totalCostPesos) => {
    const marginCash = 1.25;
    const marginML = 1.60;

    const cashNet = totalCostPesos * marginCash;
    const mlNet = totalCostPesos * marginML;

    return {
        presencial: {
            contado: cashNet,
            cuotas3: cashNet * 1.30,
            cuotas6: cashNet * 1.40
        },
        ml: {
            pago1: mlNet,
            cuotas3: mlNet * 1.30,
            cuotas6: mlNet * 1.40
        }
    };
};
