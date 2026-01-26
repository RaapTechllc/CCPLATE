"use client";

import * as React from "react";

interface TabsContextValue {
  value: string;
  onValueChange: (value: string) => void;
}

const TabsContext = React.createContext<TabsContextValue | undefined>(undefined);

function useTabsContext() {
  const context = React.useContext(TabsContext);
  if (!context) {
    throw new Error("Tabs components must be used within a Tabs provider");
  }
  return context;
}

interface TabsProps extends React.HTMLAttributes<HTMLDivElement> {
  value: string;
  onValueChange: (value: string) => void;
  children: React.ReactNode;
}

function Tabs({ value, onValueChange, children, className = "", ...props }: TabsProps) {
  return (
    <TabsContext.Provider value={{ value, onValueChange }}>
      <div className={className} {...props}>
        {children}
      </div>
    </TabsContext.Provider>
  );
}

interface TabsListProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
}

function TabsList({ className = "", children, ...props }: TabsListProps) {
  return (
    <div
      role="tablist"
      className={`inline-flex h-10 items-center justify-center rounded-md bg-muted p-1 text-muted-foreground ${className}`}
      {...props}
    >
      {children}
    </div>
  );
}

interface TabsTriggerProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  value: string;
  children: React.ReactNode;
}

function TabsTrigger({ value, className = "", children, ...props }: TabsTriggerProps) {
  const { value: selectedValue, onValueChange } = useTabsContext();
  const isSelected = selectedValue === value;
  
  return (
    <button
      type="button"
      role="tab"
      aria-selected={isSelected}
      onClick={() => onValueChange(value)}
      className={`inline-flex items-center justify-center whitespace-nowrap rounded-sm px-3 py-1.5 text-sm font-medium ring-offset-background transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 ${
        isSelected
          ? "bg-background text-foreground shadow-sm"
          : "hover:bg-background/50 hover:text-foreground"
      } ${className}`}
      {...props}
    >
      {children}
    </button>
  );
}

interface TabsContentProps extends React.HTMLAttributes<HTMLDivElement> {
  value: string;
  children: React.ReactNode;
}

function TabsContent({ value, className = "", children, ...props }: TabsContentProps) {
  const { value: selectedValue } = useTabsContext();
  
  if (selectedValue !== value) {
    return null;
  }
  
  return (
    <div
      role="tabpanel"
      className={`mt-2 ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 ${className}`}
      {...props}
    >
      {children}
    </div>
  );
}

export { Tabs, TabsList, TabsTrigger, TabsContent };
