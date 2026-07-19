import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { formatCurrency } from './utils';

export function generateAnnualCashBookPdf(
  year: number,
  rows: any[],
  bookNumber: string
) {
  try {
    const doc = new jsPDF({ orientation: 'landscape' });
    let runningBalance = 0;
    
    // Group rows by month
    const rowsByMonth: Record<number, any[]> = {};
    rows.forEach(r => {
      const d = new Date(r.date + 'T12:00:00');
      const m = d.getMonth() + 1;
      if (!rowsByMonth[m]) rowsByMonth[m] = [];
      rowsByMonth[m].push(r);
    });

    const tableData: any[] = [];
    const monthlyStats: any[] = [];
    let accumulatedRc = 0;
    let accumulatedTab = 0;
    let totalAnnualBalance = 0;
    
    for (let m = 1; m <= 12; m++) {
      const monthRows = rowsByMonth[m];
      if (!monthRows || monthRows.length === 0) continue;
      
      let monthInflow = 0;
      let monthOutflow = 0;
      let monthRc = 0;
      let monthTab = 0;
      runningBalance = 0;

      monthRows.forEach(r => {
        monthInflow += r.inflow || 0;
        monthOutflow += r.outflow || 0;
        if (r.esp === 'RC') monthRc += r.inflow || 0;
        if (r.esp === 'TAB') monthTab += r.inflow || 0;
        
        runningBalance += (r.inflow || 0) - (r.outflow || 0);
        
        let formattedDate = r.date;
        try {
          formattedDate = format(new Date(r.date + 'T12:00:00'), 'dd/MM/yyyy');
        } catch (e) { }
        
        tableData.push([
          formattedDate,
          r.esp || '',
          r.description || '',
          r.inflow > 0 ? formatCurrency(r.inflow) : '-',
          r.outflow > 0 ? formatCurrency(r.outflow) : '-',
          formatCurrency(runningBalance)
        ]);
      });
      
      accumulatedRc += monthRc;
      accumulatedTab += monthTab;
      totalAnnualBalance += runningBalance;

      // Add monthly total row
      tableData.push([
        { 
          content: `Total referente ao mês de ${format(new Date(year, m - 1, 1), 'MMMM/yyyy', { locale: ptBR })}`, 
          colSpan: 3, 
          styles: { halign: 'right', fontStyle: 'bold', fillColor: [230, 230, 230] } 
        },
        { content: formatCurrency(monthInflow), styles: { fontStyle: 'bold', fillColor: [230, 230, 230] } },
        { content: formatCurrency(monthOutflow), styles: { fontStyle: 'bold', fillColor: [230, 230, 230] } },
        { content: formatCurrency(runningBalance), styles: { fontStyle: 'bold', fillColor: [230, 230, 230] } }
      ]);
      
      monthlyStats.push({
        month: m,
        rc: monthRc,
        tab: monthTab,
        inflow: monthInflow,
        outflow: monthOutflow,
        balance: runningBalance
      });
    }

    let pageNumber = 1;

    autoTable(doc, {
      startY: 15,
      head: [['DATA', 'ESP', 'DESCRIÇÃO', 'ENTRADA', 'SAIDA', 'SALDO']],
      body: tableData,
      theme: 'plain',
      styles: { 
        fontSize: 8, 
        cellPadding: 1.5,
        lineColor: [200, 200, 200],
        lineWidth: 0.1
      },
      headStyles: { 
        fillColor: [240, 240, 240], 
        textColor: [0, 0, 0], 
        fontStyle: 'bold', 
        halign: 'center' 
      },
      columnStyles: {
        0: { halign: 'center', cellWidth: 20 },
        1: { halign: 'center', cellWidth: 10 },
        2: { halign: 'left' },
        3: { halign: 'right', cellWidth: 30 },
        4: { halign: 'right', cellWidth: 30 },
        5: { halign: 'right', cellWidth: 30 },
      },
      didDrawPage: function (data) {
        doc.setFontSize(11);
        doc.setFont("helvetica", "bold");
        const headerY = 10;
        doc.text(`LIVRO ${bookNumber}   -   ANO ${year}`, data.settings.margin.left, headerY);
        doc.text("SERVIÇO DISTRITAL DO UBERABA", doc.internal.pageSize.width / 2, headerY, { align: 'center' });
        doc.text(`CNPJ 75.213.181/0001-33          Folha: ${pageNumber}`, doc.internal.pageSize.width - data.settings.margin.right, headerY, { align: 'right' });
        
        doc.setFontSize(10);
        doc.setFont("helvetica", "normal");
        const footerY = doc.internal.pageSize.height - 10;
        doc.text("AGENTE DELEGADO\nFRANCISCO JOSE BARBOSA NOBRE", data.settings.margin.left, footerY, { align: 'left' });
        doc.text("AVENIDA SENADOR SALGADO FILHO, 2368\nGUABIROTUBA - CURITIBA - PR", doc.internal.pageSize.width / 2, footerY, { align: 'center' });
        doc.text("Telefone: 41 - 3371-2100\ne-mail: cartorio@cartoriouberaba.com.br", doc.internal.pageSize.width - data.settings.margin.right, footerY, { align: 'right' });
        pageNumber++;
      },
      margin: { top: 15, bottom: 15 }
    });

    // Statistical table
    doc.addPage();
    
    doc.setFontSize(14);
    doc.setFont("helvetica", "bold");
    doc.text(`Ano ${year}`, doc.internal.pageSize.width / 2, 20, { align: 'center' });
    
    const statsBody: any[] = [];
    let totalInflow = 0;
    let totalOutflow = 0;
    let totalRc = 0;
    let totalTab = 0;
    
    let trimInflow = 0;
    let trimOutflow = 0;
    
    for (let quarter = 0; quarter < 4; quarter++) {
      let trimSumBalance = 0;
      let trimSumBalanceForPrint = 0;
      let hasDataInQuarter = false;

      for (let monthInQ = 1; monthInQ <= 3; monthInQ++) {
        const m = quarter * 3 + monthInQ;
        const stat = monthlyStats.find(s => s.month === m);
        
        if (stat) {
          trimSumBalance += stat.balance;
          trimSumBalanceForPrint += stat.balance;
          hasDataInQuarter = true;
        }
      }

      for (let monthInQ = 1; monthInQ <= 3; monthInQ++) {
        const m = quarter * 3 + monthInQ;
        const stat = monthlyStats.find(s => s.month === m);
        const monthName = format(new Date(year, m - 1, 1), 'MMMM', { locale: ptBR });
        
        const row: any[] = [
          { content: monthName.charAt(0).toUpperCase() + monthName.slice(1), styles: { halign: 'right', fontStyle: 'bold', fillColor: [230, 230, 230] } }
        ];

        if (stat) {
          totalInflow += stat.inflow;
          totalOutflow += stat.outflow;
          totalRc += stat.rc;
          totalTab += stat.tab;

          row.push(
            formatCurrency(stat.rc),
            formatCurrency(stat.tab),
            formatCurrency(stat.inflow),
            formatCurrency(stat.outflow),
            { content: formatCurrency(stat.balance), styles: { fontStyle: 'bold' } }
          );
        } else {
          row.push('-', '-', '-', '-', '-');
        }

        if (monthInQ === 1) {
          if (hasDataInQuarter) {
            row.push(
              { content: formatCurrency(trimSumBalanceForPrint / 3), rowSpan: 3, styles: { valign: 'middle', halign: 'center', fontStyle: 'bold' } },
              { content: formatCurrency(trimSumBalanceForPrint), rowSpan: 3, styles: { valign: 'middle', halign: 'center', fontStyle: 'bold' } }
            );
          } else {
            row.push(
              { content: '-', rowSpan: 3, styles: { valign: 'middle', halign: 'center' } },
              { content: '-', rowSpan: 3, styles: { valign: 'middle', halign: 'center' } }
            );
          }
        }
        
        statsBody.push(row);
      }
    }
    
    statsBody.push([
      { content: 'Total Anual', styles: { halign: 'right', fontStyle: 'bold', fillColor: [230, 230, 230] } },
      { content: formatCurrency(totalRc), styles: { fontStyle: 'bold', fillColor: [230, 230, 230] } },
      { content: formatCurrency(totalTab), styles: { fontStyle: 'bold', fillColor: [230, 230, 230] } },
      { content: formatCurrency(totalInflow), styles: { fontStyle: 'bold', fillColor: [230, 230, 230] } },
      { content: formatCurrency(totalOutflow), styles: { fontStyle: 'bold', fillColor: [230, 230, 230] } },
      { content: formatCurrency(totalAnnualBalance), styles: { fontStyle: 'bold', fillColor: [230, 230, 230] } },
      { content: '', colSpan: 2, styles: { fillColor: [255, 255, 255] } }
    ]);

    autoTable(doc, {
      startY: 30,
      head: [[
        '', 
        { content: 'Entrada Registro\nCivil', styles: { halign: 'center' } }, 
        { content: 'Entrada\nTabelionato', styles: { halign: 'center' } }, 
        { content: 'Soma das\nEntradas', styles: { halign: 'center' } }, 
        { content: 'Saida Mensal', styles: { halign: 'center' } }, 
        { content: 'Saldo Mensal', styles: { halign: 'center' } }, 
        { content: 'Saldo\nMédia Trimestral', styles: { halign: 'center' } }, 
        { content: 'Saldo\nSoma Trimestral', styles: { halign: 'center' } }
      ]],
      body: statsBody,
      theme: 'plain',
      styles: { 
        fontSize: 9, 
        cellPadding: 2,
        lineColor: [100, 100, 100],
        lineWidth: 0.1
      },
      headStyles: { 
        fillColor: [200, 200, 200], 
        textColor: [0, 0, 0], 
        fontStyle: 'bold', 
        valign: 'middle'
      },
      columnStyles: {
        1: { halign: 'right' },
        2: { halign: 'right' },
        3: { halign: 'right' },
        4: { halign: 'right' },
        5: { halign: 'right' },
        6: { halign: 'right' },
        7: { halign: 'right' },
      }
    });

    doc.save(`livro_caixa_anual_${year}.pdf`);
  } catch (err) {
    console.error("PDF Error:", err);
    alert("Houve um erro ao gerar o PDF anual. Verifique o console.");
  }
}

export function generateCashBookPdf(
  month: number, 
  year: number, 
  rows: any[], 
  totals: { inflow: number, outflow: number, rc: number, tab: number, balance: number },
  bookNumber: string,
  startPage: number
): { pageCount: number, blob: Blob } {
  try {
    const doc = new jsPDF({ orientation: 'landscape' });
    const title = `Livro Caixa - ${month.toString().padStart(2, '0')}/${year}`;
    
    let runningBalance = 0;
    const tableData = rows.map(r => {
      runningBalance += (r.inflow || 0) - (r.outflow || 0);
      let formattedDate = r.date;
      try {
        formattedDate = format(new Date(r.date + 'T12:00:00'), 'dd/MM/yyyy');
      } catch (e) { }
      return [
        formattedDate,
        r.esp || '',
        r.description || '',
        r.inflow > 0 ? formatCurrency(r.inflow) : '-',
        r.outflow > 0 ? formatCurrency(r.outflow) : '-',
        formatCurrency(runningBalance)
      ];
    });

    let pageNumber = startPage;

    autoTable(doc, {
      startY: 15,
      head: [['DATA', 'ESP', 'DESCRIÇÃO', 'ENTRADA', 'SAIDA', 'SALDO']],
      body: tableData,
      theme: 'plain',
      styles: { 
        fontSize: 8, 
        cellPadding: 1.5,
        lineColor: [200, 200, 200],
        lineWidth: 0.1
      },
      headStyles: { 
        fillColor: [240, 240, 240], 
        textColor: [0, 0, 0], 
        fontStyle: 'bold', 
        halign: 'center' 
      },
      columnStyles: {
        0: { halign: 'center', cellWidth: 20 },
        1: { halign: 'center', cellWidth: 10 },
        2: { halign: 'left' },
        3: { halign: 'right', cellWidth: 30 },
        4: { halign: 'right', cellWidth: 30 },
        5: { halign: 'right', cellWidth: 30 },
      },
      didDrawPage: function (data) {
        // Header
        doc.setFontSize(11);
        doc.setFont("helvetica", "bold");
        
        const headerY = 10;
        doc.text(`LIVRO ${bookNumber}   -   ANO ${year}`, data.settings.margin.left, headerY);
        
        doc.text("SERVIÇO DISTRITAL DO UBERABA", doc.internal.pageSize.width / 2, headerY, { align: 'center' });
        
        const rightText = `CNPJ 75.213.181/0001-33          Folha: ${pageNumber}`;
        doc.text(rightText, doc.internal.pageSize.width - data.settings.margin.right, headerY, { align: 'right' });
        
        // Footer
        doc.setFontSize(10);
        doc.setFont("helvetica", "normal");
        const footerY = doc.internal.pageSize.height - 10;
        
        doc.text("AGENTE DELEGADO\nFRANCISCO JOSE BARBOSA NOBRE", data.settings.margin.left, footerY, { align: 'left' });
        doc.text("AVENIDA SENADOR SALGADO FILHO, 2368\nGUABIROTUBA - CURITIBA - PR", doc.internal.pageSize.width / 2, footerY, { align: 'center' });
        
        doc.text("Telefone: 41 - 3371-2100\ne-mail: cartorio@cartoriouberaba.com.br", doc.internal.pageSize.width - data.settings.margin.right, footerY, { align: 'right' });
        
        pageNumber++;
      },
      margin: { top: 15, bottom: 15 }
    });

    let finalY = (doc as any).lastAutoTable.finalY + 10;
    
    // Add new page if no space for summary
    if (finalY > doc.internal.pageSize.height - 35) {
      doc.addPage();
      finalY = 25;
    }
    
    doc.setFontSize(10);
    doc.setFont("helvetica", "bold");
    
    // Fill a light background for the summary row to match the table
    doc.setFillColor(240, 240, 240);
    doc.rect(14, finalY - 5, doc.internal.pageSize.width - 28, 8, 'F');
    
    doc.text(`Total referente ao mês de ${format(new Date(year, month - 1, 1), 'MMMM/yyyy', { locale: ptBR })}`, 16, finalY);
    
    doc.text(formatCurrency(totals.inflow), doc.internal.pageSize.width - 14 - 30 - 30, finalY, { align: 'right' });
    doc.text(formatCurrency(totals.outflow), doc.internal.pageSize.width - 14 - 30, finalY, { align: 'right' });
    doc.text(formatCurrency(totals.balance), doc.internal.pageSize.width - 14, finalY, { align: 'right' });

    // Detailed summary lines below
    doc.setFontSize(9);
    doc.setFont("helvetica", "normal");
    
    doc.text(`Total de Entradas (RC): ${formatCurrency(totals.rc)}`, 16, finalY + 10);
    doc.text(`Total de Entradas (TAB): ${formatCurrency(totals.tab)}`, 16, finalY + 16);
    doc.text(`Total de Entradas: ${formatCurrency(totals.inflow)}`, 16, finalY + 22);
    doc.text(`Total de Saídas: ${formatCurrency(totals.outflow)}`, 16, finalY + 28);
    
    doc.setFont("helvetica", "bold");
    doc.text(`Saldo do Mês: ${formatCurrency(totals.balance)}`, 16, finalY + 36);

    const pdfBlob = doc.output('blob');
    doc.save(`livro_caixa_${year}_${month.toString().padStart(2, '0')}.pdf`);
    
    return {
      pageCount: pageNumber - startPage,
      blob: pdfBlob
    };
  } catch (err) {
    console.error("PDF Error:", err);
    alert("Houve um erro ao gerar o PDF. Verifique o console.");
    throw err;
  }
}
