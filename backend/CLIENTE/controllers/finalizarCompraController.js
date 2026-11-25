const pool = require('../../db');

const LIMITE_ITENS_PEDIDO = 100;
const LIMITE_QUANTIDADE_ITEM = 999;
const LIMITE_TOTAL_CENTAVOS = 9999999999;

function validarId(value) {
    const texto = String(value);
    if (!/^[1-9]\d*$/.test(texto)) {
        return null;
    }

    const id = Number(texto);
    return Number.isSafeInteger(id) && id <= 2147483647 ? id : null;
}

function validarItensPedido(value, permitirVazio) {
    if (
        !Array.isArray(value) ||
        (!permitirVazio && value.length === 0) ||
        value.length > LIMITE_ITENS_PEDIDO
    ) {
        return {
            erro: value && value.length > LIMITE_ITENS_PEDIDO
                ? 'A sacola contém itens demais.'
                : 'A sacola está vazia.',
            itens: null
        };
    }

    const itens = [];
    const idsProdutos = new Set();

    for (const item of value) {
        const produtoId = item && validarId(item.produtoId);
        const quantidade = item && item.quantidade;

        if (
            !produtoId ||
            !Number.isSafeInteger(quantidade) ||
            quantidade < 1 ||
            quantidade > LIMITE_QUANTIDADE_ITEM ||
            idsProdutos.has(produtoId)
        ) {
            return {
                erro: 'Confira os produtos e as quantidades da sacola.',
                itens: null
            };
        }

        idsProdutos.add(produtoId);
        itens.push({ produtoId, quantidade });
    }

    return { erro: null, itens };
}

async function consultarProdutos(cliente, itens, bloquearAtualizacoes) {
    const resultado = await cliente.query(
        `SELECT id, nome, preco, imagem
         FROM produtos
         WHERE id = ANY($1::INTEGER[])
         ORDER BY id${bloquearAtualizacoes ? ' FOR SHARE' : ''}`,
        [itens.map(item => item.produtoId)]
    );

    if (resultado.rowCount !== itens.length) {
        return {
            erro: 'Um ou mais produtos não estão mais disponíveis.',
            itens: null
        };
    }

    const produtos = new Map(
        resultado.rows.map(produto => [produto.id, produto])
    );
    let totalCentavos = 0;

    const itensCalculados = itens.map(item => {
        const produto = produtos.get(item.produtoId);
        const precoCentavos = Math.round(Number(produto.preco) * 100);
        totalCentavos += precoCentavos * item.quantidade;

        return {
            produtoId: produto.id,
            nome: produto.nome,
            imagem: produto.imagem,
            quantidade: item.quantidade,
            preco: produto.preco
        };
    });

    if (
        !Number.isSafeInteger(totalCentavos) ||
        totalCentavos > LIMITE_TOTAL_CENTAVOS
    ) {
        return {
            erro: 'O valor total da compra excede o limite permitido.',
            itens: null
        };
    }

    return {
        erro: null,
        itens: itensCalculados,
        totalCentavos
    };
}

async function carregarCarrinho(cliente, usuarioId, bloquearAtualizacoes) {
    const carrinho = await cliente.query(
        `SELECT id
         FROM carrinhos
         WHERE usuario_id = $1${bloquearAtualizacoes ? ' FOR UPDATE' : ''}`,
        [usuarioId]
    );

    if (carrinho.rowCount === 0) {
        return { erro: null, itens: [], totalCentavos: 0 };
    }

    const itensSalvos = await cliente.query(
        `SELECT produto_id AS "produtoId", quantidade
         FROM itens_carrinho
         WHERE carrinho_id = $1
         ORDER BY id${bloquearAtualizacoes ? ' FOR SHARE' : ''}`,
        [carrinho.rows[0].id]
    );

    if (itensSalvos.rowCount === 0) {
        return { erro: null, itens: [], totalCentavos: 0 };
    }

    const validacao = validarItensPedido(itensSalvos.rows);
    if (validacao.erro) {
        return { erro: validacao.erro, itens: null };
    }

    return consultarProdutos(
        cliente,
        validacao.itens,
        bloquearAtualizacoes
    );
}

function formatarTotal(totalCentavos) {
    return (totalCentavos / 100).toFixed(2);
}

async function listarFormasPagamento(req, res) {
    try {
        const resultado = await pool.query(
            'SELECT id, nome FROM formas_pagamento ORDER BY id'
        );

        return res.status(200).json({
            formasPagamento: resultado.rows
        });
    } catch (erro) {
        console.error('Erro ao listar formas de pagamento:', erro);
        return res.status(500).json({
            mensagem: 'Não foi possível carregar as formas de pagamento.'
        });
    }
}

async function obterCarrinho(req, res) {
    try {
        const resumo = await carregarCarrinho(
            pool,
            req.usuarioAutenticado.id,
            false
        );
        if (resumo.erro) {
            return res.status(500).json({ erro: resumo.erro });
        }

        return res.status(200).json({
            itens: resumo.itens,
            valorTotal: formatarTotal(resumo.totalCentavos)
        });
    } catch (erro) {
        console.error('Erro ao carregar a sacola do cliente:', erro);
        return res.status(500).json({
            erro: 'Não foi possível carregar a sacola.'
        });
    }
}

async function sincronizarCarrinho(req, res) {
    const validacao = validarItensPedido(
        req.body && req.body.itens,
        true
    );
    if (validacao.erro) {
        return res.status(400).json({ erro: validacao.erro });
    }

    let cliente;

    try {
        cliente = await pool.connect();
        await cliente.query('BEGIN');

        const resumo = validacao.itens.length > 0
            ? await consultarProdutos(cliente, validacao.itens, true)
            : { erro: null, itens: [], totalCentavos: 0 };
        if (resumo.erro) {
            await cliente.query('ROLLBACK');
            return res.status(400).json({ erro: resumo.erro });
        }

        await cliente.query(
            `INSERT INTO carrinhos (usuario_id)
             VALUES ($1)
             ON CONFLICT (usuario_id) DO NOTHING`,
            [req.usuarioAutenticado.id]
        );
        const carrinho = await cliente.query(
            `SELECT id
             FROM carrinhos
             WHERE usuario_id = $1
             FOR UPDATE`,
            [req.usuarioAutenticado.id]
        );

        await cliente.query(
            'DELETE FROM itens_carrinho WHERE carrinho_id = $1',
            [carrinho.rows[0].id]
        );

        for (const item of validacao.itens) {
            await cliente.query(
                `INSERT INTO itens_carrinho (
                    carrinho_id, produto_id, quantidade
                 )
                 VALUES ($1, $2, $3)`,
                [carrinho.rows[0].id, item.produtoId, item.quantidade]
            );
        }

        await cliente.query('COMMIT');
        return res.status(200).json({
            itens: resumo.itens,
            valorTotal: formatarTotal(resumo.totalCentavos)
        });
    } catch (erro) {
        if (cliente) {
            try {
                await cliente.query('ROLLBACK');
            } catch (erroRollback) {
                console.error('Erro ao desfazer sincronização da sacola:', erroRollback);
            }
        }

        console.error('Erro ao sincronizar a sacola:', erro);
        return res.status(500).json({
            erro: 'Não foi possível sincronizar a sacola.'
        });
    } finally {
        if (cliente) {
            cliente.release();
        }
    }
}

async function criarPedido(req, res) {
    const enderecoId = validarId(req.body && req.body.enderecoId);
    const formaPagamentoId = validarId(req.body && req.body.formaPagamentoId);

    if (!enderecoId || !formaPagamentoId) {
        return res.status(400).json({
            erro: 'Selecione um endereço e uma forma de pagamento válidos.'
        });
    }

    let cliente;

    try {
        cliente = await pool.connect();
        await cliente.query('BEGIN');

        const endereco = await cliente.query(
            `SELECT id
             FROM enderecos
             WHERE id = $1 AND usuario_id = $2
             FOR KEY SHARE`,
            [enderecoId, req.usuarioAutenticado.id]
        );
        if (endereco.rowCount === 0) {
            await cliente.query('ROLLBACK');
            return res.status(404).json({
                erro: 'O endereço selecionado não foi encontrado.'
            });
        }

        const formaPagamento = await cliente.query(
            `SELECT id, nome
             FROM formas_pagamento
             WHERE id = $1
             FOR KEY SHARE`,
            [formaPagamentoId]
        );
        if (formaPagamento.rowCount === 0) {
            await cliente.query('ROLLBACK');
            return res.status(400).json({
                erro: 'A forma de pagamento selecionada não está disponível.'
            });
        }

        const resumo = await carregarCarrinho(
            cliente,
            req.usuarioAutenticado.id,
            true
        );
        if (resumo.erro) {
            await cliente.query('ROLLBACK');
            return res.status(500).json({ erro: resumo.erro });
        }
        if (resumo.itens.length === 0) {
            await cliente.query('ROLLBACK');
            return res.status(400).json({
                erro: 'A sacola está vazia.'
            });
        }

        const pedido = await cliente.query(
            `INSERT INTO pedidos (
                usuario_id, endereco_id, forma_pagamento_id, valor_total
             )
             VALUES ($1, $2, $3, $4)
             RETURNING id, valor_total`,
            [
                req.usuarioAutenticado.id,
                enderecoId,
                formaPagamentoId,
                formatarTotal(resumo.totalCentavos)
            ]
        );
        const pedidoId = pedido.rows[0].id;

        for (const item of resumo.itens) {
            await cliente.query(
                `INSERT INTO itens_pedido (
                    pedido_id, produto_id, nome_item, quantidade, preco_unitario
                 )
                 VALUES ($1, $2, $3, $4, $5)`,
                [
                    pedidoId,
                    item.produtoId,
                    item.nome,
                    item.quantidade,
                    item.preco
                ]
            );
        }

        await cliente.query(
            `DELETE FROM itens_carrinho
             WHERE carrinho_id = (
                SELECT id FROM carrinhos WHERE usuario_id = $1
             )`,
            [req.usuarioAutenticado.id]
        );

        await cliente.query('COMMIT');
        return res.status(201).json({
            pedido: pedido.rows[0],
            formaPagamento: formaPagamento.rows[0].nome
        });
    } catch (erro) {
        if (cliente) {
            try {
                await cliente.query('ROLLBACK');
            } catch (erroRollback) {
                console.error('Erro ao desfazer criação do pedido:', erroRollback);
            }
        }

        console.error('Erro ao criar pedido:', erro);
        return res.status(500).json({
            erro: 'Não foi possível registrar o pedido.'
        });
    } finally {
        if (cliente) {
            cliente.release();
        }
    }
}

module.exports = {
    listarFormasPagamento,
    obterCarrinho,
    sincronizarCarrinho,
    criarPedido
};
