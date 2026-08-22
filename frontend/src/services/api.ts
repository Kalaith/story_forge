import { ApiError as SharedApiError, createApiClient } from '@webhatchery/api-client';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL;
if (!API_BASE_URL?.trim()) {
  throw new Error('Missing required VITE_API_BASE_URL');
}

interface BackendUser {
  id?: string;
  username?: string;
  display_name?: string;
}

interface BackendParagraph {
  id?: string;
  author_id?: string;
  content?: string;
  created_at?: string;
  author?: BackendUser;
}

interface BackendStory {
  id?: string;
  title?: string;
  genre?: string;
  description?: string;
  created_by?: string;
  access_level?: 'anyone' | 'approved_only' | 'specific_users';
  require_examples?: boolean;
  created_at?: string;
  creator?: BackendUser;
  paragraphs?: BackendParagraph[];
}

export interface PublicParagraph {
  id: string;
  authorId: string;
  author: string;
  content: string;
  timestamp: string;
}

export interface PublicStory {
  id: string;
  title: string;
  genre: string;
  description: string;
  createdBy: string;
  authorName: string;
  createdDate: string;
  accessLevel: 'anyone' | 'approved_only' | 'specific_users';
  requireExamples: boolean;
  paragraphs: PublicParagraph[];
}

class ApiError extends Error {
  public status: number;

  constructor(status: number, message: string) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
  }
}

let getAccessToken: (() => Promise<string>) | null = null;

const sharedApiClient = createApiClient({
  baseURL: API_BASE_URL,
  preserveEnvelope: false,
  tokenProvider: async () => {
    if (!getAccessToken) {
      return null;
    }
    return getAccessToken();
  },
});

export function setTokenProvider(provider: () => Promise<string>) {
  getAccessToken = provider;
}

function requireAuthProvider(): void {
  if (!getAccessToken) {
    throw new Error('Token provider not set. Make sure auth context is initialized.');
  }
}

async function apiRequestPublic<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  try {
    return await sharedApiClient.request<T>(endpoint, {
      method: options.method ?? 'GET',
      headers: {
        ...options.headers,
      },
      body: options.body,
    });
  } catch (error) {
    if (error instanceof ApiError) {
      throw error;
    }
    if (error instanceof SharedApiError) {
      throw new ApiError(error.status, error.message);
    }
    throw new ApiError(0, error instanceof Error ? error.message : 'Network error');
  }
}

async function apiRequestPrivate<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  requireAuthProvider();
  return apiRequestPublic<T>(endpoint, options);
}

function toDateOnly(value?: string): string {
  if (!value) return '';
  return value.slice(0, 10);
}

function mapPublicStory(story: BackendStory): PublicStory {
  const paragraphs = (story.paragraphs ?? []).map((paragraph, index) => {
    const authorName = paragraph.author?.username ?? paragraph.author?.display_name ?? 'Unknown';
    return {
      id: paragraph.id ?? `paragraph-${index}`,
      authorId: paragraph.author_id ?? paragraph.author?.id ?? '',
      author: authorName,
      content: paragraph.content ?? '',
      timestamp: paragraph.created_at ?? '',
    };
  });

  const authorName = story.creator?.username ?? story.creator?.display_name ?? 'Unknown';

  return {
    id: story.id ?? '',
    title: story.title ?? 'Untitled',
    genre: story.genre ?? 'General',
    description: story.description ?? '',
    createdBy: story.created_by ?? story.creator?.id ?? '',
    authorName,
    createdDate: toDateOnly(story.created_at),
    accessLevel: story.access_level ?? 'anyone',
    requireExamples: Boolean(story.require_examples),
    paragraphs,
  };
}

export const storyApi = {
  async listPublic(): Promise<PublicStory[]> {
    const stories = await apiRequestPublic<BackendStory[]>('/stories');
    return stories.map(mapPublicStory);
  },

  async getPublic(id: string): Promise<PublicStory> {
    const story = await apiRequestPublic<BackendStory>(`/stories/${id}`);
    return mapPublicStory(story);
  },

  async list(): Promise<unknown[]> {
    return apiRequestPrivate<unknown[]>('/stories');
  },

  async get(id: string): Promise<unknown> {
    return apiRequestPrivate<unknown>(`/stories/${id}`);
  },

  async create(story: {
    title: string;
    genre: string;
    description: string;
    accessLevel: string;
    requireExamples: boolean;
  }): Promise<unknown> {
    return apiRequestPrivate<unknown>('/stories', {
      method: 'POST',
      body: JSON.stringify(story),
    });
  },

  async update(
    id: string,
    updates: unknown
  ): Promise<unknown> {
    return apiRequestPrivate<unknown>(`/stories/${id}`, {
      method: 'PUT',
      body: JSON.stringify(updates),
    });
  },

  async delete(id: string): Promise<void> {
    return apiRequestPrivate<void>(`/stories/${id}`, {
      method: 'DELETE',
    });
  },
};

export const paragraphApi = {
  async add(storyId: string, content: string): Promise<unknown> {
    return apiRequestPrivate<unknown>(`/stories/${storyId}/paragraphs`, {
      method: 'POST',
      body: JSON.stringify({ content }),
    });
  },

  async delete(storyId: string, paragraphId: string): Promise<void> {
    return apiRequestPrivate<void>(`/stories/${storyId}/paragraphs/${paragraphId}`, {
      method: 'DELETE',
    });
  },
};

export const writingSampleApi = {
  async getByStory(storyId: string): Promise<unknown[]> {
    return apiRequestPrivate<unknown[]>(`/stories/${storyId}/samples`);
  },

  async submit(storyId: string, content: string): Promise<unknown> {
    return apiRequestPrivate<unknown>(`/stories/${storyId}/samples`, {
      method: 'POST',
      body: JSON.stringify({ content }),
    });
  },

  async review(sampleId: string, status: 'approved' | 'rejected'): Promise<unknown> {
    return apiRequestPrivate<unknown>(`/writing-samples/${sampleId}/review`, {
      method: 'PUT',
      body: JSON.stringify({ status }),
    });
  },
};
