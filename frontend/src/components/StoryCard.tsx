import React from 'react';
import type { Story as LegacyStory } from '../types';
import { apiService } from '../services/apiService';
import { PublicStory } from '../services/api';

export type StoryCardStory = LegacyStory | PublicStory;

interface StoryCardProps {
  story: StoryCardStory;
  onClick: (story: StoryCardStory) => void;
}

function getAuthorName(story: StoryCardStory): string {
  if ('authorName' in story && story.authorName) {
    return story.authorName;
  }

  if ('createdBy' in story) {
    const author = apiService.getUser(Number(story.createdBy));
    return author ? author.username : 'Unknown';
  }

  return 'Unknown';
}

const StoryCard: React.FC<StoryCardProps> = ({ story, onClick }) => {
  const authorName = getAuthorName(story);

  const accessLevelClass = {
    anyone: 'access-level-badge--anyone',
    approved_only: 'access-level-badge--approved',
    specific_users: 'access-level-badge--specific',
  }[story.accessLevel];

  const accessLevelText = {
    anyone: 'Open',
    approved_only: 'Approval Required',
    specific_users: 'Restricted',
  }[story.accessLevel];

  return (
    <div className="story-card" onClick={() => onClick(story)}>
      <div className="story-card__header">
        <h3 className="story-card__title">{story.title}</h3>
        <div className="story-card__meta">
          <span className="story-card__genre">{story.genre}</span>
          <span className="story-card__author">by {authorName}</span>
          <span className={`access-level-badge ${accessLevelClass}`}>{accessLevelText}</span>
        </div>
      </div>
      <p className="story-card__description">{story.description}</p>
      <div className="story-card__footer">
        <div className="story-card__stats">
          <span>{story.paragraphs.length} paragraphs</span>
          <span>{new Set(story.paragraphs.map(paragraph => paragraph.author)).size} contributors</span>
        </div>
      </div>
    </div>
  );
};

export default StoryCard;
