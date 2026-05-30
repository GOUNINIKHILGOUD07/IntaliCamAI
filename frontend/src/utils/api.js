const API_URL = 'http://localhost:5000/api';

export const apiRequest = async (endpoint, options = {}) => {
  const token = localStorage.getItem('intalicam_token');
  
  const defaultOptions = {
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
    },
    ...options,
  };

  const response = await fetch(`${API_URL}${endpoint}`, defaultOptions);
  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.message || 'Something went wrong');
  }

  return data;
};
