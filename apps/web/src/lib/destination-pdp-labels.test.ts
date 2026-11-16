import assert from 'node:assert/strict';
import test from 'node:test';
import { destinationGalleryHeading, destinationMainPlacesHeading } from './destination-pdp-labels';

test('destination section headings use genitive city and region names', () => {
  assert.equal(destinationMainPlacesHeading('Краснодар'), 'Главные места Краснодара');
  assert.equal(destinationMainPlacesHeading('Пермский край'), 'Главные места Пермского края');
  assert.equal(destinationGalleryHeading('Краснодар'), 'Фотографии Краснодара');
  assert.equal(destinationGalleryHeading('Пермский край'), 'Фотографии Пермского края');
});
