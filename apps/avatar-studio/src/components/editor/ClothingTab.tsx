'use client';

import { useCallback } from 'react';
import type { UseBlueprintReturn } from '@/hooks/useBlueprint';
import type { ClothingSlotName } from '@/lib/types';
import { SectionHeader } from '@/components/ui/SectionHeader';

interface ClothingTabProps {
  store: UseBlueprintReturn;
}

/** Slot definitions with display names and placeholder items */
const CLOTHING_SLOTS: {
  slot: ClothingSlotName;
  label: string;
  icon: string;
  items: { assetId: string; name: string }[];
}[] = [
  {
    slot: 'upperBody',
    label: 'Upper Body',
    icon: 'M12 3v7m-4-3h8',
    items: [
      { assetId: 'cloth-tshirt-01', name: 'T-Shirt' },
      { assetId: 'cloth-hoodie-01', name: 'Hoodie' },
      { assetId: 'cloth-jacket-01', name: 'Jacket' },
      { assetId: 'cloth-tank-01', name: 'Tank Top' },
      { assetId: 'cloth-shirt-01', name: 'Button Shirt' },
      { assetId: 'cloth-sweater-01', name: 'Sweater' },
    ],
  },
  {
    slot: 'lowerBody',
    label: 'Lower Body',
    icon: 'M8 12v9m8-9v9',
    items: [
      { assetId: 'cloth-jeans-01', name: 'Jeans' },
      { assetId: 'cloth-shorts-01', name: 'Shorts' },
      { assetId: 'cloth-skirt-01', name: 'Skirt' },
      { assetId: 'cloth-pants-01', name: 'Pants' },
      { assetId: 'cloth-joggers-01', name: 'Joggers' },
    ],
  },
  {
    slot: 'feet',
    label: 'Footwear',
    icon: 'M4 20h16',
    items: [
      { assetId: 'cloth-sneakers-01', name: 'Sneakers' },
      { assetId: 'cloth-boots-01', name: 'Boots' },
      { assetId: 'cloth-sandals-01', name: 'Sandals' },
      { assetId: 'cloth-heels-01', name: 'Heels' },
    ],
  },
  {
    slot: 'outerwear',
    label: 'Outerwear',
    icon: 'M12 3l-8 9h16l-8-9z',
    items: [
      { assetId: 'cloth-coat-01', name: 'Coat' },
      { assetId: 'cloth-vest-01', name: 'Vest' },
      { assetId: 'cloth-cape-01', name: 'Cape' },
    ],
  },
];

export function ClothingTab({ store }: ClothingTabProps) {
  const { blueprint, equipClothing, unequipClothing } = store;

  const isEquipped = useCallback(
    (slotName: ClothingSlotName, assetId: string) =>
      blueprint.clothing.some((c) => c.slot === slotName && c.assetId === assetId),
    [blueprint.clothing]
  );

  const getEquipped = useCallback(
    (slotName: ClothingSlotName) => blueprint.clothing.find((c) => c.slot === slotName),
    [blueprint.clothing]
  );

  const handleToggle = useCallback(
    (slotName: ClothingSlotName, assetId: string, name: string) => {
      if (isEquipped(slotName, assetId)) {
        unequipClothing(slotName);
      } else {
        equipClothing({
          slot: slotName,
          assetId,
          name,
          fit: 0,
          purchased: false,
        });
      }
    },
    [isEquipped, equipClothing, unequipClothing]
  );

  return (
    <div className="flex flex-col gap-6 p-4 overflow-y-auto h-full">
      <SectionHeader title="Clothing" description="Equip clothing items to different body slots" />

      {CLOTHING_SLOTS.map((slotDef) => {
        const equipped = getEquipped(slotDef.slot);
        return (
          <section key={slotDef.slot}>
            <div className="flex items-center justify-between mb-2">
              <h4 className="text-xs font-semibold text-studio-text">{slotDef.label}</h4>
              {equipped && (
                <button
                  onClick={() => unequipClothing(slotDef.slot)}
                  className="text-xs text-red-400 hover:text-red-300 transition-colors"
                >
                  Remove
                </button>
              )}
            </div>
            <div className="grid grid-cols-3 gap-2">
              {slotDef.items.map((item) => {
                const active = isEquipped(slotDef.slot, item.assetId);
                return (
                  <button
                    key={item.assetId}
                    onClick={() => handleToggle(slotDef.slot, item.assetId, item.name)}
                    className={`p-2 rounded-lg text-xs text-center transition-all border ${
                      active
                        ? 'border-holo-500 bg-holo-500/10 text-holo-400'
                        : 'border-studio-border bg-studio-surface text-studio-muted hover:border-studio-muted hover:text-studio-text'
                    }`}
                  >
                    <div className="w-full aspect-square rounded-md bg-studio-panel mb-1.5 flex items-center justify-center">
                      <svg
                        className="w-6 h-6 text-studio-border"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={1.5}
                          d={slotDef.icon}
                        />
                      </svg>
                    </div>
                    {item.name}
                  </button>
                );
              })}
            </div>
          </section>
        );
      })}
    </div>
  );
}
