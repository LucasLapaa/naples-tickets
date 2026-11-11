'use strict';

const path = require('node:path');
const {
  ActionRowBuilder, AttachmentBuilder, ButtonBuilder, ButtonStyle,
  EmbedBuilder, ModalBuilder, TextInputBuilder, TextInputStyle
} = require('discord.js');
const { TYPES, shortText, when } = require('./utility');

const GREEN = 0x24e276;
const assets = path.join(__dirname, '..', 'assets');

function panel() {
  const embed = new EmbedBuilder()
    .setColor(GREEN)
    .setTitle('🎫  NAPLES COMMUNITY  |  CENTRAL DE ATENDIMENTO')
    .setDescription(
      '**Seu atendimento começa aqui!**\n\n' +
      'Escolha o setor ideal para falar com a nossa equipe. ' +
      'Um canal privado será criado após você preencher o formulário.\n\n' +
      '🛠️ **Suporte** — Problemas e solicitações técnicas\n' +
      '🛒 **Vendas** — Produtos, serviços e pagamentos\n' +
      '❓ **Dúvidas** — Perguntas gerais e orientações'
    )
    .setImage('attachment://naples-banner.png')
    .setFooter({ text: 'NAPLES TICKETS • Atendimento organizado e privado' });
  const buttons = new ActionRowBuilder().addComponents(
    new ButtonBuilder().setCustomId('naples:open:suporte').setLabel('Suporte').setEmoji('🛠️').setStyle(ButtonStyle.Success),
    new ButtonBuilder().setCustomId('naples:open:vendas').setLabel('Vendas').setEmoji('🛒').setStyle(ButtonStyle.Success),
    new ButtonBuilder().setCustomId('naples:open:duvidas').setLabel('Dúvidas').setEmoji('❓').setStyle(ButtonStyle.Success)
  );
  return { embeds: [embed], components: [buttons], files: [new AttachmentBuilder(path.join(assets, 'naples-banner.png'), { name: 'naples-banner.png' })] };
}
function form(type) {
  const t = TYPES[type];
  if (!t) throw new Error('Tipo de ticket inválido');
  const topic = new TextInputBuilder()
    .setCustomId('topic').setLabel(t.firstQuestion)
    .setPlaceholder(t.firstPlaceholder).setStyle(TextInputStyle.Short)
    .setMinLength(3).setMaxLength(100).setRequired(true);
  const details = new TextInputBuilder()
    .setCustomId('details').setLabel(t.secondQuestion)
    .setPlaceholder(t.secondPlaceholder).setStyle(TextInputStyle.Paragraph)
    .setMinLength(10).setMaxLength(1000).setRequired(true);
  return new ModalBuilder()
    .setCustomId(`naples:form:${type}`).setTitle(`NAPLES • ${t.label}`)
    .addComponents(
      new ActionRowBuilder().addComponents(topic),
      new ActionRowBuilder().addComponents(details)
    );
}
function ticketCard(t) {
  const kind = TYPES[t.type];
  return new EmbedBuilder()
    .setColor(t.status === 'closed' ? 0x717b86 : GREEN)
    .setTitle(`${kind.emoji}  TICKET #${String(t.number).padStart(4, '0')}  |  ${kind.label.toUpperCase()}`)
    .setDescription(
      t.status === 'open'
        ? '🟢 **Atendimento aberto.** Nossa equipe responderá por aqui.\nEvite marcar a equipe repetidamente.'
        : '🔒 **Atendimento encerrado.** A equipe pode reabrir ou excluir o canal.'
    )
    .addFields(
      { name: '👤 Solicitante', value: `<@${t.owner_id}>`, inline: true },
      { name: '🤝 Atendente', value: t.claimed_by ? `<@${t.claimed_by}>` : 'Aguardando...', inline: true },
      { name: '📅 Abertura', value: when(t.created_at), inline: true },
      { name: '📌 Assunto', value: shortText(t.topic, 900) },
      { name: '📝 Descrição', value: shortText(t.details, 1000) }
    )
    .setFooter({ text: 'Naples Community • Equipe de atendimento' });
}
function ticketButtons(status, claimed = false) {
  const row = new ActionRowBuilder();
  if (status === 'open') {
    row.addComponents(
      new ButtonBuilder().setCustomId(claimed ? 'naples:release' : 'naples:claim')
        .setLabel(claimed ? 'Liberar' : 'Assumir').setEmoji('🤝').setStyle(ButtonStyle.Success),
      new ButtonBuilder().setCustomId('naples:close').setLabel('Fechar').setEmoji('🔒').setStyle(ButtonStyle.Danger),
      new ButtonBuilder().setCustomId('naples:transcript').setLabel('Transcrição').setEmoji('📄').setStyle(ButtonStyle.Secondary)
    );
  } else {
    row.addComponents(
      new ButtonBuilder().setCustomId('naples:reopen').setLabel('Reabrir').setEmoji('🔓').setStyle(ButtonStyle.Success),
      new ButtonBuilder().setCustomId('naples:delete').setLabel('Excluir').setEmoji('🗑️').setStyle(ButtonStyle.Danger),
      new ButtonBuilder().setCustomId('naples:transcript').setLabel('Transcrição').setEmoji('📄').setStyle(ButtonStyle.Secondary)
    );
  }
  return [row];
}
function ratingButtons(ticketId) {
  const row = new ActionRowBuilder();
  for (let stars = 1; stars <= 5; stars++) {
    row.addComponents(new ButtonBuilder()
      .setCustomId(`naples:rate:${ticketId}:${stars}`).setLabel(`${stars} ⭐`)
      .setStyle(stars === 5 ? ButtonStyle.Success : ButtonStyle.Secondary));
  }
  return [row];
}
module.exports = { GREEN, panel, form, ticketCard, ticketButtons, ratingButtons };
