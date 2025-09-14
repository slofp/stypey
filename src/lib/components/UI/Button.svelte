<script lang="ts">
  import { variants, sizes, fullWidth } from './Button.css';
  import type { HTMLButtonAttributes } from 'svelte/elements';
  
  type ButtonVariant = keyof typeof variants;
  type ButtonSize = keyof typeof sizes;
  
  interface Props extends HTMLButtonAttributes {
    variant?: ButtonVariant;
    size?: ButtonSize;
    isFullWidth?: boolean;
    isLoading?: boolean;
  }
  
  let {
    variant = 'primary',
    size = 'medium',
    isFullWidth = false,
    isLoading = false,
    disabled = false,
    children,
    class: className = '',
    ...restProps
  }: Props = $props();
  
  const computedClass = $derived(() => {
    const classes = [
      variants[variant],
      sizes[size],
      isFullWidth ? fullWidth : '',
      className
    ].filter(Boolean).join(' ');
    return classes;
  });
  
  const isDisabled = $derived(disabled || isLoading);
</script>

<button
  class={computedClass()}
  disabled={isDisabled}
  {...restProps}
>
  {#if isLoading}
    <span class="spinner"></span>
  {/if}
  {@render children?.()}
</button>

<style>
  .spinner {
    width: 14px;
    height: 14px;
    border: 2px solid rgba(255, 255, 255, 0.3);
    border-top-color: white;
    border-radius: 50%;
    animation: spin 0.6s linear infinite;
  }
  
  @keyframes spin {
    to {
      transform: rotate(360deg);
    }
  }
</style>