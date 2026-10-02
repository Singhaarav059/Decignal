// Bodoni Moda only ships column-width figures, so a lone "1" sits in a wide gap.
// Pulling its side bearings in restores even spacing in display numerals.
const ONE = '<span style="margin:0 -0.07em">1</span>';

export const tightOnes = (s: string) => s.replace(/1/g, ONE);

export function Num({ children }: { children: string | number }) {
  return <span dangerouslySetInnerHTML={{ __html: tightOnes(String(children)) }} />;
}
