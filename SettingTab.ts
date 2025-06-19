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

    containerEl.createEl('h2', { text: 'AutoTitle - Настройки' });

    // API ключ OpenAI
    new Setting(containerEl)
      .setName('API ключ OpenAI')
      .setDesc('Введите ваш API ключ OpenAI для генерации заголовков')
      .addText(text => text
        .setPlaceholder('sk-...')
        .setValue(this.plugin.settings.apiKey)
        .onChange(async (value) => {
          this.plugin.settings.apiKey = value;
          await this.plugin.saveSettings();
        }));

    // Модель
    new Setting(containerEl)
      .setName('Модель OpenAI')
      .setDesc('Выберите модель для генерации заголовков')
      .addDropdown(dropdown => dropdown
        .addOption('gpt-3.5-turbo', 'GPT-3.5 Turbo')
        .addOption('gpt-4', 'GPT-4')
        .addOption('gpt-4-turbo-preview', 'GPT-4 Turbo')
        .setValue(this.plugin.settings.model)
        .onChange(async (value) => {
          this.plugin.settings.model = value;
          await this.plugin.saveSettings();
        }));

    // Температура
    new Setting(containerEl)
      .setName('Творческость (Temperature)')
      .setDesc('Настройка творческости генерации (0.0 - более консервативно, 1.0 - более креативно)')
      .addSlider(slider => slider
        .setLimits(0, 1, 0.1)
        .setValue(this.plugin.settings.temperature)
        .setDynamicTooltip()
        .onChange(async (value) => {
          this.plugin.settings.temperature = value;
          await this.plugin.saveSettings();
        }));

    // Автоматический триггер
    new Setting(containerEl)
      .setName('Автоматическая генерация')
      .setDesc('Автоматически предлагать заголовки при наборе текста')
      .addToggle(toggle => toggle
        .setValue(this.plugin.settings.autoTrigger)
        .onChange(async (value) => {
          this.plugin.settings.autoTrigger = value;
          await this.plugin.saveSettings();
        }));

    // Язык по умолчанию
    new Setting(containerEl)
      .setName('Язык по умолчанию')
      .setDesc('Выберите язык для генерации заголовков')
      .addDropdown(dropdown => dropdown
        .addOption('auto', 'Автоопределение')
        .addOption('русский', 'Русский')
        .addOption('английский', 'Английский')
        .addOption('французский', 'Французский')
        .addOption('немецкий', 'Немецкий')
        .addOption('испанский', 'Испанский')
        .setValue(this.plugin.settings.language)
        .onChange(async (value) => {
          this.plugin.settings.language = value;
          await this.plugin.saveSettings();
        }));

    // Режим замены
    new Setting(containerEl)
      .setName('Режим замены')
      .setDesc('Автоматически заменять текущий заголовок без подтверждения')
      .addToggle(toggle => toggle
        .setValue(this.plugin.settings.replaceMode)
        .onChange(async (value) => {
          this.plugin.settings.replaceMode = value;
          await this.plugin.saveSettings();
        }));

    // Таймаут
    new Setting(containerEl)
      .setName('Таймаут автогенерации (мс)')
      .setDesc('Время ожидания после прекращения набора текста перед генерацией заголовка')
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

    // Информация
    containerEl.createEl('h3', { text: 'Использование' });
    const infoDiv = containerEl.createDiv();
    infoDiv.innerHTML = `
      <p><strong>Горячие клавиши:</strong></p>
      <ul>
        <li><code>Ctrl+Shift+H</code> - Генерация заголовка для текущей заметки</li>
      </ul>
      <p><strong>Как использовать:</strong></p>
      <ul>
        <li>Введите API ключ OpenAI в настройках</li>
        <li>Напишите текст в заметке</li>
        <li>Используйте горячую клавишу или подождите автоматической генерации</li>
        <li>Подтвердите или отклоните предложенный заголовок</li>
      </ul>
    `;
  }
}
