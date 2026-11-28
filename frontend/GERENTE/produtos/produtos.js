const apiBase = (
    window.location.hostname === 'localhost' ||
    window.location.hostname === '127.0.0.1'
) && window.location.port !== '3000'
    ? `${window.location.protocol}//${window.location.hostname}:3000`
    : '';
const API = `${apiBase}/api/gerente/produtos`;

const formulario = document.getElementById('form-produto');
const painelFormulario = document.getElementById('painel-formulario');
const categoriaProduto = document.getElementById('categoria-produto');
const corpoTabela = document.getElementById('lista-produtos');
const totalProdutos = document.getElementById('total-produtos');
const mensagem = document.getElementById('mensagem');
const buscaId = document.getElementById('buscar-produto');
const entradaId = document.getElementById('id-produto');
const arquivoImagem = document.getElementById('arquivo-imagem');
const imagemPreview = document.getElementById('imagem-preview');
const imagemPreviewFoto = document.getElementById('imagem-preview-foto');
const imagemPreviewLegenda = document.getElementById('imagem-preview-legenda');
const nomesCategorias = {
    1: 'Câmera analógica',
    2: 'Câmera digital',
    3: 'Filme',
    4: 'Lente',
    5: 'Kit'
};
let produtos = [];
let arquivoImagemSelecionado = null;
let urlPreviewImagem = null;

function escaparHTML(valor) {
    return String(valor ?? '').replace(/[&<>"']/g, caractere => ({
        '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;'
    })[caractere]);
}

function mostrarMensagem(texto, erro = false) {
    mensagem.textContent = texto;
    mensagem.classList.toggle('erro', erro);
}

function formatarMoeda(valor) {
    return Number(valor || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

function urlImagem(valor) {
    if (!valor) return '';
    return String(valor).startsWith('./') ? `/${String(valor).slice(2)}` : String(valor);
}

function mostrarPreviaImagem(url, legenda) {
    if (urlPreviewImagem) URL.revokeObjectURL(urlPreviewImagem);
    urlPreviewImagem = url.startsWith('blob:') ? url : null;
    imagemPreviewFoto.src = url;
    imagemPreviewLegenda.textContent = legenda;
    imagemPreview.hidden = !url;
}

function limparImagemSelecionada() {
    arquivoImagemSelecionado = null;
    arquivoImagem.value = '';
    if (urlPreviewImagem) URL.revokeObjectURL(urlPreviewImagem);
    urlPreviewImagem = null;
}

async function requisitar(url = API, opcoes = {}) {
    const resposta = await fetch(url, {
        credentials: 'include',
        ...opcoes,
        headers: {
            ...(opcoes.body ? { 'Content-Type': 'application/json' } : {}),
            ...(opcoes.headers || {})
        }
    });

    if (resposta.status === 401 || resposta.status === 403) {
        window.location.href = '../../CLIENTE/login/login.html';
        throw new Error('Entre com uma conta de gerente para gerenciar os produtos.');
    }

    if (resposta.status === 204) return {};
    const dados = await resposta.json();
    if (!resposta.ok) throw new Error(dados.erro || 'Não foi possível concluir a operação.');
    return dados;
}

function desenharProdutos() {
    totalProdutos.textContent = `${produtos.length} ${produtos.length === 1 ? 'produto' : 'produtos'}`;
    if (!produtos.length) {
        corpoTabela.innerHTML = '<tr><td class="crud-vazio" colspan="7">Nenhum produto cadastrado.</td></tr>';
        return;
    }

    corpoTabela.innerHTML = produtos.map(produto => `
        <tr>
            <td>#${escaparHTML(produto.id)}</td>
            <td>${produto.imagem ? `<img class="product-thumb" src="${escaparHTML(urlImagem(produto.imagem))}" alt="" loading="lazy">` : '—'}</td>
            <td><span class="product-name">${escaparHTML(produto.nome)}</span></td>
            <td><span class="product-category">${escaparHTML(nomesCategorias[produto.categoria_id] || produto.categoria)}</span></td>
            <td>${formatarMoeda(produto.preco)}</td>
            <td>${formatarMoeda(produto.preco_pix)}</td>
            <td><div class="product-actions">
                <button class="crud-button pequeno" type="button" data-editar="${escaparHTML(produto.id)}">Editar</button>
                <button class="crud-button pequeno perigo" type="button" data-excluir="${escaparHTML(produto.id)}">Excluir</button>
            </div></td>
        </tr>
    `).join('');
}

async function carregarProdutos() {
    try {
        const dados = await requisitar();
        produtos = dados.produtos || [];
        desenharProdutos();
        mensagem.classList.remove('erro');
    } catch (erro) {
        totalProdutos.textContent = 'Não foi possível carregar';
        corpoTabela.innerHTML = '<tr><td class="crud-vazio" colspan="7">Não foi possível carregar os produtos.</td></tr>';
        mostrarMensagem(erro.message, true);
    }
}

function atualizarCamposCategoria() {
    const categoria = Number(categoriaProduto.value);
    document.getElementById('detalhes-filme').hidden = categoria !== 3;
    document.getElementById('detalhes-lente').hidden = categoria !== 4;
    document.getElementById('detalhes-kit').hidden = categoria !== 5;
    document.getElementById('ajuda-categoria').hidden = ![1, 2].includes(categoria);
}

function abrirNovoProduto() {
    formulario.reset();
    limparImagemSelecionada();
    imagemPreview.hidden = true;
    formulario.elements.id.value = '';
    document.getElementById('modo-formulario').textContent = 'NOVO ITEM';
    document.getElementById('titulo-formulario').textContent = 'Adicionar produto';
    document.getElementById('identificador-produto').hidden = true;
    document.getElementById('salvar-produto').textContent = 'Salvar produto';
    atualizarCamposCategoria();
    painelFormulario.hidden = false;
    painelFormulario.scrollIntoView({ behavior: 'smooth', block: 'start' });
    formulario.elements.nome.focus();
}

function preencherFormulario(produto) {
    formulario.elements.id.value = produto.id;
    formulario.elements.nome.value = produto.nome || '';
    categoriaProduto.value = String(produto.categoria_id);
    formulario.elements.preco.value = produto.preco ?? '';
    formulario.elements.preco_pix.value = produto.preco_pix ?? '';
    formulario.elements.imagem.value = produto.imagem || '';
    limparImagemSelecionada();
    if (produto.imagem) {
        mostrarPreviaImagem(urlImagem(produto.imagem), 'Imagem atual. Escolha outro arquivo para substituí-la.');
    } else {
        imagemPreview.hidden = true;
    }
    formulario.elements.iso.value = produto.iso ?? '';
    formulario.elements.quantidade_poses.value = produto.quantidade_poses ?? '';
    formulario.elements.caracteristicas_filme.value = (produto.caracteristicas_filme || []).join(', ');
    formulario.elements.caracteristicas_lente.value = (produto.caracteristicas_lente || []).join(', ');
    formulario.elements.componentes.value = (produto.componentes || [])
        .map(item => `${item.id}:${item.quantidade}`)
        .join(', ');

    document.getElementById('modo-formulario').textContent = 'EDITAR ITEM';
    document.getElementById('titulo-formulario').textContent = produto.nome;
    const identificador = document.getElementById('identificador-produto');
    identificador.textContent = `ID #${produto.id}`;
    identificador.hidden = false;
    document.getElementById('salvar-produto').textContent = 'Salvar alterações';
    atualizarCamposCategoria();
    painelFormulario.hidden = false;
    painelFormulario.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

async function editarProduto(id) {
    try {
        const dados = await requisitar(`${API}/${encodeURIComponent(id)}`);
        preencherFormulario(dados.produto);
        mostrarMensagem(`Produto #${id} carregado para edição.`);
    } catch (erro) {
        mostrarMensagem(erro.message, true);
    }
}

function lerComponentesKit(valor) {
    if (!valor.trim()) return [];
    return valor.split(/[,;\n]/).map(parte => {
        const correspondencia = parte.trim().match(/^(\d+)\s*(?::\s*(\d+))?$/);
        if (!correspondencia) throw new Error('Use o formato ID:quantidade para cada produto do kit.');
        return { id: Number(correspondencia[1]), quantidade: Number(correspondencia[2] || 1) };
    });
}

async function salvarProduto(evento) {
    evento.preventDefault();
    const id = formulario.elements.id.value;
    const categoria = Number(categoriaProduto.value);
    const body = {
        nome: formulario.elements.nome.value,
        categoria_id: categoria,
        preco: formulario.elements.preco.value,
        preco_pix: formulario.elements.preco_pix.value,
        imagem: formulario.elements.imagem.value
    };

    try {
        if (arquivoImagemSelecionado) {
            const imagemSalva = await requisitar(`${API}/imagem`, {
                method: 'POST',
                headers: { 'Content-Type': arquivoImagemSelecionado.type },
                body: arquivoImagemSelecionado
            });
            body.imagem = imagemSalva.imagem;
        }

        if (categoria === 3) {
            body.iso = formulario.elements.iso.value;
            body.quantidade_poses = formulario.elements.quantidade_poses.value;
            body.caracteristicas = formulario.elements.caracteristicas_filme.value;
        } else if (categoria === 4) {
            body.caracteristicas = formulario.elements.caracteristicas_lente.value;
        } else if (categoria === 5) {
            body.componentes = lerComponentesKit(formulario.elements.componentes.value);
        }

        const resposta = await requisitar(id ? `${API}/${encodeURIComponent(id)}` : API, {
            method: id ? 'PUT' : 'POST',
            body: JSON.stringify(body)
        });
        painelFormulario.hidden = true;
        formulario.reset();
        limparImagemSelecionada();
        imagemPreview.hidden = true;
        mostrarMensagem(resposta.mensagem || 'Produto salvo.');
        await carregarProdutos();
    } catch (erro) {
        mostrarMensagem(erro.message, true);
    }
}

document.getElementById('novo-produto').addEventListener('click', abrirNovoProduto);
document.getElementById('cancelar-produto').addEventListener('click', () => {
    painelFormulario.hidden = true;
    formulario.reset();
    limparImagemSelecionada();
    imagemPreview.hidden = true;
});
categoriaProduto.addEventListener('change', atualizarCamposCategoria);
formulario.addEventListener('submit', salvarProduto);
arquivoImagem.addEventListener('change', () => {
    const arquivo = arquivoImagem.files?.[0];
    if (!arquivo) return;
    const tiposPermitidos = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
    if (!tiposPermitidos.includes(arquivo.type) || arquivo.size > 5 * 1024 * 1024) {
        limparImagemSelecionada();
        mostrarMensagem('Escolha uma imagem JPEG, PNG, WebP ou GIF de até 5 MB.', true);
        return;
    }
    arquivoImagemSelecionado = arquivo;
    mostrarPreviaImagem(URL.createObjectURL(arquivo), arquivo.name);
    mostrarMensagem('Imagem pronta para ser enviada junto com o produto.');
});

buscaId.addEventListener('submit', async evento => {
    evento.preventDefault();
    const id = entradaId.value.trim();
    if (!/^\d+$/.test(id) || Number(id) < 1) {
        mostrarMensagem('Digite um ID válido para buscar o produto.', true);
        return;
    }
    await editarProduto(id);
});

corpoTabela.addEventListener('click', async evento => {
    const botao = evento.target.closest('button');
    if (!botao) return;
    if (botao.dataset.editar) return editarProduto(botao.dataset.editar);
    if (!botao.dataset.excluir) return;

    const produto = produtos.find(item => item.id === Number(botao.dataset.excluir));
    if (!window.confirm(`Excluir “${produto?.nome || 'este produto'}”? Ele sairá do catálogo, dos favoritos e das sacolas. Os pedidos antigos manterão o nome e o valor registrados.`)) return;

    try {
        await requisitar(`${API}/${encodeURIComponent(botao.dataset.excluir)}`, { method: 'DELETE' });
        mostrarMensagem('Produto excluído do catálogo.');
        await carregarProdutos();
    } catch (erro) {
        mostrarMensagem(erro.message, true);
    }
});

carregarProdutos();
