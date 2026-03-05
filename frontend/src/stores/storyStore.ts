import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { Story, User, Paragraph, WritingSample } from '../types';
import { storyApi, paragraphApi, writingSampleApi } from '../services/api';

export interface WritingSession {
  storyId: number | string;
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
  isLoading: boolean;
  error: string | null;
}

interface StoryActions {
  // Story management
  fetchStories: () => Promise<void>;
  fetchStory: (storyId: string) => Promise<void>;
  createStory: (story: { title: string; genre: string; description: string; accessLevel: string; requireExamples: boolean }) => Promise<void>;
  updateStory: (storyId: string, updates: Partial<Story>) => Promise<void>;
  deleteStory: (storyId: string) => Promise<void>;
  setCurrentStory: (story: Story | null) => void;

  // Paragraph management
  addParagraph: (storyId: string, content: string) => Promise<void>;
  deleteParagraph: (storyId: string, paragraphId: string) => Promise<void>;

  // User management
  setUser: (user: User | null) => void;

  // Writing sessions
  startWritingSession: (storyId: string | number, goalWords?: number) => void;
  endWritingSession: (wordsAdded: number, notes?: string) => void;
  updateSessionProgress: (wordCount: number) => void;

  // Writing samples
  fetchWritingSamples: (storyId: string) => Promise<void>;
  submitWritingSample: (storyId: string, content: string) => Promise<void>;
  reviewWritingSample: (sampleId: string, status: 'approved' | 'rejected') => Promise<void>;

  // Analytics & Preferences
  updateDailyWordCount: (words: number) => void;
  incrementStreak: () => void;
  resetStreak: () => void;
  updatePreferences: (preferences: Partial<StoryState['preferences']>) => void;
  getStoryWordCount: (storyId: string | number) => number;
  clearAll: () => void;
}

type StoryStore = StoryState & StoryActions;

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
      isLoading: false,
      error: null,

      // Async Story Management
      fetchStories: async () => {
        set({ isLoading: true, error: null });
        try {
          const stories = await storyApi.list() as Story[];
          set({ stories, isLoading: false });
        } catch (error: any) {
          set({ error: error.message, isLoading: false });
        }
      },

      fetchStory: async (storyId) => {
        set({ isLoading: true, error: null });
        try {
          const story = await storyApi.get(storyId) as Story;
          set({ currentStory: story, isLoading: false });
        } catch (error: any) {
          set({ error: error.message, isLoading: false });
        }
      },

      createStory: async (storyData) => {
        set({ isLoading: true, error: null });
        try {
          const newStory = await storyApi.create(storyData) as Story;
          set((state) => ({
            stories: [...state.stories, newStory],
            currentStory: newStory,
            isLoading: false
          }));
        } catch (error: any) {
          set({ error: error.message, isLoading: false });
          throw error;
        }
      },

      updateStory: async (storyId, updates) => {
        set({ isLoading: true, error: null });
        try {
          const updatedStory = await storyApi.update(storyId, updates as any) as Story;
          set((state) => ({
            stories: state.stories.map(s => s.id === updatedStory.id ? updatedStory : s),
            currentStory: state.currentStory?.id === updatedStory.id ? updatedStory : state.currentStory,
            isLoading: false
          }));
        } catch (error: any) {
          set({ error: error.message, isLoading: false });
          throw error;
        }
      },

      deleteStory: async (storyId) => {
        set({ isLoading: true, error: null });
        try {
          await storyApi.delete(storyId);
          set((state) => ({
            stories: state.stories.filter(s => String(s.id) !== String(storyId)),
            currentStory: String(state.currentStory?.id) === String(storyId) ? null : state.currentStory,
            writingSamples: state.writingSamples.filter(ws => String(ws.storyId) !== String(storyId)),
            isLoading: false
          }));
        } catch (error: any) {
          set({ error: error.message, isLoading: false });
          throw error;
        }
      },

      setCurrentStory: (story) => set({ currentStory: story }),

      // Async Paragraph Management
      addParagraph: async (storyId, content) => {
        set({ isLoading: true, error: null });
        try {
          const newParagraph = await paragraphApi.add(storyId, content) as Paragraph;
          set((state) => {
            const updatedStory = state.currentStory && String(state.currentStory.id) === String(storyId)
              ? { ...state.currentStory, paragraphs: [...(state.currentStory.paragraphs || []), newParagraph] }
              : state.currentStory;
            return {
              currentStory: updatedStory,
              stories: state.stories.map(s => String(s.id) === String(storyId) && updatedStory ? updatedStory : s),
              isLoading: false
            };
          });
        } catch (error: any) {
          set({ error: error.message, isLoading: false });
          throw error;
        }
      },

      deleteParagraph: async (storyId, paragraphId) => {
        set({ isLoading: true, error: null });
        try {
          await paragraphApi.delete(storyId, paragraphId);
          set((state) => {
            const updatedStory = state.currentStory && String(state.currentStory.id) === String(storyId)
              ? {
                ...state.currentStory,
                paragraphs: state.currentStory.paragraphs.filter(p => String(p.id) !== String(paragraphId)),
              }
              : state.currentStory;
            return {
              currentStory: updatedStory,
              stories: state.stories.map(s => String(s.id) === String(storyId) && updatedStory ? (updatedStory as Story) : s),
              isLoading: false
            };
          });
        } catch (error: any) {
          set({ error: error.message, isLoading: false });
          throw error;
        }
      },

      // User Management
      setUser: (user) => set({ user }),

      // Async Writing Samples
      fetchWritingSamples: async (storyId) => {
        set({ isLoading: true, error: null });
        try {
          const writingSamples = await writingSampleApi.getByStory(storyId) as WritingSample[];
          set({ writingSamples, isLoading: false });
        } catch (error: any) {
          set({ error: error.message, isLoading: false });
        }
      },

      submitWritingSample: async (storyId, content) => {
        set({ isLoading: true, error: null });
        try {
          const newSample = await writingSampleApi.submit(storyId, content) as WritingSample;
          set((state) => ({
            writingSamples: [...state.writingSamples, newSample],
            isLoading: false
          }));
        } catch (error: any) {
          set({ error: error.message, isLoading: false });
          throw error;
        }
      },

      reviewWritingSample: async (sampleId, status) => {
        set({ isLoading: true, error: null });
        try {
          const updatedSample = await writingSampleApi.review(sampleId, status) as WritingSample;
          set((state) => ({
            writingSamples: state.writingSamples.map(ws => String(ws.id) === String(sampleId) ? updatedSample : ws),
            isLoading: false
          }));
        } catch (error: any) {
          set({ error: error.message, isLoading: false });
          throw error;
        }
      },

      // Writing Sessions (Kept local, just state tracking)
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

      endWritingSession: (wordsAdded, _notes = '') =>
        set((state) => {
          if (!state.currentWritingSession) return state;

          const endTime = new Date();
          const sessionLength = endTime.getTime() - state.currentWritingSession.startTime.getTime();

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

      // Analytics & Preferences
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

      updatePreferences: (newPreferences) =>
        set((state) => ({
          preferences: { ...state.preferences, ...newPreferences },
        })),

      getStoryWordCount: (storyId) => {
        const story = get().stories.find(s => String(s.id) === String(storyId));
        if (!story || !story.paragraphs) return 0;
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
        // We only want to persist user preferences and analytics locally now, stories come from API
        analytics: state.analytics,
        preferences: state.preferences,
      }),
    }
  )
);
