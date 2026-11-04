<script lang="ts" module>
  // Simple 24px line icons, drawn for ORBIT.
  export const PATHS = {
    play: 'M8 5.5v13l10-6.5z',
    chart: 'M4 19h16M7 16v-5M12 16V7M17 16v-8',
    gear: 'M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6zM19.4 13.5l1.6 1.2-2 3.4-1.9-.7a7.6 7.6 0 0 1-2 1.2l-.3 2h-4l-.3-2a7.6 7.6 0 0 1-2-1.2l-1.9.7-2-3.4 1.6-1.2a7.4 7.4 0 0 1 0-3l-1.6-1.2 2-3.4 1.9.7a7.6 7.6 0 0 1 2-1.2l.3-2h4l.3 2a7.6 7.6 0 0 1 2 1.2l1.9-.7 2 3.4-1.6 1.2a7.4 7.4 0 0 1 0 3z',
    back: 'M15 5l-7 7 7 7',
    share: 'M12 4v11M7.5 8.5 12 4l4.5 4.5M5 13v6h14v-6',
    book: 'M5 4.5h5.5A2.5 2.5 0 0 1 13 7v13a2 2 0 0 0-2-2H5zM19 4.5h-3.5A2.5 2.5 0 0 0 13 7',
    moon: 'M20 14.5A8 8 0 1 1 9.5 4a6.5 6.5 0 0 0 10.5 10.5z',
    check: 'M5 12.5l4.5 4.5L19 7.5',
    close: 'M6 6l12 12M18 6 6 18',
    flame: 'M12 21c3.9 0 6-2.6 6-6 0-3.6-3-5.6-3.6-9C12.8 7.4 11 9.5 11 11.5 9.7 10.8 9 9.7 9 8.5 7.2 10 6 12.3 6 15c0 3.4 2.1 6 6 6z',
  } as const
  export type IconName = keyof typeof PATHS
</script>

<script lang="ts">
  interface Props {
    name: IconName
    size?: number
  }
  let { name, size = 22 }: Props = $props()
</script>

<svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
  <path d={PATHS[name]} fill={name === 'play' ? 'currentColor' : 'none'} />
</svg>
