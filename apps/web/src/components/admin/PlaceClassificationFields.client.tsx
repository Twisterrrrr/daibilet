'use client';

import * as React from 'react';
import { PLACE_SUBTYPE_OPTIONS, PLACE_TYPE_OPTIONS, placeSubtypeIssue } from '@daibilet/contracts/place-pdp';

type Props = {
  placeType?: string;
  placeSubtype?: string;
  defaultPlaceType?: string;
  defaultPlaceSubtype?: string;
  onChange?: (value: { placeType: string; placeSubtype: string }) => void;
  typeName?: string;
  subtypeName?: string;
  typeLabel?: string;
  subtypeLabel?: string;
  typePlaceholder?: string;
  suggestionPlaceType?: string;
};

export function PlaceClassificationFields({
  placeType: controlledType, placeSubtype: controlledSubtype, defaultPlaceType = '', defaultPlaceSubtype = '', onChange, typeName = 'placeType', subtypeName = 'placeSubtype',
  typeLabel = 'Тип места', subtypeLabel = 'Подтип места', typePlaceholder = 'Не определён', suggestionPlaceType,
}: Props) {
  const listId = React.useId();
  const [local, setLocal] = React.useState({ placeType: defaultPlaceType, placeSubtype: defaultPlaceSubtype });
  const placeType = controlledType ?? local.placeType;
  const placeSubtype = controlledSubtype ?? local.placeSubtype;
  const update = (value: { placeType: string; placeSubtype: string }) => {
    if (onChange) onChange(value);
    else setLocal(value);
  };
  const effectiveType = placeType || suggestionPlaceType || '';
  const options = PLACE_SUBTYPE_OPTIONS[effectiveType as keyof typeof PLACE_SUBTYPE_OPTIONS] || [];
  const issue = placeSubtypeIssue(effectiveType, placeSubtype);
  return <>
    <label className="block text-xs text-slate-600">{typeLabel}
      <select name={typeName} value={placeType} onChange={(event) => update({ placeType: event.target.value, placeSubtype })} className="mt-1 w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm">
        <option value="">{typePlaceholder}</option>
        {PLACE_TYPE_OPTIONS.map(([value, label]) => <option key={value} value={value}>{label}</option>)}
      </select>
    </label>
    <label className="block text-xs text-slate-600">{subtypeLabel}
      <input name={subtypeName} list={listId} value={placeSubtype} maxLength={64} pattern="[a-z0-9_-]*" placeholder="Выберите подсказку или укажите свой slug" onChange={(event) => update({ placeType, placeSubtype: event.target.value })} className="mt-1 w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm" />
      <datalist id={listId}>{options.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}</datalist>
      {issue && <span className="mt-1 block text-xs text-amber-800">Подтип не входит в справочник выбранного типа. Проверьте сочетание; нестандартный slug можно оставить как редакционное исключение.</span>}
    </label>
  </>;
}
