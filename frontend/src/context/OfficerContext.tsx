import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { api } from '../services/api';
import { Employee } from '../types';

interface OfficerContextType {
  officers: Employee[];
  activeOfficers: Employee[];
  loading: boolean;
  refreshOfficers: () => Promise<Employee[]>;
  getOfficerByZone: (zone?: string) => Employee | undefined;
  getOfficerNameForZone: (zone?: string) => string;
  getZoneForOfficerName: (name?: string) => string | undefined;
}

const OfficerContext = createContext<OfficerContextType | undefined>(undefined);

export const OfficerProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [officers, setOfficers] = useState<Employee[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  const fetchOfficers = useCallback(async (): Promise<Employee[]> => {
    try {
      const data = await api.getEmployees();
      const list = Array.isArray(data) ? data : [];
      setOfficers(list);
      return list;
    } catch (err: any) {
      // Gracefully handle unauthenticated or network errors without raising an uncaught exception
      if (err?.message?.includes('Authentication token required') || err?.message?.includes('401')) {
        setOfficers([]);
        return [];
      }
      console.warn('Could not load officers directory:', err?.message || err);
      return [];
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchOfficers();

    const handleSync = () => {
      fetchOfficers();
    };

    window.addEventListener('officers-synced', handleSync);
    return () => {
      window.removeEventListener('officers-synced', handleSync);
    };
  }, [fetchOfficers]);

  const activeOfficers = officers.filter(o => !o.status || o.status === 'Active');

  const getOfficerByZone = useCallback((zone?: string): Employee | undefined => {
    if (!zone) return undefined;
    const norm = zone.trim().toLowerCase();
    // Check active officers first
    const activeMatch = activeOfficers.find(o => {
      const oz = (o.assignedZone || '').trim().toLowerCase();
      return oz === norm || oz.includes(norm.replace('bengaluru', '').trim());
    });
    if (activeMatch) return activeMatch;

    // Any officer matching zone
    return officers.find(o => {
      const oz = (o.assignedZone || '').trim().toLowerCase();
      return oz === norm || oz.includes(norm.replace('bengaluru', '').trim());
    });
  }, [activeOfficers, officers]);

  const getOfficerNameForZone = useCallback((zone?: string): string => {
    const officer = getOfficerByZone(zone);
    if (officer) return officer.name;
    return '';
  }, [getOfficerByZone]);

  const getZoneForOfficerName = useCallback((name?: string): string | undefined => {
    if (!name) return undefined;
    const norm = name.trim().toLowerCase();
    const match = officers.find(o => o.name.trim().toLowerCase() === norm);
    return match?.assignedZone;
  }, [officers]);

  return (
    <OfficerContext.Provider
      value={{
        officers,
        activeOfficers,
        loading,
        refreshOfficers: fetchOfficers,
        getOfficerByZone,
        getOfficerNameForZone,
        getZoneForOfficerName,
      }}
    >
      {children}
    </OfficerContext.Provider>
  );
};

export const useOfficers = () => {
  const context = useContext(OfficerContext);
  if (!context) {
    throw new Error('useOfficers must be used within an OfficerProvider');
  }
  return context;
};
