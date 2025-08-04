import * as fs from 'fs-extra';
import { marked } from 'marked';
import { ConversionOptions, ConversionResult, IFormatConverter, SupportedFormat } from '../../types/index';

export class TextConverter implements IFormatConverter {
  canConvert(inputFormat: SupportedFormat, outputFormat: SupportedFormat): boolean {
    return inputFormat === 'txt' || outputFormat === 'txt';
  }

  async convert(
    inputPath: string,
    outputPath: string,
    options: ConversionOptions = {}
  ): Promise<ConversionResult> {
    const startTime = Date.now();
    
    try {
      const inputContent = await fs.readFile(inputPath, 'utf-8');
      let processedContent: string;

      const outputExt = outputPath.split('.').pop()?.toLowerCase();

      switch (outputExt) {
        case 'md':
          processedContent = this.textToMarkdown(inputContent);
          break;
        case 'html':
          processedContent = this.textToHtml(inputContent);
          break;
        case 'txt':
          processedContent = inputContent;
          break;
        default:
          processedContent = inputContent;
      }

      await fs.writeFile(outputPath, processedContent, 'utf-8');

      const inputStats = await fs.stat(inputPath);
      const outputStats = await fs.stat(outputPath);

      return {
        success: true,
        inputPath,
        outputPath,
        inputFormat: 'txt',
        outputFormat: outputExt as SupportedFormat,
        inputSize: inputStats.size,
        outputSize: outputStats.size,
        duration: Date.now() - startTime,
      };

    } catch (error) {
      return {
        success: false,
        inputPath,
        outputPath,
        inputFormat: 'txt',
        outputFormat: 'txt',
        inputSize: 0,
        outputSize: 0,
        duration: Date.now() - startTime,
        error: error instanceof Error ? error.message : String(error),
      };
    }
  }

  private textToMarkdown(text: string): string {
    const lines = text.split('\n');
    const result: string[] = [];

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      const trimmed = line.trim();
      
      if (!trimmed) {
        result.push('');
        continue;
      }

      // 检测可能的标题（短行，全大写或首字母大写）
      if (trimmed.length < 80 && 
          (trimmed === trimmed.toUpperCase() || 
           this.isLikelyTitle(trimmed))) {
        
        // 根据上下文判断标题级别
        const level = this.getTitleLevel(trimmed, i, lines);
        result.push(`${'#'.repeat(level)} ${trimmed}`);
        result.push('');
      } else if (trimmed.startsWith('- ') || trimmed.startsWith('* ')) {
        // 保持列表格式
        result.push(trimmed);
      } else if (/^\d+\./.test(trimmed)) {
        // 保持有序列表格式
        result.push(trimmed);
      } else {
        // 普通段落
        result.push(trimmed);
        
        // 如果下一行为空，添加段落分隔
        if (i + 1 < lines.length && !lines[i + 1].trim()) {
          result.push('');
        }
      }
    }

    return result.join('\n');
  }

  private textToHtml(text: string): string {
    const lines = text.split('\n');
    const result: string[] = [
      '<!DOCTYPE html>',
      '<html lang="zh-CN">',
      '<head>',
      '    <meta charset="UTF-8">',
      '    <meta name="viewport" content="width=device-width, initial-scale=1.0">',
      '    <title>转换的文档</title>',
      '</head>',
      '<body>'
    ];

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      const trimmed = line.trim();
      
      if (!trimmed) {
        continue;
      }

      // 检测可能的标题
      if (trimmed.length < 80 && 
          (trimmed === trimmed.toUpperCase() || 
           this.isLikelyTitle(trimmed))) {
        
        const level = this.getTitleLevel(trimmed, i, lines);
        result.push(`    <h${level}>${this.escapeHtml(trimmed)}</h${level}>`);
      } else if (trimmed.startsWith('- ') || trimmed.startsWith('* ')) {
        // 处理无序列表
        if (i === 0 || !lines[i-1].trim().startsWith('-') && !lines[i-1].trim().startsWith('*')) {
          result.push('    <ul>');
        }
        result.push(`        <li>${this.escapeHtml(trimmed.substring(2))}</li>`);
        if (i === lines.length - 1 || (!lines[i+1].trim().startsWith('-') && !lines[i+1].trim().startsWith('*'))) {
          result.push('    </ul>');
        }
      } else if (/^\d+\./.test(trimmed)) {
        // 处理有序列表
        if (i === 0 || !/^\d+\./.test(lines[i-1].trim())) {
          result.push('    <ol>');
        }
        const content = trimmed.replace(/^\d+\.\s*/, '');
        result.push(`        <li>${this.escapeHtml(content)}</li>`);
        if (i === lines.length - 1 || !/^\d+\./.test(lines[i+1].trim())) {
          result.push('    </ol>');
        }
      } else {
        // 普通段落
        result.push(`    <p>${this.escapeHtml(trimmed)}</p>`);
      }
    }

    result.push('</body>');
    result.push('</html>');
    
    return result.join('\n');
  }

  private isLikelyTitle(text: string): boolean {
    // 检查是否像标题：首字母大写，没有句号结尾，相对较短
    return /^[A-Z\u4e00-\u9fa5]/.test(text) && 
           !text.endsWith('.') && 
           !text.endsWith('。') &&
           text.length < 80;
  }

  private getTitleLevel(text: string, index: number, lines: string[]): number {
    // 简单的标题级别判断逻辑
    if (text === text.toUpperCase()) {
      return 1; // 全大写可能是一级标题
    }
    
    if (index === 0) {
      return 1; // 第一行可能是标题
    }
    
    return 2; // 默认二级标题
  }

  private escapeHtml(text: string): string {
    return text
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }
}