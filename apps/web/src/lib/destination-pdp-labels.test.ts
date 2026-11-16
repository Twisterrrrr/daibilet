import assert from 'node:assert/strict';
import test from 'node:test';
import { destinationGalleryHeading, destinationMainPlacesHeading } from './destination-pdp-labels';

test('destination section headings avoid inserting city names in the wrong grammatical case', () => {
  assert.equal(destinationMainPlacesHeading(false), 'Что посмотреть в городе');
  assert.equal(destinationMainPlacesHeading(true), 'Главные места региона');
  assert.equal(destinationGalleryHeading(false), 'Фотографии города');
  assert.equal(destinationGalleryHeading(true), 'Фотографии региона');
});
