# SparkLingo

SparkLingo é uma plataforma gamificada de inglês com visual forte, cards interativos e exercícios que parecem parte de um jogo.

## O que já está implementado

- home redesenhada com sidebar, hero ilustrado, trilha de aulas e rail lateral de progresso
- textos corrigidos em UTF-8
- estados reais de acerto e erro nas questões de múltipla escolha
- drag and drop funcional para completar frase
- ordenação arrastável de palavras
- pacote inicial de ilustrações locais em `public/illustrations`

## Stack

- React 18
- TypeScript
- Vite 5
- `@dnd-kit` para drag and drop
- `lucide-react` para ícones

## Rodar localmente

```bash
npm install
npm run dev
```

## Validar

```bash
npm run build
npm run lint
```

## Geração de artes com API gratuita

O projeto inclui um script para gerar artes com Pollinations:

```bash
npm run generate:art
```

Se o endpoint exigir autenticação na sua sessão, defina antes uma chave publicável:

```bash
$env:POLLINATIONS_KEY="sua-chave"
npm run generate:art
```

As saídas vão para `public/pollinations/`.
