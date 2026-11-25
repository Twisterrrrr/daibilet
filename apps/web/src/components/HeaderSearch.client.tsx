'use client';

import { isPlacesSectionPath } from '@/lib/catalog-url';
import { usePathname } from 'next/navigation';
import { SearchAutocomplete } from '@/components/search/SearchAutocomplete.client';

type HeaderSearchProps = {
  className?: string;
  inputClassName?: string;
  placeholder?: string;
  initialQuery?: string;
  cityFilter?: string;
  variant?: 'inline' | 'overlay';
};

export function HeaderSearch({
  className = '',
  inputClassName,
  placeholder,
  initialQuery = '',
  cityFilter,
  variant = 'inline',
}: HeaderSearchProps) {
  const pathname = usePathname() || '/';
  const resolvedPlaceholder = placeholder || (isPlacesSectionPath(pathname)
    ? 'Музей, театр, парк, набережная…'
    : 'События, места, статьи и города…');

  return (
    <SearchAutocomplete
      context="global"
      placesOnly={isPlacesSectionPath(pathname)}
      className={className}
      inputClassName={inputClassName}
      placeholder={resolvedPlaceholder}
      initialQuery={initialQuery}
      cityFilter={cityFilter}
      variant={variant}
    />
  );
}
