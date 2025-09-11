<?php
header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: POST, GET, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    exit(0);
}

$dataFile = '../data/contador.json';

// Função para ler o contador atual
function lerContador($arquivo) {
    if (!file_exists($arquivo)) {
        return [
            'totalEtiquetas' => 19452,
            'ultimaAtualizacao' => date('c'),
            'breakdown' => [
                'placas' => 0,
                'caixa' => 0,
                'avulso' => 0,
                'enderec' => 0,
                'transfer' => 0,
                'termo' => 0
            ],
            'historico' => []
        ];
    }
    
    $conteudo = file_get_contents($arquivo);
    return json_decode($conteudo, true);
}

// Função para salvar o contador
function salvarContador($arquivo, $dados) {
    return file_put_contents($arquivo, json_encode($dados, JSON_PRETTY_PRINT));
}

if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    // Incrementar contador
    $input = json_decode(file_get_contents('php://input'), true);
    $quantidade = isset($input['quantidade']) ? (int)$input['quantidade'] : 1;
    $tipo = isset($input['tipo']) ? $input['tipo'] : 'geral';
    
    $dados = lerContador($dataFile);
    $dados['totalEtiquetas'] += $quantidade;
    $dados['ultimaAtualizacao'] = date('c');
    
    // Atualizar breakdown se especificado
    if (isset($dados['breakdown'][$tipo])) {
        $dados['breakdown'][$tipo] += $quantidade;
    }
    
    // Adicionar ao histórico
    $dados['historico'][] = [
        'data' => date('c'),
        'quantidade' => $quantidade,
        'tipo' => $tipo,
        'total' => $dados['totalEtiquetas']
    ];
    
    // Manter apenas os últimos 100 registros do histórico
    if (count($dados['historico']) > 100) {
        $dados['historico'] = array_slice($dados['historico'], -100);
    }
    
    if (salvarContador($dataFile, $dados)) {
        echo json_encode([
            'sucesso' => true,
            'total' => $dados['totalEtiquetas'],
            'incremento' => $quantidade
        ]);
    } else {
        http_response_code(500);
        echo json_encode(['erro' => 'Erro ao salvar dados']);
    }
    
} else {
    // Retornar contador atual
    $dados = lerContador($dataFile);
    echo json_encode([
        'total' => $dados['totalEtiquetas'],
        'ultimaAtualizacao' => $dados['ultimaAtualizacao'],
        'breakdown' => $dados['breakdown']
    ]);
}
?>