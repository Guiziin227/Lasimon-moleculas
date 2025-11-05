"use client";

import dynamic from "next/dynamic";

const ARViewer = dynamic(() => import("@/components/ar-viewer"), {
  ssr: false,
});

// ATP PDB data embedded
const ATP_PDB = `HEADER    NUCLEOTIDE                      08-APR-87   1ATP
ATOM      1  P   ATP A   1       8.901   4.127  -0.555  1.00  0.00           P
ATOM      2  O   ATP A   1       9.860   3.166  -0.962  1.00  0.00           O
ATOM      3  O   ATP A   1       8.608   5.342  -1.487  1.00  0.00           O
ATOM      4  O   ATP A   1       7.618   3.506  -0.328  1.00  0.00           O
ATOM      5  C   ATP A   1      10.184   1.066  -0.345  1.00  0.00           C
ATOM      6  C   ATP A   1      10.900   0.346   0.805  1.00  0.00           C
ATOM      7  O   ATP A   1      10.391  -0.968   1.123  1.00  0.00           O
ATOM      8  C   ATP A   1      10.744   1.069   2.137  1.00  0.00           C
ATOM      9  O   ATP A   1      11.338   0.392   3.297  1.00  0.00           O
ATOM     10  C   ATP A   1       9.246   1.211   2.407  1.00  0.00           C
ATOM     11  N   ATP A   1       8.517   2.423   2.116  1.00  0.00           N
ATOM     12  C   ATP A   1       9.156   3.648   2.102  1.00  0.00           C
ATOM     13  N   ATP A   1      10.475   3.718   2.396  1.00  0.00           N
ATOM     14  C   ATP A   1      11.123   2.608   2.648  1.00  0.00           C
ATOM     15  N   ATP A   1       8.450   4.749   1.804  1.00  0.00           N
ATOM     16  N   ATP A   1      12.373   2.603   2.988  1.00  0.00           N
CONECT    1    2    3    4    5
CONECT    2    1
CONECT    3    1
CONECT    4    1
CONECT    5    1    6   11
CONECT    6    5    7    8
CONECT    7    6   10
CONECT    8    6    9   10
CONECT    9    8
CONECT   10    7    8   11
CONECT   11    5   10   12
CONECT   12   11   13   15
CONECT   13   12   14
CONECT   14   13   16
CONECT   15   12
CONECT   16   14
END`;

export default function Home() {
  return (
    <main className="w-screen h-screen bg-black overflow-hidden">
      <ARViewer pdbData={ATP_PDB} />
    </main>
  );
}
