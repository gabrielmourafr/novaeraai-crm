// Exporta uma lista de objetos pra CSV e dispara o download no navegador.
// Usa ";" como separador (padrão do Excel em pt-BR) e escapa aspas/quebras de linha.
export function exportToCsv(filename: string, rows: Record<string, string | number | null | undefined>[]) {
  if (rows.length === 0) return;

  const headers = Object.keys(rows[0]);
  const escape = (value: unknown) => {
    const str = value === null || value === undefined ? "" : String(value);
    if (str.includes(";") || str.includes('"') || str.includes("\n")) {
      return `"${str.replace(/"/g, '""')}"`;
    }
    return str;
  };

  const lines = [
    headers.join(";"),
    ...rows.map((row) => headers.map((h) => escape(row[h])).join(";")),
  ];
  const csvContent = "﻿" + lines.join("\r\n"); // BOM pro Excel reconhecer acentuação

  const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename.endsWith(".csv") ? filename : `${filename}.csv`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
