import React, { useState, useEffect } from 'react';
import { apiService } from '../services/apiService';
import StoryCard from '../components/StoryCard';
import type { Story } from '../types';
import { useNavigate } from 'react-router-dom';

interface HomePageProps {
  showToast: (message: string, type?: 'success' | 'error' | 'warning') => void;
}

const HomePage: React.FC<HomePageProps> = (/*{ showToast }*/) => {
  const [stories, setStories] = useState<Story[]>([]);
  const [filteredStories, setFilteredStories] = useState<Story[]>([]);
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [genreFilter, setGenreFilter] = useState<string>('');
  const [accessFilter, setAccessFilter] = useState<string>('');
  const genres = apiService.getGenres();
  const navigate = useNavigate();

  useEffect(() => {
    const allStories = apiService.getStories();
    setStories(allStories);
    setFilteredStories(allStories);
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

  const handleStoryClick = (story: Story) => {
    navigate(`/story/${story.id}`);
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
          {filteredStories.length > 0 ? (
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