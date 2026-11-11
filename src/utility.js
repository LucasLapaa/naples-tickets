'use strict';

const TYPES = Object.freeze({
  suporte: {
    label: 'Suporte', emoji: '🛠️',
    roleKey: 'role_suporte', categoryKey: 'category_suporte',
    firstQuestion: 'Qual problema você encontrou?',
    firstPlaceholder: 'Ex.: não consigo acessar um recurso',
    secondQuestion: 'Descreva o problema com detalhes',
    secondPlaceholder: 'O que aconteceu? O que você já tentou?'
  },
  vendas: {
    label: 'Vendas', emoji: '🛒',
    roleKey: 'role_vendas', categoryKey: 'category_vendas',
    firstQuestion: 'Qual produto ou serviço?',
    firstPlaceholder: 'Ex.: plano Premium',
    secondQuestion: 'Conte o que deseja comprar ou saber',
    secondPlaceholder: 'Descreva o pedido e suas dúvidas'
  },
  duvidas: {
    label: 'Dúvidas', emoji: '❓',
    roleKey: 'role_duvidas', categoryKey: 'category_duvidas',
    firstQuestion: 'Qual é o assunto da dúvida?',
    firstPlaceholder: 'Ex.: regras da comunidade',
    secondQuestion: 'Escreva sua dúvida',
    secondPlaceholder: 'Explique sua pergunta com detalhes'
  }
});

function slug(text) {
  return String(text ?? '')
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .toLowerCase().replace(/[^a-z0-9-]/g, '-')
    .replace(/-+/g, '-').replace(/^-|-$/g, '').slice(0, 40) || 'atendimento';
}
function ticketName(number, type, prefix = 'ticket') {
  return `${prefix}-${String(number).padStart(4, '0')}-${slug(type)}`.slice(0, 90);
}
function shortText(text, max = 1024) {
  const raw = String(text ?? '—').replace(/\r/g, '').trim();
  return raw.length > max ? raw.slice(0, max - 3) + '...' : (raw || '—');
}
function when(iso) {
  if (!iso) return '—';
  return new Date(iso).toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo' });
}

// Quando cargos gerais são definidos, somente eles têm acesso via cargo.
// Sem cargos gerais, preserva o funcionamento antigo por departamento.
function ticketRoleIds(settings, type) {
  const globals = ['role_staff', 'role_admin', 'role_owner']
    .map(key => settings?.[key]).filter(Boolean);
  if (globals.length) return [...new Set(globals)];
  const fallback = settings?.[TYPES[type]?.roleKey];
  return fallback ? [fallback] : [];
}

module.exports = { TYPES, slug, ticketName, shortText, when, ticketRoleIds };
