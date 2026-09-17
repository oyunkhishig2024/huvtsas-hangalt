import { INITIAL_UNIFORM_CATALOG, COMMANDS_DATA } from './uniformCatalogData';
import { StockHolding, SupplyRequest } from '../types';

// Every unit's stock starts out sitting entirely in the ЗХЖШ central warehouse.
// Командлал and Анги warehouses start empty and are filled only as ЗХЖШ actually
// sends supply down the chain (via sendSupply / receiveSupply in the context).
export function seedHqHoldings(): StockHolding[] {
  const holdings: StockHolding[] = [];
  INITIAL_UNIFORM_CATALOG.forEach((item) => {
    Object.entries(item.sizeStock).forEach(([size, qty]) => {
      if (qty > 0) {
        holdings.push({
          id: `hold-hq-${item.id}-${size}`,
          uniformId: item.id,
          size,
          locationType: 'hq',
          locationId: 'HQ',
          quantity: qty
        });
      }
    });
  });
  return holdings;
}

// One sample pending request so the ЗХЖШ "incoming requests" screen isn't empty on first load.
export function seedInitialSupplyRequests(): SupplyRequest[] {
  const sampleItem = INITIAL_UNIFORM_CATALOG[0];
  const sampleSize = Object.keys(sampleItem.sizeStock)[0];
  const cmd = COMMANDS_DATA[0];
  return [
    {
      id: 'req-seed-1',
      requestNo: 'ХҮС-2025-0001',
      requestedByType: 'command',
      requestedById: cmd.id,
      requestedByLabel: cmd.nameMn,
      toType: 'hq',
      toId: 'HQ',
      items: [{ uniformId: sampleItem.id, uniformNameMn: sampleItem.nameMn, size: sampleSize, quantity: 30 }],
      status: 'pending',
      requestedDate: new Date().toISOString().slice(0, 10),
      requestedBy: 'Командлалын дарга',
      notes: 'Улирлын дүрэмт хувцасны хомсдол нөхөх'
    }
  ];
}
