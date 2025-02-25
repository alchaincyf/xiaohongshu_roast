"use client";
import { useState, useEffect } from 'react';

export default function ClientOnly({ 
  children, 
  fallback = <p>加载中...</p> 
}: { 
  children: React.ReactNode;
  fallback?: React.ReactNode;
}) {
  const [mounted, setMounted] = useState(false);
  
  useEffect(() => {
    setMounted(true);
  }, []);
  
  if (!mounted) {
    return <>{fallback}</>;
  }
  
  return <>{children}</>;
} 