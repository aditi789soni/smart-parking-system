"use client";

import React, { createContext, useContext, useState, useEffect } from "react";

export interface UserProfile {
  id: string;
  name: string;
  email: string;
  role: "REGULAR_USER" | "ADMIN" | "ATTENDANT" | string;
}

interface UserContextType {
  currentUser: UserProfile | null;
  users: UserProfile[];
  setCurrentUser: (user: UserProfile) => void;
  switchRole: (role: string) => void;
  loading: boolean;
}

const defaultUser: UserProfile = {
  id: "demo-user-alex",
  name: "Alex Demo",
  email: "user@example.com",
  role: "REGULAR_USER",
};

const UserContext = createContext<UserContextType>({
  currentUser: defaultUser,
  users: [],
  setCurrentUser: () => {},
  switchRole: () => {},
  loading: false,
});

export function UserProvider({ children }: { children: React.ReactNode }) {
  const [currentUser, setCurrentUser] = useState<UserProfile | null>(defaultUser);
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadUsers() {
      try {
        const res = await fetch("/api/users");
        if (res.ok) {
          const data = await res.json();
          if (data.users && data.users.length > 0) {
            setUsers(data.users);
            // Check localStorage
            const savedEmail = localStorage.getItem("smart_parking_active_user");
            const matched = data.users.find((u: UserProfile) => u.email === savedEmail);
            if (matched) {
              setCurrentUser(matched);
            } else {
              // Default to regular user
              const reg = data.users.find((u: UserProfile) => u.role === "REGULAR_USER") || data.users[0];
              setCurrentUser(reg);
            }
          }
        }
      } catch (err) {
        console.warn("Could not load users list, using default:", err);
      } finally {
        setLoading(false);
      }
    }

    loadUsers();
  }, []);

  const handleSetCurrentUser = (user: UserProfile) => {
    setCurrentUser(user);
    if (typeof window !== "undefined") {
      localStorage.setItem("smart_parking_active_user", user.email);
    }
  };

  const switchRole = (role: string) => {
    const target = users.find((u) => u.role === role);
    if (target) {
      handleSetCurrentUser(target);
    }
  };

  return (
    <UserContext.Provider
      value={{
        currentUser,
        users,
        setCurrentUser: handleSetCurrentUser,
        switchRole,
        loading,
      }}
    >
      {children}
    </UserContext.Provider>
  );
}

export function useUser() {
  return useContext(UserContext);
}
