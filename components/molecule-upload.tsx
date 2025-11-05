"use client";

import type React from "react";
import { useState } from "react";
import { Button } from "./ui/Button";

interface MoleculeUploadProps {
  onUpload: (data: string) => void;
}

const DEFAULT_ATP_PDB = `HEADER    SMALL MOLECULE                          20251002   CONV
TITLE     CONVERTED FROM SDF FORMAT
COMPND    MOL_ID: 1; MOLECULE: ATP;
SOURCE    MOL_ID: 1; SYNTHETIC: YES;
KEYWDS    CHEMICAL COMPOUND
HETATM    1 P1   UNL A   1       1.200  -0.226  -6.850  1.00 20.00          P
HETATM    2 O1   UNL A   1       1.740   1.140  -6.672  1.00 20.00          O
HETATM    3 O2   UNL A   1       2.123  -1.036  -7.891  1.00 20.00          O
HETATM    4 O3   UNL A   1      -0.302  -0.139  -7.421  1.00 20.00          O
HETATM    5 P2   UNL A   1       0.255  -0.130  -4.446  1.00 20.00          P
HETATM    6 O4   UNL A   1       0.810   1.234  -4.304  1.00 20.00          O
HETATM    7 O5   UNL A   1      -1.231  -0.044  -5.057  1.00 20.00          O
HETATM    8 O6   UNL A   1       1.192  -0.990  -5.433  1.00 20.00          O
HETATM    9 P3   UNL A   1      -0.745   0.068  -2.071  1.00 20.00          P
HETATM   10 O7   UNL A   1      -2.097   0.143  -2.669  1.00 20.00          O
HETATM   11 O8   UNL A   1      -0.125   1.549  -1.957  1.00 20.00          O
HETATM   12 O9   UNL A   1       0.203  -0.840  -3.002  1.00 20.00          O
HETATM   13 O10  UNL A   1      -0.844  -0.587  -0.604  1.00 20.00          O
HETATM   14 C1   UNL A   1      -1.694   0.260   0.170  1.00 20.00          C
HETATM   15 C2   UNL A   1      -1.831  -0.309   1.584  1.00 20.00          C
HETATM   16 O11  UNL A   1      -0.542  -0.355   2.234  1.00 20.00          O
HETATM   17 C3   UNL A   1      -2.683   0.630   2.465  1.00 20.00          C
HETATM   18 O12  UNL A   1      -4.033   0.165   2.534  1.00 20.00          O
HETATM   19 C4   UNL A   1      -2.011   0.555   3.856  1.00 20.00          C
HETATM   20 O13  UNL A   1      -2.926   0.043   4.827  1.00 20.00          O
HETATM   21 C5   UNL A   1      -0.830  -0.418   3.647  1.00 20.00          C
HETATM   22 N1   UNL A   1       0.332   0.015   4.425  1.00 20.00          N
HETATM   23 C6   UNL A   1       1.302   0.879   4.012  1.00 20.00          C
HETATM   24 N2   UNL A   1       2.184   1.042   4.955  1.00 20.00          N
HETATM   25 C7   UNL A   1       1.833   0.300   6.033  1.00 20.00          C
HETATM   26 C8   UNL A   1       2.391   0.077   7.303  1.00 20.00          C
HETATM   27 N3   UNL A   1       3.564   0.706   7.681  1.00 20.00          N
HETATM   28 N4   UNL A   1       1.763  -0.747   8.135  1.00 20.00          N
HETATM   29 C9   UNL A   1       0.644  -1.352   7.783  1.00 20.00          C
HETATM   30 N5   UNL A   1       0.088  -1.178   6.602  1.00 20.00          N
HETATM   31 C10  UNL A   1       0.644  -0.371   5.704  1.00 20.00          C
HETATM   32 H1   UNL A   1       2.100  -0.546  -8.725  1.00 20.00          H
HETATM   33 H2   UNL A   1      -0.616  -1.048  -7.522  1.00 20.00          H
HETATM   34 H3   UNL A   1      -1.554  -0.952  -5.132  1.00 20.00          H
HETATM   35 H4   UNL A   1       0.752   1.455  -1.563  1.00 20.00          H
HETATM   36 H5   UNL A   1      -2.678   0.312  -0.296  1.00 20.00          H
HETATM   37 H6   UNL A   1      -1.263   1.259   0.221  1.00 20.00          H
HETATM   38 H7   UNL A   1      -2.275  -1.304   1.550  1.00 20.00          H
HETATM   39 H8   UNL A   1      -2.651   1.649   2.078  1.00 20.00          H
HETATM   40 H9   UNL A   1      -4.515   0.788   3.094  1.00 20.00          H
HETATM   41 H10  UNL A   1      -1.646   1.537   4.157  1.00 20.00          H
HETATM   42 H11  UNL A   1      -3.667   0.662   4.867  1.00 20.00          H
HETATM   43 H12  UNL A   1      -1.119  -1.430   3.931  1.00 20.00          H
HETATM   44 H13  UNL A   1       1.334   1.357   3.044  1.00 20.00          H
HETATM   45 H14  UNL A   1       3.938   0.548   8.562  1.00 20.00          H
HETATM   46 H15  UNL A   1       4.015   1.303   7.064  1.00 20.00          H
HETATM   47 H16  UNL A   1       0.166  -2.014   8.490  1.00 20.00          H
CONECT    1    2    3    4    8
CONECT    2    1
CONECT    3    1   32
CONECT    4    1   33
CONECT    5    6    7    8   12
CONECT    6    5
CONECT    7    5   34
CONECT    8    1    5
CONECT    9   10   11   12   13
CONECT   10    9
CONECT   11    9   35
CONECT   12    5    9
CONECT   13    9   14
CONECT   14   13   15   36   37
CONECT   15   14   16   17   38
CONECT   16   15   21
CONECT   17   15   18   19   39
CONECT   18   17   40
CONECT   19   17   20   21   41
CONECT   20   19   42
CONECT   21   16   19   22   43
CONECT   22   21   23   31
CONECT   23   22   24   44
CONECT   24   23   25
CONECT   25   24   26   31
CONECT   26   25   27   28
CONECT   27   26   45   46
CONECT   28   26   29
CONECT   29   28   30   47
CONECT   30   29   31
CONECT   31   22   25   30
CONECT   32    3
CONECT   33    4
CONECT   34    7
CONECT   35   11
CONECT   36   14
CONECT   37   14
CONECT   38   15
CONECT   39   17
CONECT   40   18
CONECT   41   19
CONECT   42   20
CONECT   43   21
CONECT   44   23
CONECT   45   27
CONECT   46   27
CONECT   47   29
END
`;

export default function MoleculeUpload({ onUpload }: MoleculeUploadProps) {
  const [isDragging, setIsDragging] = useState(false);

  const handleFile = (file: File) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      if (typeof e.target?.result === "string") {
        onUpload(e.target.result);
      }
    };
    reader.readAsText(file);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files[0];
    if (file?.name.endsWith(".pdb")) {
      handleFile(file);
    }
  };

  return (
    <div className="w-full h-full flex flex-col items-center justify-center p-4 sm:p-6 bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
      <div
        className={`border-2 border-dashed rounded-lg p-6 sm:p-12 text-center cursor-pointer transition-all max-w-md ${
          isDragging
            ? "border-blue-400 bg-blue-500/10"
            : "border-slate-600 hover:border-blue-500"
        }`}
        onDragOver={() => setIsDragging(true)}
        onDragLeave={() => setIsDragging(false)}
        onDrop={handleDrop}
      >
        <h1 className="text-3xl sm:text-4xl font-bold mb-2 text-white">
          moleculAR
        </h1>
        <p className="text-gray-300 mb-2 text-base sm:text-lg">
          🧬 Visualizador Molecular 3D
        </p>
        <p className="text-xs sm:text-sm text-gray-400 mb-6">
          Escaneie moléculas com Realidade Aumentada
        </p>
        <p className="text-xs text-gray-500 mb-6 hidden sm:block">
          Arraste um arquivo .pdb aqui
        </p>
        <input
          type="file"
          accept=".pdb"
          onChange={(e) => e.target.files?.[0] && handleFile(e.target.files[0])}
          className="hidden"
          id="pdb-input"
        />
        <div className="flex gap-3 justify-center flex-col">
          <label htmlFor="pdb-input">
            <Button
              className="bg-blue-600 hover:bg-blue-700 text-sm sm:text-base cursor-pointer"
              size="lg"
            >
              Selecionar PDB
            </Button>
          </label>
          <Button
            variant="secondary"
            size="lg"
            onClick={() => onUpload(DEFAULT_ATP_PDB)}
            className="bg-slate-700 hover:bg-slate-600 text-sm sm:text-base"
          >
            Demo: ATP
          </Button>
        </div>
      </div>
    </div>
  );
}
