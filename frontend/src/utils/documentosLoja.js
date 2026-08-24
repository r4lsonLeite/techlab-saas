import { API_BASE_URL } from '../services/api';

// ============================================================================
// CABEÇALHO DA LOJA NOS DOCUMENTOS IMPRESSOS
// ----------------------------------------------------------------------------
// Cupom térmico, comprovante A4 e orçamento em PDF montavam o cabeçalho cada um
// à sua maneira: o cupom da tela "Consultar OS" saía só com o nome e o telefone
// da loja, sem logo, e cada documento dava um tamanho diferente à imagem. Aqui
// fica a fonte única desses dados, para o que o ADM preenche em "Configurações
// da Loja" sair igual em todos os papéis.
// ============================================================================

// Caixa fixa da logo. Qualquer imagem que o ADM enviar — deitada, em pé ou
// quadrada — é encaixada dentro destas medidas sem distorcer e sem empurrar o
// resto do documento.
export const TAMANHO_LOGO = {
  termica: { largura: 180, altura: 70 },
  a4: { largura: 220, altura: 90 },
};

const escapar = (valor) =>
  String(valor ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');

const TERMOS_PADRAO =
  '1. Orçamentos válidos por 5 dias.\n' +
  '2. Aparelhos não retirados em 90 dias poderão ser vendidos para custear o serviço.\n' +
  '3. Garantia de 90 dias sobre o serviço prestado e as peças trocadas.\n' +
  '4. A garantia não cobre mau uso, quedas ou contato com líquidos.\n' +
  '5. Não nos responsabilizamos por perda de dados.';

// O upload devolve um caminho relativo ("/uploads/..."), mas uma logo migrada
// de outro serviço pode já vir com o endereço completo.
export const urlAbsoluta = (caminho) => {
  if (!caminho) return null;
  return /^https?:\/\//i.test(caminho) ? caminho : `${API_BASE_URL}${caminho}`;
};

/** Normaliza o que veio de /lojas/configuracoes para uso nos documentos. */
export const normalizarLoja = (configLoja) => ({
  nome: configLoja?.nome || 'Assistência Técnica',
  cnpj: configLoja?.cnpj || '',
  telefone: configLoja?.telefone || '',
  endereco: configLoja?.endereco || '',
  email: configLoja?.email || '',
  website: configLoja?.website || '',
  logoUrl: urlAbsoluta(configLoja?.logo_url),
  termos: configLoja?.termos_garantia || TERMOS_PADRAO,
});

/**
 * Imagem da logo já no tamanho e formato definidos.
 * @param {'termica'|'a4'} formato
 * @param {{ centralizada?: boolean, monocromatica?: boolean }} opcoes
 */
export const htmlLogo = (loja, formato = 'a4', opcoes = {}) => {
  const { centralizada = false, monocromatica = false } = opcoes;
  if (!loja.logoUrl) return '';

  const { largura, altura } = TAMANHO_LOGO[formato] || TAMANHO_LOGO.a4;
  const estilo = [
    `width: ${largura}px`,
    `height: ${altura}px`,
    'object-fit: contain',
    'object-position: center',
    'display: block',
    centralizada ? 'margin: 0 auto 6px auto' : 'margin: 0',
    // Impressora térmica só imprime preto: a logo colorida sairia empastelada.
    monocromatica ? 'filter: grayscale(100%) contrast(140%)' : '',
    'print-color-adjust: exact',
    '-webkit-print-color-adjust: exact',
  ]
    .filter(Boolean)
    .join('; ');

  return `<img src="${escapar(loja.logoUrl)}" alt="${escapar(loja.nome)}" style="${estilo}" />`;
};

/** Linhas de contato da loja, só com o que estiver preenchido. */
export const linhasContato = (loja, { comCnpj = true } = {}) => {
  const linhas = [];
  if (comCnpj && loja.cnpj) linhas.push(`CNPJ: ${loja.cnpj}`);
  if (loja.endereco) linhas.push(loja.endereco);
  if (loja.telefone) linhas.push(`Tel: ${loja.telefone}`);
  if (loja.email) linhas.push(loja.email);
  if (loja.website) linhas.push(loja.website);
  return linhas.map(escapar);
};

/**
 * Cabeçalho centralizado do cupom térmico: logo em preto e branco, nome da
 * loja e os contatos configurados.
 */
export const cabecalhoTermico = (loja) => `
  <div style="text-align: center; margin-bottom: 8px;">
    ${htmlLogo(loja, 'termica', { centralizada: true, monocromatica: true })}
    <p style="margin: 0 0 2px 0; font-size: 15px; font-weight: bold;">${escapar(loja.nome)}</p>
    ${linhasContato(loja)
      .map((linha) => `<p style="margin: 1px 0; font-size: 11px;">${linha}</p>`)
      .join('')}
  </div>
`;

export { escapar, TERMOS_PADRAO };
