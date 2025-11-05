export const ATOM_CONFIG: Record<
  string,
  { color: string; radius: number; mass: number }
> = {
  H: { color: "0xffffff", radius: 1.2, mass: 1 },
  C: { color: "0x333333", radius: 1.7, mass: 12 },
  N: { color: "0x3050f8", radius: 1.55, mass: 14 },
  O: { color: "0xff0d0d", radius: 1.52, mass: 16 },
  P: { color: "0xff7f0f", radius: 1.8, mass: 31 },
  S: { color: "0xffff30", radius: 1.8, mass: 32 },
  F: { color: "0x90e050", radius: 1.47, mass: 19 },
  Cl: { color: "0x1ff01f", radius: 1.75, mass: 35 },
  Br: { color: "0xa62929", radius: 1.85, mass: 80 },
  I: { color: "0x940094", radius: 1.98, mass: 127 },
};

export function getAtomConfig(element: string) {
  return (
    ATOM_CONFIG[element] || {
      color: 0x888888,
      radius: 1.5,
      mass: 1,
    }
  );
}
