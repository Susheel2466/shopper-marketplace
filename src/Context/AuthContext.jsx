import React, { createContext, useEffect, useState } from "react";

export const AuthContext = createContext(null);

const USER_KEY = "shopper-auth-user";
const TOKEN_KEY = "shopper-token";

// "Remember me" -> localStorage (survives browser restart).
// Otherwise    -> sessionStorage (cleared when the tab/window closes).
const readStored = (key) => {
  try {
    return localStorage.getItem(key) ?? sessionStorage.getItem(key);
  } catch {
    return null;
  }
};

const clearStored = (key) => {
  try {
    localStorage.removeItem(key);
    sessionStorage.removeItem(key);
  } catch {
    /* ignore */
  }
};

const AuthContextProvider = (props) => {
  const [user, setUser] = useState(() => {
    const stored = readStored(USER_KEY);
    try {
      return stored ? JSON.parse(stored) : null;
    } catch {
      return null;
    }
  });
  const [token, setToken] = useState(() => readStored(TOKEN_KEY));

  // Called after a successful login/signup. `remember` chooses persistence.
  const login = (userData, authToken, remember = true) => {
    const store = remember ? localStorage : sessionStorage;
    // Clear the other storage so a stale copy can't linger.
    clearStored(USER_KEY);
    clearStored(TOKEN_KEY);

    setUser(userData);
    store.setItem(USER_KEY, JSON.stringify(userData));
    if (authToken) {
      setToken(authToken);
      store.setItem(TOKEN_KEY, authToken);
    }
  };

  const logout = () => {
    setUser(null);
    setToken(null);
    clearStored(USER_KEY);
    clearStored(TOKEN_KEY);
  };

  // Auto-logout when the API reports our token is invalid/expired (401).
  useEffect(() => {
    const handler = () => {
      setUser(null);
      setToken(null);
      clearStored(USER_KEY);
      clearStored(TOKEN_KEY);
    };
    window.addEventListener("auth:expired", handler);
    return () => window.removeEventListener("auth:expired", handler);
  }, []);

  return (
    <AuthContext.Provider value={{ user, token, login, logout }}>
      {props.children}
    </AuthContext.Provider>
  );
};

export default AuthContextProvider;
