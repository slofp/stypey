<script lang="ts">
  import {
    card,
    cardHoverable,
    cardHeader,
    cardTitle,
    cardDescription,
    cardContent,
    cardFooter,
    variants,
    padding as paddingStyles
  } from './Card.css';
  import type { HTMLAttributes } from 'svelte/elements';
  
  type CardVariant = keyof typeof variants;
  type CardPadding = keyof typeof paddingStyles;
  
  interface Props extends HTMLAttributes<HTMLDivElement> {
    variant?: CardVariant;
    padding?: CardPadding;
    hoverable?: boolean;
    title?: string;
    description?: string;
  }
  
  let {
    variant = 'default',
    padding = 'medium',
    hoverable = false,
    title,
    description,
    children,
    class: className = '',
    ...restProps
  }: Props = $props();
  
  const computedClass = $derived(() => {
    const classes = [
      card,
      variants[variant],
      paddingStyles[padding],
      hoverable ? cardHoverable : '',
      className
    ].filter(Boolean).join(' ');
    return classes;
  });
</script>

<div class={computedClass()} {...restProps}>
  {#if title || description}
    <div class={cardHeader}>
      {#if title}
        <h3 class={cardTitle}>{title}</h3>
      {/if}
      {#if description}
        <p class={cardDescription}>{description}</p>
      {/if}
    </div>
  {/if}
  
  <div class={cardContent}>
    {@render children?.()}
  </div>
</div>