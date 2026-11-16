import { cityToGenitive } from './city-declension';

export function destinationMainPlacesHeading(destinationName: string): string {
  return `Главные места ${cityToGenitive(destinationName)}`;
}

export function destinationGalleryHeading(destinationName: string): string {
  return `Фотографии ${cityToGenitive(destinationName)}`;
}
