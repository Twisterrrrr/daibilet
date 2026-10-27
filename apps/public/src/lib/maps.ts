/** Deep-link маршрута в 2ГИС (directions). Порядок координат: lon,lat. */
export function build2gisRouteUrl(lat: number, lng: number): string {
  // routeSearch/rsType/... устарел: 2ГИС редиректит на /spb без точки.
  // Актуальная схема: destination = points/|{lon},{lat} (from пустой = геолокация).
  return `https://2gis.ru/directions/tab/car/points/|${lng},${lat}`;
}
