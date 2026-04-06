export type UserRole = 'admin' | 'dj' | 'viewer';

export interface UserProfile {
  uid: string;
  displayName: string | null;
  email: string | null;
  photoURL: string | null;
  role: UserRole;
}

export interface Timeslot {
  id: string;
  title: string;
  djName: string;
  djId: string;
  startTime: any; // Firestore Timestamp
  endTime: any; // Firestore Timestamp
  mode: 'audio' | 'video';
  recurring?: boolean;
}

export interface ChatMessage {
  id: string;
  userId: string;
  userName: string;
  text: string;
  timestamp: any; // Firestore Timestamp
}

export interface StreamState {
  isLive: boolean;
  currentTimeslotId: string | null;
  mode: 'audio' | 'video';
  viewerCount: number;
  djName?: string;
}
