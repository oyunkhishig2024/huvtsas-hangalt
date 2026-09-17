import { COMMANDS_DATA, DEPARTMENTS_DATA } from './uniformCatalogData';
import { HQ_ROLES, COMMAND_ROLES, UNIT_ROLES, UserSession } from '../types';

// Single shared demo password for every dummy account (for testing convenience only).
export const DEMO_PASSWORD = '12345';

export interface DemoCredential {
  username: string;
  password: string;
  session: UserSession;
  labelMn: string;
  level: 'hq' | 'command' | 'unit';
}

const hqCredential: DemoCredential = {
  username: 'ЗХЖШ',
  password: DEMO_PASSWORD,
  level: 'hq',
  labelMn: 'ЗХЖШ (Жанжин штаб)',
  session: {
    level: 'hq',
    roleTitle: HQ_ROLES[0],
    commandId: null,
    unitId: null,
    displayName: `${HQ_ROLES[0]} (ЗХЖШ)`
  }
};

const commandCredentials: DemoCredential[] = COMMANDS_DATA.map((cmd) => ({
  username: cmd.code,
  password: DEMO_PASSWORD,
  level: 'command',
  labelMn: cmd.nameMn,
  session: {
    level: 'command',
    roleTitle: COMMAND_ROLES[0],
    commandId: cmd.id,
    unitId: null,
    displayName: `${COMMAND_ROLES[0]} (${cmd.nameMn})`
  }
}));

const unitCredentials: DemoCredential[] = DEPARTMENTS_DATA.map((dept) => ({
  username: dept.code.replace('ЗХ-', ''),
  password: DEMO_PASSWORD,
  level: 'unit',
  labelMn: dept.nameMn,
  session: {
    level: 'unit',
    roleTitle: UNIT_ROLES[0],
    commandId: dept.commandId,
    unitId: dept.id,
    displayName: `${UNIT_ROLES[0]} (${dept.shortName || dept.code})`
  }
}));

export const DEMO_CREDENTIALS: DemoCredential[] = [hqCredential, ...commandCredentials, ...unitCredentials];

export function findCredential(username: string, password: string): DemoCredential | null {
  const u = username.trim().toLowerCase();
  const match = DEMO_CREDENTIALS.find((c) => c.username.trim().toLowerCase() === u);
  if (!match) return null;
  if (match.password !== password) return null;
  return match;
}
