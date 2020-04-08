#!/usr/bin/env node
const recast = require("recast");
const {
    identifier: id,
    expressionStatement,
    memberExpression,
    assignmentExpression,
    arrowFunctionExpression
} = recast.types.builders;
const fs = require('fs');
const path = require('path');

const options = process.argv.slice(2);

if (options.length === 0 || options.includes('-h') || options.includes('--help')) {
    console.log(`
        采用commonjs规则，将.js文件内所有函数修改为导出形式。
        选项： -r 或 --rewrite可直接覆盖原有文件
    `);
    process.exit(0);
}

let rewriteMode = options.includes('-r') || options.includes('--rewrite');

console.log(options)
const clearFileArg = options.filter((item) => {
    return !['-r', '--rewrite', '-h', '--help'].includes(item);
});

let filename = clearFileArg[0];

const writeASTFile = function (ast, filename, rewriteMode) {
    const newCode = recast.print(ast).code;
    if (!rewriteMode) {
        filename = filename.split('.').slice(0, -1).concat(['export', 'js']).join('.');
    }

    fs.writeFileSync(path.join(process.cwd(), filename), newCode);
};

recast.run(function (ast, printSource) {
    let funcIds = [];
    recast.types.visit(ast, {
        visitFunctionDeclaration(path) {
            const node = path.node;
            const funcName = node.id;
            const params = node.params;
            const body = node.body;

            funcIds.push(funcName.name);
            const rep = expressionStatement(assignmentExpression('=', memberExpression(id('exports'), funcName), arrowFunctionExpression(params, body)));

            path.replace(rep);
            return false;
        }
    });

    recast.types.visit(ast, {
        visitCallExpression(path) {
            const node = path.node;
            if (funcIds.includes(node.callee.name)) {
                node.callee = memberExpression(id('exports'), node.callee);
            }
            return false;
        }
    });

    writeASTFile(ast, filename, rewriteMode);
});

