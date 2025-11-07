export interface Atom {
  serial: number;
  name: string;
  element: string;
  x: number;
  y: number;
  z: number;
}

export interface Bond {
  atom1: number;
  atom2: number;
}

export interface PDBData {
  atoms: Atom[];
  bonds: Bond[];
}

// CPK color scheme for atoms
const ATOM_COLORS: Record<string, number> = {
  H: 0xffffff, // White
  C: 0x404040, // Dark Gray
  N: 0x0000ff, // Blue
  O: 0xff0000, // Red
  P: 0xff8000, // Orange
  S: 0xffff00, // Yellow
};

const ATOM_RADII: Record<string, number> = {
  H: 0.3,
  C: 0.4,
  N: 0.35,
  O: 0.35,
  P: 0.45,
  S: 0.4,
};

export function parsePDB(pdbContent: string): PDBData {
  const lines = pdbContent.split("\n");
  const atoms: Atom[] = [];
  const bonds: Bond[] = [];
  const atomMap = new Map<number, Atom>();

  for (const line of lines) {
    if (line.startsWith("ATOM") || line.startsWith("HETATM")) {
      const serial = Number.parseInt(line.substring(6, 11).trim());
      const name = line.substring(12, 16).trim();
      const element = line.substring(76, 78).trim() || name.charAt(0);
      const x = Number.parseFloat(line.substring(30, 38).trim());
      const y = Number.parseFloat(line.substring(38, 46).trim());
      const z = Number.parseFloat(line.substring(46, 54).trim());

      const atom: Atom = { serial, name, element, x, y, z };
      atoms.push(atom);
      atomMap.set(serial, atom);
    } else if (line.startsWith("CONECT")) {
      const parts = line.substring(6).trim().split(/\s+/).map(Number);
      const atom1Serial = parts[0];

      for (let i = 1; i < parts.length; i++) {
        const atom2Serial = parts[i];
        if (atom2Serial && atom1Serial < atom2Serial) {
          bonds.push({ atom1: atom1Serial, atom2: atom2Serial });
        }
      }
    }
  }

  // If no CONECT records, calculate bonds based on distance
  if (bonds.length === 0) {
    for (let i = 0; i < atoms.length; i++) {
      for (let j = i + 1; j < atoms.length; j++) {
        const atom1 = atoms[i];
        const atom2 = atoms[j];
        const distance = Math.sqrt(
          Math.pow(atom1.x - atom2.x, 2) +
            Math.pow(atom1.y - atom2.y, 2) +
            Math.pow(atom1.z - atom2.z, 2)
        );

        // Typical bond length is 1.0-1.8 Angstroms
        if (distance < 1.8) {
          bonds.push({ atom1: atom1.serial, atom2: atom2.serial });
        }
      }
    }
  }

  return { atoms, bonds };
}

export function createMoleculeFromPDB(pdbData: PDBData, THREE: any): any {
  const molecule = new THREE.Group();
  const atomMeshes = new Map<number, any>();

  // Center the molecule
  let centerX = 0,
    centerY = 0,
    centerZ = 0;
  pdbData.atoms.forEach((atom) => {
    centerX += atom.x;
    centerY += atom.y;
    centerZ += atom.z;
  });
  centerX /= pdbData.atoms.length;
  centerY /= pdbData.atoms.length;
  centerZ /= pdbData.atoms.length;

  // Create atoms
  pdbData.atoms.forEach((atom) => {
    const color = ATOM_COLORS[atom.element] || 0xff00ff;
    const radius = ATOM_RADII[atom.element] || 0.4;

    const geometry = new THREE.SphereGeometry(radius, 16, 16);
    // Usar MeshBasicMaterial para compatibilidade com MindAR
    const material = new THREE.MeshBasicMaterial({
      color,
    });
    const sphere = new THREE.Mesh(geometry, material);

    sphere.position.set(atom.x - centerX, atom.y - centerY, atom.z - centerZ);

    molecule.add(sphere);
    atomMeshes.set(atom.serial, sphere);
  });

  // Create bonds
  pdbData.bonds.forEach((bond) => {
    const atom1 = pdbData.atoms.find((a) => a.serial === bond.atom1);
    const atom2 = pdbData.atoms.find((a) => a.serial === bond.atom2);

    if (atom1 && atom2) {
      const start = new THREE.Vector3(
        atom1.x - centerX,
        atom1.y - centerY,
        atom1.z - centerZ
      );
      const end = new THREE.Vector3(
        atom2.x - centerX,
        atom2.y - centerY,
        atom2.z - centerZ
      );

      const direction = new THREE.Vector3().subVectors(end, start);
      const length = direction.length();
      const midpoint = new THREE.Vector3()
        .addVectors(start, end)
        .multiplyScalar(0.5);

      const geometry = new THREE.CylinderGeometry(0.1, 0.1, length, 8);
      // Usar MeshBasicMaterial para compatibilidade com MindAR
      const material = new THREE.MeshBasicMaterial({
        color: 0x888888,
      });
      const cylinder = new THREE.Mesh(geometry, material);

      cylinder.position.copy(midpoint);
      cylinder.quaternion.setFromUnitVectors(
        new THREE.Vector3(0, 1, 0),
        direction.normalize()
      );

      molecule.add(cylinder);
    }
  });

  return molecule;
}
