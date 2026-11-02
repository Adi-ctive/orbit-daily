export interface QuizBlock {
  q: string
  choices: string[]
  answer: number
  explanation: string
}

export interface ContentSource {
  name: string
  url: string
  revisionId?: number
}

export interface ContentItem {
  id: string
  type: 'card' | 'quiz' | 'riddle' | 'aptitude'
  category: string
  title: string
  body: string
  hook?: string
  whyItMatters?: string
  quiz?: QuizBlock
  difficulty: number
  tags: string[]
  source: ContentSource
  license: string
  attribution: string
  modified: boolean
  reviewed: boolean
}

export interface ChunkInfo {
  file: string
  type: 'card' | 'quiz' | 'aptitude'
  category: string
  /** Index of this chunk within its type+category. */
  n: number
  count: number
  hash: string
}

export interface ContentManifest {
  version: string
  generated: string
  chunkSize: number
  chunks: ChunkInfo[]
  counts: Record<string, number>
}
