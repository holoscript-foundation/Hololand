'use client';

import { useCallback } from 'react';
import type { UseBlueprintReturn } from '@/hooks/useBlueprint';
import type { AccessorySlot, AccessorySlotName } from '@/lib/types';
import { SectionHeader } from '@/components/ui/SectionHeader';

interface AccessoriesTabProps {
  store: UseBlueprintReturn;
}

const ACCESSORY_SLOTS: {
  slot: AccessorySlotName;
  label: string;
  items: { assetId: string; name: string }[];
}[] = [
  {
    slot: 'hat',
    label: 'Hats',
    items: [
      { assetId: 'acc-beanie-01', name: 'Beanie' },
      { assetId: 'acc-cap-01', name: 'Cap' },
      { assetId: 'acc-fedora-01', name: 'Fedora' },
      { assetId: 'acc-crown-01', name: 'Crown' },
    ],
  },
  {
    slot: 'glasses',
    label: 'Eyewear',
    items: [
      { assetId: 'acc-glasses-01', name: 'Glasses' },
      { assetId: 'acc-sunglasses-01', name: 'Sunglasses' },
      { assetId: 'acc-monocle-01', name: 'Monocle' },
      { assetId: 'acc-goggles-01', name: 'Goggles' },
    ],
  },
  {
    slot: 'earrings',
    label: 'Earrings',
    items: [
      { assetId: 'acc-studs-01', name: 'Studs' },
      { assetId: 'acc-hoops-01', name: 'Hoops' },
      { assetId: 'acc-drops-01', name: 'Drop Earrings' },
    ],
  },
  {
    slot: 'necklace',
    label: 'Necklace',
    items: [
      { assetId: 'acc-chain-01', name: 'Chain' },
      { assetId: 'acc-pendant-01', name: 'Pendant' },
      { assetId: 'acc-choker-01', name: 'Choker' },
    ],
  },
  {
    slot: 'backpack',
    label: 'Back',
    items: [
      { assetId: 'acc-backpack-01', name: 'Backpack' },
      { assetId: 'acc-wings-01', name: 'Wings' },
      { assetId: 'acc-cape-01', name: 'Cape' },
    ],
  },
];

const DEFAULT_OFFSET = { x: 0, y: 0, z: 0 };
const DEFAULT_ROTATION = { x: 0, y: 0, z: 0 };

export function AccessoriesTab({ store }: AccessoriesTabProps) {
  const { blueprint, equipAccessory, unequipAccessory } = store;

  const isEquipped = useCallback(
    (slotName: AccessorySlotName, assetId: string) =>
      blueprint.accessories.some(
        (a) => a.slot === slotName && a.assetId === assetId,
      ),
    [blueprint.accessories],
  );

  const getEquipped = useCallback(
    (slotName: AccessorySlotName) =>
      blueprint.accessories.find((a) => a.slot === slotName),
    [blueprint.accessories],
  );

  const handleToggle = useCallback(
    (slotName: AccessorySlotName, assetId: string, name: string) => {
      if (isEquipped(slotName, assetId)) {
        unequipAccessory(slotName);
      } else {
        equipAccessory({
          slot: slotName,
          assetId,
          name,
          scale: 1.0,
          offset: DEFAULT_OFFSET,
          rotationOffset: DEFAULT_ROTATION,
          purchased: false,
        });
      }
    },
    [isEquipped, equipAccessory, unequipAccessory],
  );

  return (
    <div className="flex flex-col gap-6 p-4 overflow-y-auto h-full">
      <SectionHeader
        title="Accessories"
        description="Add accessories to personalize your avatar"
      />

      {ACCESSORY_SLOTS.map((slotDef) => {
        const equipped = getEquipped(slotDef.slot);
        return (
          <section key={slotDef.slot}>
            <div className="flex items-center justify-between mb-2">
              <h4 className="text-xs font-semibold text-studio-text">
                {slotDef.label}
              </h4>
              {equipped && (
                <button
                  onClick={() => unequipAccessory(slotDef.slot)}
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
                    onClick={() =>
                      handleToggle(slotDef.slot, item.assetId, item.name)
                    }
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
                        <circle cx="12" cy="12" r="6" strokeWidth={1.5} />
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
