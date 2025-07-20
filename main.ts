import { App, Editor, MarkdownView, Modal, Notice, Plugin, PluginManifest, TFile } from 'obsidian';
import { AutoTitleSettings, DEFAULT_SETTINGS } from './settings';
import { AutoTitleSettingTab } from './SettingTab';
import { generateTitle, showNotice } from './utils';

export default class AutoTitlePlugin extends Plugin {
  settings: AutoTitleSettings;
  private typingTimer: NodeJS.Timeout | null = null;
  private isGenerating = false;
  private generatedForCurrentFile: Set<string> = new Set();
  private statusBarItem: HTMLElement | null = null;
  private indicatorTimer: NodeJS.Timeout | null = null;

  constructor(app: App, manifest: PluginManifest) {
    super(app, manifest);
  }

  async onload() {
    console.log('Загружается плагин AutoTitle');

    await this.loadSettings();

    // Добавляем кнопку в ленту
    this.addRibbonIcon('heading', 'Генерировать заголовок', (evt: MouseEvent) => {
      this.generateTitleForActiveNote();
    });

    // Добавляем команду
    this.addCommand({
      id: 'generate-title',
      name: 'Generate title for note',
      callback: () => {
        this.generateTitleForActiveNote();
      },
      hotkeys: [
        {
          modifiers: ['Ctrl', 'Shift'],
          key: 'h'
        }
      ]
    });

    // Добавляем команду для редактора
    this.addCommand({
      id: 'generate-title-editor',
      name: 'Generate title (in editor)',
      editorCallback: (editor: Editor, view: MarkdownView) => {
        this.generateTitleForEditor(editor, view);
      }
    });

    // Добавляем вкладку настроек
    this.addSettingTab(new AutoTitleSettingTab(this.app, this));

    // Добавляем элемент в статус-бар
    this.statusBarItem = this.addStatusBarItem();
    this.updateStatusBar();

    // Регистрируем обработчик изменений в редакторе для автоматической генерации
    this.registerAutoTrigger();

    // Добавляем элемент в контекстное меню файлов
    this.registerEvent(
      this.app.workspace.on('file-menu', (menu, file) => {
        if (file instanceof TFile && file.extension === 'md') {
          menu.addItem((item) => {
            item
              .setTitle('Генерировать заголовок с AI')
              .setIcon('heading')
              .onClick(() => {
                this.generateTitleForFile(file);
              });
          });
        }
      })
    );
  }

  onunload() {
    console.log('Выгружается плагин AutoTitle');
    if (this.typingTimer) {
      clearTimeout(this.typingTimer);
    }
    if (this.indicatorTimer) {
      clearTimeout(this.indicatorTimer);
    }
  }

  private updateStatusBar() {
    if (!this.statusBarItem) return;
    
    const mode = this.settings.triggerMode;
    let text = '';
    
    switch (mode) {
      case 'manual':
        text = 'AutoTitle: Manual';
        break;
      case 'auto':
        text = 'AutoTitle: Auto';
        break;
      case 'semi-auto':
        text = 'AutoTitle: Semi-auto';
        break;
    }
    
    this.statusBarItem.setText(text);
  }

  async loadSettings() {
    this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());
  }

  async saveSettings() {
    await this.saveData(this.settings);
    
    // Обновляем статус-бар
    this.updateStatusBar();
    
    // Перерегистрируем автотриггер при изменении настроек
    this.registerAutoTrigger();
  }

  private registerAutoTrigger() {
    // Снимаем предыдущие обработчики
    this.app.workspace.off('editor-change', this.handleEditorChange);
    
    if (this.settings.triggerMode !== 'manual') {
      this.registerEvent(
        this.app.workspace.on('editor-change', this.handleEditorChange.bind(this))
      );
    }
  }

  private handleEditorChange(editor: Editor, view: MarkdownView) {
    if (this.isGenerating) {
      return;
    }
    
    // Не запускать автогенерацию, если уже был сгенерирован заголовок для этой заметки
    const file = view?.file;
    if (file && this.generatedForCurrentFile.has(file.path)) {
      return;
    }
    
    // Сбрасываем предыдущий таймер и индикатор
    if (this.typingTimer) {
      clearTimeout(this.typingTimer);
    }
    if (this.indicatorTimer) {
      clearTimeout(this.indicatorTimer);
    }
    
    const content = editor.getValue();
    if (!content || content.trim().length < this.settings.minContentLength) {
      return;
    }

    // Проверяем, есть ли уже заголовок
    const lines = content.split('\n');
    const firstLine = lines[0]?.trim();
    if (firstLine && firstLine.startsWith('#') && !this.settings.replaceMode) {
      return;
    }

    if (this.settings.triggerMode === 'auto') {
      // Автоматический режим - запускаем генерацию после паузы
      this.typingTimer = setTimeout(() => {
        this.autoGenerateTitle(editor, view);
      }, this.settings.timeout);
      
      // Показываем индикатор если включено
      if (this.settings.showIndicator) {
        this.indicatorTimer = setTimeout(() => {
          this.showGenerationIndicator();
        }, this.settings.timeout - 1000);
      }
    } else if (this.settings.triggerMode === 'semi-auto') {
      // Полуавтоматический режим - показываем индикатор и кнопку для ручного запуска
      this.typingTimer = setTimeout(() => {
        this.showManualTriggerButton(editor, view);
      }, this.settings.timeout);
    }
  }

  private async autoGenerateTitle(editor: Editor, view: MarkdownView) {
    if (this.isGenerating) {
      return;
    }
    
    const content = editor.getValue();
    if (!content || content.trim().length < this.settings.minContentLength) {
      return;
    }
    
    // Проверяем, есть ли уже заголовок
    const lines = content.split('\n');
    const firstLine = lines[0]?.trim();
    
    // Если первая строка уже является заголовком и режим замены выключен, не генерируем
    if (firstLine && firstLine.startsWith('#') && !this.settings.replaceMode) {
      return;
    }
    
    // Не запускать автогенерацию, если уже был сгенерирован заголовок для этой заметки
    const file = view?.file;
    if (file && this.generatedForCurrentFile.has(file.path)) {
      return;
    }
    
    try {
      this.isGenerating = true;
      this.hideGenerationIndicator();
      
      const suggestedTitle = await generateTitle(
        content,
        this.settings.apiKey,
        this.settings.model,
        this.settings.temperature,
        this.settings.language
      );
      
      if (this.settings.replaceMode) {
        this.replaceTitle(editor, suggestedTitle);
        showNotice(`Заголовок обновлен: "${suggestedTitle}"`);
        // После генерации — больше не автогенерировать для этой заметки
        if (file) this.generatedForCurrentFile.add(file.path);
      } else {
        this.showTitleSuggestionModal(editor, view, suggestedTitle);
      }
    } catch (error) {
      console.error('Ошибка автогенерации заголовка:', error);
      // Не показываем ошибку для автогенерации, чтобы не мешать пользователю
    } finally {
      this.isGenerating = false;
    }
  }

  private showGenerationIndicator() {
    if (!this.settings.showIndicator) return;
    
    // Создаем всплывающее уведомление о предстоящей генерации
    const notice = new Notice('Генерация заголовка через 1 секунду...', 2000);
    
    // Добавляем кнопку отмены
    const noticeEl = notice.noticeEl;
    const cancelButton = noticeEl.createEl('button', { text: 'Отмена' });
    cancelButton.style.marginLeft = '10px';
    cancelButton.onclick = () => {
      if (this.typingTimer) {
        clearTimeout(this.typingTimer);
      }
      notice.hide();
    };
  }

  private hideGenerationIndicator() {
    // Этот метод может быть использован для скрытия индикаторов
    // В данной реализации индикаторы исчезают автоматически
  }

  private showManualTriggerButton(editor: Editor, view: MarkdownView) {
    // Создаем всплывающее уведомление с кнопкой ручного запуска
    const notice = new Notice('', 5000);
    const noticeEl = notice.noticeEl;
    noticeEl.innerHTML = '';
    
    const text = noticeEl.createEl('span', { text: 'Готов сгенерировать заголовок. ' });
    const generateButton = noticeEl.createEl('button', { text: 'Сгенерировать' });
    generateButton.style.marginLeft = '10px';
    generateButton.style.backgroundColor = 'var(--interactive-accent)';
    generateButton.style.color = 'var(--text-on-accent)';
    generateButton.style.border = 'none';
    generateButton.style.padding = '4px 8px';
    generateButton.style.borderRadius = '3px';
    generateButton.style.cursor = 'pointer';
    
    generateButton.onclick = () => {
      notice.hide();
      this.autoGenerateTitle(editor, view);
    };
    
    const cancelButton = noticeEl.createEl('button', { text: 'Отмена' });
    cancelButton.style.marginLeft = '5px';
    cancelButton.onclick = () => {
      notice.hide();
    };
  }

  private async generateTitleForActiveNote() {
    const activeView = this.app.workspace.getActiveViewOfType(MarkdownView);
    if (!activeView) {
      showNotice('Откройте заметку для генерации заголовка');
      return;
    }

    const editor = activeView.editor;
    await this.generateTitleForEditor(editor, activeView);
  }

  private async generateTitleForEditor(editor: Editor, view: MarkdownView) {
    if (this.isGenerating) {
      showNotice('Генерация заголовка уже выполняется...');
      return;
    }

    const content = editor.getValue();
    if (!content || content.trim().length < 10) {
      showNotice('Недостаточно содержимого для генерации заголовка');
      return;
    }

    if (!this.settings.apiKey) {
      showNotice('Настройте API ключ OpenAI в настройках плагина');
      return;
    }

    try {
      this.isGenerating = true;
      showNotice('Генерирую заголовок...', 2000);

      const suggestedTitle = await generateTitle(
        content,
        this.settings.apiKey,
        this.settings.model,
        this.settings.temperature,
        this.settings.language
      );

      this.showTitleSuggestionModal(editor, view, suggestedTitle);
    } catch (error) {
      console.error('Ошибка генерации заголовка:', error);
      showNotice(`Ошибка: ${error.message}`);
    } finally {
      this.isGenerating = false;
    }
  }

  private async generateTitleForFile(file: TFile) {
    const content = await this.app.vault.read(file);
    if (!content || content.trim().length < 10) {
      showNotice('Недостаточно содержимого для генерации заголовка');
      return;
    }

    if (!this.settings.apiKey) {
      showNotice('Настройте API ключ OpenAI в настройках плагина');
      return;
    }

    try {
      this.isGenerating = true;
      showNotice('Генерирую заголовок...', 2000);

      const suggestedTitle = await generateTitle(
        content,
        this.settings.apiKey,
        this.settings.model,
        this.settings.temperature,
        this.settings.language
      );

      // Создаем модальное окно для подтверждения
      new TitleSuggestionModal(this.app, suggestedTitle, async (accepted: boolean) => {
        if (accepted) {
          // Обновляем содержимое файла
          const updatedContent = this.insertTitleIntoContent(content, suggestedTitle);
          await this.app.vault.modify(file, updatedContent);
          showNotice(`Заголовок добавлен в файл: "${suggestedTitle}"`);
        }
      }).open();
    } catch (error) {
      console.error('Ошибка генерации заголовка:', error);
      showNotice(`Ошибка: ${error.message}`);
    } finally {
      this.isGenerating = false;
    }
  }

  private showTitleSuggestionModal(editor: Editor, view: MarkdownView, suggestedTitle: string) {
    new TitleSuggestionModal(this.app, suggestedTitle, (accepted: boolean) => {
      if (accepted) {
        this.replaceTitle(editor, suggestedTitle);
        showNotice(`Заголовок обновлен: "${suggestedTitle}"`);
        // После генерации — больше не автогенерировать для этой заметки
        const file = view?.file;
        if (file) this.generatedForCurrentFile.add(file.path);
        // Переименовываем файл, если это возможно
        if (view.file) {
          this.renameFile(view.file, suggestedTitle);
        }
      }
    }).open();
  }

  private replaceTitle(editor: Editor, newTitle: string) {
    const content = editor.getValue();
    const lines = content.split('\n');
    
    // Проверяем, есть ли уже заголовок в первой строке
    if (lines[0] && lines[0].trim().startsWith('#')) {
      // Заменяем существующий заголовок
      lines[0] = `# ${newTitle}`;
    } else {
      // Добавляем новый заголовок в начало
      lines.unshift(`# ${newTitle}`, '');
    }
    
    editor.setValue(lines.join('\n'));
  }

  private insertTitleIntoContent(content: string, title: string): string {
    const lines = content.split('\n');
    // Если первая строка уже содержит нужный заголовок, ничего не делаем
    if (lines[0] && lines[0].trim() === `# ${title}`) {
      return content;
    }
    // Проверяем, есть ли уже заголовок в первой строке
    if (lines[0] && lines[0].trim().startsWith('#')) {
      // Заменяем существующий заголовок
      lines[0] = `# ${title}`;
    } else {
      // Добавляем новый заголовок в начало
      lines.unshift(`# ${title}`, '');
    }
    return lines.join('\n');
  }

  private async renameFile(file: TFile, newTitle: string) {
    try {
      // Очищаем заголовок от недопустимых символов для имени файла
      const sanitizedTitle = newTitle
        .replace(/[<>:"/\\|?*]/g, '')
        .replace(/\s+/g, ' ')
        .trim()
        .substring(0, 100); // Ограничиваем длину

      if (sanitizedTitle && sanitizedTitle !== file.basename) {
        const newPath = file.path.replace(file.name, `${sanitizedTitle}.md`);
        
        // Проверяем, не существует ли уже файл с таким именем
        const existingFile = this.app.vault.getAbstractFileByPath(newPath);
        if (!existingFile) {
          await this.app.fileManager.renameFile(file, newPath);
          showNotice(`Файл переименован: "${sanitizedTitle}"`);
        }
      }
    } catch (error) {
      console.error('Ошибка переименования файла:', error);
      // Не показываем ошибку пользователю, так как это не критично
    }
  }
}

class TitleSuggestionModal extends Modal {
  private suggestedTitle: string;
  private onResult: (accepted: boolean) => void;

  constructor(app: App, suggestedTitle: string, onResult: (accepted: boolean) => void) {
    super(app);
    this.suggestedTitle = suggestedTitle;
    this.onResult = onResult;
  }

  onOpen() {
    const { contentEl } = this;
    contentEl.empty();

    contentEl.createEl('h2', { text: 'Предлагаемый заголовок' });
    
    const titleEl = contentEl.createEl('div', { 
      text: this.suggestedTitle,
      cls: 'suggested-title'
    });
    titleEl.style.fontSize = '1.2em';
    titleEl.style.fontWeight = 'bold';
    titleEl.style.margin = '20px 0';
    titleEl.style.padding = '10px';
    titleEl.style.border = '1px solid var(--background-modifier-border)';
    titleEl.style.borderRadius = '4px';

    const buttonsDiv = contentEl.createDiv({ cls: 'modal-button-container' });
    buttonsDiv.style.display = 'flex';
    buttonsDiv.style.gap = '10px';
    buttonsDiv.style.justifyContent = 'flex-end';
    buttonsDiv.style.marginTop = '20px';

    const acceptButton = buttonsDiv.createEl('button', { text: 'Принять' });
    acceptButton.classList.add('mod-cta');
    acceptButton.onclick = () => {
      this.close();
      this.onResult(true);
    };

    const rejectButton = buttonsDiv.createEl('button', { text: 'Отклонить' });
    rejectButton.onclick = () => {
      this.close();
      this.onResult(false);
    };

    // Фокус на кнопке "Принять"
    acceptButton.focus();
  }

  onClose() {
    const { contentEl } = this;
    contentEl.empty();
  }
}
