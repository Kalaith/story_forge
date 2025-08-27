import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { apiService } from '../services/apiService';
import type { Story, User } from '../types';

interface StoryManagementPageProps {
  showToast: (message: string, type?: 'success' | 'error' | 'warning') => void;
}

const StoryManagementPage: React.FC<StoryManagementPageProps> = ({ showToast }) => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [story, setStory] = useState<Story | null>(null);
  const [activeTab, setActiveTab] = useState('contributors');

  useEffect(() => {
    if (id) {
      const foundStory = apiService.getStory(parseInt(id));
      if (foundStory) {
        setStory(foundStory);
      } else {
        showToast('Story not found', 'error');
        navigate('/dashboard');
      }
    }
  }, [id, navigate, showToast]);


  if (!story) {
    return <div>Loading...</div>;
  }

  const contributors = Array.from(new Set(story.paragraphs.map(p => p.author)))
    .map(username => apiService.getUserByUsername(username))
    .filter((user): user is User => user !== undefined);

  const writingSamples = apiService.getWritingSamplesForStory(story.id);

  const handleToggleBlockUser = (userId: number) => {
    const updatedBlockedUsers = story.blockedUsers.includes(userId)
      ? story.blockedUsers.filter(id => id !== userId)
      : [...story.blockedUsers, userId];
    apiService.updateStory(story.id, { blockedUsers: updatedBlockedUsers });
    setStory({ ...story, blockedUsers: updatedBlockedUsers });
    showToast(story.blockedUsers.includes(userId) ? 'User unblocked' : 'User blocked');
  };

  const handleApproveSample = (userId: number, sampleStoryId: number) => {
    apiService.updateWritingSample(userId, sampleStoryId, { status: 'approved' });
    if (!story.approvedContributors.includes(userId)) {
      apiService.updateStory(story.id, { approvedContributors: [...story.approvedContributors, userId] });
      setStory(prev => prev ? { ...prev, approvedContributors: [...prev.approvedContributors, userId] } : null);
    }
    showToast('Writing sample approved');
  };

  const handleRejectSample = (userId: number, sampleStoryId: number) => {
    apiService.updateWritingSample(userId, sampleStoryId, { status: 'rejected' });
    showToast('Writing sample rejected');
  };

  const handleUpdateStorySettings = (e: React.FormEvent) => {
    e.preventDefault();
    const form = e.target as HTMLFormElement;
    const accessLevel = (form.elements.namedItem('editAccessLevel') as HTMLSelectElement).value as Story['accessLevel'];
    const requireExamples = (form.elements.namedItem('editRequireExamples') as HTMLInputElement).checked;
    
    apiService.updateStory(story.id, { accessLevel, requireExamples });
    setStory(prev => prev ? { ...prev, accessLevel, requireExamples } : null);
    showToast('Settings updated');
  };

  return (
    <div id="storyManagementView">
      <div className="container">
        <div className="management-header">
          <button className="btn btn--outline btn--sm" onClick={() => navigate('/dashboard')}>← Back to Dashboard</button>
          <h2>Manage: <span>{story.title}</span></h2>
        </div>
        
        <div className="management-tabs">
          <button className={`tab-btn ${activeTab === 'contributors' ? 'active' : ''}`} onClick={() => setActiveTab('contributors')}>Contributors</button>
          <button className={`tab-btn ${activeTab === 'writingSamples' ? 'active' : ''}`} onClick={() => setActiveTab('writingSamples')}>Writing Samples</button>
          <button className={`tab-btn ${activeTab === 'settings' ? 'active' : ''}`} onClick={() => setActiveTab('settings')}>Settings</button>
        </div>
        
        <div className="tab-content">
          <div className={`tab-panel ${activeTab === 'contributors' ? 'active' : 'hidden'}`} id="contributorsTab">
            <div id="contributorsManagement">
              <h3>Contributors</h3>
              {contributors.length > 0 ? (
                contributors.map(contributor => {
                  const contributionCount = story.paragraphs.filter(p => p.author === contributor.username).length;
                  const isBlocked = story.blockedUsers.includes(contributor.id);
                  return (
                    <div className="contributor-item" key={contributor.id}>
                      <div className="contributor-info">
                        <div className="contributor-name">{contributor.username}</div>
                        <div className="contributor-stats">{contributionCount} contributions</div>
                      </div>
                      <div className="contributor-actions">
                        <button className="btn btn--outline btn--sm block-user-btn" onClick={() => handleToggleBlockUser(contributor.id)}>
                          {isBlocked ? 'Unblock' : 'Block'}
                        </button>
                      </div>
                    </div>
                  );
                })
              ) : (
                <div className="empty-state"><p>No contributors yet</p></div>
              )}
            </div>
          </div>
          
          <div className={`tab-panel ${activeTab === 'writingSamples' ? 'active' : 'hidden'}`} id="writingSamplesTab">
            <div id="writingSamplesManagement">
              <h3>Writing Samples</h3>
              {writingSamples.length > 0 ? (
                writingSamples.map(sample => {
                  const user = apiService.getUser(sample.userId);
                  return (
                    <div className="writing-sample-item" key={sample.userId + '-' + sample.storyId}> {/* Unique key */} 
                      <div className="sample-header">
                        <span className="sample-author">{user ? user.username : 'Unknown'}</span>
                        <span className={`status ${sample.status}`}>{sample.status}</span>
                      </div>
                      <div className="sample-content">{sample.content}</div>
                      <div className="sample-actions">
                        {sample.status === 'pending' && (
                          <>
                            <button className="btn btn--outline btn--sm" onClick={() => handleRejectSample(sample.userId, sample.storyId)}>Reject</button>
                            <button className="btn btn--primary btn--sm" onClick={() => handleApproveSample(sample.userId, sample.storyId)}>Approve</button>
                          </>
                        )}
                      </div>
                    </div>
                  );
                })
              ) : (
                <div className="empty-state"><p>No writing samples submitted</p></div>
              )}
            </div>
          </div>
          
          <div className={`tab-panel ${activeTab === 'settings' ? 'active' : 'hidden'}`} id="settingsTab">
            <div id="storySettingsPanel">
              <h3>Story Settings</h3>
              <form onSubmit={handleUpdateStorySettings}>
                <div className="form-group">
                  <label className="form-label">Access Level</label>
                  <select className="form-control" id="editAccessLevel" defaultValue={story.accessLevel}>
                    <option value="anyone">Anyone can contribute</option>
                    <option value="approved_only">Require approval</option>
                    <option value="specific_users">Specific users only</option>
                  </select>
                </div>
                <div className="form-group">
                  <label className="checkbox-label">
                    <input type="checkbox" id="editRequireExamples" defaultChecked={story.requireExamples} />
                    Require writing examples
                  </label>
                </div>
                <div className="form-actions">
                  <button type="submit" className="btn btn--primary">Save Settings</button>
                </div>
              </form>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default StoryManagementPage;