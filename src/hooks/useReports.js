import React, { useState, useEffect } from 'react';

export const useReports = () => {
  const [reports, setReports] = useState(() => {
    const saved = localStorage.getItem('pos_reports');
    if (saved) {
      return JSON.parse(saved);
    }
    return [];
  });

  useEffect(() => {
    localStorage.setItem('pos_reports', JSON.stringify(reports));
  }, [reports]);

  const addReport = (checkoutData) => {
    const newReport = {
      id: Date.now().toString(),
      date: new Date().toISOString(),
      ...checkoutData,
      status: 'pending' // pending, synced, error
    };
    setReports(prev => [newReport, ...prev]);
    return newReport;
  };

  const updateReportStatus = (id, status) => {
    setReports(prev => prev.map(report => 
      report.id === id ? { ...report, status } : report
    ));
  };

  const deleteReport = (id) => {
    setReports(prev => prev.filter(report => report.id !== id));
  };

  return { reports, addReport, updateReportStatus, deleteReport };
};
