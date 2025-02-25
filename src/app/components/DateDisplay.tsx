"use client";
import { useState, useEffect } from 'react';

export function DateDisplay({ timestamp }: { timestamp: number }) {
  const [formattedDate, setFormattedDate] = useState('');
  
  useEffect(() => {
    setFormattedDate(new Date(timestamp).toLocaleString('zh-CN', {
      year: 'numeric',
      month: 'numeric',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    }));
  }, [timestamp]);
  
  return <span>{formattedDate}</span>;
} 