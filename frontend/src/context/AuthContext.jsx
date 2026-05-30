import React, { createContext, useState, useEffect } from 'react';

export const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Check local storage for token and user on mount
    const storedUser = localStorage.getItem('intalicam_user');
    const token = localStorage.getItem('intalicam_token');
    
    if (storedUser && token) {
      setUser(JSON.parse(storedUser));
    }
    setLoading(false);
  }, []);

  const login = (userData, token) => {
    localStorage.setItem('intalicam_user', JSON.stringify(userData));
    localStorage.setItem('intalicam_token', token);
    setUser(userData);
  };

  const logout = () => {
    localStorage.removeItem('intalicam_user');
    localStorage.removeItem('intalicam_token');
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, login, logout, loading }}>
        {!loading && children}
    </AuthContext.Provider>
  );
};
