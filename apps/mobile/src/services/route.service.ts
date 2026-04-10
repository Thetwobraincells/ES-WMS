/**
 * Route API service — fetches the current driver's assigned route.
 */
import api, { extractData } from './api';
import type { RouteData } from '../types/api';

export async function getMyRoute(): Promise<RouteData> {
  const res = await api.get('/routes/my-route');
  return extractData<RouteData>(res);
}
