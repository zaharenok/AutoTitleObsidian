import { App, PluginSettingTab, Setting } from 'obsidian';
import AutoTitlePlugin from './main';

export class AutoTitleSettingTab extends PluginSettingTab {
  plugin: AutoTitlePlugin;

  constructor(app: App, plugin: AutoTitlePlugin) {
    super(app, plugin);
    this.plugin = plugin;
  }

  display(): void {
    const { containerEl } = this;

    containerEl.empty();

    containerEl.createEl('h2', { text: 'AutoTitle – Settings' });

    // OpenAI API Key
    new Setting(containerEl)
      .setName('OpenAI API Key')
      .setDesc('Enter your OpenAI API key for title generation')
      .addText(text => text
        .setPlaceholder('sk-...')
        .setValue(this.plugin.settings.apiKey)
        .onChange(async (value) => {
          this.plugin.settings.apiKey = value;
          await this.plugin.saveSettings();
        }));

    // Model
    new Setting(containerEl)
      .setName('OpenAI Model')
      .setDesc('Select the model for title generation')
      .addDropdown(dropdown => dropdown
        .addOption('gpt-4.1', 'GPT-4.1')
        .addOption('gpt-4.1-nano', 'GPT-4.1 Nano')
        .addOption('gpt-4o', 'GPT-4o')
        .addOption('gpt-3.5-turbo', 'GPT-3.5 Turbo')
        .setValue(this.plugin.settings.model)
        .onChange(async (value) => {
          this.plugin.settings.model = value;
          await this.plugin.saveSettings();
        }));

    // Temperature
    new Setting(containerEl)
      .setName('Creativity (Temperature)')
      .setDesc('Adjust the creativity of generation (0.0 – more conservative, 1.0 – more creative)')
      .addSlider(slider => slider
        .setLimits(0, 1, 0.1)
        .setValue(this.plugin.settings.temperature)
        .setDynamicTooltip()
        .onChange(async (value) => {
          this.plugin.settings.temperature = value;
          await this.plugin.saveSettings();
        }));

    // Auto generation
    new Setting(containerEl)
      .setName('Automatic Generation')
      .setDesc('Automatically suggest titles while typing')
      .addToggle(toggle => toggle
        .setValue(this.plugin.settings.autoTrigger)
        .onChange(async (value) => {
          this.plugin.settings.autoTrigger = value;
          await this.plugin.saveSettings();
        }));

    // Title Language
    new Setting(containerEl)
      .setName('Title Language')
      .setDesc('Select the language for the generated title')
      .addDropdown(dropdown => dropdown
        .addOption('auto', 'Auto (detect from note language)')
        .addOption('en', 'English')
        .addOption('ru', 'Russian')
        .addOption('zh', 'Chinese')
        .addOption('es', 'Spanish')
        .setValue(this.plugin.settings.language || 'auto')
        .onChange(async (value) => {
          this.plugin.settings.language = value;
          await this.plugin.saveSettings();
        }));

    // Replace mode
    new Setting(containerEl)
      .setName('Replace Mode')
      .setDesc('Automatically replace the current title without confirmation')
      .addToggle(toggle => toggle
        .setValue(this.plugin.settings.replaceMode)
        .onChange(async (value) => {
          this.plugin.settings.replaceMode = value;
          await this.plugin.saveSettings();
        }));

    // Timeout
    new Setting(containerEl)
      .setName('Auto-generation Timeout (ms)')
      .setDesc('Waiting time after you stop typing before generating a title')
      .addText(text => text
        .setPlaceholder('3000')
        .setValue(this.plugin.settings.timeout.toString())
        .onChange(async (value) => {
          const timeout = parseInt(value);
          if (!isNaN(timeout) && timeout > 0) {
            this.plugin.settings.timeout = timeout;
            await this.plugin.saveSettings();
          }
        }));

    // Info
    containerEl.createEl('h3', { text: 'Usage' });
    const infoDiv = containerEl.createDiv();
    infoDiv.innerHTML = `
      <p><strong>Hotkeys:</strong></p>
      <ul>
        <li><code>Ctrl+Shift+H</code> – Generate a title for the current note</li>
      </ul>
      <p><strong>How to use:</strong></p>
      <ul>
        <li>Enter your OpenAI API key in the settings</li>
        <li>Write text in your note</li>
        <li>Use the hotkey or wait for automatic generation</li>
        <li>Confirm or reject the suggested title</li>
      </ul>
    `;
  }
}
