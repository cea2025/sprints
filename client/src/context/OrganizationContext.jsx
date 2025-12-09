import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { useAuth } from './AuthContext';
import { useLocation, useNavigate } from 'react-router-dom';

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

  // Get organizations from user data or fetch them
  useEffect(() => {
    if (user) {
      if (user.organizations && user.organizations.length > 0) {
        // Use organizations from auth response
        setOrganizations(user.organizations);
        
        // Auto-select if only one org
        if (user.organizations.length === 1) {
          setCurrentOrganization(user.organizations[0]);
        } else {
          // Try to restore from localStorage
          const savedOrgId = localStorage.getItem('currentOrgId');
          if (savedOrgId) {
            const savedOrg = user.organizations.find(org => org.id === savedOrgId);
            if (savedOrg) {
              setCurrentOrganization(savedOrg);
            }
          }
        }
        setLoading(false);
      } else {
        fetchOrganizations();
      }
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
        
        // Auto-select if only one org
        if (Array.isArray(data) && data.length === 1) {
          setCurrentOrganization(data[0]);
          localStorage.setItem('currentOrgId', data[0].id);
        } else {
          // Try to restore from localStorage
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

  const selectOrganization = useCallback((org) => {
    console.log('🔄 [ORG] Selecting organization:', org?.name, org?.id);
    setCurrentOrganization(org);
    if (org) {
      localStorage.setItem('currentOrgId', org.id);
      localStorage.setItem('currentOrgSlug', org.slug);
      console.log('💾 [ORG] Saved to localStorage:', { id: org.id, slug: org.slug });
      // Also update server session
      fetch('/api/organizations/select', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ organizationId: org.id })
      }).catch(console.error);
    } else {
      localStorage.removeItem('currentOrgId');
      localStorage.removeItem('currentOrgSlug');
    }
  }, []);

  // Set organization by slug (for URL-based routing)
  const setCurrentOrganizationBySlug = useCallback(async (slug) => {
    if (!slug) return;
    
    // First check if org is in current list
    let org = organizations.find(o => o.slug === slug);
    
    if (org) {
      if (!currentOrganization || currentOrganization.slug !== slug) {
        selectOrganization(org);
      }
      return;
    }
    
    // Org not in list - might be newly created or user is Super Admin
    // Fetch the org directly by slug
    try {
      const response = await fetch(`/api/organizations/by-slug/${slug}`, {
        credentials: 'include'
      });
      
      if (response.ok) {
        const orgData = await response.json();
        if (orgData) {
          // Add to organizations list
          setOrganizations(prev => {
            if (prev.find(o => o.id === orgData.id)) return prev;
            return [...prev, orgData];
          });
          selectOrganization(orgData);
        }
      }
    } catch (error) {
      console.error('Error fetching organization by slug:', error);
    }
  }, [organizations, currentOrganization, selectOrganization]);

  const refreshOrganizations = useCallback(() => {
    fetchOrganizations();
  }, []);

  const value = {
    currentOrganization,
    organizations,
    loading,
    selectOrganization,
    setCurrentOrganizationBySlug,
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
