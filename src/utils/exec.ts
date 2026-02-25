import { execFile as _execFile } from 'node:child_process';
import { promisify } from 'node:util';

export const execFile = promisify(_execFile);
