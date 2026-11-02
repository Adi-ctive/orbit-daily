<script lang="ts">
  import { ICONS, type IconName } from '../art/sprites/icons'
  import { spriteDataUrl } from '../art/sprites/sprite'

  interface Props {
    name: IconName
    scale?: number
  }
  let { name, scale = 2 }: Props = $props()
  const src = $derived(spriteDataUrl(ICONS[name]))
</script>

<img class="pixel" {src} width={12 * scale} height={12 * scale} alt="" aria-hidden="true" />
