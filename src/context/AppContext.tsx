"use client";

import React, { createContext, useContext, useState, useEffect } from "react";

export type Role = "Admin" | "Member";
export type Status = "To Do" | "In Progress" | "In Review" | "Done";
export type Priority = "Low" | "Medium" | "High" | "Urgent";

export interface User {
  id: string;
  name: string;
  role: Role;
  avatar: string;
  color: string;
}

export interface Task {
  id: string;
  title: string;
  assigneeId: string;
  status: Status;
  priority: Priority;
  due: string;
  completedAt: string | null;
}

interface AppContextType {
  currentUser: User | null;
  members: User[];
  tasks: Task[];
  login: (name: string, role: Role) => void;
  logout: () => void;
  addMember: (name: string, role: Role) => void;
  removeMember: (memberId: string) => void;
  addTask: (task: Omit<Task, "id" | "completedAt">) => void;
  updateTaskStatus: (taskId: string, status: Status) => void;
  updateTask: (taskId: string, updatedData: Partial<Task>) => void;
  deleteTask: (taskId: string) => void;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

const generateColor = () => {
  const colors = ["#e11d48", "#2563eb", "#16a34a", "#ca8a04", "#9333ea", "#0891b2"];
  return colors[Math.floor(Math.random() * colors.length)];
};

export const AppProvider = ({ children }: { children: React.ReactNode }) => {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [members, setMembers] = useState<User[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [isLoaded, setIsLoaded] = useState(false);

  // Load from local storage
  useEffect(() => {
    const storedUser = localStorage.getItem("tf_user");
    const storedMembers = localStorage.getItem("tf_members");
    const storedTasks = localStorage.getItem("tf_tasks");

    if (storedUser) setCurrentUser(JSON.parse(storedUser));
    if (storedMembers) setMembers(JSON.parse(storedMembers));
    if (storedTasks) setTasks(JSON.parse(storedTasks));
    setIsLoaded(true);
  }, []);

  // Save to local storage
  useEffect(() => {
    if (isLoaded) {
      localStorage.setItem("tf_user", JSON.stringify(currentUser));
      localStorage.setItem("tf_members", JSON.stringify(members));
      localStorage.setItem("tf_tasks", JSON.stringify(tasks));
    }
  }, [currentUser, members, tasks, isLoaded]);

  const login = (name: string, role: Role) => {
    const existing = members.find(m => m.name.toLowerCase() === name.toLowerCase());
    let userToLogin: User;
    
    if (existing) {
      userToLogin = existing;
    } else {
      userToLogin = {
        id: "m_" + Math.random().toString(36).substr(2, 9),
        name,
        role,
        avatar: name.charAt(0).toUpperCase(),
        color: generateColor(),
      };
      setMembers([...members, userToLogin]);
    }
    
    setCurrentUser(userToLogin);
  };

  const logout = () => {
    setCurrentUser(null);
  };

  const addMember = (name: string, role: Role) => {
    const newMember: User = {
      id: "m_" + Math.random().toString(36).substr(2, 9),
      name,
      role,
      avatar: name.charAt(0).toUpperCase(),
      color: generateColor(),
    };
    setMembers([...members, newMember]);
  };

  const addTask = (taskData: Omit<Task, "id" | "completedAt">) => {
    const newTask: Task = {
      ...taskData,
      id: "t_" + Math.random().toString(36).substr(2, 9),
      completedAt: taskData.status === "Done" ? new Date().toISOString() : null,
    };
    setTasks([...tasks, newTask]);
  };

  const updateTaskStatus = (taskId: string, status: Status) => {
    setTasks(tasks.map(t => {
      if (t.id === taskId) {
        return { 
          ...t, 
          status, 
          completedAt: status === "Done" ? new Date().toISOString() : null 
        };
      }
      return t;
    }));
  };

  const updateTask = (taskId: string, updatedData: Partial<Task>) => {
    setTasks(tasks.map(t => {
      if (t.id === taskId) {
        const newStatus = updatedData.status || t.status;
        return {
          ...t,
          ...updatedData,
          completedAt: newStatus === "Done" && t.status !== "Done" ? new Date().toISOString() 
                       : newStatus !== "Done" ? null 
                       : t.completedAt
        };
      }
      return t;
    }));
  };

  const deleteTask = (taskId: string) => {
    setTasks(tasks.filter(t => t.id !== taskId));
  };

  const removeMember = (memberId: string) => {
    setMembers(members.filter(m => m.id !== memberId));
  };

  if (!isLoaded) return <div style={{ background: "var(--bg-base)", height: "100vh" }} />;

  return (
    <AppContext.Provider value={{ currentUser, members, tasks, login, logout, addMember, addTask, updateTaskStatus, updateTask, deleteTask, removeMember }}>
      {children}
    </AppContext.Provider>
  );
};

export const useAppContext = () => {
  const context = useContext(AppContext);
  if (context === undefined) throw new Error("useAppContext must be used within AppProvider");
  return context;
};
