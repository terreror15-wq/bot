export interface ElectronAPI {
  isElectron: boolean;
  platform: string;
  pickFolder: (defaultPath?: string) => Promise<string | null>;
  openFolder: (dirPath: string) => Promise<boolean>;
  openFile: (filePath: string) => Promise<boolean>;
  minimizeToTray: () => Promise<boolean>;
  syncTrayState: (payload: {
    watching: boolean;
    currentStep: string;
    minimizeToTray: boolean;
  }) => void;
}

declare global {
  interface Window {
    electronAPI?: ElectronAPI;
  }
}

export {};
