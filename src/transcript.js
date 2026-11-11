'use strict';

const { AttachmentBuilder } = require('discord.js');
const { when } = require('./utility');

const MAX_MESSAGES = 700; // Limite explícito para não ultrapassar upload/cotas do Discord.
const MAX_BYTES = 5 * 1024 * 1024;

async function transcriptAttachment(channel, ticket) {
  const fetched = [];
  let before;
  while (fetched.length < MAX_MESSAGES) {
    const opts = { limit: Math.min(100, MAX_MESSAGES - fetched.length) };
    if (before) opts.before = before;
    const batch = await channel.messages.fetch(opts);
    if (!batch.size) break;
    fetched.push(...batch.values());
    before = batch.last().id;
    if (batch.size < opts.limit) break;
  }
  fetched.sort((a, b) => a.createdTimestamp - b.createdTimestamp);
  const lines = [
    'NAPLES COMMUNITY — TRANSCRIÇÃO DE TICKET',
    `Ticket: #${String(ticket.number).padStart(4, '0')} / ${ticket.type}`,
    `Solicitante: ${ticket.owner_id}`,
    `Assunto: ${ticket.topic}`,
    `Criado em: ${when(ticket.created_at)}`,
    `Mensagens exportadas: ${fetched.length} (máximo: ${MAX_MESSAGES})`,
    'Aviso: mensagens de canais comuns exigem MESSAGE CONTENT INTENT no Discord.',
    '='.repeat(75),
    ''
  ];
  for (const message of fetched) {
    const author = `${message.author?.tag || 'Desconhecido'} (${message.author?.id || '?'})`;
    const content = message.content || '[sem texto visível / embed / mensagem de sistema]';
    lines.push(`[${when(message.createdAt)}] ${author}`);
    lines.push(content);
    if (message.attachments.size) {
      lines.push('Anexos: ' + message.attachments.map(a => `${a.name}: ${a.url}`).join(' | '));
    }
    lines.push('');
  }
  let payload = Buffer.from(lines.join('\n'), 'utf8');
  if (payload.length > MAX_BYTES) {
    // Mantém início legível e evita ultrapassar o limite máximo de arquivo.
    payload = Buffer.from(payload.subarray(0, MAX_BYTES - 200).toString('utf8') + '\n\n[TRANSCRIÇÃO TRUNCADA POR TAMANHO]', 'utf8');
  }
  return new AttachmentBuilder(payload, { name: `naples-ticket-${ticket.number}-transcript.txt` });
}

module.exports = { transcriptAttachment };
