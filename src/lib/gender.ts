/**
 * Heuristic gender guess from a (Brazilian) first name. This is an ESTIMATE
 * derived from real data (the accounts a profile actually follows), not a
 * fabricated number — but name-based inference is imperfect (unisex names,
 * brands, foreign names), so treat the counts as approximate.
 */
const FEMALE = new Set([
  "maria","ana","julia","juliana","beatriz","mariana","gabriela","isabela","larissa","amanda",
  "camila","fernanda","patricia","leticia","bruna","carolina","aline","vanessa","jessica","sabrina",
  "natalia","rafaela","bianca","sofia","alice","laura","manuela","helena","valentina","luiza",
  "cecilia","clara","marina","sandra","andrea","carla","debora","monica","renata","tatiane",
  "tania","viviane","priscila","adriana","claudia","cristina","daniela","eduarda","elaine","fabiana",
  "gisele","ingrid","kelly","lucia","michele","nadia","paula","regina","rosa","silvia","vera",
  "yasmin","duda","bia","gabi","mari","isa","lorena","emanuelly","heloisa","sarah","agatha","milena",
  "vitoria","raquel","simone","luana","thais","carolzinha","nicole","stephany","emilly","ester",
]);

const MALE = new Set([
  "joao","jose","carlos","paulo","pedro","lucas","gabriel","rafael","bruno","felipe","gustavo",
  "matheus","thiago","tiago","daniel","marcos","andre","rodrigo","fernando","ricardo","eduardo",
  "leonardo","vinicius","guilherme","diego","fabio","alexandre","antonio","francisco","marcelo",
  "roberto","luiz","luis","sergio","sandro","vitor","victor","caio","igor","henrique","arthur",
  "davi","miguel","bernardo","enzo","nicolas","samuel","benjamin","theo","murilo","otavio","caua",
  "ryan","yuri","wesley","wellington","alan","alex","joaquim","heitor","gael","noah","pietro","erick",
  "kaique","kaua","lorenzo","levi","anthony","bryan","cauan","emanuel","juan","luccas","raul",
]);

function normalize(s: string): string {
  return s
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z\s.]/g, " ")
    .trim();
}

export function guessGender(name: string | null | undefined, fallbackUsername?: string): "f" | "m" | "u" {
  const source = (name && name.trim()) || fallbackUsername || "";
  const first = normalize(source).split(/[\s.]+/).filter(Boolean)[0];
  if (!first) return "u";
  if (FEMALE.has(first)) return "f";
  if (MALE.has(first)) return "m";
  // Weak fallback: in PT-BR, first names ending in "a" are predominantly female.
  if (first.length >= 3) {
    if (first.endsWith("a")) return "f";
    if (/[o019]$/.test(first) || /(son|ton|nor|ilson|ando|inho)$/.test(first)) return "m";
  }
  return "u";
}

export function countGenders(
  people: { displayName: string | null; username: string }[],
): { girls: number; boys: number } {
  let girls = 0;
  let boys = 0;
  for (const p of people) {
    const g = guessGender(p.displayName, p.username);
    if (g === "f") girls++;
    else if (g === "m") boys++;
  }
  return { girls, boys };
}
