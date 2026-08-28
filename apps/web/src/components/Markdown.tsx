'use client';
import { useMemo } from 'react';

const escape = (s: string) =>
  s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');

const inline = (s: string) =>
  escape(s)
    .replace(/`([^`]+)`/g, '<code class="px-1 py-0.5 bg-gray-100 rounded text-[11px] text-gray-800 font-mono">$1</code>')
    .replace(/\*\*\*(.*?)\*\*\*/g, '<strong><em>$1</em></strong>')
    .replace(/\*\*(.*?)\*\*/g, '<strong class="font-semibold text-current">$1</strong>')
    .replace(/__(.*?)__/g, '<strong class="font-semibold text-current">$1</strong>')
    .replace(/\*(.*?)\*/g, '<em>$1</em>')
    .replace(/_(.*?)_/g, '<em>$1</em>')
    .replace(/\[(.*?)\]\((.*?)\)/g, '<a href="$2" target="_blank" rel="noopener noreferrer" class="text-primary-600 hover:underline">$1</a>');

function renderBlock(block: string): string {
  const lines = block.split('\n').filter((l) => l.trim() !== '');
  if (lines.length === 0) return '';

  const isTable = lines.every((l) => l.trim().startsWith('|') && l.trim().endsWith('|'));
  if (isTable) {
    const isSep = (l: string) =>
      l.replace(/\|/g, '').replace(/[-:]/g, '').replace(/\s/g, '') === '';
    const hasHeader = lines.length >= 2 && isSep(lines[1]);
    const headerRow = lines[0];
    const bodyRows = hasHeader ? lines.slice(2) : lines.slice(1);
    const cell = (c: string, tag = 'td') =>
      `<${tag} class="${
        tag === 'th'
          ? 'border-b-2 border-gray-300 p-2 text-left font-semibold text-gray-900 bg-gray-50'
          : 'border-b border-gray-100 p-2 text-gray-700'
      }">${inline(c.trim())}</${tag}>`;
    const rowHtml = (row: string, tag = 'td') =>
      '<tr>' +
      row
        .split('|')
        .slice(1, -1)
        .map((c) => cell(c, tag))
        .join('') +
      '</tr>';
    const thead = '<thead>' + rowHtml(headerRow, 'th') + '</thead>';
    const tbody =
      '<tbody>' + bodyRows.map((r) => rowHtml(r, 'td')).join('') + '</tbody>';
    return `<table class="w-full text-sm border-collapse my-2 border border-gray-200 rounded-lg overflow-hidden">${
      hasHeader ? thead : ''
    }${tbody}</table>`;
  }

  const isList = lines.every(
    (l) =>
      l.trim().startsWith('- ') ||
      l.trim().startsWith('* ') ||
      /^\d+\. /.test(l.trim()) ||
      l.trim() === ''
  );
  if (isList && lines.some((l) => l.trim() !== '')) {
    const isOl = lines.every((l) => /^\d+\. /.test(l.trim()) || l.trim() === '');
    const items = lines
      .filter((l) => l.trim() !== '')
      .map((l) => {
        const text = l.replace(/^[-*\d]+\.\s*/, '').trim();
        return `<li class="mb-1 last:mb-0">${inline(text)}</li>`;
      })
      .join('');
    return isOl
      ? `<ol class="list-decimal pl-5 my-2 space-y-1">${items}</ol>`
      : `<ul class="list-disc pl-5 my-2 space-y-1">${items}</ul>`;
  }

  return lines
    .map((line) => {
      const h = line.match(/^(#{1,6})\s+(.*)$/);
      if (h) {
        const level = h[1].length;
        const H = `h${level}`;
        const sizes = ['text-xl', 'text-lg', 'text-base', 'text-sm', 'text-sm', 'text-xs'];
        return `<${H} class="${sizes[level - 1]} font-bold mt-3 mb-1">${inline(h[2])}</${H}>`;
      }
      return `<p class="mb-2 last:mb-0 leading-relaxed">${inline(line)}</p>`;
    })
    .join('');
}

function renderMarkdown(text: string): string {
  if (!text) return '';
  const codeBlocks: string[] = [];
  const withoutCode = text.replace(/```([\s\S]*?)```/g, (match, code) => {
    codeBlocks.push(code);
    return `__CODE_BLOCK_${codeBlocks.length - 1}__`;
  });

  const blocks = withoutCode.split(/\n\s*\n/);
  const html = blocks
    .map((block) => {
      const codeMatch = block.trim().match(/^__CODE_BLOCK_(\d+)__$/);
      if (codeMatch) {
        const idx = parseInt(codeMatch[1], 10);
        const code = escape(codeBlocks[idx]);
        return `<pre class="bg-gray-900 text-gray-100 p-3 rounded-lg text-xs overflow-x-auto my-2"><code>${code}</code></pre>`;
      }
      return renderBlock(block);
    })
    .join('');

  return html;
}

export default function Markdown({ content }: { content: string }) {
  const html = useMemo(() => renderMarkdown(content), [content]);
  return <div className="markdown-body" dangerouslySetInnerHTML={{ __html: html }} />;
}
