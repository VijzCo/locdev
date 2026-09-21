export type AccountType = 'individual' | 'parent';
export type Gender = 'male' | 'female';
export type ProfileStatus = 'looking_for_marriage' | 'parents_managing' | 'exploring';
export type MatchStatus = 'pending' | 'accepted' | 'rejected' | 'blocked';
export type MessageStatus = 'sent' | 'delivered' | 'read';
export type VerificationStatus = 'none' | 'email' | 'phone' | 'full';

export interface UserProfile {
  uid: string;
  accountType: AccountType;
  email: string;
  displayName: string;
  photoURL?: string;
  createdAt: any;
  updatedAt: any;
  isAdmin?: boolean;
  isVerified?: boolean;
  verificationStatus: VerificationStatus;
  profileComplete: number; // 0-100
  
  // Personal info
  name: string;
  age?: number;
  dateOfBirth?: string;
  gender?: Gender;
  heightCm?: number;
  location?: string;
  city?: string;
  country?: string;
  nationality?: string;
  
  // Background
  education?: string;
  occupation?: string;
  religion?: string;
  sect?: string;
  maritalStatus?: string;
  hasChildren?: boolean;
  
  // Lifestyle
  prayerFrequency?: string;
  hijab?: boolean; // for females
  beard?: boolean; // for males
  smokingStatus?: string;
  
  // Profile
  bio?: string;
  interests?: string[];
  languages?: string[];
  photos?: string[];
  profilePhoto?: string;
  
  // Status
  profileStatus: ProfileStatus;
  isActive: boolean;
  isPaused: boolean;
  lastSeen?: any;
  
  // Parent account specifics
  childName?: string;
  childAge?: number;
  childGender?: Gender;
  
  // Privacy
  privacy: PrivacySettings;
  
  // Preferences
  preferences: PartnerPreferences;
}

export interface PrivacySettings {
  profileVisibility: 'everyone' | 'matches_only' | 'hidden';
  showPhotosTo: 'everyone' | 'matches_only' | 'none';
  showContactDetails: boolean;
  showLastSeen: boolean;
  allowMessagesFrom: 'everyone' | 'matches_only';
}

export interface PartnerPreferences {
  ageMin?: number;
  ageMax?: number;
  heightMinCm?: number;
  heightMaxCm?: number;
  locations?: string[];
  education?: string[];
  religion?: string[];
  maritalStatus?: string[];
  lifestyle?: string[];
}

export interface Match {
  id: string;
  users: [string, string];
  initiatorId: string;
  receiverId: string;
  status: MatchStatus;
  createdAt: any;
  updatedAt: any;
  lastMessage?: string;
  lastMessageAt?: any;
}

export interface Message {
  id: string;
  matchId: string;
  senderId: string;
  text: string;
  status: MessageStatus;
  createdAt: any;
  isDeleted?: boolean;
}

export interface Report {
  id: string;
  reporterId: string;
  reportedId: string;
  reason: string;
  details?: string;
  status: 'pending' | 'reviewed' | 'resolved';
  createdAt: any;
}

export interface Notification {
  id: string;
  userId: string;
  type: 'match_request' | 'match_accepted' | 'new_message' | 'profile_view' | 'photo_request';
  fromUserId?: string;
  message: string;
  isRead: boolean;
  createdAt: any;
  link?: string;
}
