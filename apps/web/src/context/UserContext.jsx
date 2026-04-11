import React, { createContext, useState, useContext, useEffect } from 'react';
const UserContext = createContext();

export const UserProvider = ({ children }) => {
  const [user, setUser] = useState(null);

  const updateUser = (nextUser) => {
    setUser(nextUser);
    if (nextUser !== null && nextUser !== undefined && nextUser !== "undefined") {
      localStorage.setItem('user', JSON.stringify(nextUser));
      return;
    }

    localStorage.removeItem('user');
  };

  useEffect(() => {
    const storedUser = localStorage.getItem('user');
    if (storedUser !== null && storedUser !== undefined && storedUser !== "undefined") {
      try {
        setUser(JSON.parse(storedUser));
      } catch (error) {
        localStorage.removeItem('user');
        setUser(null);
      }
    }
  }, []);

  return (
    <UserContext.Provider value={{ user, setUser: updateUser }}>
      {children}
    </UserContext.Provider>
  );
};

export const useUser = () => useContext(UserContext);
