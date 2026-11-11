import assert from 'node:assert/strict';
import test from 'node:test';
import { PDP_VARIANTS } from './pdp-documents.js';
import {
  PDP_SECTION_EDITOR_SCHEMA,
  PDP_VARIANT_READINESS,
  PDP_VARIANT_SECTION_PROFILE,
  PLACE_PDP_VARIANT_BY_TYPE,
} from '../../../packages/contracts/src/place-pdp.ts';

const placeVariants = Object.keys(PDP_VARIANTS).filter((variant) => variant !== 'event');

test('all 16 place PDP variants have editor, profile, and readiness coverage', () => {
  assert.equal(placeVariants.length, 16);

  for (const variant of placeVariants) {
    const sections = PDP_VARIANTS[variant];
    const profile = PDP_VARIANT_SECTION_PROFILE[variant];
    const readiness = PDP_VARIANT_READINESS[variant];

    assert.ok(profile, `${variant}: section profile is missing`);
    assert.ok(readiness?.length, `${variant}: readiness checklist is missing`);
    for (const section of sections) {
      assert.ok(PDP_SECTION_EDITOR_SCHEMA[section], `${variant}: editor schema missing for ${section}`);
      assert.ok(
        profile.core.includes(section) || profile.conditional.includes(section),
        `${variant}: ${section} is neither core nor conditional`,
      );
    }
    for (const item of readiness) {
      assert.ok(item.anyOf.length > 0, `${variant}: empty readiness rule ${item.label}`);
      for (const section of item.anyOf) {
        assert.ok(sections.includes(section), `${variant}: readiness references unknown section ${section}`);
      }
    }
  }
});

test('every place type resolves to an implemented place PDP variant', () => {
  for (const [placeType, variant] of Object.entries(PLACE_PDP_VARIANT_BY_TYPE)) {
    assert.ok(PDP_VARIANTS[variant], `${placeType}: unknown variant ${variant}`);
    assert.ok(PDP_VARIANT_READINESS[variant]?.length, `${placeType}: ${variant} has no readiness checklist`);
  }
});
