/**
 * React Query hooks for data fetching with caching
 * Uses the existing API infrastructure with smart caching
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useContext, useCallback } from 'react';
import OrganizationContext from '../context/OrganizationContext';
import { useToast } from '../components/ui/Toast';

// Base fetch function with organization header
async function apiFetch(url, options = {}) {
  const orgId = options.organizationId || localStorage.getItem('currentOrgId');
  
  const fetchOptions = {
    method: options.method || 'GET',
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
      ...(orgId ? { 'X-Organization-Id': orgId } : {}),
      ...options.headers,
    },
  };

  if (options.body && fetchOptions.method !== 'GET') {
    fetchOptions.body = JSON.stringify(options.body);
  }

  const response = await fetch(url, fetchOptions);
  
  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new Error(error.error || error.message || `Error ${response.status}`);
  }
  
  return response.json();
}

// ============= QUERY HOOKS =============

/**
 * Fetch rocks with caching
 */
export function useRocks(filters = {}) {
  const orgContext = useContext(OrganizationContext);
  const orgId = orgContext?.currentOrganization?.id;
  
  const params = new URLSearchParams();
  if (filters.year) params.append('year', filters.year);
  if (filters.quarter) params.append('quarter', filters.quarter);
  if (filters.objectiveId) params.append('objectiveId', filters.objectiveId);
  if (filters.orphanFilter) params.append('orphanFilter', filters.orphanFilter);
  
  const queryString = params.toString();
  const url = `/api/rocks${queryString ? `?${queryString}` : ''}`;
  
  return useQuery({
    queryKey: ['rocks', orgId, filters],
    queryFn: () => apiFetch(url, { organizationId: orgId }),
    enabled: !!orgId,
    staleTime: 30 * 1000, // Fresh for 30 seconds
  });
}

/**
 * Fetch stories with caching
 */
export function useStories(filters = {}, limit = 30) {
  const orgContext = useContext(OrganizationContext);
  const orgId = orgContext?.currentOrganization?.id;
  
  const params = new URLSearchParams();
  params.append('limit', limit.toString());
  if (filters.sprintId) params.append('sprintId', filters.sprintId);
  if (filters.rockId) params.append('rockId', filters.rockId);
  if (filters.isBlocked) params.append('isBlocked', filters.isBlocked);
  if (filters.orphanFilter) params.append('orphanFilter', filters.orphanFilter);
  
  const url = `/api/stories?${params.toString()}`;
  
  return useQuery({
    queryKey: ['stories', orgId, filters, limit],
    queryFn: () => apiFetch(url, { organizationId: orgId }),
    enabled: !!orgId,
    staleTime: 30 * 1000,
    select: (data) => {
      // Handle both array and paginated response
      if (Array.isArray(data)) return data;
      if (data?.data && Array.isArray(data.data)) return data.data;
      return [];
    },
  });
}

/**
 * Fetch tasks with caching
 */
export function useTasks(filters = {}) {
  const orgContext = useContext(OrganizationContext);
  const orgId = orgContext?.currentOrganization?.id;
  
  const params = new URLSearchParams();
  if (filters.status) params.append('status', filters.status);
  if (filters.ownerId) params.append('ownerId', filters.ownerId);
  if (filters.storyId) params.append('storyId', filters.storyId);
  if (filters.standalone) params.append('standalone', filters.standalone);
  
  const queryString = params.toString();
  const url = `/api/tasks${queryString ? `?${queryString}` : ''}`;
  
  return useQuery({
    queryKey: ['tasks', orgId, filters],
    queryFn: () => apiFetch(url, { organizationId: orgId }),
    enabled: !!orgId,
    staleTime: 20 * 1000, // Tasks change more often
  });
}

/**
 * Fetch user's tasks
 */
export function useMyTasks() {
  const orgContext = useContext(OrganizationContext);
  const orgId = orgContext?.currentOrganization?.id;
  
  return useQuery({
    queryKey: ['myTasks', orgId],
    queryFn: () => apiFetch('/api/tasks/my', { organizationId: orgId }),
    enabled: !!orgId,
    staleTime: 20 * 1000,
  });
}

/**
 * Fetch objectives with caching
 */
export function useObjectives(filters = {}) {
  const orgContext = useContext(OrganizationContext);
  const orgId = orgContext?.currentOrganization?.id;
  
  const params = new URLSearchParams();
  if (filters.orphanFilter) params.append('orphanFilter', filters.orphanFilter);
  
  const queryString = params.toString();
  const url = `/api/objectives${queryString ? `?${queryString}` : ''}`;
  
  return useQuery({
    queryKey: ['objectives', orgId, filters],
    queryFn: () => apiFetch(url, { organizationId: orgId }),
    enabled: !!orgId,
    staleTime: 60 * 1000, // Objectives don't change often
  });
}

/**
 * Fetch sprints with caching
 */
export function useSprints() {
  const orgContext = useContext(OrganizationContext);
  const orgId = orgContext?.currentOrganization?.id;
  
  return useQuery({
    queryKey: ['sprints', orgId],
    queryFn: () => apiFetch('/api/sprints', { organizationId: orgId }),
    enabled: !!orgId,
    staleTime: 60 * 1000,
  });
}

/**
 * Fetch team members with caching
 */
export function useTeamMembers() {
  const orgContext = useContext(OrganizationContext);
  const orgId = orgContext?.currentOrganization?.id;
  
  return useQuery({
    queryKey: ['team', orgId],
    queryFn: () => apiFetch('/api/team', { organizationId: orgId }),
    enabled: !!orgId,
    staleTime: 5 * 60 * 1000, // Team rarely changes
  });
}

// ============= MUTATION HOOKS =============

/**
 * Update task status with optimistic update
 */
export function useUpdateTaskStatus() {
  const queryClient = useQueryClient();
  const toast = useToast();
  const orgContext = useContext(OrganizationContext);
  const orgId = orgContext?.currentOrganization?.id;
  
  return useMutation({
    mutationFn: ({ taskId, status }) => 
      apiFetch(`/api/tasks/${taskId}/status`, {
        method: 'PATCH',
        body: { status },
        organizationId: orgId,
      }),
    
    // Optimistic update
    onMutate: async ({ taskId, status }) => {
      // Cancel outgoing refetches
      await queryClient.cancelQueries({ queryKey: ['tasks'] });
      await queryClient.cancelQueries({ queryKey: ['myTasks'] });
      
      // Snapshot previous values
      const previousTasks = queryClient.getQueryData(['tasks', orgId]);
      const previousMyTasks = queryClient.getQueryData(['myTasks', orgId]);
      
      // Optimistically update tasks
      queryClient.setQueryData(['tasks', orgId], (old) => {
        if (!old) return old;
        return old.map(t => t.id === taskId ? { ...t, status } : t);
      });
      
      queryClient.setQueryData(['myTasks', orgId], (old) => {
        if (!old) return old;
        return old.map(t => t.id === taskId ? { ...t, status } : t);
      });
      
      return { previousTasks, previousMyTasks };
    },
    
    // Rollback on error
    onError: (err, variables, context) => {
      if (context?.previousTasks) {
        queryClient.setQueryData(['tasks', orgId], context.previousTasks);
      }
      if (context?.previousMyTasks) {
        queryClient.setQueryData(['myTasks', orgId], context.previousMyTasks);
      }
      toast.error('שגיאה בעדכון סטטוס');
    },
    
    // Refetch on success
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
      queryClient.invalidateQueries({ queryKey: ['myTasks'] });
    },
  });
}

/**
 * Update story progress with optimistic update
 */
export function useUpdateStoryProgress() {
  const queryClient = useQueryClient();
  const toast = useToast();
  const orgContext = useContext(OrganizationContext);
  const orgId = orgContext?.currentOrganization?.id;
  
  return useMutation({
    mutationFn: ({ storyId, progress, isBlocked }) => 
      apiFetch(`/api/stories/${storyId}/progress`, {
        method: 'PUT',
        body: { progress, isBlocked },
        organizationId: orgId,
      }),
    
    onMutate: async ({ storyId, progress, isBlocked }) => {
      await queryClient.cancelQueries({ queryKey: ['stories'] });
      
      const previousStories = queryClient.getQueriesData({ queryKey: ['stories'] });
      
      // Optimistically update
      queryClient.setQueriesData({ queryKey: ['stories'] }, (old) => {
        if (!old) return old;
        if (Array.isArray(old)) {
          return old.map(s => s.id === storyId ? { ...s, progress, isBlocked } : s);
        }
        return old;
      });
      
      return { previousStories };
    },
    
    onError: (err, variables, context) => {
      if (context?.previousStories) {
        context.previousStories.forEach(([queryKey, data]) => {
          queryClient.setQueryData(queryKey, data);
        });
      }
      toast.error('שגיאה בעדכון התקדמות');
    },
    
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['stories'] });
      queryClient.invalidateQueries({ queryKey: ['rocks'] }); // Rocks progress depends on stories
    },
  });
}

/**
 * Invalidate all queries for the organization (full refresh)
 */
export function useInvalidateAll() {
  const queryClient = useQueryClient();
  const orgContext = useContext(OrganizationContext);
  const orgId = orgContext?.currentOrganization?.id;
  
  return useCallback(() => {
    queryClient.invalidateQueries({ queryKey: ['rocks', orgId] });
    queryClient.invalidateQueries({ queryKey: ['stories', orgId] });
    queryClient.invalidateQueries({ queryKey: ['tasks', orgId] });
    queryClient.invalidateQueries({ queryKey: ['objectives', orgId] });
    queryClient.invalidateQueries({ queryKey: ['sprints', orgId] });
    queryClient.invalidateQueries({ queryKey: ['myTasks', orgId] });
  }, [queryClient, orgId]);
}

