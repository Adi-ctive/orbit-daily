// Shown on the Credits screen. Mirrors CREDITS.md.
export interface Credit {
  what: string
  source: string
  url: string
  license: string
}

export const CREDITS: Credit[] = [
  { what: 'Title font: Press Start 2P', source: 'CodeMan38, via Fontsource', url: 'https://fonts.google.com/specimen/Press+Start+2P', license: 'SIL OFL 1.1' },
  { what: 'Label font: Pixelify Sans', source: 'Stefie Justprince, via Fontsource', url: 'https://fonts.google.com/specimen/Pixelify+Sans', license: 'SIL OFL 1.1' },
  { what: 'Star Chart card text', source: 'Wikipedia contributors', url: 'https://en.wikipedia.org/', license: 'CC BY-SA 4.0' },
  { what: 'Quiz facts (elements, planets, countries, rivers, mountains)', source: 'Wikidata', url: 'https://www.wikidata.org/', license: 'CC0 1.0' },
  { what: 'Arithmetic word problems', source: 'GSM8K, OpenAI', url: 'https://github.com/openai/grade-school-math', license: 'MIT' },
  { what: 'Art, music, sound effects, riddles and puzzles', source: 'Made for ORBIT, generated in code', url: '', license: 'Original' },
]
