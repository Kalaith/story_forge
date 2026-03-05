import React, { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { storyApi, PublicParagraph, PublicStory } from '../services/api';

interface StoryReadingPageProps {
  showToast: (message: string, type?: 'success' | 'error' | 'warning') => void;
}

const StoryReadingPage: React.FC<StoryReadingPageProps> = ({ showToast }) => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [story, setStory] = useState<PublicStory | null>(null);

  useEffect(() => {
    let mounted = true;

    const loadStory = async () => {
      if (!id) {
        return;
      }

      try {
        const foundStory = await storyApi.getPublic(id);
        if (mounted) {
          setStory(foundStory);
        }
      } catch (error) {
        if (!mounted) {
          return;
        }
        const message = error instanceof Error ? error.message : 'Story not found';
        showToast(message, 'error');
        navigate('/');
      }
    };

    loadStory();
    return () => {
      mounted = false;
    };
  }, [id, navigate, showToast]);

  if (!story) {
    return <div>Loading story...</div>;
  }

  const accessLevelClass = {
    anyone: 'access-level-badge--anyone',
    approved_only: 'access-level-badge--approved',
    specific_users: 'access-level-badge--specific',
  }[story.accessLevel];

  const accessLevelText = {
    anyone: 'Open to Anyone',
    approved_only: 'Approval Required',
    specific_users: 'Restricted Access',
  }[story.accessLevel];

  return (
    <div id="storyReadingView">
      <div className="container">
        <div className="story-header">
          <button className="btn btn--outline btn--sm back-btn" onClick={() => navigate('/')}>
            Back to Stories
          </button>
          <div className="story-meta">
            <h1 className="story-title">{story.title}</h1>
            <div className="story-info">
              <span className="story-genre">{story.genre}</span>
              <span className="story-author">by {story.authorName || 'Unknown'}</span>
              <span className={`access-level-badge ${accessLevelClass}`}>{accessLevelText}</span>
            </div>
            <p className="story-description">{story.description}</p>
          </div>
        </div>

        <div className="story-content">
          <div className="paragraphs-container" id="paragraphsContainer">
            {story.paragraphs.map((paragraph: PublicParagraph) => (
              <div className="paragraph" key={paragraph.id}>
                <div className="paragraph__content">{paragraph.content}</div>
                <div className="paragraph__meta">
                  <span className="paragraph__author">by {paragraph.author}</span>
                  <span className="paragraph__date">
                    {new Date(paragraph.timestamp).toLocaleDateString()}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default StoryReadingPage;
