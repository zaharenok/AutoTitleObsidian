export interface AutoTitleSettings {
  apiKey: string;
  model: string;
  temperature: number;
  autoTrigger: boolean;
  language: string;
  replaceMode: boolean;
  timeout: number;
}

export const DEFAULT_SETTINGS: AutoTitleSettings = {
  apiKey: '',
  model: 'gpt-3.5-turbo',
  temperature: 0.3,
  autoTrigger: true,
  language: 'auto',
  replaceMode: false,
  timeout: 3000
};
