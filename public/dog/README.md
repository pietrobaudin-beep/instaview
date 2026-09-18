# Frames da animação do mascote

Coloque aqui os seis PNGs transparentes do cachorro farejando, nomeados
exatamente:

    01.png  02.png  03.png  04.png  05.png  06.png

O componente `AnimatedDog` (src/components/ui/dog.tsx) toca os arquivos em
sequência assim que eles existirem. Enquanto não existirem, ele cai
automaticamente no desenho vetorial com a animação em CSS — nenhuma tela
precisa ser alterada nos dois casos.
