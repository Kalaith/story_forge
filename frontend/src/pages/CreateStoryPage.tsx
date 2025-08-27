import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { apiService } from '../services/apiService';

interface CreateStoryPageProps {
  showToast: (message: string, type?: 'success' | 'error' | 'warning') => void;
}

const CreateStoryPage: React.FC<CreateStoryPageProps> = ({ showToast }) => {
  const navigate = useNavigate();
  const genres = apiService.getGenres();

  const [storyTitle, setStoryTitle] = useState('');
  const [storyGenre, setStoryGenre] = useState(genres[0] || '');
  const [storyDescription, setStoryDescription] = useState('');
  const [accessLevel, setAccessLevel] = useState('anyone');
  const [requireExamples, setRequireExamples] = useState(false);
  const [firstParagraph, setFirstParagraph] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();


    const newStoryData = {
      title: storyTitle,
      genre: storyGenre,
      description: storyDescription,
      createdBy: 1, // Hardcoded for now, will be dynamic with auth
      accessLevel: accessLevel as 'anyone' | 'approved_only' | 'specific_users',
      requireExamples: requireExamples,
      firstParagraph: firstParagraph,
      author: "placeholder_author" // Hardcoded for now
    };

    const newStory = apiService.createStory(newStoryData);
    showToast('Story created successfully!');
    navigate(`/story/${newStory.id}`);
  };

  return (
    <div id="storyCreationView">
      <div className="container">
        <div className="form-container">
          <h2>Create New Story</h2>
          <form onSubmit={handleSubmit}>
            <div className="form-group">
              <label className="form-label" htmlFor="storyTitle">Story Title</label>
              <input type="text" className="form-control" id="storyTitle" value={storyTitle} onChange={(e) => setStoryTitle(e.target.value)} required />
            </div>
            
            <div className="form-group">
              <label className="form-label" htmlFor="storyGenre">Genre</label>
              <select className="form-control" id="storyGenre" value={storyGenre} onChange={(e) => setStoryGenre(e.target.value)} required>
                <option value="">Select a genre</option>
                {genres.map(genre => (
                  <option key={genre} value={genre}>{genre}</option>
                ))}
              </select>
            </div>
            
            <div className="form-group">
              <label className="form-label" htmlFor="storyDescription">Description</label>
              <textarea className="form-control" id="storyDescription" rows={3} value={storyDescription} onChange={(e) => setStoryDescription(e.target.value)} required placeholder=""></textarea>
            </div>
            
            <div className="form-group">
              <label className="form-label" htmlFor="accessLevel">Access Level</label>
              <select className="form-control" id="accessLevel" value={accessLevel} onChange={(e) => setAccessLevel(e.target.value)} required>
                <option value="anyone">Anyone can contribute</option>
                <option value="approved_only">Require approval</option>
                <option value="specific_users">Specific users only</option>
              </select>
            </div>
            
            <div className="form-group">
              <label className="checkbox-label">
                <input type="checkbox" id="requireExamples" checked={requireExamples} onChange={(e) => setRequireExamples(e.target.checked)} />
                Require writing examples before contributing
              </label>
            </div>
            
            <div className="form-group">
              <label className="form-label" htmlFor="firstParagraph">Opening Paragraph</label>
              <textarea className="form-control" id="firstParagraph" rows={5} value={firstParagraph} onChange={(e) => setFirstParagraph(e.target.value)} required placeholder="Start your story here..."></textarea>
            </div>
            
            <div className="form-actions">
              <button type="button" className="btn btn--outline" onClick={() => navigate('/')}>Cancel</button>
              <button type="submit" className="btn btn--primary">Create Story</button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default CreateStoryPage;