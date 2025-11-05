export interface Atom {
  index: number;
  name: string;
  residue: string;
  x: number;
  y: number;
  z: number;
  element: string;
  charge?: number;
}

export interface Bond {
  atom1: number;
  atom2: number;
}

export function parsePDB(pdbData: string): { atoms: Atom[]; bonds: Bond[] } {
  const atoms: Atom[] = [];
  const bonds: Bond[] = [];
  const lines = pdbData.split("\n");

  lines.forEach((line) => {
    if (line.startsWith("ATOM") || line.startsWith("HETATM")) {
      const atom: Atom = {
        index: Number.parseInt(line.substring(6, 11).trim()),
        name: line.substring(12, 16).trim(),
        residue: line.substring(17, 20).trim(),
        x: Number.parseFloat(line.substring(30, 38)),
        y: Number.parseFloat(line.substring(38, 46)),
        z: Number.parseFloat(line.substring(46, 54)),
        element: line.substring(76, 78).trim(),
      };
      atoms.push(atom);
    } else if (line.startsWith("CONECT")) {
      const atom1 = Number.parseInt(line.substring(6, 11).trim());
      const bondAtoms = [
        line.substring(11, 16).trim(),
        line.substring(16, 21).trim(),
        line.substring(21, 26).trim(),
        line.substring(26, 31).trim(),
      ]
        .filter((a) => a)
        .map(Number.parseInt);

      bondAtoms.forEach((atom2) => {
        if (atom1 < atom2) {
          bonds.push({ atom1, atom2 });
        }
      });
    }
  });

  return { atoms, bonds };
}
