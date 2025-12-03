export enum Role {
  USER = 'user',
  MODEL = 'model'
}

export interface Message {
  id: string;
  role: Role;
  text: string;
  image?: string; // Base64 string of the uploaded image
  timestamp: number;
  isError?: boolean;
}

export interface ChatSession {
  id: string;
  title: string;
  messages: Message[];
  createdAt: number;
}

export interface ChatState {
  messages: Message[];
  isLoading: boolean;
}

export interface UserSettings {
  name: string;
  avatar: string | null; // Base64 string
  background: string; // CSS background value or Image Data URL
  isBackgroundImage: boolean;
}