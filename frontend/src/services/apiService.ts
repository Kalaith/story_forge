import { data } from '../data/mockData';
import type { Story, User, WritingSample, Paragraph } from '../types';

class ApiService {
  private users: User[] = data.users;
  private stories: Story[] = data.stories as Story[];
  private genres: string[] = data.genres;
  private writingSamples: WritingSample[] = data.writingSamples as WritingSample[];

  getUsers(): User[] {
    return this.users;
  }

  getUser(id: number): User | undefined {
    return this.users.find(u => u.id === id);
  }

  getUserByUsername(username: string): User | undefined {
    return this.users.find(u => u.username === username);
  }

  getStories(): Story[] {
    return this.stories;
  }

  getStory(id: number): Story | undefined {
    return this.stories.find(s => s.id === id);
  }

  getGenres(): string[] {
    return this.genres;
  }

  getWritingSamplesForStory(storyId: number): WritingSample[] {
    return this.writingSamples.filter(s => s.storyId === storyId);
  }

  createStory(storyData: Omit<Story, 'id' | 'createdDate' | 'blockedUsers' | 'approvedContributors' | 'paragraphs'> & { author: string; firstParagraph: string }): Story {
    const newStory: Story = {
      ...storyData,
      id: this.stories.length + 1,
      createdDate: new Date().toISOString().split('T')[0],
      blockedUsers: [],
      approvedContributors: [],
      paragraphs: [{
        id: 1,
        author: storyData.author,
        content: storyData.firstParagraph,
        timestamp: new Date().toISOString()
      }]
    };
    this.stories.push(newStory);
    return newStory;
  }

  addParagraph(storyId: number, paragraphData: Omit<Paragraph, 'id' | 'timestamp'>): Paragraph | null {
    const story = this.getStory(storyId);
    if (story) {
      const newParagraph: Paragraph = {
        ...paragraphData,
        id: story.paragraphs.length + 1,
        timestamp: new Date().toISOString()
      };
      story.paragraphs.push(newParagraph);
      return newParagraph;
    }
    return null;
  }

  addWritingSample(sampleData: Omit<WritingSample, 'status' | 'submittedDate'>): WritingSample {
    const newSample: WritingSample = {
      ...sampleData,
      status: 'pending',
      submittedDate: new Date().toISOString().split('T')[0]
    };
    this.writingSamples.push(newSample);
    return newSample;
  }

  updateStory(storyId: number, updates: Partial<Story>): Story | null {
    const story = this.getStory(storyId);
    if (story) {
      Object.assign(story, updates);
      return story;
    }
    return null;
  }

  updateWritingSample(userId: number, storyId: number, updates: Partial<WritingSample>): WritingSample | null {
    const sample = this.writingSamples.find(s => s.userId === userId && s.storyId === storyId);
    if (sample) {
      Object.assign(sample, updates);
      return sample;
    }
    return null;
  }
}

export const apiService = new ApiService();