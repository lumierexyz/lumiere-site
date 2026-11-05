const GLOBAL_STATS_ENDPOINT = "https://api.hyperliquid.xyz/info"
const BLOCK_LIST_ENDPOINT = "https://rpc.hyperliquid.xyz/explorer"
const BLOCK_SAMPLE_SIZE = 20
const MAX_TPS = 200_000
const MARKET_PRICE_REFRESH_MS = 30_000
const TICKER_MARKET_COUNT = 10
const TICKER_ICON_BASE_URL = "https://app.hyperliquid.xyz/coins"

// Snapshot taken 2026-08-15 from the 30 highest-volume active perps whose
// Hyperliquid App coin endpoint returned an SVG. Live volume determines which
// ten of these markets appear and in what order.
const tickerMarketPool = [
  { dex: "", market: "BTC", displayName: "BTC" },
  { dex: "xyz", market: "xyz:SNDK", displayName: "SNDK" },
  { dex: "", market: "ETH", displayName: "ETH" },
  { dex: "xyz", market: "xyz:SPCX", displayName: "SPCX" },
  { dex: "xyz", market: "xyz:XYZ100", displayName: "XYZ100" },
  { dex: "xyz", market: "xyz:SKHX", displayName: "SKHYNIX" },
  { dex: "xyz", market: "xyz:SP500", displayName: "S&P500" },
  { dex: "xyz", market: "xyz:DRAM", displayName: "DRAM" },
  { dex: "xyz", market: "xyz:MU", displayName: "MU" },
  { dex: "", market: "HYPE", displayName: "HYPE" },
  { dex: "xyz", market: "xyz:CL", displayName: "WTIOIL" },
  { dex: "xyz", market: "xyz:SKHY", displayName: "SKHY" },
  { dex: "xyz", market: "xyz:BRENTOIL", displayName: "BRENTOIL" },
  { dex: "xyz", market: "xyz:INTC", displayName: "INTC" },
  { dex: "", market: "SOL", displayName: "SOL" },
  { dex: "xyz", market: "xyz:TSLA", displayName: "TSLA" },
  { dex: "xyz", market: "xyz:NBIS", displayName: "NBIS" },
  { dex: "xyz", market: "xyz:NVDA", displayName: "NVDA" },
  { dex: "xyz", market: "xyz:SMSN", displayName: "SAMSUNG" },
  { dex: "", market: "PUMP", displayName: "PUMP" },
  { dex: "xyz", market: "xyz:SILVER", displayName: "SILVER" },
  { dex: "xyz", market: "xyz:GOLD", displayName: "GOLD" },
  { dex: "xyz", market: "xyz:GOOGL", displayName: "GOOGL" },
  { dex: "", market: "ZEC", displayName: "ZEC" },
  { dex: "xyz", market: "xyz:EWY", displayName: "EWY" },
  { dex: "", market: "XRP", displayName: "XRP" },
  { dex: "", market: "LINK", displayName: "LINK" },
  { dex: "xyz", market: "xyz:CRCL", displayName: "CRCL" },
  { dex: "xyz", market: "xyz:AMD", displayName: "AMD" },
  { dex: "xyz", market: "xyz:CBRS", displayName: "CBRS" },
]

const tickerDexes = [...new Set(tickerMarketPool.map(({ dex }) => dex))]

const compactUnits = [
  { suffix: "T", value: 1e12 },
  { suffix: "B", value: 1e9 },
  { suffix: "M", value: 1e6 },
  { suffix: "K", value: 1e3 },
]

export function formatCompactNumber(value) {
  if (!Number.isFinite(value)) throw new TypeError("Value must be a finite number")

  const unit = compactUnits.find(({ value: unitValue }) => Math.abs(value) >= unitValue)
  if (!unit) return value.toFixed(1)

  return `${(value / unit.value).toFixed(1)}${unit.suffix}`
}

export function calculateTransactionsPerSecond(blockSummaries) {
  if (!Array.isArray(blockSummaries) || blockSummaries.length < 2) {
    throw new TypeError("At least two block summaries are required to calculate TPS")
  }

  let earliestBlockTime = Infinity
  let latestBlockTime = -Infinity
  let totalTransactions = 0

  for (const summary of blockSummaries) {
    const blockTime = Number(summary?.blockTime)
    const numTxs = Number(summary?.numTxs)
    if (!Number.isFinite(blockTime)) {
      throw new TypeError("Hyperliquid block list returned an invalid blockTime")
    }
    if (!Number.isFinite(numTxs) || numTxs < 0) {
      throw new TypeError("Hyperliquid block list returned an invalid numTxs")
    }

    earliestBlockTime = Math.min(earliestBlockTime, blockTime)
    latestBlockTime = Math.max(latestBlockTime, blockTime)
    totalTransactions += numTxs
  }

  const elapsedSeconds = (latestBlockTime - earliestBlockTime) / 1000
  if (elapsedSeconds <= 0) {
    throw new RangeError("Hyperliquid block list must span a positive amount of time")
  }

  return totalTransactions / elapsedSeconds
}

export function formatMarketPrice(value) {
  if (!Number.isFinite(value) || value < 0) {
    throw new TypeError("Market price must be a non-negative finite number")
  }

  const significantDigits = 5
  const magnitude = value === 0 ? 0 : Math.floor(Math.log10(value))
  const scale = 10 ** (significantDigits - 1 - magnitude)
  const roundedValue = Math.round(value * scale) / scale
  const integerDigits = roundedValue === 0 ? 1 : Math.floor(Math.log10(roundedValue)) + 1
  const fractionDigits = Math.max(0, significantDigits - integerDigits)

  return roundedValue.toLocaleString("en-US", {
    minimumFractionDigits: fractionDigits,
    maximumFractionDigits: fractionDigits,
  })
}

export function selectTopTickerMarkets(perpDataByDex, annotations = new Map()) {
  const annotationByMarket = annotations instanceof Map ? annotations : new Map(annotations)
  const contextByMarket = new Map()

  for (const dex of tickerDexes) {
    const response = perpDataByDex.get(dex)
    if (!Array.isArray(response) || response.length < 2) continue

    const [metadata, contexts] = response
    if (!Array.isArray(metadata?.universe) || !Array.isArray(contexts)) continue

    metadata.universe.forEach((asset, index) => {
      contextByMarket.set(asset.name, { asset, context: contexts[index] })
    })
  }

  return tickerMarketPool
    .flatMap(({ dex, market, displayName }) => {
      const marketData = contextByMarket.get(market)
      if (!marketData || marketData.asset.isDelisted) return []

      const volume = Number(marketData.context?.dayNtlVlm)
      const rawPrice = marketData.context?.midPx || marketData.context?.markPx
      const price = Number(rawPrice)
      if (!Number.isFinite(volume) || volume < 0 || !Number.isFinite(price) || price < 0) return []

      return [{
        dex,
        market,
        displayName: annotationByMarket.get(market)?.displayName || displayName,
        iconUrl: `${TICKER_ICON_BASE_URL}/${market}.svg`,
        price,
        volume,
      }]
    })
    .sort((left, right) => right.volume - left.volume || left.market.localeCompare(right.market))
    .slice(0, TICKER_MARKET_COUNT)
}

function formatTpsNumber(value) {
  if (!Number.isFinite(value)) throw new TypeError("Value must be a finite number")
  if (Math.abs(value) < 1000) return Math.round(value).toLocaleString("en-US")

  const thousands = (value / 1000).toFixed(1).replace(/\.0$/, "")
  return `${thousands}k`
}

function findStatValueElement(label) {
  for (let container = label.parentElement; container; container = container.parentElement) {
    const value = container.querySelector('[data-framer-name="Number"] .framer-text')
    if (value) return value
  }

  return null
}

function findStatValueElements(labelText) {
  const labels = document.querySelectorAll('[data-framer-name="Label"]')
  const values = new Set()

  for (const label of labels) {
    if (label.textContent.trim().toLowerCase() !== labelText) continue

    const value = findStatValueElement(label)
    if (value) values.add(value)
  }

  return values
}

function updateStatText(labelText, formattedValue) {
  for (const element of findStatValueElements(labelText)) {
    if (element.textContent !== formattedValue) element.textContent = formattedValue
  }
}

function updateTpsStat(formattedValue) {
  const labels = document.querySelectorAll('[data-framer-name="Label"]')

  for (const label of labels) {
    const currentLabel = label.textContent.trim().toLowerCase()
    if (currentLabel !== "max tps" && currentLabel !== "tps / max tps") continue

    const value = findStatValueElement(label)
    const labelText = label.querySelector(".framer-text") ?? label
    if (labelText.textContent !== "TPS / MAX TPS") {
      labelText.textContent = "TPS / MAX TPS"
    }
    if (formattedValue && value?.textContent !== formattedValue) {
      value.textContent = formattedValue
    }
  }
}

function updateOpenInterestStat(formattedValue) {
  const labels = document.querySelectorAll('[data-framer-name="Label"]')

  for (const label of labels) {
    const currentLabel = label.textContent.trim().toLowerCase()
    if (currentLabel !== "24h revenue" && currentLabel !== "open interest") continue

    const value = findStatValueElement(label)
    const labelText = label.querySelector(".framer-text") ?? label
    if (labelText.textContent !== "Open interest") {
      labelText.textContent = "Open interest"
    }
    if (formattedValue && value?.textContent !== formattedValue) {
      value.textContent = formattedValue
    }
  }
}

function updateStats(formattedStats) {
  if (formattedStats.dailyVolume) {
    updateStatText("24h volume", formattedStats.dailyVolume)
  }
  if (formattedStats.nUsers) {
    updateStatText("users", formattedStats.nUsers)
  }
  updateOpenInterestStat(formattedStats.oi)
  updateTpsStat(formattedStats.tps)
}

function createTickerCard(market, duplicate = false) {
  const formattedPrice = formatMarketPrice(market.price)
  const link = document.createElement("a")
  link.className = "market-ticker-card"
  link.dataset.market = market.market
  link.href = `https://app.hyperliquid.xyz/trade/${market.market}`
  link.target = "_blank"
  link.rel = "noopener noreferrer"
  link.setAttribute("aria-label", `Trade ${market.displayName} at $${formattedPrice}`)
  if (duplicate) link.tabIndex = -1

  const icon = document.createElement("img")
  icon.className = "market-ticker-icon"
  icon.src = market.iconUrl
  icon.alt = ""
  icon.decoding = "async"

  const copy = document.createElement("span")
  copy.className = "market-ticker-copy"

  const name = document.createElement("span")
  name.className = "market-ticker-name"
  name.textContent = market.displayName

  const price = document.createElement("span")
  price.className = "market-ticker-price"
  price.append("$")

  const priceValue = document.createElement("span")
  priceValue.className = "market-ticker-price-value"
  priceValue.textContent = formattedPrice
  price.append(priceValue)

  copy.append(name, price)
  link.append(icon, copy)
  return link
}

function createTickerGroup(markets, duplicate = false) {
  const group = document.createElement("div")
  group.className = "market-ticker-group"
  if (duplicate) group.setAttribute("aria-hidden", "true")
  group.append(...markets.map(market => createTickerCard(market, duplicate)))
  return group
}

function updateTickerPrices(ticker, markets) {
  const marketByName = new Map(markets.map(market => [market.market, market]))

  ticker.querySelectorAll(".market-ticker-card").forEach(card => {
    const market = marketByName.get(card.dataset.market)
    if (!market) return

    const formattedPrice = formatMarketPrice(market.price)
    const price = card.querySelector(".market-ticker-price-value")
    if (price?.textContent !== formattedPrice) price.textContent = formattedPrice

    const label = `Trade ${market.displayName} at $${formattedPrice}`
    if (card.getAttribute("aria-label") !== label) card.setAttribute("aria-label", label)
  })
}

function renderTickerMarkets(markets) {
  if (!markets.length) return

  const orderKey = markets.map(({ market, displayName }) => `${market}:${displayName}`).join("|")
  document.querySelectorAll(".framer-108gnsz").forEach(strip => {
    let ticker = strip.querySelector(":scope > .market-ticker")
    if (!ticker) {
      ticker = document.createElement("div")
      ticker.className = "market-ticker"
      ticker.setAttribute("role", "region")
      ticker.setAttribute("aria-label", "Top perpetual markets by 24-hour volume")
      strip.append(ticker)
    }

    if (ticker.dataset.marketOrder !== orderKey) {
      const track = document.createElement("div")
      track.className = "market-ticker-track"
      track.append(createTickerGroup(markets), createTickerGroup(markets, true))
      ticker.replaceChildren(track)
      ticker.dataset.marketOrder = orderKey
    } else {
      updateTickerPrices(ticker, markets)
    }

    strip.classList.add("dynamic-market-ticker-ready")
  })
}

async function loadPerpMarketData(dex = "") {
  const response = await fetch(GLOBAL_STATS_ENDPOINT, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ type: "metaAndAssetCtxs", ...(dex ? { dex } : {}) }),
    cache: "no-store",
  })

  if (!response.ok) {
    throw new Error(`Hyperliquid ${dex || "main"} market data request failed with ${response.status}`)
  }

  const marketData = await response.json()
  if (!Array.isArray(marketData) || marketData.length < 2) {
    throw new TypeError(`Hyperliquid ${dex || "main"} market data returned invalid data`)
  }

  return marketData
}

async function loadPerpAnnotations() {
  const response = await fetch(GLOBAL_STATS_ENDPOINT, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ type: "perpConciseAnnotations" }),
    cache: "no-store",
  })

  if (!response.ok) {
    throw new Error(`Hyperliquid perp annotations request failed with ${response.status}`)
  }

  const annotations = await response.json()
  if (!Array.isArray(annotations)) {
    throw new TypeError("Hyperliquid perp annotations returned invalid data")
  }

  return new Map(annotations)
}

async function loadGlobalStats() {
  const response = await fetch(GLOBAL_STATS_ENDPOINT, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ type: "globalStats" }),
    cache: "no-store",
  })

  if (!response.ok) {
    throw new Error(`Hyperliquid global stats request failed with ${response.status}`)
  }

  const stats = await response.json()
  const dailyVolume = Number(stats.dailyVolume)
  const nUsers = Number(stats.nUsers)
  const oi = Number(stats.oi)
  if (!Number.isFinite(dailyVolume) || dailyVolume < 0) {
    throw new TypeError("Hyperliquid global stats returned an invalid dailyVolume")
  }
  if (!Number.isFinite(nUsers) || nUsers < 0) {
    throw new TypeError("Hyperliquid global stats returned an invalid nUsers")
  }
  if (!Number.isFinite(oi) || oi < 0) {
    throw new TypeError("Hyperliquid global stats returned an invalid oi")
  }

  return {
    dailyVolume: formatCompactNumber(dailyVolume),
    nUsers: formatCompactNumber(nUsers),
    oi: formatCompactNumber(oi),
  }
}

async function loadTpsStat() {
  const response = await fetch(BLOCK_LIST_ENDPOINT, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ type: "blockList", n_blocks: BLOCK_SAMPLE_SIZE }),
    cache: "no-store",
  })

  if (!response.ok) {
    throw new Error(`Hyperliquid block list request failed with ${response.status}`)
  }

  const result = await response.json()
  const tps = calculateTransactionsPerSecond(result.block_summaries)
  return `${formatTpsNumber(tps)} / ${formatTpsNumber(MAX_TPS)}`
}

function initializeStats() {
  const formattedStats = {
    oi: "—",
    tps: `— / ${formatTpsNumber(MAX_TPS)}`,
  }
  let tickerMarkets = []
  updateStats(formattedStats)

  let updateScheduled = false
  const observer = new MutationObserver(() => {
    if (updateScheduled) return
    updateScheduled = true
    requestAnimationFrame(() => {
      updateScheduled = false
      updateStats(formattedStats)
      renderTickerMarkets(tickerMarkets)
    })
  })

  observer.observe(document.body, {
    childList: true,
    characterData: true,
    subtree: true,
  })

  loadGlobalStats()
    .then((globalStats) => {
      Object.assign(formattedStats, globalStats)
      updateStats(formattedStats)
    })
    .catch((error) => {
      console.warn("Unable to update the Hyperliquid global stats.", error)
    })

  loadTpsStat()
    .then((tps) => {
      formattedStats.tps = tps
      updateStats(formattedStats)
    })
    .catch((error) => {
      console.warn("Unable to update the Hyperliquid TPS stat.", error)
    })

  const annotationsPromise = loadPerpAnnotations().catch((error) => {
    console.warn("Unable to load Hyperliquid perp annotations.", error)
    return new Map()
  })

  let tickerLoading = false
  const refreshTickerMarkets = async () => {
    if (tickerLoading) return
    tickerLoading = true

    try {
      const [annotations, results] = await Promise.all([
        annotationsPromise,
        Promise.allSettled(tickerDexes.map(dex => loadPerpMarketData(dex))),
      ])
      const perpDataByDex = new Map()

      results.forEach((result, index) => {
        const dex = tickerDexes[index]
        if (result.status === "fulfilled") {
          perpDataByDex.set(dex, result.value)
        } else {
          console.warn(`Unable to update Hyperliquid ${dex || "main"} market data.`, result.reason)
        }
      })

      tickerMarkets = selectTopTickerMarkets(perpDataByDex, annotations)
      renderTickerMarkets(tickerMarkets)
    } finally {
      tickerLoading = false
    }
  }

  refreshTickerMarkets()
  window.setInterval(() => {
    if (document.visibilityState === "visible") refreshTickerMarkets()
  }, MARKET_PRICE_REFRESH_MS)
}

if (typeof document !== "undefined") initializeStats()
