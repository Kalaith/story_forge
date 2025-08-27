export interface User {
  id: number;
  username: string;
  email: string;
  joinDate: string;
  storiesCreated: number;
  contributions: number;
}

export interface Paragraph {
  id: number;
  author: string;
  content: string;
  timestamp: string;
}

export type AccessLevel = "anyone" | "approved_only" | "specific_users";

export interface Story {
  id: number;
  title: string;
  genre: string;
  description: string;
  createdBy: number; // User ID
  createdDate: string;
  accessLevel: AccessLevel;
  requireExamples: boolean;
  blockedUsers: number[]; // User IDs
  approvedContributors: number[]; // User IDs
  paragraphs: Paragraph[];
}

export interface WritingSample {
  userId: number;
  storyId: number;
  content: string;
  status: "pending" | "approved" | "rejected";
  submittedDate: string;
}