/**
 * Shared data fetching hooks to reduce code duplication across pages
 */
import { useState, useEffect, useCallback } from 'react';
import { useApi } from './useApi';
import { useOrganization } from '../context/OrganizationContext';

/**
 * Hook for fetching team members
 */
export function useTeamMembers() {
  const [teamMembers, setTeamMembers] = useState([]);
  const { request } = useApi();
  const { currentOrganization } = useOrganization();

  const fetchTeamMembers = useCallback(async () => {
    if (!currentOrganization) return;
    const data = await request('/api/team', { showToast: false });
    if (data && Array.isArray(data)) setTeamMembers(data);
  }, [currentOrganization, request]);

  useEffect(() => {
    fetchTeamMembers();
  }, [fetchTeamMembers]);

  return { teamMembers, setTeamMembers, refetch: fetchTeamMembers };
}

/**
 * Hook for fetching sprints
 */
export function useSprints() {
  const [sprints, setSprints] = useState([]);
  const { request } = useApi();
  const { currentOrganization } = useOrganization();

  const fetchSprints = useCallback(async () => {
    if (!currentOrganization) return;
    const data = await request('/api/sprints', { showToast: false });
    if (data && Array.isArray(data)) setSprints(data);
  }, [currentOrganization, request]);

  useEffect(() => {
    fetchSprints();
  }, [fetchSprints]);

  return { sprints, setSprints, refetch: fetchSprints };
}

/**
 * Hook for fetching rocks
 */
export function useRocks() {
  const [rocks, setRocks] = useState([]);
  const { request } = useApi();
  const { currentOrganization } = useOrganization();

  const fetchRocks = useCallback(async () => {
    if (!currentOrganization) return;
    const data = await request('/api/rocks', { showToast: false });
    if (data && Array.isArray(data)) setRocks(data);
  }, [currentOrganization, request]);

  useEffect(() => {
    fetchRocks();
  }, [fetchRocks]);

  return { rocks, setRocks, refetch: fetchRocks };
}

/**
 * Hook for fetching stories (milestones)
 */
export function useStories(limit = 200) {
  const [stories, setStories] = useState([]);
  const { request } = useApi();
  const { currentOrganization } = useOrganization();

  const fetchStories = useCallback(async () => {
    if (!currentOrganization) return;
    const data = await request(`/api/stories?limit=${limit}`, { showToast: false });
    // Handle both array and paginated response formats
    if (data) {
      if (Array.isArray(data)) {
        setStories(data);
      } else if (data.data && Array.isArray(data.data)) {
        setStories(data.data);
      }
    }
  }, [currentOrganization, request, limit]);

  useEffect(() => {
    fetchStories();
  }, [fetchStories]);

  return { stories, setStories, refetch: fetchStories };
}

/**
 * Hook for fetching objectives (projects)
 */
export function useObjectives() {
  const [objectives, setObjectives] = useState([]);
  const { request } = useApi();
  const { currentOrganization } = useOrganization();

  const fetchObjectives = useCallback(async () => {
    if (!currentOrganization) return;
    const data = await request('/api/objectives', { showToast: false });
    if (data && Array.isArray(data)) setObjectives(data);
  }, [currentOrganization, request]);

  useEffect(() => {
    fetchObjectives();
  }, [fetchObjectives]);

  return { objectives, setObjectives, refetch: fetchObjectives };
}

/**
 * Hook for fetching tasks
 */
export function useTasks(filters = {}) {
  const [tasks, setTasks] = useState([]);
  const { request } = useApi();
  const { currentOrganization } = useOrganization();

  const fetchTasks = useCallback(async () => {
    if (!currentOrganization) return;
    let url = '/api/tasks';
    const params = new URLSearchParams();
    if (filters.status) params.append('status', filters.status);
    if (filters.ownerId) params.append('ownerId', filters.ownerId);
    if (filters.standalone) params.append('standalone', 'true');
    if (params.toString()) url += `?${params.toString()}`;
    
    const data = await request(url, { showToast: false });
    if (data && Array.isArray(data)) setTasks(data);
  }, [currentOrganization, request, filters.status, filters.ownerId, filters.standalone]);

  useEffect(() => {
    fetchTasks();
  }, [fetchTasks]);

  return { tasks, setTasks, refetch: fetchTasks };
}

/**
 * Combined hook for common data needs
 */
export function useCommonData(options = {}) {
  const { 
    needTeamMembers = false, 
    needSprints = false, 
    needRocks = false,
    needStories = false,
    needObjectives = false
  } = options;

  const teamMembersData = needTeamMembers ? useTeamMembers() : { teamMembers: [], refetch: () => {} };
  const sprintsData = needSprints ? useSprints() : { sprints: [], refetch: () => {} };
  const rocksData = needRocks ? useRocks() : { rocks: [], refetch: () => {} };
  const storiesData = needStories ? useStories() : { stories: [], refetch: () => {} };
  const objectivesData = needObjectives ? useObjectives() : { objectives: [], refetch: () => {} };

  return {
    teamMembers: teamMembersData.teamMembers,
    sprints: sprintsData.sprints,
    rocks: rocksData.rocks,
    stories: storiesData.stories,
    objectives: objectivesData.objectives,
    refetch: {
      teamMembers: teamMembersData.refetch,
      sprints: sprintsData.refetch,
      rocks: rocksData.refetch,
      stories: storiesData.refetch,
      objectives: objectivesData.refetch,
    }
  };
}

