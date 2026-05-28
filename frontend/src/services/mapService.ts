import { apiClient } from './apiClient';
import { MapFloor, MapFloorData, MapNode, MapEdge, NodeType } from '../shared/types';

export const mapService = {
  // Floors
  getAllFloors: () => apiClient.get<MapFloor[]>('/map/floors').then(r => r.data),
  getFloorData: (id: number) => apiClient.get<MapFloorData>(`/map/floors/${id}`).then(r => r.data),
  getFloorByLocation: (locationId: number) =>
    apiClient.get<MapFloorData>(`/map/floors/by-location/${locationId}`).then(r => r.data),
  createFloor: (data: { locationId: number; imageUrl: string; imgWidth: number; imgHeight: number }) =>
    apiClient.post<MapFloor>('/map/floors', data).then(r => r.data),
  updateFloor: (id: number, data: { imageUrl: string; imgWidth: number; imgHeight: number }) =>
    apiClient.put<MapFloor>(`/map/floors/${id}`, data).then(r => r.data),
  deleteFloor: (id: number) => apiClient.delete(`/map/floors/${id}`),

  // Nodes
  createNode: (data: {
    floorId: number;
    x: number;
    y: number;
    type: NodeType;
    label?: string;
    locationId?: number;
    assetId?: string;
  }) => apiClient.post<MapNode>('/map/nodes', data).then(r => r.data),
  updateNode: (id: number, data: Partial<Pick<MapNode, 'x' | 'y' | 'type' | 'label' | 'locationId' | 'assetId'>>) =>
    apiClient.put<MapNode>(`/map/nodes/${id}`, data).then(r => r.data),
  deleteNode: (id: number) => apiClient.delete(`/map/nodes/${id}`),
  getNodeByAsset: (assetId: string) =>
    apiClient.get<MapNode>(`/map/nodes/by-asset/${assetId}`).then(r => r.data),
  getNodeByLocation: (locationId: number) =>
    apiClient.get<MapNode>(`/map/nodes/by-location/${locationId}`).then(r => r.data),

  // Edges
  createEdge: (nodeFromId: number, nodeToId: number) =>
    apiClient.post<MapEdge>('/map/edges', { nodeFromId, nodeToId }).then(r => r.data),
  deleteEdge: (id: number) => apiClient.delete(`/map/edges/${id}`),

  // Wayfinding
  findPath: (from: number, to: number, avoidStairs = false) =>
    apiClient.get<MapNode[]>(`/map/wayfinding?from=${from}&to=${to}&avoidStairs=${avoidStairs}`).then(r => r.data),
  findPathToAsset: (from: number, assetId: string, avoidStairs = false) =>
    apiClient
      .get<MapNode[]>(`/map/wayfinding/asset?from=${from}&assetId=${assetId}&avoidStairs=${avoidStairs}`)
      .then(r => r.data),
};
