"use client";
import { useState, useEffect } from 'react';

export function ClientDateTime() {
  const [dateTime, setDateTime] = useState('');
  
  useEffect(() => {
    setDateTime(new Date().toLocaleString('zh-CN'));
  }, []);
  
  return <span>{dateTime}</span>;
} 