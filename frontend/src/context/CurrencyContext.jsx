import { createContext, useContext, useState } from "react";

const CURRENCIES = [
  { code: "IQD", symbol: "د.ع", name: "دينار عراقي", rate: 1 },
  { code: "USD", symbol: "$",   name: "دولار أمريكي", rate: 0.00077 },
  { code: "EUR", symbol: "€",   name: "يورو", rate: 0.00071 },
  { code: "SAR", symbol: "﷼",   name: "ريال سعودي", rate: 0.0029 },
  { code: "TRY", symbol: "₺",   name: "ليرة تركية", rate: 0.025 },
];

const CurrencyContext = createContext(null);

export function CurrencyProvider({ children }) {
  const [currency, setCurrency] = useState(
    () => CURRENCIES.find(c => c.code === (localStorage.getItem("currency") || "IQD")) || CURRENCIES[0]
  );

  const changeCurrency = (code) => {
    const found = CURRENCIES.find(c => c.code === code) || CURRENCIES[0];
    localStorage.setItem("currency", code);
    setCurrency(found);
  };

  // Format a number in IQD base to display currency
  const fmt = (val) => {
    const num = Number(val || 0);
    const converted = num * currency.rate;
    const display = currency.code === "IQD"
      ? Math.round(converted).toLocaleString("en-US")
      : converted.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    return `${display} ${currency.symbol}`;
  };

  // Parse text input to number (handles commas)
  const parse = (str) => {
    if (typeof str === "number") return str;
    const cleaned = String(str || "").replace(/,/g, "").replace(/[^\d.]/g, "");
    return parseFloat(cleaned) || 0;
  };

  return (
    <CurrencyContext.Provider value={{ currency, currencies: CURRENCIES, changeCurrency, fmt, parse }}>
      {children}
    </CurrencyContext.Provider>
  );
}

export function useCurrency() {
  return useContext(CurrencyContext);
}
