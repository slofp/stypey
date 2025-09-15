<script lang="ts">
  interface Props {
    size?: number;
    class?: string;
  }
  
  let { size = 32, class: className = '' }: Props = $props();
</script>

<svg 
  xmlns="http://www.w3.org/2000/svg" 
  viewBox="0 0 128 128" 
  fill="none"
  width={size}
  height={size}
  class={className}
>
  <rect width="128" height="128" rx="24" fill="#667eea"/>
  <text x="50%" y="50%" dominant-baseline="middle" text-anchor="middle" 
    font-family="system-ui, -apple-system, sans-serif" 
    font-size="48" font-weight="bold" fill="white">TS</text>
</svg>