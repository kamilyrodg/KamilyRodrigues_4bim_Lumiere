const { Pool } = require('pg');
const path = require('path');
require('dotenv').config({
    path: path.join(__dirname, '../.env')
});

const pool = new Pool({
    host: process.env.DB_HOST,
    port: process.env.DB_PORT,
    database: process.env.DB_NAME,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD
});

pool.on('error', erro => {
    console.error('Erro em uma conexão ociosa do PostgreSQL:', erro);
});

module.exports = pool;