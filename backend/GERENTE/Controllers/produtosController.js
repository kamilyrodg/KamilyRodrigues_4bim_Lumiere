const pool = require('../../db');
const fs = require('node:fs/promises');
const path = require('node:path');
const { randomUUID } = require('node:crypto');

const CATEGORIAS_CAMERA = new Set([1, 2]);
const CATEGORIA_FILME = 3;
const CATEGORIA_LENTE = 4;
const CATEGORIA_KIT = 5;
const DIRETORIO_IMAGENS = path.resolve(__dirname, '../../../img/CLIENTE/produtos');
const TIPOS_IMAGEM = new Map([
    ['image/jpeg', { extensao: '.jpg', assinatura: buffer => buffer.length >= 3 && buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff }],
    ['image/png', { extensao: '.png', assinatura: buffer => buffer.length >= 8 && buffer.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])) }],
    ['image/webp', { extensao: '.webp', assinatura: buffer => buffer.length >= 12 && buffer.toString('ascii', 0, 4) === 'RIFF' && buffer.toString('ascii', 8, 12) === 'WEBP' }],
    ['image/gif', { extensao: '.gif', assinatura: buffer => buffer.length >= 6 && ['GIF87a', 'GIF89a'].includes(buffer.toString('ascii', 0, 6)) }]
]);

const CONSULTA_PRODUTOS = `
    SELECT
        p.id,
        p.categoria_id,
        c.nome AS categoria,
        p.nome,
        p.preco,
        p.preco_pix,
        p.imagem,
        f.iso,
        f.quantidade_poses,
        COALESCE(fc.caracteristicas, ARRAY[]::VARCHAR[]) AS caracteristicas_filme,
        COALESCE(lc.caracteristicas, ARRAY[]::VARCHAR[]) AS caracteristicas_lente,
        COALESCE(kp.componentes, '[]'::JSON) AS componentes
    FROM produtos p
    INNER JOIN categorias c ON c.id = p.categoria_id
    LEFT JOIN filmes f ON f.produto_id = p.id
    LEFT JOIN LATERAL (
        SELECT ARRAY_AGG(DISTINCT cf.nome ORDER BY cf.nome) AS caracteristicas
        FROM filme_caracteristicas rel
        INNER JOIN caracteristicas_filme cf ON cf.id = rel.caracteristica_id
        WHERE rel.filme_id = p.id
    ) fc ON TRUE
    LEFT JOIN LATERAL (
        SELECT ARRAY_AGG(DISTINCT cl.nome ORDER BY cl.nome) AS caracteristicas
        FROM lente_caracteristicas rel
        INNER JOIN caracteristicas_lente cl ON cl.id = rel.caracteristica_id
        WHERE rel.lente_id = p.id
    ) lc ON TRUE
    LEFT JOIN LATERAL (
        SELECT JSON_AGG(
            JSON_BUILD_OBJECT(
                'id', componente.id,
                'nome', componente.nome,
                'quantidade', rel.quantidade
            ) ORDER BY componente.id
        ) AS componentes
        FROM kits_produto rel
        INNER JOIN produtos componente ON componente.id = rel.produto_id
        WHERE rel.kit_id = p.id
    ) kp ON TRUE
`;

function normalizarTexto(valor) {
    return typeof valor === 'string' ? valor.trim() : '';
}

function lerListaCaracteristicas(valor) {
    const itens = Array.isArray(valor)
        ? valor
        : typeof valor === 'string'
            ? valor.split(/[,;\n]/)
            : [];

    return [...new Map(itens
        .map(item => normalizarTexto(item))
        .filter(item => item && item.length <= 50)
        .map(item => [item.toLocaleLowerCase('pt-BR'), item])).values()];
}

function validarProduto(body) {
    const nome = normalizarTexto(body.nome);
    const categoriaId = Number(body.categoria_id);
    const preco = Number(body.preco);
    const precoPix = Number(body.preco_pix);
    const imagem = normalizarTexto(body.imagem) || null;

    if (!nome || nome.length > 150) {
        return { erro: 'Informe um nome de até 150 caracteres.' };
    }
    if (![...CATEGORIAS_CAMERA, CATEGORIA_FILME, CATEGORIA_LENTE, CATEGORIA_KIT].includes(categoriaId)) {
        return { erro: 'Selecione uma categoria válida.' };
    }
    if (!Number.isFinite(preco) || preco < 0 || preco > 99999999.99) {
        return { erro: 'Informe um preço válido.' };
    }
    if (!Number.isFinite(precoPix) || precoPix < 0 || precoPix > 99999999.99) {
        return { erro: 'Informe um preço Pix válido.' };
    }
    if (imagem && imagem.length > 255) {
        return { erro: 'O caminho da imagem deve ter até 255 caracteres.' };
    }

    const dados = {
        nome,
        categoriaId,
        preco: preco.toFixed(2),
        precoPix: precoPix.toFixed(2),
        imagem,
        iso: null,
        quantidadePoses: null,
        caracteristicas: lerListaCaracteristicas(body.caracteristicas),
        componentes: Array.isArray(body.componentes) ? body.componentes : []
    };

    if (categoriaId === CATEGORIA_FILME) {
        for (const [campo, rotulo] of [['iso', 'ISO'], ['quantidade_poses', 'quantidade de poses']]) {
            const valor = body[campo] === '' || body[campo] == null ? null : Number(body[campo]);
            if (valor !== null && (!Number.isSafeInteger(valor) || valor <= 0)) {
                return { erro: `Informe um valor válido para ${rotulo}.` };
            }
            if (campo === 'iso') dados.iso = valor;
            else dados.quantidadePoses = valor;
        }
    }

    if (categoriaId === CATEGORIA_KIT) {
        if (dados.componentes.some(item =>
            !Number.isSafeInteger(Number(item.id)) || Number(item.id) < 1 ||
            !Number.isSafeInteger(Number(item.quantidade)) || Number(item.quantidade) < 1
        )) {
            return { erro: 'Confira os IDs e as quantidades dos itens do kit.' };
        }
        dados.componentes = [...new Map(dados.componentes.map(item => [Number(item.id), {
            id: Number(item.id),
            quantidade: Number(item.quantidade)
        }])).values()];
    }

    return { dados };
}

async function salvarDetalhes(client, produtoId, dados) {
    await client.query('DELETE FROM filme_caracteristicas WHERE filme_id = $1', [produtoId]);
    await client.query('DELETE FROM filmes WHERE produto_id = $1', [produtoId]);
    await client.query('DELETE FROM lente_caracteristicas WHERE lente_id = $1', [produtoId]);
    await client.query('DELETE FROM kits_produto WHERE kit_id = $1', [produtoId]);

    if (dados.categoriaId === CATEGORIA_FILME) {
        await client.query(
            'INSERT INTO filmes (produto_id, iso, quantidade_poses) VALUES ($1, $2, $3)',
            [produtoId, dados.iso, dados.quantidadePoses]
        );

        for (const nome of dados.caracteristicas) {
            const existente = await client.query(
                'SELECT id FROM caracteristicas_filme WHERE LOWER(nome) = LOWER($1) LIMIT 1',
                [nome]
            );
            const caracteristicaId = existente.rows[0]?.id ?? (await client.query(
                'INSERT INTO caracteristicas_filme (nome) VALUES ($1) RETURNING id',
                [nome]
            )).rows[0].id;
            await client.query(
                'INSERT INTO filme_caracteristicas (filme_id, caracteristica_id) VALUES ($1, $2)',
                [produtoId, caracteristicaId]
            );
        }
    }

    if (dados.categoriaId === CATEGORIA_LENTE) {
        for (const nome of dados.caracteristicas) {
            const existente = await client.query(
                'SELECT id FROM caracteristicas_lente WHERE LOWER(nome) = LOWER($1) LIMIT 1',
                [nome]
            );
            const caracteristicaId = existente.rows[0]?.id ?? (await client.query(
                'INSERT INTO caracteristicas_lente (nome) VALUES ($1) RETURNING id',
                [nome]
            )).rows[0].id;
            await client.query(
                'INSERT INTO lente_caracteristicas (lente_id, caracteristica_id) VALUES ($1, $2)',
                [produtoId, caracteristicaId]
            );
        }
    }

    if (dados.categoriaId === CATEGORIA_KIT && dados.componentes.length) {
        if (dados.componentes.some(item => item.id === Number(produtoId))) {
            throw Object.assign(new Error('Um kit não pode conter a si mesmo.'), { status: 400 });
        }

        const ids = dados.componentes.map(item => item.id);
        const existentes = await client.query(
            'SELECT id FROM produtos WHERE id = ANY($1::INTEGER[]) AND categoria_id <> $2',
            [ids, CATEGORIA_KIT]
        );
        if (existentes.rowCount !== ids.length) {
            throw Object.assign(new Error('Os itens do kit precisam ser produtos existentes e não podem ser outros kits.'), { status: 400 });
        }

        for (const item of dados.componentes) {
            await client.query(
                'INSERT INTO kits_produto (kit_id, produto_id, quantidade) VALUES ($1, $2, $3)',
                [produtoId, item.id, item.quantidade]
            );
        }
    }
}

async function listarProdutos(req, res) {
    try {
        const resultado = await pool.query(`${CONSULTA_PRODUTOS} ORDER BY p.id DESC`);
        return res.json({ produtos: resultado.rows });
    } catch (erro) {
        console.error('Erro ao listar produtos para o gerente:', erro);
        return res.status(500).json({ erro: 'Não foi possível carregar os produtos.' });
    }
}

async function buscarProduto(req, res) {
    const id = Number.parseInt(req.params.id, 10);
    if (!Number.isSafeInteger(id) || id < 1) {
        return res.status(400).json({ erro: 'Informe um ID de produto válido.' });
    }
    try {
        const resultado = await pool.query(`${CONSULTA_PRODUTOS} WHERE p.id = $1`, [id]);
        if (!resultado.rowCount) return res.status(404).json({ erro: 'Produto não encontrado.' });
        return res.json({ produto: resultado.rows[0] });
    } catch (erro) {
        console.error('Erro ao buscar produto para o gerente:', erro);
        return res.status(500).json({ erro: 'Não foi possível buscar esse produto.' });
    }
}

async function enviarImagem(req, res) {
    const tipoImagem = TIPOS_IMAGEM.get(req.get('content-type') || '');
    const arquivo = req.body;
    if (!tipoImagem || !Buffer.isBuffer(arquivo) || arquivo.length === 0) {
        return res.status(400).json({ erro: 'Escolha uma imagem JPEG, PNG, WebP ou GIF.' });
    }
    if (!tipoImagem.assinatura(arquivo)) {
        return res.status(400).json({ erro: 'O arquivo selecionado não parece ser uma imagem válida.' });
    }

    const nomeArquivo = `${randomUUID()}${tipoImagem.extensao}`;
    try {
        await fs.mkdir(DIRETORIO_IMAGENS, { recursive: true });
        await fs.writeFile(path.join(DIRETORIO_IMAGENS, nomeArquivo), arquivo, { flag: 'wx' });
        return res.status(201).json({ imagem: `/img/CLIENTE/produtos/${nomeArquivo}` });
    } catch (erro) {
        console.error('Erro ao armazenar imagem de produto:', erro);
        return res.status(500).json({ erro: 'Não foi possível salvar a imagem no servidor.' });
    }
}

async function gravarProduto(req, res) {
    const validacao = validarProduto(req.body || {});
    if (validacao.erro) return res.status(400).json({ erro: validacao.erro });

    const id = req.params.id ? Number.parseInt(req.params.id, 10) : null;
    if (req.params.id && (!Number.isSafeInteger(id) || id < 1)) {
        return res.status(400).json({ erro: 'ID de produto inválido.' });
    }

    const client = await pool.connect();
    try {
        await client.query('BEGIN');
        let produtoId = id;
        if (id) {
            const atualizado = await client.query(
                `UPDATE produtos
                 SET categoria_id = $1, nome = $2, preco = $3, preco_pix = $4, imagem = $5
                 WHERE id = $6 RETURNING id`,
                [validacao.dados.categoriaId, validacao.dados.nome, validacao.dados.preco,
                    validacao.dados.precoPix, validacao.dados.imagem, id]
            );
            if (!atualizado.rowCount) {
                await client.query('ROLLBACK');
                return res.status(404).json({ erro: 'Produto não encontrado.' });
            }
        } else {
            const criado = await client.query(
                `INSERT INTO produtos (categoria_id, nome, preco, preco_pix, imagem)
                 VALUES ($1, $2, $3, $4, $5) RETURNING id`,
                [validacao.dados.categoriaId, validacao.dados.nome, validacao.dados.preco,
                    validacao.dados.precoPix, validacao.dados.imagem]
            );
            produtoId = criado.rows[0].id;
        }

        await salvarDetalhes(client, produtoId, validacao.dados);
        await client.query('COMMIT');
        return res.status(id ? 200 : 201).json({ id: produtoId, mensagem: id ? 'Produto atualizado.' : 'Produto cadastrado.' });
    } catch (erro) {
        try { await client.query('ROLLBACK'); } catch {}
        if (erro.status) return res.status(erro.status).json({ erro: erro.message });
        console.error('Erro ao salvar produto:', erro);
        return res.status(500).json({ erro: 'Não foi possível salvar o produto.' });
    } finally {
        client.release();
    }
}

async function excluirProduto(req, res) {
    const id = Number.parseInt(req.params.id, 10);
    if (!Number.isSafeInteger(id) || id < 1) {
        return res.status(400).json({ erro: 'ID de produto inválido.' });
    }

    const client = await pool.connect();
    try {
        await client.query('BEGIN');
        const produto = await client.query('SELECT id FROM produtos WHERE id = $1 FOR UPDATE', [id]);
        if (!produto.rowCount) {
            await client.query('ROLLBACK');
            return res.status(404).json({ erro: 'Produto não encontrado.' });
        }

        await client.query('DELETE FROM kits_produto WHERE kit_id = $1 OR produto_id = $1', [id]);
        await client.query('DELETE FROM favoritos WHERE produto_id = $1', [id]);
        await client.query('DELETE FROM itens_carrinho WHERE produto_id = $1', [id]);
        await client.query('UPDATE itens_pedido SET produto_id = NULL WHERE produto_id = $1', [id]);
        await client.query('DELETE FROM filme_caracteristicas WHERE filme_id = $1', [id]);
        await client.query('DELETE FROM filmes WHERE produto_id = $1', [id]);
        await client.query('DELETE FROM lente_caracteristicas WHERE lente_id = $1', [id]);
        await client.query('DELETE FROM produtos WHERE id = $1', [id]);
        await client.query('COMMIT');
        return res.status(204).end();
    } catch (erro) {
        try { await client.query('ROLLBACK'); } catch {}
        console.error('Erro ao excluir produto:', erro);
        return res.status(500).json({ erro: 'Não foi possível excluir o produto.' });
    } finally {
        client.release();
    }
}

module.exports = { listarProdutos, buscarProduto, enviarImagem, gravarProduto, excluirProduto };
