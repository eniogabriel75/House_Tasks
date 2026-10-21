# Tarefas PWA (React + Vite + Supabase)

App de tarefas compartilhadas, instalável no iPhone sem App Store (PWA).
Cada pessoa entra com Google, tem a sua lista e pode **convidar** outra pessoa para dividir a mesma lista.
Cada tarefa tem checkbox ("feito"), observação e fotos de comprovação. As mudanças aparecem em tempo real para todos da lista.

## Tecnologias

- React
- TypeScript
- Vite
- Tailwind CSS
- Supabase
- Vercel
- PWA

## Funcionalidades

- Login com Google
- Criação e gerenciamento de tarefas
- Upload de fotos
- Atualização em tempo real
- Controle de acesso com RLS
- Instalação como aplicativo no celular

## Estrutura do projeto

```text
tarefas-pwa/
├── supabase/
│   └── schema.sql
└── web/
    ├── public/
    ├── src/
    ├── .env.example
    ├── package.json
    └── vite.config.ts