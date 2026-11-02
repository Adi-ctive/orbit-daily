// Templated quiz items from Wikidata (CC0). Every answer is checked against the data.
import { getJson, mcq, rng } from './lib.mjs'

const SPARQL = 'https://query.wikidata.org/sparql?format=json&query='

async function q(sparql) {
  const j = await getJson(SPARQL + encodeURIComponent(sparql), { headers: { Accept: 'application/sparql-results+json' } })
  return (j?.results?.bindings ?? []).map((b) => Object.fromEntries(Object.entries(b).map(([k, v]) => [k, v.value])))
}

const LABEL = 'SERVICE wikibase:label { bd:serviceParam wikibase:language "en". }'
const qid = (u) => u.split('/').pop()
const fmt = (n) => Math.round(n).toLocaleString('en-US')

function item(id, category, quiz, entity, tags, difficulty = 2) {
  return {
    id,
    type: 'quiz',
    category,
    title: '',
    body: '',
    quiz,
    difficulty,
    tags,
    source: { name: 'Wikidata', url: entity ? `https://www.wikidata.org/wiki/${entity}` : 'https://www.wikidata.org/' },
    license: 'CC0 1.0',
    attribution: 'Wikidata',
    modified: true,
    reviewed: false,
  }
}

/** Pairs where the bigger value beats the smaller by `ratio`. */
function pairs(list, key, ratio, cap, seed) {
  const r = rng(seed)
  const out = []
  for (let i = 0; i < list.length; i++)
    for (let j = i + 1; j < list.length; j++) {
      const a = list[i]
      const b = list[j]
      const hi = Math.max(a[key], b[key])
      const lo = Math.min(a[key], b[key])
      if (lo <= 0 || hi / lo < ratio) continue
      out.push(r.float() < 0.5 ? [a, b] : [b, a])
    }
  return r.shuffle(out).slice(0, cap)
}

export async function fetchWikidataQuizzes() {
  const out = []
  const push = (category, make) => {
    const n = out.filter((x) => x.category === category).length
    out.push(make(`quiz:${category}:${String(n).padStart(5, '0')}`))
  }

  // Elements.
  const els = (await q(`SELECT ?el ?elLabel ?sym ?num WHERE { ?el wdt:P31 wd:Q11344; wdt:P246 ?sym; wdt:P1086 ?num. ${LABEL} }`))
    .map((x) => ({ id: qid(x.el), name: x.elLabel, sym: x.sym, num: Number(x.num) }))
    .filter((x) => x.num >= 1 && x.num <= 118 && !/^Q\d+$/.test(x.name))
  const uniqEls = [...new Map(els.map((e) => [e.num, e])).values()].sort((a, b) => a.num - b.num)
  console.log(`  elements: ${uniqEls.length}`)
  const er = rng('elements')
  for (const e of uniqEls) {
    const others = er.shuffle(uniqEls.filter((o) => o.num !== e.num)).slice(0, 3)
    push('chemistry', (id) => item(id, 'chemistry', { q: `Which element has the chemical symbol ${e.sym}?`, ...mcq(id, e.name, others.map((o) => o.name)), explanation: `${e.sym} is ${e.name}, element number ${e.num}.` }, e.id, ['element', 'symbol'], 2))
    push('chemistry', (id) => item(id, 'chemistry', { q: `Which element has atomic number ${e.num}?`, ...mcq(id, e.name, others.map((o) => o.name)), explanation: `Element ${e.num} is ${e.name} (${e.sym}): each atom has ${e.num} protons.` }, e.id, ['element', 'number'], 3))
  }
  for (const [a, b] of pairs(uniqEls, 'num', 1.0001, 3000, 'el-pairs')) {
    const win = a.num > b.num ? a : b
    push('chemistry', (id) => item(id, 'chemistry', { q: `Which element has more protons in each atom?`, ...mcq(id, win.name, [win === a ? b.name : a.name]), explanation: `${a.name} has ${a.num}, ${b.name} has ${b.num}. The atomic number counts protons.` }, win.id, ['element', 'higher-lower'], 2))
  }

  // Countries: sovereign states with capital, population, area and continent.
  const rows = await q(`SELECT ?c ?cLabel ?cap ?capLabel ?pop ?area ?contLabel WHERE {
    ?c wdt:P31 wd:Q3624078.
    FILTER NOT EXISTS { ?c wdt:P31 wd:Q3024240 }
    FILTER NOT EXISTS { ?c wdt:P576 ?end }
    OPTIONAL { ?c wdt:P36 ?cap }
    OPTIONAL { ?c wdt:P1082 ?pop }
    OPTIONAL { ?c p:P2046/psn:P2046/wikibase:quantityAmount ?area }
    OPTIONAL { ?c wdt:P30 ?cont }
    ${LABEL} }`)
  const cmap = new Map()
  for (const r of rows) {
    const k = qid(r.c)
    const c = cmap.get(k) ?? { id: k, name: r.cLabel, caps: new Set(), pop: 0, area: 0, conts: new Set() }
    if (r.capLabel && !/^Q\d+$/.test(r.capLabel)) c.caps.add(r.capLabel)
    if (r.pop) c.pop = Math.max(c.pop, Number(r.pop))
    if (r.area) c.area = Math.max(c.area, Number(r.area) / 1e6)
    if (r.contLabel) c.conts.add(r.contLabel)
    cmap.set(k, c)
  }
  const countries = [...cmap.values()].filter((c) => !/^Q\d+$/.test(c.name))
  console.log(`  countries: ${countries.length}`)
  const cr = rng('countries')
  const oneCap = countries.filter((c) => c.caps.size === 1).map((c) => ({ ...c, cap: [...c.caps][0] }))
  for (const c of oneCap) {
    const others = cr.shuffle(oneCap.filter((o) => o.id !== c.id && o.cap !== c.cap)).slice(0, 3)
    push('geography', (id) => item(id, 'geography', { q: `What is the capital of ${c.name}?`, ...mcq(id, c.cap, others.map((o) => o.cap)), explanation: `${c.cap} is the capital of ${c.name}.` }, c.id, ['capital'], 2))
    push('geography', (id) => item(id, 'geography', { q: `${c.cap} is the capital of which country?`, ...mcq(id, c.name, others.map((o) => o.name)), explanation: `${c.cap} is the capital of ${c.name}.` }, c.id, ['capital'], 2))
  }
  const withPop = countries.filter((c) => c.pop > 10_000)
  for (const [a, b] of pairs(withPop, 'pop', 1.3, 6000, 'pop-pairs')) {
    const win = a.pop > b.pop ? a : b
    push('geography', (id) => item(id, 'geography', { q: 'Which country has more people?', ...mcq(id, win.name, [win === a ? b.name : a.name]), explanation: `${a.name}: about ${fmt(a.pop)}. ${b.name}: about ${fmt(b.pop)} (Wikidata).` }, win.id, ['population', 'higher-lower'], a.pop / b.pop > 3 || b.pop / a.pop > 3 ? 1 : 2))
  }
  const withArea = countries.filter((c) => c.area > 0)
  for (const [a, b] of pairs(withArea, 'area', 1.3, 6000, 'area-pairs')) {
    const win = a.area > b.area ? a : b
    push('geography', (id) => item(id, 'geography', { q: 'Which country is larger by area?', ...mcq(id, win.name, [win === a ? b.name : a.name]), explanation: `${a.name}: about ${fmt(a.area)} km². ${b.name}: about ${fmt(b.area)} km².` }, win.id, ['area', 'higher-lower'], 2))
  }
  const oneCont = countries.filter((c) => c.conts.size === 1).map((c) => ({ ...c, cont: [...c.conts][0] }))
  const conts = [...new Set(oneCont.map((c) => c.cont))]
  for (let k = 0; k < 1500; k++) {
    const cont = cr.pick(conts)
    const ins = oneCont.filter((c) => c.cont === cont)
    const outs = oneCont.filter((c) => c.cont !== cont)
    if (!ins.length || outs.length < 3) continue
    const yes = cr.pick(ins)
    const no = cr.shuffle(outs).slice(0, 3)
    push('geography', (id) => item(id, 'geography', { q: `Which of these countries is in ${cont}?`, ...mcq(id, yes.name, no.map((n) => n.name)), explanation: `${yes.name} is in ${cont}. ${no.map((n) => `${n.name}: ${n.cont}`).join('; ')}.` }, yes.id, ['continent'], 2))
  }

  // Rivers and mountains.
  const rivers = (await q(`SELECT ?r ?rLabel ?len WHERE { ?r wdt:P31 wd:Q4022; p:P2043/psn:P2043/wikibase:quantityAmount ?len. FILTER(?len > 1000000) ${LABEL} }`))
    .map((x) => ({ id: qid(x.r), name: x.rLabel, len: Number(x.len) / 1000 }))
    .filter((x) => !/^Q\d+$/.test(x.name))
  const uniqR = [...new Map(rivers.map((r) => [r.name, r])).values()]
  console.log(`  rivers: ${uniqR.length}`)
  for (const [a, b] of pairs(uniqR, 'len', 1.15, 2500, 'river-pairs')) {
    const win = a.len > b.len ? a : b
    push('geography', (id) => item(id, 'geography', { q: 'Which river is longer?', ...mcq(id, win.name, [win === a ? b.name : a.name]), explanation: `${a.name}: about ${fmt(a.len)} km. ${b.name}: about ${fmt(b.len)} km. River lengths vary with how they are measured.` }, win.id, ['river', 'higher-lower'], 3))
  }
  const mountains = (await q(`SELECT ?m ?mLabel ?el WHERE { ?m wdt:P31 wd:Q8502; p:P2044/psn:P2044/wikibase:quantityAmount ?el. FILTER(?el > 5500) ${LABEL} }`))
    .map((x) => ({ id: qid(x.m), name: x.mLabel, el: Number(x.el) }))
    .filter((x) => !/^Q\d+$/.test(x.name))
  const uniqM = [...new Map(mountains.map((m) => [m.name, m])).values()]
  console.log(`  mountains: ${uniqM.length}`)
  for (const [a, b] of pairs(uniqM, 'el', 1.03, 2500, 'mountain-pairs')) {
    const win = a.el > b.el ? a : b
    push('geography', (id) => item(id, 'geography', { q: 'Which mountain is higher?', ...mcq(id, win.name, [win === a ? b.name : a.name]), explanation: `${a.name}: ${fmt(a.el)} m. ${b.name}: ${fmt(b.el)} m above sea level.` }, win.id, ['mountain', 'higher-lower'], 3))
  }

  // Moons.
  const PLANETS = { Q2: 'Earth', Q111: 'Mars', Q319: 'Jupiter', Q193: 'Saturn', Q324: 'Uranus', Q332: 'Neptune', Q339: 'Pluto' }
  const moons = (await q(`SELECT ?m ?mLabel ?p WHERE { VALUES ?p { ${Object.keys(PLANETS).map((k) => 'wd:' + k).join(' ')} } ?m wdt:P31/wdt:P279* wd:Q2537; wdt:P397 ?p. ${LABEL} }`))
    .map((x) => ({ id: qid(x.m), name: x.mLabel, planet: PLANETS[qid(x.p)] }))
    .filter((x) => !/^Q\d+$/.test(x.name) && !/^S\/|\d{4}/.test(x.name))
  const uniqMoons = [...new Map(moons.map((m) => [m.name, m])).values()]
  console.log(`  moons: ${uniqMoons.length}`)
  const planetNames = Object.values(PLANETS)
  for (const m of uniqMoons) {
    const others = rng('moon' + m.name).shuffle(planetNames.filter((p) => p !== m.planet)).slice(0, 3)
    push('astronomy', (id) => item(id, 'astronomy', { q: `Which world does the moon ${m.name} orbit?`, ...mcq(id, m.planet, others), explanation: `${m.name} is a moon of ${m.planet}.` }, m.id, ['moon'], m.planet === 'Earth' ? 1 : 3))
  }

  // Planets: mass, radius and orbital period, compared in pairs.
  const prow = await q(`SELECT ?p ?pLabel ?mass ?rad ?per WHERE {
    VALUES ?p { wd:Q308 wd:Q313 wd:Q2 wd:Q111 wd:Q319 wd:Q193 wd:Q324 wd:Q332 }
    OPTIONAL { ?p p:P2067/psn:P2067/wikibase:quantityAmount ?mass }
    OPTIONAL { ?p p:P2120/psn:P2120/wikibase:quantityAmount ?rad }
    OPTIONAL { ?p p:P2146/psn:P2146/wikibase:quantityAmount ?per }
    ${LABEL} }`)
  const pm = new Map()
  for (const r of prow) {
    const p = pm.get(r.pLabel) ?? { id: qid(r.p), name: r.pLabel, mass: 0, rad: 0, per: 0 }
    if (r.mass) p.mass = Math.max(p.mass, Number(r.mass))
    if (r.rad) p.rad = Math.max(p.rad, Number(r.rad))
    if (r.per) p.per = Math.max(p.per, Number(r.per))
    pm.set(r.pLabel, p)
  }
  const planets = [...pm.values()]
  for (const [key, question, unit] of [
    ['mass', 'Which planet is more massive?', 'kg'],
    ['rad', 'Which planet is wider?', 'm radius'],
    ['per', 'Which planet takes longer to orbit the Sun?', 's per orbit'],
  ]) {
    for (const [a, b] of pairs(planets, key, 1.05, 100, 'planet-' + key)) {
      const win = a[key] > b[key] ? a : b
      push('astronomy', (id) => item(id, 'astronomy', { q: question, ...mcq(id, win.name, [win === a ? b.name : a.name]), explanation: `${a.name}: ${a[key].toExponential(2)} ${unit}. ${b.name}: ${b[key].toExponential(2)} ${unit}.` }, win.id, ['planet', 'higher-lower'], 2))
    }
  }
  return out
}
