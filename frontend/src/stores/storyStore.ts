import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { Story, User, Paragraph, WritingSample } from '../types';

export interface WritingSession {
  storyId: number;
  startTime: Date;
  endTime?: Date;
  wordCount: number;
  wordsAdded: number;
  sessionGoal: number;
  notes: string;
}

export interface WritingAnalytics {
  dailyWordCount: number;
  weeklyProgress: number[];
  monthlyGoals: { target: number; achieved: number; month: string }[];
  streakDays: number;
  averageSessionLength: number;
  mostProductiveHours: number[];
  totalWordsWritten: number;
}

interface StoryState {
  stories: Story[];
  currentStory: Story | null;
  user: User | null;
  writingSamples: WritingSample[];
  currentWritingSession: WritingSession | null;
  analytics: WritingAnalytics;
  preferences: {
    autoSave: boolean;
    sessionGoal: number;
    showWordCount: boolean;
    darkMode: boolean;
  };
}

interface StoryActions {
  // Story management
  createStory: (story: Omit<Story, 'id' | 'createdDate' | 'paragraphs'>) => void;
  updateStory: (storyId: number, updates: Partial<Story>) => void;
  deleteStory: (storyId: number) => void;
  setCurrentStory: (story: Story | null) => void;
  loadUserStories: (stories: Story[]) => void;
  
  // Paragraph management
  addParagraph: (storyId: number, paragraph: Omit<Paragraph, 'id' | 'timestamp'>) => void;
  updateParagraph: (storyId: number, paragraphId: number, content: string) => void;
  deleteParagraph: (storyId: number, paragraphId: number) => void;
  
  // User management
  setUser: (user: User | null) => void;
  
  // Writing sessions
  startWritingSession: (storyId: number, goalWords?: number) => void;
  endWritingSession: (wordsAdded: number, notes?: string) => void;
  updateSessionProgress: (wordCount: number) => void;
  
  // Writing samples
  submitWritingSample: (sample: Omit<WritingSample, 'submittedDate' | 'status'>) => void;
  updateWritingSampleStatus: (userId: number, storyId: number, status: WritingSample['status']) => void;
  
  // Analytics
  updateDailyWordCount: (words: number) => void;
  incrementStreak: () => void;
  resetStreak: () => void;
  
  // Preferences
  updatePreferences: (preferences: Partial<StoryState['preferences']>) => void;
  
  // Utility
  getStoryWordCount: (storyId: number) => number;
  clearAll: () => void;
}

type StoryStore = StoryState & StoryActions;

const generateId = () => Math.floor(Math.random() * 1000000);

const defaultAnalytics: WritingAnalytics = {
  dailyWordCount: 0,
  weeklyProgress: [0, 0, 0, 0, 0, 0, 0],
  monthlyGoals: [],
  streakDays: 0,
  averageSessionLength: 0,
  mostProductiveHours: [],
  totalWordsWritten: 0,
};

const defaultPreferences = {
  autoSave: true,
  sessionGoal: 500,
  showWordCount: true,
  darkMode: false,
};

export const useStoryStore = create<StoryStore>()(
  persist(
    (set, get) => ({
      // State
      stories: [],
      currentStory: null,
      user: null,
      writingSamples: [],
      currentWritingSession: null,
      analytics: { ...defaultAnalytics },
      preferences: { ...defaultPreferences },

      // Story Management
      createStory: (storyData) =>
        set((state) => {
          const newStory: Story = {
            ...storyData,
            id: generateId(),
            createdDate: new Date().toISOString(),
            paragraphs: [],
          };
          return {
            stories: [...state.stories, newStory],
            currentStory: newStory,
          };
        }),

      updateStory: (storyId, updates) =>
        set((state) => {
          const updatedStories = state.stories.map(story =>
            story.id === storyId ? { ...story, ...updates } : story
          );
          return {
            stories: updatedStories,
            currentStory: state.currentStory?.id === storyId 
              ? updatedStories.find(s => s.id === storyId) || null
              : state.currentStory,
          };
        }),

      deleteStory: (storyId) =>
        set((state) => ({
          stories: state.stories.filter(s => s.id !== storyId),
          currentStory: state.currentStory?.id === storyId ? null : state.currentStory,
          writingSamples: state.writingSamples.filter(ws => ws.storyId !== storyId),
        })),

      setCurrentStory: (story) => set({ currentStory: story }),

      loadUserStories: (stories) => set({ stories }),

      // Paragraph Management
      addParagraph: (storyId, paragraphData) =>
        set((state) => {
          const newParagraph: Paragraph = {
            ...paragraphData,
            id: generateId(),
            timestamp: new Date().toISOString(),
          };

          const updatedStories = state.stories.map(story =>
            story.id === storyId
              ? { ...story, paragraphs: [...story.paragraphs, newParagraph] }
              : story
          );

          return {
            stories: updatedStories,
            currentStory: state.currentStory?.id === storyId
              ? updatedStories.find(s => s.id === storyId) || null
              : state.currentStory,
          };
        }),

      updateParagraph: (storyId, paragraphId, content) =>
        set((state) => {
          const updatedStories = state.stories.map(story =>
            story.id === storyId
              ? {
                  ...story,
                  paragraphs: story.paragraphs.map(p =>
                    p.id === paragraphId ? { ...p, content } : p
                  ),
                }
              : story
          );

          return {
            stories: updatedStories,
            currentStory: state.currentStory?.id === storyId
              ? updatedStories.find(s => s.id === storyId) || null
              : state.currentStory,
          };
        }),

      deleteParagraph: (storyId, paragraphId) =>
        set((state) => {
          const updatedStories = state.stories.map(story =>
            story.id === storyId
              ? {
                  ...story,
                  paragraphs: story.paragraphs.filter(p => p.id !== paragraphId),
                }
              : story
          );

          return {
            stories: updatedStories,
            currentStory: state.currentStory?.id === storyId
              ? updatedStories.find(s => s.id === storyId) || null
              : state.currentStory,
          };
        }),

      // User Management
      setUser: (user) => set({ user }),

      // Writing Sessions
      startWritingSession: (storyId, goalWords = 500) =>
        set({
          currentWritingSession: {
            storyId,
            startTime: new Date(),
            wordCount: 0,
            wordsAdded: 0,
            sessionGoal: goalWords,
            notes: '',
          },
        }),

      endWritingSession: (wordsAdded, notes = '') =>
        set((state) => {
          if (!state.currentWritingSession) return state;

          const endTime = new Date();
          const sessionLength = endTime.getTime() - state.currentWritingSession.startTime.getTime();

          // Update analytics
          const updatedAnalytics = {
            ...state.analytics,
            dailyWordCount: state.analytics.dailyWordCount + wordsAdded,
            totalWordsWritten: state.analytics.totalWordsWritten + wordsAdded,
            averageSessionLength: Math.round((state.analytics.averageSessionLength + sessionLength / 60000) / 2),
          };

          return {
            currentWritingSession: null,
            analytics: updatedAnalytics,
          };
        }),

      updateSessionProgress: (wordCount) =>
        set((state) =>
          state.currentWritingSession
            ? {
                currentWritingSession: {
                  ...state.currentWritingSession,
                  wordCount,
                  wordsAdded: wordCount - state.currentWritingSession.wordCount,
                },
              }
            : state
        ),

      // Writing Samples
      submitWritingSample: (sampleData) =>
        set((state) => {
          const newSample: WritingSample = {
            ...sampleData,
            submittedDate: new Date().toISOString(),
            status: 'pending',
          };
          return {
            writingSamples: [...state.writingSamples, newSample],
          };
        }),

      updateWritingSampleStatus: (userId, storyId, status) =>
        set((state) => ({
          writingSamples: state.writingSamples.map(ws =>
            ws.userId === userId && ws.storyId === storyId
              ? { ...ws, status }
              : ws
          ),
        })),

      // Analytics
      updateDailyWordCount: (words) =>
        set((state) => ({
          analytics: {
            ...state.analytics,
            dailyWordCount: words,
            totalWordsWritten: state.analytics.totalWordsWritten + words,
          },
        })),

      incrementStreak: () =>
        set((state) => ({
          analytics: {
            ...state.analytics,
            streakDays: state.analytics.streakDays + 1,
          },
        })),

      resetStreak: () =>
        set((state) => ({
          analytics: {
            ...state.analytics,
            streakDays: 0,
          },
        })),

      // Preferences
      updatePreferences: (newPreferences) =>
        set((state) => ({
          preferences: { ...state.preferences, ...newPreferences },
        })),

      // Utility
      getStoryWordCount: (storyId) => {
        const story = get().stories.find(s => s.id === storyId);
        if (!story) return 0;
        return story.paragraphs.reduce(
          (total, paragraph) => total + paragraph.content.split(/\s+/).length,
          0
        );
      },

      clearAll: () =>
        set({
          stories: [],
          currentStory: null,
          user: null,
          writingSamples: [],
          currentWritingSession: null,
          analytics: { ...defaultAnalytics },
          preferences: { ...defaultPreferences },
        }),
    }),
    {
      name: 'story-forge-storage',
      partialize: (state) => ({
        stories: state.stories,
        user: state.user,
        analytics: state.analytics,
        preferences: state.preferences,
      }),
    }
  )
);