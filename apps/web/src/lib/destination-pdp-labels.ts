export function destinationMainPlacesHeading(region: boolean): string {
  return region ? 'Главные места региона' : 'Что посмотреть в городе';
}

export function destinationGalleryHeading(region: boolean): string {
  return region ? 'Фотографии региона' : 'Фотографии города';
}
