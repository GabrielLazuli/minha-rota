# Minha Rota 🚌

🌐 **Acesse agora:** [https://minha-rota-flax.vercel.app/](https://minha-rota-flax.vercel.app/)

Aplicativo web *mobile-first* (React + TypeScript + Tailwind CSS + Capacitor) para calcular horários e conexões de ônibus da **Rota Transportes** via **Itabuna** (Salobrinho/UESC, Buerarema, Ilhéus, Itajuípe, Itapé, Olivença e Itacaré).

## Funcionalidades

- **Cálculo automático de baldeação em Itabuna:** cruza o horário de saída da origem com o tempo estimado de viagem até a rodoviária e encontra a conexão exata para o destino.
- **Passagem direta pelo Salobrinho (BR-415):** considera automaticamente os ônibus da linha *Ilhéus ↔ Itabuna* como opção direta para quem sai ou chega no ponto do Salobrinho/UESC.
- **Botão "Próxima rota":** identifica na hora o próximo ônibus viável com base no relógio atual do aparelho.
- **Botão "Última do dia":** mostra o horário limite de saída para não ficar preso sem conexão em Itabuna.
- **Filtro "Dias de aula na UESC":** inclui ou oculta os horários extras do período letivo da linha Salobrinho ↔ Itabuna.
- **100% offline/estático (PWA + Android APK):** todos os horários ficam em `src/data/horarios.ts`, funcionando mesmo sem sinal de internet no ponto e fáceis de editar quando a empresa publicar nova tabela.

## Como rodar localmente

```bash
npm install
npm run dev
