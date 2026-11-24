import { ajustesCopy } from "./ajustes";
import { alumnasCopy } from "./alumnas";
import { clasesCopy } from "./clases";
import { commonCopy } from "./common";
import { hoyCopy } from "./hoy";
import { materialesCopy } from "./materiales";

/**
 * Admin copy, one module per section so units can change their own words
 * without touching the others. Plain everyday Spanish, voseo, short.
 */
export const adminCopy = {
  common: commonCopy,
  hoy: hoyCopy,
  alumnas: alumnasCopy,
  clases: clasesCopy,
  materiales: materialesCopy,
  ajustes: ajustesCopy,
} as const;

export {
  ajustesCopy,
  alumnasCopy,
  clasesCopy,
  commonCopy,
  hoyCopy,
  materialesCopy,
};
