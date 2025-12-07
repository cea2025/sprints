import { createContext, useContext, useState, useEffect } from 'react';
import { useAuth } from './AuthContext';

const OrganizationContext = createContext(null);

export const useOrganization = () => {
  const context = useContext(OrganizationContext);
  if (!context) {
    throw new Error('useOrganization must be used within an OrganizationProvider');
  }
  return context;
};

export const OrganizationProvider = ({ children }) => {
  const { user } = useAuth();
  const [currentOrganization, setCurrentOrganization] = useState(null);
  const [organizations, setOrganizations] = useState([]);
  const [loading, setLoading] = useState(true);

  // טעינת ארגונים בעת התחברות
  useEffect(() => {
    if (user) {
      fetchOrganizations();
    } else {
      setCurrentOrganization(null);
      setOrganizations([]);
      setLoading(false);
    }
  }, [user]);

  const fetchOrganizations = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/organizations/my', {
        credentials: 'include'
      });
      
      if (response.ok) {
        const data = await response.json();
        setOrganizations(Array.isArray(data) ? data : []);
        
        // אם יש רק ארגון אחד, בחר אותו אוטומטית
        if (Array.isArray(data) && data.length === 1) {
          setCurrentOrganization(data[0]);
          localStorage.setItem('currentOrgId', data[0].id);
        } else {
          // בדוק אם יש ארגון שמור
          const savedOrgId = localStorage.getItem('currentOrgId');
          if (savedOrgId && Array.isArray(data)) {
            const savedOrg = data.find(org => org.id === savedOrgId);
            if (savedOrg) {
              setCurrentOrganization(savedOrg);
            }
          }
        }
      }
    } catch (error) {
      console.error('Error fetching organizations:', error);
    } finally {
      setLoading(false);
    }
  };

  const selectOrganization = (org) => {
    setCurrentOrganization(org);
    if (org) {
      localStorage.setItem('currentOrgId', org.id);
    } else {
      localStorage.removeItem('currentOrgId');
    }
  };

  const refreshOrganizations = () => {
    fetchOrganizations();
  };

  const value = {
    currentOrganization,
    organizations,
    loading,
    selectOrganization,
    refreshOrganizations,
    hasMultipleOrgs: organizations.length > 1
  };

  return (
    <OrganizationContext.Provider value={value}>
      {children}
    </OrganizationContext.Provider>
  );
};

export default OrganizationContext;

