# Rota Fácil Sul 🚌

Aplicativo web mobile-first (React + TypeScript + Tailwind CSS) para calcular conexões de ônibus da **Rota Transportes** via **Itabuna** (Salobrinho/UESC, Buerarema, Ilhéus, Itajuípe, Itapé, Olivença e Itacaré).

## Funcionalidades

- **Cálculo automático de baldeação em Itabuna:** cruza o horário de saída da origem com o tempo estimado de viagem até a rodoviária e encontra a conexão exata para o destino.
- **Botão "Próxima rota":** identifica na hora o próximo ônibus viável com base no relógio atual do aparelho.
- **Botão "Última do dia":** mostra o horário limite de saída para não ficar preso sem conexão em Itabuna.
- **Filtro "Dias de aula na UESC":** inclui ou oculta os horários extras em azul da linha Salobrinho ↔ Itabuna.
- **100% offline/estático:** todos os horários ficam em `src/data/horarios.ts`, fáceis de editar quando a empresa publicar nova tabela.

## Como rodar localmente

```bash
npm install
npm run dev
```

Para gerar a versão de produção (hospedagem gratuita na Vercel, Netlify ou GitHub Pages):

```bash
npm run build
```
