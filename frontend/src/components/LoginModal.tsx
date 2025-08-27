import React, { useState } from 'react';
import { apiService } from '../services/apiService';

interface LoginModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const LoginModal: React.FC<LoginModalProps> = ({ isOpen, onClose }) => {

  const [selectedUsername, setSelectedUsername] = useState<string>('');

  const users = apiService.getUsers(); // Get users from API service

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (selectedUsername) {
      onClose(); // Close modal on successful login
    }
  };

  if (!isOpen) return null;

  return (
    <div className="modal"> {/* The base modal styling */}
      <div className="modal-content">
        <div className="modal-header">
          <h3>Sign In</h3>
          <button className="modal-close" onClick={onClose}>&times;</button>
        </div>
        <div className="modal-body">
          <form onSubmit={handleSubmit}>
            <div className="form-group">
              <label className="form-label" htmlFor="username">Username</label>
              <select
                className="form-control"
                id="username"
                required
                value={selectedUsername}
                onChange={(e) => setSelectedUsername(e.target.value)}
              >
                <option value="">Select a user</option>
                {users.map(user => (
                  <option key={user.id} value={user.username}>{user.username}</option>
                ))}
              </select>
            </div>
            <div className="form-actions">
              <button type="submit" className="btn btn--primary btn--full-width">Sign In</button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default LoginModal;