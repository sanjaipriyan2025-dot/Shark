
export interface User {
  id: string;
  email: string;
  name: string;
}

export interface ActionItem {
  task: string;
  owner: string;
}

export interface MeetingMemo {
  id: string;
  timestamp: number;
  title: string;
  summary: string;
  keyPoints: string[];
  actionItems: ActionItem[];
  followUps: string[];
  transcript?: string;
  userId: string;
}

export enum AppState {
  AUTH = 'AUTH',
  LANDING = 'LANDING',
  PROCESSING = 'PROCESSING',
  RESULT = 'RESULT',
  HISTORY = 'HISTORY'
}

export interface GeminiResponse {
  summary: string;
  keyPoints: string[];
  actionItems: ActionItem[];
  followUps: string[];
  transcript: string;
}
