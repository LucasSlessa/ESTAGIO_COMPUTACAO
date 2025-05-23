
let chart = null;

function toggleTheme() {
    document.body.classList.toggle('dark-mode');
    atualizarGrafico();
}

function toggleWeights() {
    const weightsContainer = document.getElementById('weightsContainer');
    const isPonderada = document.getElementById('ponderada').checked;
    weightsContainer.classList.toggle('visible', isPonderada);
    if (isPonderada) {
        updateWeights();
    }
}

function updateWeights() {
    const numPeriodos = parseInt(document.getElementById('periodos').value) || 0;
    const weightInputs = document.getElementById('weightInputs');
    weightInputs.innerHTML = '';

    if (numPeriodos > 0) {
        for (let i = 0; i < numPeriodos; i++) {
            const input = document.createElement('input');
            input.type = 'number';
            input.step = '0.1';
            input.value = (numPeriodos - i);
            input.className = 'weight-input';
            input.placeholder = `Peso ${i + 1}`;
            weightInputs.appendChild(input);
        }
    }
}

function atualizarPeriodos() {
    const tbody = document.querySelector('#dadosTabela tbody');
    const periodos = Array.from(tbody.children);
    
    periodos.forEach((linha, index) => {
        linha.cells[0].textContent = `${index + 1}`;
    });
}
function adicionarLinha() {
    const tbody = document.querySelector('#dadosTabela tbody');
    const novaLinha = document.createElement('tr');
    const periodo = tbody.children.length + 1;
    
    novaLinha.innerHTML = ` 
        <td>${periodo}</td>
        <td><input type="number" step="0.01" onchange="atualizarGrafico()"></td>
        <td>-</td>
        <td>-</td>
        <td><button class="delete-btn" onclick="excluirLinha(this)">Excluir</button></td>
    `;
    
    novaLinha.setAttribute('draggable', 'true');
    novaLinha.addEventListener('dragstart', (event) => {
        event.dataTransfer.setData('text', event.target.rowIndex);
    });
    
    novaLinha.addEventListener('dragover', (event) => {
        event.preventDefault(); // Necessário para permitir o drop
    });
    
    novaLinha.addEventListener('drop', (event) => {
        event.preventDefault();
        const origem = event.dataTransfer.getData('text');
        const destino = event.target.closest('tr').rowIndex;
        
        if (origem !== destino) {
            const rows = Array.from(tbody.rows);
            const origemRow = rows[origem - 1];
            const destinoRow = rows[destino - 1];
            
            if (origem < destino) {
                tbody.insertBefore(origemRow, destinoRow.nextSibling);
            } else {
                tbody.insertBefore(origemRow, destinoRow);
            }
            
            atualizarPeriodos();
            atualizarGrafico();
        }
    });

    tbody.appendChild(novaLinha);
    atualizarGrafico();
}


function calcularMediaMovel() {
    const numPeriodos = parseInt(document.getElementById('periodos').value);
    if (!numPeriodos || numPeriodos < 1) {
        alert('Por favor, insira um número válido de períodos');
        return;
    }

    const isPonderada = document.getElementById('ponderada').checked;
    const tbody = document.querySelector('#dadosTabela tbody');
    const valores = Array.from(tbody.querySelectorAll('input')).map(input => parseFloat(input.value));

    for (let i = 0; i < valores.length; i++) {
        if (i < numPeriodos - 1) {
            tbody.children[i].children[2].textContent = '-';
            continue;
        }

        let mediaMovel;
        if (isPonderada) {
            const pesos = Array.from(document.querySelectorAll('.weight-input')).map(input => parseFloat(input.value));
            const somaPesos = pesos.reduce((acc, val) => acc + val, 0);
            
            let somaPonderada = 0;
            for (let j = 0; j < numPeriodos; j++) {
                somaPonderada += valores[i - j] * pesos[j];
            }
            mediaMovel = somaPonderada / somaPesos;
        } else {
            mediaMovel = valores
                .slice(i - numPeriodos + 1, i + 1)
                .reduce((acc, val) => acc + val, 0) / numPeriodos;
        }

        tbody.children[i].children[2].textContent = mediaMovel.toFixed(2);
    }

    atualizarGrafico();
}

function calcularSazonalidade() {
    const tbody = document.querySelector('#dadosTabela tbody');
    const valores = Array.from(tbody.querySelectorAll('input')).map(input => parseFloat(input.value));
    const numPeriodos = valores.length;

    if (numPeriodos < 4) {
        alert('É necessário pelo menos 4 períodos para calcular a sazonalidade.');
        return;
    }

    // Calcular a demanda média anual
    const demandaTotal = valores.reduce((acc, val) => acc + val, 0);
    const demandaMediaAnual = demandaTotal / numPeriodos;

    // Calcular coeficientes de sazonalidade
    const coefSazonalidade = valores.map(val => val / demandaMediaAnual);
    const coefSazonalidadeMedia = coefSazonalidade.reduce((acc, val) => acc + val, 0) / numPeriodos;

    // Ajustar as previsões
    for (let i = 0; i < valores.length; i++) {
        const ajusteSazonal = coefSazonalidade[i] * coefSazonalidadeMedia;
        tbody.children[i].children[3].textContent = ajusteSazonal.toFixed(2);
    }

    atualizarGrafico();
}

function limparDados() {
    document.querySelector('#dadosTabela tbody').innerHTML = '';
    document.getElementById('periodos').value = '';
    document.getElementById('weightInputs').innerHTML = '';
    if (chart) {
        chart.destroy();
        chart = null;
    }
}
function excluirLinha(button) {
    const linha = button.closest('tr');
    const tbody = document.querySelector('#dadosTabela tbody');
    tbody.removeChild(linha);
    atualizarGrafico();
    atualizarPeriodos();
}

function calcularTendenciaLinear(valores) {
    const n = valores.length;
    const x = Array.from({ length: n }, (_, i) => i + 1); // Cria um array de índices (1, 2, 3,...)
    const y = valores;

    // Calcular a média de x e y
    const meanX = x.reduce((acc, val) => acc + val, 0) / n;
    const meanY = y.reduce((acc, val) => acc + val, 0) / n;

    // Calcular o coeficiente angular (m) e o coeficiente linear (b)
    let numerator = 0;
    let denominator = 0;
    for (let i = 0; i < n; i++) {
        numerator += (x[i] - meanX) * (y[i] - meanY);
        denominator += (x[i] - meanX) ** 2;
    }

    const m = numerator / denominator;  // Inclinação
    const b = meanY - m * meanX;        // Intercepto

    // Calcular os valores da linha de tendência
    const tendencia = x.map(xValue => m * xValue + b);
    
    return tendencia;
}

function atualizarGrafico() {
    const ctx = document.getElementById('grafico').getContext('2d');
    const tbody = document.querySelector('#dadosTabela tbody');
    
    const periodos = Array.from(tbody.children).map((row, index) => `Período ${index + 1}`);
    const valores = Array.from(tbody.querySelectorAll('input')).map(input => parseFloat(input.value) || 0);
    const medias = Array.from(tbody.children).map(row => {
        const mediaText = row.children[2].textContent;
        return mediaText === '-' ? null : parseFloat(mediaText);
    });
    const ajustes = Array.from(tbody.children).map(row => {
        const ajusteText = row.children[3].textContent;
        return ajusteText === '-' ? null : parseFloat(ajusteText);
    });

    // Calcular a tendência linear
    const tendenciaLinear = calcularTendenciaLinear(valores);

    if (chart) {
        chart.destroy();
    }

    chart = new Chart(ctx, {
        type: 'line',
        data: {
            labels: periodos,
            datasets: [
                {
                    label: 'Valores',
                    data: valores,
                    borderColor: '#007bff',
                    tension: 0.1
                },
                {
                    label: 'Média Móvel',
                    data: medias,
                    borderColor: '#28a745',
                    tension: 0.1
                },
                {
                    label: 'Ajuste Sazonal',
                    data: ajustes,
                    borderColor: '#ffc107',
                    tension: 0.1
                },
                {
                    label: 'Tendência Linear',
                    data: tendenciaLinear,
                    borderColor: '#dc3545', // Cor da linha de tendência
                    borderDash: [5, 5],    // Linha tracejada
                    tension: 0.1
                }
            ]
        }
    });
}

async function exportarParaPDF() {
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF();
    let y = 20;

    // Adiciona o logo da Univap no cabeçalho
    const logo = await fetch("https://upload.wikimedia.org/wikipedia/commons/thumb/0/0a/Universidade_do_Vale_do_Para%C3%ADba_logo.png/1200px-Universidade_do_Vale_do_Para%C3%ADba_logo.png")
        .then(response => response.blob())
        .then(blob => {
            return new Promise((resolve) => {
                const reader = new FileReader();
                reader.onload = function(event) {
                    resolve(event.target.result);
                };
                reader.readAsDataURL(blob);
            });
        });

    doc.addImage(logo, 'PNG', 10, 10, 30, 20); // Posição e tamanho do logo
    doc.setFontSize(16);
    doc.text("Relatório de Média Móvel e Ajuste Sazonal", 50, 20);
    doc.setFontSize(12);
    doc.text(`Data: ${new Date().toLocaleDateString()} ${new Date().toLocaleTimeString()}`, 50, 30);
    y += 20;

    // Linha de separação
    doc.line(10, y, 200, y);
    y += 10;

    // Cabeçalhos da tabela
    doc.setFontSize(12);
    const headers = Array.from(document.querySelectorAll("#dadosTabela thead th")).map(header => header.textContent);
    headers.forEach((header, index) => {
        doc.setFont("helvetica", "bold");
        doc.text(header, 10 + index * 40, y);
    });
    y += 10;

    // Dados das linhas da tabela
    const rows = Array.from(document.querySelectorAll("#dadosTabela tbody tr"));
    rows.forEach((row) => {
        const cells = Array.from(row.cells).map((cell, index) => {
            return index === 1 ? cell.querySelector("input").value : cell.textContent;
        });

        cells.forEach((cell, index) => {
            doc.setFont("helvetica", "normal");
            doc.text(cell || "-", 10 + index * 40, y);
        });
        y += 10;
    });

    // Adiciona o gráfico ao PDF
    const canvas = document.getElementById("grafico");
    const imgData = canvas.toDataURL("image/png");
    doc.addPage();
    doc.addImage(imgData, "PNG", 10, 20, 180, 90);

    // Salvar o arquivo PDF
    doc.save("Relatorio.pdf");
}



function exportarParaExcel() {
    const table = document.getElementById("dadosTabela");
    const wb = XLSX.utils.book_new();
    const ws_data = [];
    
    // Adicionar data e hora no Excel
    const dataHoraAtual = new Date();
    const diaHora = `${dataHoraAtual.toLocaleDateString()} ${dataHoraAtual.toLocaleTimeString()}`;
    ws_data.push([`Data e Hora: ${diaHora}`]);  // Linha com data e hora
    ws_data.push([]); // Linha em branco
    
    // Extrair cabeçalhos
    const headers = Array.from(table.querySelectorAll("thead th")).map(th => th.textContent.trim());
    ws_data.push(headers);
    
    // Extrair dados das linhas
    const rows = Array.from(table.querySelectorAll("tbody tr"));
    rows.forEach(row => {
        const rowData = Array.from(row.cells).map((cell, index) => {
            // Pega o valor do input se for a coluna "Valor" (índice 1)
            if (index === 1 && cell.querySelector("input")) {
                return cell.querySelector("input").value;
            }
            // Para outras colunas, pega o texto diretamente
            return cell.textContent.trim();
        });
        ws_data.push(rowData);
    });
    

    const ws = XLSX.utils.aoa_to_sheet(ws_data);
    XLSX.utils.book_append_sheet(wb, ws, "Relatorio");
    
    // Gerar e salvar o arquivo Excel
    XLSX.writeFile(wb, "Relatorio.xlsx");
}



document.addEventListener('DOMContentLoaded', function() {
    const dataHoraAtual = new Date();
    const diaHora = `${dataHoraAtual.toLocaleDateString()} ${dataHoraAtual.toLocaleTimeString()}`;

    const calendarInput = document.getElementById('calendar');
    if (calendarInput) {
        const currentDate = new Date().toISOString().split('T')[0]; 
        calendarInput.value = currentDate;
    }
});




