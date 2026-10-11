import type { ComponentType, ReactNode, SVGProps } from 'react';

type FoodIconProps = SVGProps<SVGSVGElement>;
type FoodIcon = ComponentType<FoodIconProps>;

/** Original food illustrations; layered colour and highlights stay crisp at any size. */
function Artwork({ children, ...props }: FoodIconProps & { children: ReactNode }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width="64" height="64" {...props} viewBox="0 0 64 64" fill="none" focusable="false">
      <ellipse cx="32" cy="55" rx="23" ry="4" fill="#733819" opacity=".13" />
      {children}
    </svg>
  );
}

export function RiceIcon(props: FoodIconProps) {
  return <Artwork {...props}>
    <path d="M9 32h46c-1 14-10 23-23 23S10 46 9 32Z" fill="#BB5630" />
    <path d="M12 34h39c-2 11-9 17-19 17S15 45 12 34Z" fill="#F7D9A3" />
    <ellipse cx="32" cy="31" rx="24" ry="11" fill="#FFF1CF" />
    <path d="M12 30c1-8 9-15 20-15s19 7 20 15c-8 7-31 7-40 0Z" fill="#E88426" />
    <path d="M17 26c4-7 16-10 27-4l5 7c-10 4-24 4-33 0Z" fill="#F4A63B" />
    <path d="m20 25 4 1m4-5 3 2m6 3 4-1m-12 5 4 1m9-10 2 2m-27 7 3 1" stroke="#FFE5A7" strokeWidth="2.5" strokeLinecap="round" />
    <path d="m34 17 4-7 6 2 2 8-6 7-7-3Z" fill="#A83A20" />
    <path d="m37 16 3-3 3 2-1 6-4 2Z" fill="#D96127" />
    <path d="M18 19c-4-1-5-4-4-7 4 0 7 3 7 6m-1 0c0-5 3-7 7-6-1 4-3 6-7 6" fill="#4A8946" />
    <path d="M17 39c2 4 4 6 8 7" stroke="#FFF5DD" strokeWidth="3" strokeLinecap="round" />
  </Artwork>;
}

export function PepperSoupIcon(props: FoodIconProps) {
  return <Artwork {...props}>
    <path d="M8 30h48c-1 15-9 24-24 24S9 45 8 30Z" fill="#A63725" />
    <path d="M12 34h39c-2 10-8 16-19 16-9 0-16-5-20-16Z" fill="#D95030" />
    <ellipse cx="32" cy="30" rx="24" ry="11" fill="#F29A58" />
    <ellipse cx="32" cy="29" rx="20" ry="8" fill="#71351F" />
    <path d="m17 26 9-3 5 6-5 6-9-3Z" fill="#B97749" />
    <path d="m35 23 10 3-2 8-9-2Z" fill="#CB8D57" />
    <path d="m19 26 5-1 3 3-7 1m17-3 5 1-1 3" stroke="#E6B783" strokeWidth="2" strokeLinecap="round" />
    <path d="m30 27 3-4 3 2-3 4m-14 3 3 3 4-1m12-1 5-2 2 3" fill="#72A34A" />
    <path d="M28 29c4-4 5-1 3 2-2 3-4 1-3-2Z" fill="#F36B36" />
    <path d="M23 15c-4-5 4-6 1-11m13 11c-4-5 4-6 1-11" stroke="#CF9D78" strokeWidth="2" strokeLinecap="round" opacity=".65" />
    <path d="M17 39c2 3 4 5 7 6" stroke="#F88C65" strokeWidth="3" strokeLinecap="round" />
  </Artwork>;
}

export function GrillIcon(props: FoodIconProps) {
  return <Artwork {...props}>
    <path d="m16 54 29-43m-17 45 27-40" stroke="#B58347" strokeWidth="3" strokeLinecap="round" />
    <path d="m15 40 8-12 12 8-8 12Zm12-18 8-12 12 8-8 12Zm0 22 8-12 12 8-8 12Zm12-18 8-12 12 8-8 12Z" fill="#A63F22" />
    <path d="m17 39 6-8 8 5-6 8Zm12-18 6-8 8 5-6 8Zm0 22 6-8 8 5-6 8Zm12-18 6-8 8 5-6 8Z" fill="#E47B36" />
    <path d="m21 35 6 4m6-22 6 4m-6 18 6 4m6-22 6 4" stroke="#843321" strokeWidth="2" strokeLinecap="round" />
    <path d="m23 27 3-5 12 8-3 5m0-5 3-5 12 8-3 5" fill="#6C963E" />
    <path d="m36 9 3-4 11 7-3 4" fill="#E9B447" />
  </Artwork>;
}

export function ShawarmaIcon(props: FoodIconProps) {
  return <Artwork {...props}>
    <path d="m15 22 27-8 7 12-11 29c-3 5-11 3-13-2Z" fill="#D19A58" />
    <path d="m17 22 23-6 6 10-10 27c-2 3-6 3-8-1Z" fill="#F6D9A5" />
    <path d="m18 24 19 7-10 18m19-22-18 18" stroke="#DCB57D" strokeWidth="2" />
    <ellipse cx="31" cy="21" rx="16" ry="9" transform="rotate(-16 31 21)" fill="#FFF0C9" />
    <path d="m18 20 4-9 6 4 4-7 6 5 8-1-3 11-11 5Z" fill="#578D3D" />
    <path d="m22 20 5-4 6 3 5-4 5 5-10 7Z" fill="#9BB65C" />
    <path d="m24 16 6-3 4 6-5 4Zm12 5 5-4 4 4-5 4Z" fill="#C66537" />
    <path d="m20 22 5-3 3 3-5 3m9-2 4-3 3 3-4 3" fill="#E65035" />
    <path d="m27 23 6-3 5 3" stroke="#FFF4DE" strokeWidth="2.5" strokeLinecap="round" />
    <path d="m29 47 4 6" stroke="#FFF0D1" strokeWidth="3" strokeLinecap="round" />
  </Artwork>;
}

export function LocalDishIcon(props: FoodIconProps) {
  return <Artwork {...props}>
    <ellipse cx="32" cy="39" rx="27" ry="16" fill="#C5A47B" />
    <ellipse cx="32" cy="36" rx="27" ry="16" fill="#FFF1D6" />
    <ellipse cx="32" cy="36" rx="22" ry="12" fill="#E4CC9F" />
    <path d="M26 35c-3-9 5-14 15-12 9 1 14 7 11 15-4 9-24 8-26-3Z" fill="#456A34" />
    <path d="m29 31 6-5 4 3 7-1 4 6-5 5-5-3-7 3Z" fill="#73903D" />
    <path d="m35 30 6-1 4 5-6 4-5-3Z" fill="#A7532B" />
    <path d="m37 30 4 1 1 3" stroke="#D48A4C" strokeWidth="2" strokeLinecap="round" />
    <path d="M12 35c-2-9 1-18 9-19 7-1 13 8 12 18-1 8-20 9-21 1Z" fill="#DABD88" />
    <path d="M13 32c0-9 3-14 8-14 6 0 10 7 10 14-4 5-14 5-18 0Z" fill="#FFF0C9" />
    <path d="M17 28c0-4 1-6 4-7" stroke="#FFF9E7" strokeWidth="3" strokeLinecap="round" />
    <circle cx="47" cy="38" r="2" fill="#E89B3E" />
  </Artwork>;
}

export function DrinkIcon(props: FoodIconProps) {
  return <Artwork {...props}>
    <path d="m36 24 5-17h10" stroke="#BD5834" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
    <path d="M17 20h29l-4 33c-5 5-17 5-21 0Z" fill="#B9D8D9" />
    <path d="m20 27 3 24c4 3 12 4 17 0l3-24Z" fill="#F5A12F" />
    <path d="m23 41 1 10c4 2 10 3 15 0l1-10Z" fill="#E78026" />
    <ellipse cx="32" cy="27" rx="11" ry="4" fill="#FFD77A" />
    <ellipse cx="32" cy="20" rx="15" ry="5" fill="#E7F1EB" />
    <ellipse cx="32" cy="20" rx="11" ry="3" fill="#C0DCDD" />
    <path d="m35 25 4-14" stroke="#BD5834" strokeWidth="3" />
    <path d="m24 31 2 14" stroke="#FFF2C9" strokeWidth="3" strokeLinecap="round" />
    <circle cx="46" cy="23" r="10" fill="#DE8A22" />
    <circle cx="46" cy="23" r="8" fill="#FFE69A" />
    <path d="m46 16 1 6 5-3m-6 4 6 3m-7-2-4 5m4-6-5-4" stroke="#EEA332" strokeWidth="2" strokeLinecap="round" />
  </Artwork>;
}

export function BakeryIcon(props: FoodIconProps) {
  return <Artwork {...props}>
    <path d="M7 40c2-17 11-23 25-23s23 6 25 23c-6 15-43 15-50 0Z" fill="#9F4926" />
    <path d="M9 36c3-13 11-19 23-19s20 6 23 19c-6 13-39 13-46 0Z" fill="#DB8D3B" />
    <path d="M13 32c4-9 10-13 19-13s16 4 20 13c-8 10-31 10-39 0Z" fill="#F3B85D" />
    <path d="m23 23-5 9m15-11-5 12m15-9-5 10" stroke="#A8652D" strokeWidth="4" strokeLinecap="round" />
    <path d="m24 22-4 8m14-10-4 11m14-8-4 9" stroke="#FFE0A0" strokeWidth="3" strokeLinecap="round" />
    <path d="M15 41c5 4 13 5 19 5" stroke="#F7C578" strokeWidth="2" strokeLinecap="round" />
  </Artwork>;
}

export function BurgerIcon(props: FoodIconProps) {
  return <Artwork {...props}>
    <path d="M10 44h44c-1 9-8 12-22 12s-21-3-22-12Z" fill="#C5762F" />
    <path d="M11 43h42v5c-10 5-31 5-42 0Z" fill="#F2B758" />
    <rect x="8" y="34" width="48" height="10" rx="5" fill="#6E3521" />
    <path d="m9 33 8-4 8 4 7-4 8 4 8-4 7 4-4 6-9-3-10 4-8-4-11 3Z" fill="#679544" />
    <path d="m13 29 37 1-10 10-10-5-9 4Z" fill="#FFD25C" />
    <path d="M10 27c0-13 10-19 22-19s22 6 22 19c-11 5-33 5-44 0Z" fill="#D98430" />
    <path d="M13 23c2-8 9-12 19-12s17 4 19 12c-10 4-28 4-38 0Z" fill="#F0B45D" />
    <path d="m22 17 2 1m8-4 2 1m8 3 2 1m-14 2 2 1" stroke="#FFF1C7" strokeWidth="2.5" strokeLinecap="round" />
  </Artwork>;
}

export function PlatterIcon(props: FoodIconProps) {
  return <Artwork {...props}>
    <ellipse cx="32" cy="47" rx="27" ry="7" fill="#A9B7A3" />
    <ellipse cx="32" cy="44" rx="27" ry="6" fill="#E1E8D7" />
    <path d="M10 42c0-15 9-25 22-25s22 10 22 25Z" fill="#C58342" />
    <path d="M13 39c1-12 8-20 19-20s18 8 19 20Z" fill="#E9BD78" />
    <path d="M19 32c2-6 5-9 10-10" stroke="#FFF0C9" strokeWidth="4" strokeLinecap="round" />
    <path d="M29 17v-4h6v4" stroke="#9B6239" strokeWidth="3" strokeLinecap="round" />
    <path d="M9 42h46" stroke="#985C30" strokeWidth="3" strokeLinecap="round" />
  </Artwork>;
}

const cuisineIconMap: Record<string, FoodIcon> = {
  all: PlatterIcon, 'fast-food': BurgerIcon, 'fast food': BurgerIcon,
  'rice-dishes': RiceIcon, 'rice dishes': RiceIcon, rice: RiceIcon, jollof: RiceIcon, 'jollof rice': RiceIcon,
  'pepper-soup': PepperSoupIcon, 'pepper soup': PepperSoupIcon,
  grills: GrillIcon, bbq: GrillIcon, barbecue: GrillIcon,
  shawarma: ShawarmaIcon, drinks: DrinkIcon, juice: DrinkIcon, smoothies: DrinkIcon,
  local: LocalDishIcon, 'local dishes': LocalDishIcon, traditional: LocalDishIcon,
  bakery: BakeryIcon, pastries: BakeryIcon, bread: BakeryIcon,
};

export function getCuisineIcon(tags?: string[] | string | null): FoodIcon {
  for (const tag of Array.isArray(tags) ? tags : tags ? [tags] : []) {
    const icon = cuisineIconMap[tag?.toLowerCase().trim()];
    if (icon) return icon;
  }
  return PlatterIcon;
}

export function CuisineIcon({ tags, className }: { tags?: string[] | string | null; className?: string }) {
  const Icon = getCuisineIcon(tags);
  return <Icon className={className} aria-hidden="true" />;
}
