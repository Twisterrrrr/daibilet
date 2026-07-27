/** Deep-link маршрута в 2ГИС. Порядок координат: lon,lat. */
export function build2gisRouteUrl(lat: number, lng: number): string {
  return `https://2gis.ru/routeSearch/rsType/car/to/${lng},${lat}`;
}
