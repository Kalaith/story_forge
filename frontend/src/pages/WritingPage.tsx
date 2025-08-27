import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { apiService } from '../services/apiService';
import type { Story, Paragraph } from '../types';

interface WritingPageProps {
  showToast: (message: string, type?: 'success' | 'error' | 'warning') => void;
}

const WritingPage: React.FC<WritingPageProps> = ({ showToast }) => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [story, setStory] = useState<Story | null>(null);
  const [writingSampleContent, setWritingSampleContent] = useState('');
  const [newParagraphContent, setNewParagraphContent] = useState('');

  useEffect(() => {
    if (id) {
      const foundStory = apiService.getStory(parseInt(id));
      if (foundStory) {
        setStory(foundStory);
      } else {
        showToast('Story not found', 'error');
        navigate('/');
      }
    }
  }, [id, navigate, showToast]);

  const handleSubmitWritingSample = (e: React.FormEvent) => {
    e.preventDefault();
    if (!writingSampleContent.trim()) {
      showToast('Please provide a writing sample', 'error');
      return;
    }

  };


  if (!story) {
    return <div>Loading...</div>; // Or redirect to login/homepage
  }

  const hasApprovedSample = apiService.getWritingSamplesForStory(story.id).some(sample => 
    sample.status === 'approved'
  );

  const showWritingSampleSection = story.requireExamples && !hasApprovedSample;

  return (
    <div id="writingView">
      <div className="container">
        <div className="writing-interface">
          <h2>Add to: <span>{story.title}</span></h2>
          
          <div className="context-paragraphs">
            <h3>Recent Paragraphs</h3>
            <div id="contextParagraphs">
              {story.paragraphs.slice(-2).map((paragraph: Paragraph) => (
                <div className="paragraph" key={paragraph.id}>
                  <div className="paragraph__content">{paragraph.content}</div>
                  <div className="paragraph__meta">
                    <span className="paragraph__author">by {paragraph.author}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
          
          {showWritingSampleSection ? (
            <div className="writing-sample-section">
              <h3>Writing Sample Required</h3>
              <p>This story requires you to submit a writing sample before contributing. Please provide a short paragraph demonstrating your writing style:</p>
              <textarea 
                className="form-control" 
                rows={4} 
                placeholder="Write a sample paragraph here..."
                value={writingSampleContent}
                onChange={(e) => setWritingSampleContent(e.target.value)}
              ></textarea>
              <button className="btn btn--primary" onClick={handleSubmitWritingSample}>Submit Sample</button>
            </div>
          ) : (
            <div className="paragraph-writing">
              <h3>Your Paragraph</h3>
              <textarea 
                className="form-control" 
                rows={6} 
                placeholder="Continue the story..."
                value={newParagraphContent}
                onChange={(e) => setNewParagraphContent(e.target.value)}
              ></textarea>
              <div className="writing-actions">
                <button className="btn btn--outline" onClick={() => navigate(`/story/${story.id}`)}>Cancel</button>
                <button className="btn btn--primary" >Submit Paragraph</button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default WritingPage;