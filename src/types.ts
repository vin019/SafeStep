export interface User {
  id: string;
  name: string;
  email: string;
  role: 'admin' | 'user';
  reputation: number;
  avatar: string;
  createdAt: any;
}

export interface Hazard {
  id: string;
  type: string;
  title: string;
  description: string;
  coords: {
    lat: number;
    lng: number;
  };
  reporterId: string;
  reporterName: string;
  reporterAvatar: string;
  status: 'active' | 'archived';
  verificationCount: number;
  createdAt: any;
}

export interface Verification {
  userId: string;
  hazardId: string;
  status: 'valid' | 'invalid';
  timestamp: any;
}

export interface Comment {
  id: string;
  hazardId: string;
  userId: string;
  userName: string;
  userAvatar: string;
  content: string;
  createdAt: any;
}

export interface Media {
  id: string;
  hazardId: string;
  userId: string;
  url: string;
  type: 'image' | 'video';
  createdAt: any;
}

export interface ActivityItem {
  id: string;
  type: 'HAZARD_REPORTED' | 'HAZARD_VERIFIED';
  title: string;
  timestamp: Date | any;
  statusText: string;
}

export interface NotificationLog {
  id: string;
  userId: string;
  hazardId?: string;
  type: 'proximity_alert' | 'nav_risk';
  message: string;
  timestamp: any;
}

export interface RouteOption {
  id: string;
  type: 'Safest' | 'Fastest';
  via: string;
  time: number;
  score: number;
  tags: string[];
  coordinates: [number, number][];
}
