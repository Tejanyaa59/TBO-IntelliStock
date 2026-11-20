export type Category = "Hotels" | "Flights" | "Packages"
export type Inventory = { id: string; destination: string; supplier: string; category: Category; period: string; history: number[]; forecast: number; available: number; cost: number; price: number; sellThrough: number; cancellation: number; season: number; volatility: number; dependency: number }
export type Allocation = Inventory & { quantity: number; investment: number; revenue: number; profit: number; exposure: number; adjustedProfit: number; risk: number; status: "PRIORITIZE" | "MONITOR" | "AVOID" }
const destinations = ["Dubai", "Singapore", "Bangkok", "London", "Paris", "Bali", "Maldives", "Hyderabad", "Delhi", "Mumbai"]
const suppliers = ["Desert Gate Travel", "WorldLink DMC", "Siam Select", "Apex Global", "EuroStay Partners", "Island Routes"]
const categories: Category[] = ["Hotels", "Flights", "Packages"]
const bases = [460, 390, 520, 310, 280, 420, 190, 360, 440, 410]
export const inventory: Inventory[] = Array.from({ length: 30 }, (_, i) => {
  const d = i % 10, c = categories[Math.floor(i / 10)], factor = c === "Hotels" ? 1 : c === "Flights" ? 1.3 : 0.7
  const forecast = Math.round(bases[d] * factor * (0.86 + (i * 7 % 30) / 100))
  const cost = Math.round((c === "Hotels" ? 92 : c === "Flights" ? 235 : 310) * (0.78 + (d % 4) * .13))
  const price = Math.round(cost * (1.55 + (i % 6) * .06))
  return { id: `INV-${String(2401 + i)}`, destination: destinations[d], supplier: suppliers[(d + Math.floor(i / 10)) % suppliers.length], category: c, period: ["Dec 2026", "Jan 2027", "Feb 2027", "Mar 2027", "Apr 2027"][i % 5], history: [Math.round(forecast * .72), Math.round(forecast * .79), Math.round(forecast * .83), Math.round(forecast * .9), forecast], forecast, available: Math.round(forecast * (.56 + (i * 11 % 55) / 100)), cost, price, sellThrough: .72 + (i % 5) * .045, cancellation: .04 + (i % 7) * .018, season: .9 + (i % 6) * .055, volatility: .08 + (i % 5) * .035, dependency: .12 + (i % 6) * .1 }
})
export const money = (n: number) => new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(n)
export function riskScore(x: Inventory) { return Math.min(100, Math.round(x.volatility * 250 + x.cancellation * 280 + x.dependency * 100 + Math.max(0, (x.available - x.forecast) / x.forecast) * 75 + (1 - x.season) * 35)) }
export function forecastDemand(x: Inventory, horizon: number, growth = 0) { const weighted = x.history.reduce((sum, v, i) => sum + v * (i + 1), 0) / 15; return Math.round(weighted * x.season * (1 + growth) * (1 + Math.max(0, horizon - 1) * .035)) }
export function optimize(budget: number, minMargin = 10, maxRisk = 75, preferred: Category[] = categories): Allocation[] {
 const rows = inventory.map(x => { const risk = riskScore(x), demand = x.forecast, gap = Math.max(0, demand - x.available), qty = Math.max(0, Math.round(gap * x.sellThrough)), margin = (x.price - x.cost) / x.price * 100; const eligible = preferred.includes(x.category) && risk <= maxRisk && margin >= minMargin; const unitNet = x.price * x.sellThrough - x.cost - x.price * x.cancellation * .45 - x.cost * (1 - x.sellThrough) * .35; return { ...x, forecast: demand, quantity: eligible ? qty : 0, investment: 0, revenue: 0, profit: 0, exposure: 0, adjustedProfit: unitNet, risk, status: risk > maxRisk || unitNet <= 0 ? "AVOID" as const : margin > minMargin + 7 && risk < 45 ? "PRIORITIZE" as const : "MONITOR" as const, unitNet } })
 const candidates = rows.filter(x => x.quantity > 0).sort((a,b) => (b.unitNet / b.cost) * (1 - b.risk / 140) - (a.unitNet / a.cost) * (1 - a.risk / 140))
 let remaining = Math.max(0, budget)
 for (const x of candidates) { const qty = Math.min(x.quantity, Math.floor(remaining / x.cost)); x.quantity = qty; x.investment = qty * x.cost; x.revenue = qty * x.price * x.sellThrough; x.profit = x.revenue - x.investment; x.exposure = qty * (x.price * x.cancellation * .45 + x.cost * (1 - x.sellThrough) * .35); x.adjustedProfit = x.profit - x.exposure; remaining -= x.investment }
 return rows
}
export function downloadCsv(name: string, rows: Record<string, unknown>[]) { const keys = Object.keys(rows[0] || {}); const csv = [keys.join(","), ...rows.map(r => keys.map(k => `"${String(r[k] ?? "").replaceAll('"','""')}"`).join(","))].join("\n"); const a = document.createElement("a"); a.href = URL.createObjectURL(new Blob([csv], { type: "text/csv" })); a.download = name; a.click(); URL.revokeObjectURL(a.href) }
