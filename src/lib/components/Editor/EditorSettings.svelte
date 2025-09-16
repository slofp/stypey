<script lang="ts">
  import { editorStore } from '$stores/editor.svelte';
  import { IconSettings, IconTextSize, IconTextWrap, IconHash, IconMap } from '@tabler/icons-svelte';
  
  interface Props {
    isOpen?: boolean;
  }
  
  let { isOpen = $bindable(false) }: Props = $props();
  
  const settings = $derived(editorStore.editorSettings);
  
  function increaseFontSize(): void {
    editorStore.changeFontSize(1);
  }
  
  function decreaseFontSize(): void {
    editorStore.changeFontSize(-1);
  }
  
  function toggleTabSize(): void {
    editorStore.toggleTabSize();
  }
  
  function toggleWordWrap(): void {
    editorStore.toggleWordWrap();
  }
  
  function toggleMinimap(): void {
    editorStore.toggleMinimap();
  }
  
  function cycleLineNumbers(): void {
    editorStore.cycleLineNumbers();
  }
  
  function resetSettings(): void {
    editorStore.updateSettings({
      fontSize: 14,
      tabSize: 2,
      wordWrap: 'on',
      minimap: false,
      lineNumbers: 'on',
      renderWhitespace: 'selection',
      cursorBlinking: 'blink',
      cursorStyle: 'line',
      autoClosingBrackets: 'languageDefined',
      autoClosingQuotes: 'languageDefined',
      formatOnPaste: true,
      formatOnType: true,
    });
  }
</script>

<div class="editor-settings" class:open={isOpen}>
  <button
    class="settings-toggle"
    onclick={() => isOpen = !isOpen}
    aria-label="エディタ設定"
    title="エディタ設定"
  >
    <IconSettings size={20} />
  </button>
  
  {#if isOpen}
    <div class="settings-panel">
      <h3 class="settings-title">エディタ設定</h3>
      
      <div class="settings-group">
        <div class="setting-item">
          <div class="setting-label">
            <IconTextSize size={16} />
            フォントサイズ
          </div>
          <div class="setting-control">
            <button
              class="btn-small"
              onclick={decreaseFontSize}
              disabled={settings.fontSize <= 10}
            >
              -
            </button>
            <span class="setting-value">{settings.fontSize}px</span>
            <button
              class="btn-small"
              onclick={increaseFontSize}
              disabled={settings.fontSize >= 24}
            >
              +
            </button>
          </div>
        </div>
        
        <div class="setting-item">
          <span class="setting-label">
            タブサイズ
          </span>
          <div class="setting-control">
            <button
              class="btn-toggle"
              onclick={toggleTabSize}
            >
              {settings.tabSize} スペース
            </button>
          </div>
        </div>
        
        <div class="setting-item">
          <div class="setting-label">
            <IconTextWrap size={16} />
            折り返し
          </div>
          <div class="setting-control">
            <button
              class="btn-toggle"
              class:active={settings.wordWrap === 'on'}
              onclick={toggleWordWrap}
            >
              {settings.wordWrap === 'on' ? 'ON' : 'OFF'}
            </button>
          </div>
        </div>
        
        <div class="setting-item">
          <div class="setting-label">
            <IconHash size={16} />
            行番号
          </div>
          <div class="setting-control">
            <button
              class="btn-toggle"
              onclick={cycleLineNumbers}
            >
              {#if settings.lineNumbers === 'on'}
                表示
              {:else if settings.lineNumbers === 'off'}
                非表示
              {:else}
                相対
              {/if}
            </button>
          </div>
        </div>
        
        <div class="setting-item">
          <div class="setting-label">
            <IconMap size={16} />
            ミニマップ
          </div>
          <div class="setting-control">
            <button
              class="btn-toggle"
              class:active={settings.minimap}
              onclick={toggleMinimap}
            >
              {settings.minimap ? 'ON' : 'OFF'}
            </button>
          </div>
        </div>
      </div>
      
      <div class="settings-footer">
        <button
          class="btn-reset"
          onclick={resetSettings}
        >
          デフォルトに戻す
        </button>
      </div>
    </div>
  {/if}
</div>

<style>
  .editor-settings {
    position: relative;
  }
  
  .settings-toggle {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 36px;
    height: 36px;
    border-radius: 0.5rem;
    background-color: var(--bg-secondary);
    color: var(--text-primary);
    border: 1px solid var(--border-default);
    cursor: pointer;
    transition: all 0.2s ease;
  }
  
  .settings-toggle:hover {
    background-color: var(--bg-tertiary);
    border-color: var(--border-dark);
  }
  
  .settings-panel {
    position: absolute;
    top: 100%;
    right: 0;
    margin-top: 0.5rem;
    width: 280px;
    background-color: var(--bg-elevated);
    border: 1px solid var(--border-default);
    border-radius: 0.5rem;
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
    z-index: 100;
    padding: 1rem;
    animation: slideInDown 0.2s ease;
  }
  
  .settings-title {
    font-size: 0.875rem;
    font-weight: 600;
    margin-bottom: 1rem;
    color: var(--text-primary);
  }
  
  .settings-group {
    display: flex;
    flex-direction: column;
    gap: 0.75rem;
  }
  
  .setting-item {
    display: flex;
    justify-content: space-between;
    align-items: center;
  }
  
  .setting-label {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    font-size: 0.875rem;
    color: var(--text-secondary);
  }
  
  .setting-control {
    display: flex;
    align-items: center;
    gap: 0.5rem;
  }
  
  .setting-value {
    min-width: 48px;
    text-align: center;
    font-size: 0.875rem;
    font-weight: 500;
    color: var(--text-primary);
  }
  
  .btn-small {
    width: 24px;
    height: 24px;
    display: flex;
    align-items: center;
    justify-content: center;
    border-radius: 0.25rem;
    background-color: var(--bg-secondary);
    color: var(--text-primary);
    border: 1px solid var(--border-default);
    cursor: pointer;
    transition: all 0.2s ease;
    font-size: 1rem;
  }
  
  .btn-small:hover:not(:disabled) {
    background-color: var(--bg-tertiary);
    border-color: var(--border-dark);
  }
  
  .btn-small:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
  
  .btn-toggle {
    padding: 0.25rem 0.75rem;
    border-radius: 0.25rem;
    background-color: var(--bg-secondary);
    color: var(--text-primary);
    border: 1px solid var(--border-default);
    cursor: pointer;
    transition: all 0.2s ease;
    font-size: 0.75rem;
    font-weight: 500;
  }
  
  .btn-toggle:hover {
    background-color: var(--bg-tertiary);
    border-color: var(--border-dark);
  }
  
  .btn-toggle.active {
    background-color: var(--color-primary-500);
    color: white;
    border-color: var(--color-primary-600);
  }
  
  .settings-footer {
    margin-top: 1rem;
    padding-top: 1rem;
    border-top: 1px solid var(--border-light);
  }
  
  .btn-reset {
    width: 100%;
    padding: 0.5rem;
    border-radius: 0.25rem;
    background-color: transparent;
    color: var(--text-tertiary);
    border: 1px solid var(--border-light);
    cursor: pointer;
    transition: all 0.2s ease;
    font-size: 0.75rem;
  }
  
  .btn-reset:hover {
    background-color: var(--bg-secondary);
    color: var(--text-secondary);
    border-color: var(--border-default);
  }
  
  @keyframes slideInDown {
    from {
      opacity: 0;
      transform: translateY(-10px);
    }
    to {
      opacity: 1;
      transform: translateY(0);
    }
  }
</style>