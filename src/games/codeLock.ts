// Code Lock: deduction (Mastermind style). Crack a hidden 4-colour code. After
// each guess you learn how many colours are in the right place and how many are
// right but in the wrong place.
import type { RNG } from '../lib/rng'
import { button, el, makeStage } from './kit'
import { defaultScore, type GameModule } from './types'

interface L {
  code: number[]
  colours: number
  repeats: boolean
  maxGuesses: number
}

const SLOTS = 4
const HUES = ['#6cc7e0', '#ffc978', '#e08db5', '#6fdc9b', '#9a8ad6', '#ff7a6b', '#e9edf5']
const NAMES = ['cyan', 'amber', 'pink', 'green', 'violet', 'red', 'white']

export function score(code: readonly number[], guess: readonly number[]): { exact: number; near: number } {
  let exact = 0
  const a: number[] = []
  const b: number[] = []
  code.forEach((c, i) => (c === guess[i] ? exact++ : (a.push(c), b.push(guess[i]))))
  let near = 0
  for (const x of b) {
    const k = a.indexOf(x)
    if (k >= 0) {
      near++
      a.splice(k, 1)
    }
  }
  return { exact, near }
}

function generate(rng: RNG, d: number): L {
  const colours = d > 0.55 ? 7 : 6
  const repeats = d > 0.35
  const code: number[] = []
  while (code.length < SLOTS) {
    const c = rng.int(0, colours - 1)
    if (!repeats && code.includes(c)) continue
    code.push(c)
  }
  return { code, colours, repeats, maxGuesses: d > 0.7 ? 8 : 9 }
}

function verify(l: L): boolean {
  return l.code.length === SLOTS && l.code.every((c) => c >= 0 && c < l.colours) && (l.repeats || new Set(l.code).size === SLOTS)
}

const mod: GameModule<L> = {
  id: 'code-lock',
  category: 'logic',
  title: 'Code Lock',
  rules: {
    goal: 'Crack the hidden code of 4 colours in as few guesses as you can.',
    steps: [
      'Fill the 4 slots with colours and press Try.',
      'A solid dot ● means one colour is right and in the right slot.',
      'A hollow dot ○ means one colour is in the code but in a different slot.',
      'The dots do not say which slot they refer to. Use each clue to rule codes out.',
    ],
  },
  howTo: 'Guess the 4-colour code. ● is right colour, right slot. ○ is right colour, wrong slot.',
  generate,
  verify,
  mount(ctx) {
    const st = makeStage(ctx.host, 40, 40)
    st.canvasBox.remove()
    const L = ctx.level
    const board = el('div', { class: 'cl-board' })
    const note = el('p', { class: 'g-text sm-prompt', text: L.repeats ? 'Colours may repeat in the code.' : 'Each colour appears at most once.' })
    st.root.insertBefore(note, st.controls)
    st.root.insertBefore(board, st.controls)
    const guesses: number[][] = []
    let cur: number[] = []
    let done = false

    const peg = (c: number | null) => {
      const p = el('span', { class: 'cl-peg' + (c === null ? ' empty' : '') })
      if (c !== null) p.style.background = HUES[c]
      return p
    }
    const fbEl = (exact: number, near: number) => {
      const f = el('span', { class: 'cl-fb', 'aria-label': `${exact} exact, ${near} near` })
      for (let k = 0; k < exact; k++) f.append(el('i', { class: 'x' }))
      for (let k = 0; k < near; k++) f.append(el('i', { class: 'n' }))
      for (let k = exact + near; k < SLOTS; k++) f.append(el('i'))
      return f
    }

    const render = () => {
      board.replaceChildren(
        ...guesses.map((g, k) => {
          const r = score(L.code, g)
          return el('div', { class: 'cl-row' }, el('span', { class: 'cl-n', text: String(k + 1) }), ...g.map(peg), fbEl(r.exact, r.near))
        }),
      )
      if (!done) {
        const row = el('div', { class: 'cl-row cur' }, el('span', { class: 'cl-n', text: String(guesses.length + 1) }))
        for (let k = 0; k < SLOTS; k++) row.append(peg(cur[k] ?? null))
        row.append(el('span', { class: 'cl-fb' }))
        board.append(row)
      }
      st.hud.textContent = `Guess ${Math.min(guesses.length + 1, L.maxGuesses)} of ${L.maxGuesses}`
      tryB.disabled = cur.length < SLOTS
      back.disabled = cur.length === 0
    }

    const pal = el('div', { class: 'cl-pal' })
    for (let c = 0; c < L.colours; c++) {
      const b = button('', () => {
        if (done || cur.length >= SLOTS) return
        cur.push(c)
        ctx.fx.sfx('tap')
        render()
      }, 'cl-colour')
      b.style.background = HUES[c]
      b.setAttribute('aria-label', NAMES[c])
      pal.append(b)
    }
    const back = button('Undo', () => {
      cur.pop()
      render()
    })
    const tryB = button('Try', () => submit(), 'big')
    st.controls.append(pal, back, tryB)

    const submit = () => {
      if (done || cur.length < SLOTS) return
      guesses.push(cur)
      cur = []
      const r = score(L.code, guesses[guesses.length - 1])
      ctx.fx.sfx(r.exact === SLOTS ? 'levelup' : 'flip')
      if (r.exact === SLOTS || guesses.length >= L.maxGuesses) {
        done = true
        render()
        const solved = r.exact === SLOTS
        const best = Math.max(...guesses.map((g) => score(L.code, g).exact))
        ctx.finish({
          score: solved ? Math.max(0.4, 1 - Math.max(0, guesses.length - 4) * 0.12) : (best / SLOTS) * 0.3,
          correct: solved ? 1 : 0,
          total: 1,
          answer: `The code was ${L.code.map((c) => NAMES[c]).join(', ')}. ${solved ? `Cracked in ${guesses.length} guesses.` : 'Not cracked.'}`,
          explanation:
            'Strong players pick each guess to split the remaining codes as evenly as possible, not just to hit. Any 4-colour, 6-colour code can be cracked in 5 guesses with perfect play. A good habit: never repeat a guess that an earlier clue already rules out.',
        })
        return
      }
      render()
    }
    render()
    return { destroy: () => st.destroy() }
  },
  score: defaultScore('logic'),
}

export default mod
