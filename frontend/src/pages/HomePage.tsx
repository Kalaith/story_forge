import React, { useState, useEffect } from 'react';
import { storyApi, PublicStory } from '../services/api';
import StoryCard from '../components/StoryCard';
import { useNavigate } from 'react-router-dom';
import type { Story as LegacyStory } from '../types';

interface HomePageProps {
  showToast: (message: string, type?: 'success' | 'error' | 'warning') => void;
}

const HomePage: React.FC<HomePageProps> = (/*{ showToast }*/) => {
  const [stories, setStories] = useState<PublicStory[]>([]);
  const [filteredStories, setFilteredStories] = useState<PublicStory[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string>('');
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [genreFilter, setGenreFilter] = useState<string>('');
  const [accessFilter, setAccessFilter] = useState<string>('');
  const genres = Array.from(new Set(stories.map(story => story.genre))).sort();
  const navigate = useNavigate();

  useEffect(() => {
    let mounted = true;

    const loadStories = async () => {
      setIsLoading(true);
      setError('');
      try {
        const allStories = await storyApi.listPublic();
        if (!mounted) return;
        setStories(allStories);
        setFilteredStories(allStories);
      } catch (err) {
        if (!mounted) return;
        const message = err instanceof Error ? err.message : 'Failed to load stories';
        setError(message);
      } finally {
        if (mounted) {
          setIsLoading(false);
        }
      }
    };

    loadStories();
    return () => {
      mounted = false;
    };
  }, []);

  useEffect(() => {
    let currentFilteredStories = [...stories];

    if (searchTerm) {
      currentFilteredStories = currentFilteredStories.filter(story => 
        story.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        story.description.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    if (genreFilter) {
      currentFilteredStories = currentFilteredStories.filter(story => story.genre === genreFilter);
    }

    if (accessFilter) {
      currentFilteredStories = currentFilteredStories.filter(story => story.accessLevel === accessFilter);
    }

    setFilteredStories(currentFilteredStories);
  }, [searchTerm, genreFilter, accessFilter, stories]);

  const handleStoryClick = (story: PublicStory | LegacyStory) => {
    navigate(`/story/${String(story.id)}`);
  };

  return (
    <div id="homepageView">
      <section className="hero-section">
        <h1>Collaborative Storytelling</h1>
        <p className="hero-description">Join writers from around the world to create amazing stories, one paragraph at a time.</p>
      </section>

      <section className="filters-section">
        <div className="filters flex items-center gap-16">
          <select className="form-control filter-select" value={genreFilter} onChange={(e) => setGenreFilter(e.target.value)}>
            <option value="">All Genres</option>
            {genres.map(genre => (
              <option key={genre} value={genre}>{genre}</option>
            ))}
          </select>
          <select className="form-control filter-select" value={accessFilter} onChange={(e) => setAccessFilter(e.target.value)}>
            <option value="">All Access Levels</option>
            <option value="anyone">Open to Anyone</option>
            <option value="approved_only">Approved Contributors</option>
            <option value="specific_users">Specific Users Only</option>
          </select>
          <div className="search-container">
            <input 
              type="text" 
              className="form-control" 
              placeholder="Search stories..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </div>
      </section>

      <section className="stories-section">
        <div className="section-header flex items-center justify-between">
          <h2>Featured Stories</h2>
          <button className="btn btn--primary" onClick={() => navigate('/create-story')}>Create New Story</button>
        </div>
        <div className="stories-grid">
          {isLoading ? (
            <div className="empty-state"><h3>Loading stories...</h3></div>
          ) : error ? (
            <div className="empty-state"><h3>Unable to load stories</h3><p>{error}</p></div>
          ) : filteredStories.length > 0 ? (
            filteredStories.map(story => (
              <StoryCard key={story.id} story={story} onClick={handleStoryClick} />
            ))
          ) : (
            <div className="empty-state"><h3>No stories found</h3><p>Try adjusting your filters or create a new story.</p></div>
          )}
        </div>
      </section>
    </div>
  );
};

export default HomePage;
