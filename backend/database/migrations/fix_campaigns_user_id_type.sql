-- Fix campaigns.user_id to match users.id type (UUID varchar)
-- This migration changes user_id from bigint to varchar(36) to match users.id

-- First, let's see what campaigns exist (should be none if this is a fresh install)
SELECT COUNT(*) as campaign_count FROM campaigns;

-- Drop the existing index on user_id
ALTER TABLE campaigns DROP INDEX campaigns_user_id_index;

-- Change the user_id column type to match users.id
ALTER TABLE campaigns 
MODIFY COLUMN user_id varchar(36) NOT NULL;

-- Recreate the index
ALTER TABLE campaigns 
ADD INDEX campaigns_user_id_index (user_id);

-- Add a proper foreign key constraint
ALTER TABLE campaigns 
ADD CONSTRAINT fk_campaigns_user_id 
FOREIGN KEY (user_id) REFERENCES users(id) 
ON DELETE CASCADE ON UPDATE CASCADE;

-- Verify the change
DESCRIBE campaigns;
