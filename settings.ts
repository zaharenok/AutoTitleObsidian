export interface AutoTitleSettings {
  apiKey: string;
  model: string;
  temperature: number;
  autoTrigger: boolean;
  language: string;
  replaceMode: boolean;
  timeout: number;
  minContentLength: number;
  triggerMode: 'manual' | 'auto' | 'semi-auto';
  showIndicator: boolean;
}

export const DEFAULT_SETTINGS: AutoTitleSettings = {
  apiKey: '',
  model: 'gpt-3.5-turbo',
  temperature: 0.3,
  autoTrigger: false,
  language: 'auto',
  replaceMode: false,
  timeout: 5000,
  minContentLength: 100,
  triggerMode: 'manual',
  showIndicator: true
};
