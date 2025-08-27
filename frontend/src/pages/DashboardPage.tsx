import React, { useState } from 'react';
import StoryCard from '../components/StoryCard';
import type { Story, Paragraph } from '../types';
import { useNavigate } from 'react-router-dom';

interface DashboardPageProps {
  showToast: (message: string, type?: 'success' | 'error' | 'warning') => void;
}

const DashboardPage: React.FC<DashboardPageProps> = (/*{ showToast }*/) => {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('myStories');
  const [userStories] = useState<Story[]>([]);
  const [userContributions] = useState<{ story: Story; paragraph: Paragraph }[]>([]);
  const [storiesToManage] = useState<Story[]>([]);

  
  const handleStoryClick = (story: Story) => {
    navigate(`/story/${story.id}`);
  };

  const handleManageStoryClick = (story: Story) => {
    navigate(`/manage-story/${story.id}`);
  };

  return (
    <div id="dashboardView">
      <div className="container">
        <h2>Dashboard</h2>
        
        <div className="dashboard-tabs">
          <button className={`tab-btn ${activeTab === 'myStories' ? 'active' : ''}`} onClick={() => setActiveTab('myStories')}>My Stories</button>
          <button className={`tab-btn ${activeTab === 'myContributions' ? 'active' : ''}`} onClick={() => setActiveTab('myContributions')}>My Contributions</button>
          <button className={`tab-btn ${activeTab === 'managementPanel' ? 'active' : ''}`} onClick={() => setActiveTab('managementPanel')}>Story Management</button>
        </div>
        
        <div className="tab-content">
          <div className={`tab-panel ${activeTab === 'myStories' ? 'active' : 'hidden'}`} id="myStoriesTab">
            <div id="userStoriesGrid">
              {userStories.length > 0 ? (
                userStories.map(story => (
                  <StoryCard key={story.id} story={story} onClick={handleStoryClick} />
                ))
              ) : (
                <div className="empty-state"><h3>No stories yet</h3><p>Create your first collaborative story!</p></div>
              )}
            </div>
          </div>
          
          <div className={`tab-panel ${activeTab === 'myContributions' ? 'active' : 'hidden'}`} id="myContributionsTab">
            <div id="userContributionsGrid">
              {userContributions.length > 0 ? (
                userContributions.map(({ story, paragraph }) => (
                  <div className="card" key={paragraph.id} onClick={() => handleStoryClick(story)}>
                    <div className="card__body">
                      <h4>{story.title}</h4>
                      <p className="paragraph__content">{paragraph.content}</p>
                      <small className="paragraph__date">{new Date(paragraph.timestamp).toLocaleDateString()}</small>
                    </div>
                  </div>
                ))
              ) : (
                <div className="empty-state"><h3>No contributions yet</h3><p>Start contributing to stories!</p></div>
              )}
            </div>
          </div>
          
          <div className={`tab-panel ${activeTab === 'managementPanel' ? 'active' : 'hidden'}`} id="managementPanelTab">
            <div id="storyManagementPanel">
              {storiesToManage.length > 0 ? (
                storiesToManage.map(story => (
                  <div className="card" key={story.id}>
                    <div className="card__body">
                      <h4>{story.title}</h4>
                      <p>{story.paragraphs.length} paragraphs, {new Set(story.paragraphs.map(p => p.author)).size} contributors</p>
                      <div className="form-actions">
                        <button className="btn btn--primary btn--sm" onClick={() => handleManageStoryClick(story)}>Manage</button>
                      </div>
                    </div>
                  </div>
                ))
              ) : (
                <div className="empty-state"><h3>No stories to manage</h3></div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DashboardPage;