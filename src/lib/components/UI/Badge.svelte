<script lang="ts">
  import { variants, sizes, outlined, dot } from './Badge.css';
  import type { HTMLAttributes } from 'svelte/elements';
  
  type BadgeVariant = keyof typeof variants;
  type BadgeSize = keyof typeof sizes;
  
  interface Props extends HTMLAttributes<HTMLSpanElement> {
    variant?: BadgeVariant;
    size?: BadgeSize;
    isOutlined?: boolean;
    showDot?: boolean;
  }
  
  let {
    variant = 'default',
    size = 'medium',
    isOutlined = false,
    showDot = false,
    children,
    class: className = '',
    ...restProps
  }: Props = $props();
  
  const computedClass = $derived(() => {
    const classes = [
      variants[variant],
      sizes[size],
      isOutlined ? outlined : '',
      className
    ].filter(Boolean).join(' ');
    return classes;
  });
</script>

<span class={computedClass()} {...restProps}>
  {#if showDot}
    <span class={dot}></span>
  {/if}
  {@render children?.()}
</span>