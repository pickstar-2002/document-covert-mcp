import * as fs from 'fs-extra';
import * as path from 'path';
import * as mammoth from 'mammoth';
import { marked } from 'marked';
import { ConversionOptions, ConversionResult, IFormatConverter, SupportedFormat } from '../../types/index';

export class WordConverter implements IFormatConverter {
  canConvert(inputFormat: SupportedFormat, outputFormat: SupportedFormat): boolean {
    return inputFormat === 'docx' || outputFormat === 'docx';
  }

  async convert(
    inputPath: string,
    outputPath: string,
    options: ConversionOptions = {}
  ): Promise<ConversionResult> {
    const startTime = Date.now();
    
    try {
      const inputBuffer = await fs.readFile(inputPath);
      let content: string;

      // 从Word文档提取内容
      if (inputPath.endsWith('.docx')) {
        try {
          const result = await mammoth.convertToHtml({ buffer: inputBuffer });
          content = result.value;
          console.log('Mammoth conversion successful, content length:', content.length);
        } catch (error) {
          console.error('Mammoth conversion failed:', error);
          throw new Error(`Word文档转换失败: ${error instanceof Error ? error.message : String(error)}`);
        }
      } else {
        content = inputBuffer.toString('utf-8');
      }

      // 根据输出格式处理内容
      const outputExt = outputPath.split('.').pop()?.toLowerCase();
      let processedContent: string;

      switch (outputExt) {
        case 'md':
          processedContent = this.htmlToMarkdown(content, path.dirname(outputPath));
          break;
        case 'html':
          processedContent = content;
          break;
        case 'txt':
          processedContent = this.htmlToText(content);
          break;
        default:
          processedContent = content;
      }

      await fs.writeFile(outputPath, processedContent, 'utf-8');

      const inputStats = await fs.stat(inputPath);
      const outputStats = await fs.stat(outputPath);

      return {
        success: true,
        inputPath,
        outputPath,
        inputFormat: 'docx',
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
        inputFormat: 'docx',
        outputFormat: 'txt',
        inputSize: 0,
        outputSize: 0,
        duration: Date.now() - startTime,
        error: error instanceof Error ? error.message : String(error),
      };
    }
  }

  private htmlToMarkdown(html: string, outputDir: string): string {
    let markdown = html;
    
    // 预处理：合并被分页分割的代码块
    markdown = this.mergeFragmentedCodeBlocks(markdown);
    
    // 处理图片 - 优先处理，避免被其他规则影响
    markdown = this.processImages(markdown, outputDir);
    
    // 处理标题
    markdown = markdown.replace(/<h([1-6])[^>]*>(.*?)<\/h[1-6]>/gi, (match, level, content) => {
      const hashes = '#'.repeat(parseInt(level));
      const cleanContent = content.replace(/<[^>]+>/g, '').trim();
      return `${hashes} ${cleanContent}\n\n`;
    });
    
    // 处理表格 - 改进版本
    markdown = markdown.replace(/<table[^>]*>(.*?)<\/table>/gis, (match, tableContent) => {
      return this.convertTableToMarkdown(tableContent);
    });
    
    // 处理代码块 - 改进版本，支持语言标识，确保代码块完整性
    markdown = markdown.replace(/<pre[^>]*><code[^>]*class="language-([^"]*)"[^>]*>(.*?)<\/code><\/pre>/gis, (match, language, code) => {
      const cleanCode = this.cleanCodeContent(code);
      if (!cleanCode.trim()) {
        return ''; // 跳过空的代码块
      }
      return `\`\`\`${language}\n${cleanCode}\n\`\`\`\n\n`;
    });
    
    // 处理普通代码块 - 确保代码块完整性
    markdown = markdown.replace(/<pre[^>]*><code[^>]*>(.*?)<\/code><\/pre>/gis, (match, code) => {
      const cleanCode = this.cleanCodeContent(code);
      if (!cleanCode.trim()) {
        return ''; // 跳过空的代码块
      }
      
      // 尝试检测代码语言
      const detectedLanguage = this.detectCodeLanguage(cleanCode);
      const languageTag = detectedLanguage ? detectedLanguage : '';
      
      return `\`\`\`${languageTag}\n${cleanCode}\n\`\`\`\n\n`;
    });
    
    // 处理行内代码
    markdown = markdown.replace(/<code[^>]*>(.*?)<\/code>/gi, '`$1`');
    
    // 处理列表
    markdown = markdown.replace(/<ul[^>]*>(.*?)<\/ul>/gis, (match, listContent) => {
      return this.convertListToMarkdown(listContent, false);
    });
    
    markdown = markdown.replace(/<ol[^>]*>(.*?)<\/ol>/gis, (match, listContent) => {
      return this.convertListToMarkdown(listContent, true);
    });
    
    // 处理链接
    markdown = markdown.replace(/<a[^>]*href="([^"]*)"[^>]*>(.*?)<\/a>/gi, '[$2]($1)');
    
    // 处理段落
    markdown = markdown.replace(/<p[^>]*>(.*?)<\/p>/gi, '$1\n\n');
    
    // 处理粗体和斜体
    markdown = markdown.replace(/<strong[^>]*>(.*?)<\/strong>/gi, '**$1**');
    markdown = markdown.replace(/<b[^>]*>(.*?)<\/b>/gi, '**$1**');
    markdown = markdown.replace(/<em[^>]*>(.*?)<\/em>/gi, '*$1*');
    markdown = markdown.replace(/<i[^>]*>(.*?)<\/i>/gi, '*$1*');
    
    // 处理换行
    markdown = markdown.replace(/<br\s*\/?>/gi, '\n');
    
    // 清理剩余的HTML标签
    markdown = markdown.replace(/<[^>]+>/g, '');
    
    // 处理HTML实体
    markdown = markdown.replace(/&nbsp;/g, ' ');
    markdown = markdown.replace(/&amp;/g, '&');
    markdown = markdown.replace(/&lt;/g, '<');
    markdown = markdown.replace(/&gt;/g, '>');
    markdown = markdown.replace(/&quot;/g, '"');
    markdown = markdown.replace(/&#39;/g, "'");
    
    // 清理多余的空行
    markdown = markdown.replace(/\n\n\n+/g, '\n\n');
    
    return markdown.trim();
  }

  private processImages(html: string, outputDir: string): string {
    // 创建images目录
    const imagesDir = path.join(outputDir, 'images');
    fs.ensureDirSync(imagesDir);
    
    // 处理带alt属性的图片
    html = html.replace(/<img[^>]*src="([^"]*)"[^>]*alt="([^"]*)"[^>]*>/gi, (match, src, alt) => {
      if (src.startsWith('data:image/')) {
        const imageInfo = this.extractBase64Image(src, alt, imagesDir);
        return `![${alt || '图片'}](./images/${imageInfo.filename})\n\n`;
      }
      return `![${alt || '图片'}](${src})\n\n`;
    });
    
    // 处理没有alt属性的图片
    html = html.replace(/<img[^>]*src="([^"]*)"[^>]*>/gi, (match, src) => {
      if (src.startsWith('data:image/')) {
        const imageInfo = this.extractBase64Image(src, '图片', imagesDir);
        return `![图片](./images/${imageInfo.filename})\n\n`;
      }
      return `![图片](${src})\n\n`;
    });
    
    return html;
  }

  private extractBase64Image(base64Data: string, alt: string, imagesDir: string): { filename: string; data: Buffer } {
    // 提取图片格式和数据
    const matches = base64Data.match(/^data:image\/([a-zA-Z]+);base64,(.+)$/);
    if (!matches) {
      return { filename: 'image.png', data: Buffer.from('') };
    }
    
    const [, format, data] = matches;
    const timestamp = Date.now();
    const filename = `image_${timestamp}.${format}`;
    const buffer = Buffer.from(data, 'base64');
    
    try {
      // 保存图片到文件系统
      const imagePath = path.join(imagesDir, filename);
      fs.writeFileSync(imagePath, buffer);
      console.log(`图片已保存: ${imagePath}`);
    } catch (error) {
      console.error(`保存图片失败: ${error}`);
    }
    
    return { filename, data: buffer };
  }

  private convertTableToMarkdown(tableHtml: string): string {
    const rows: string[] = [];
    const headerMatch = tableHtml.match(/<thead[^>]*>(.*?)<\/thead>/is);
    const bodyMatch = tableHtml.match(/<tbody[^>]*>(.*?)<\/tbody>/is);
    
    let tableContent = tableHtml;
    if (headerMatch || bodyMatch) {
      tableContent = (headerMatch ? headerMatch[1] : '') + (bodyMatch ? bodyMatch[1] : '');
    }
    
    const rowMatches = tableContent.match(/<tr[^>]*>(.*?)<\/tr>/gis);
    if (!rowMatches) return '\n';
    
    let isFirstRow = true;
    for (const rowMatch of rowMatches) {
      const cellMatches = rowMatch.match(/<t[hd][^>]*>(.*?)<\/t[hd]>/gis);
      if (cellMatches) {
        const cells = cellMatches.map(cell => 
          cell.replace(/<t[hd][^>]*>(.*?)<\/t[hd]>/is, '$1')
              .replace(/<[^>]+>/g, '')
              .replace(/\n/g, ' ')
              .trim()
        );
        rows.push('| ' + cells.join(' | ') + ' |');
        
        if (isFirstRow) {
          rows.push('| ' + cells.map(() => '---').join(' | ') + ' |');
          isFirstRow = false;
        }
      }
    }
    
    return '\n' + rows.join('\n') + '\n\n';
  }

  private convertListToMarkdown(listHtml: string, ordered: boolean): string {
    const itemMatches = listHtml.match(/<li[^>]*>(.*?)<\/li>/gis);
    if (!itemMatches) return '';
    
    const items = itemMatches.map((item, index) => {
      const content = item.replace(/<li[^>]*>(.*?)<\/li>/is, '$1')
                         .replace(/<[^>]+>/g, '')
                         .replace(/\n/g, ' ')
                         .trim();
      const prefix = ordered ? `${index + 1}. ` : '- ';
      return prefix + content;
    });
    
    return '\n' + items.join('\n') + '\n\n';
  }

  private htmlToText(html: string): string {
    let text = html;
    
    // 处理标题 - 添加适当的间距和装饰
    text = text.replace(/<h([1-6])[^>]*>(.*?)<\/h[1-6]>/gi, (match, level, content) => {
      const cleanContent = content.replace(/<[^>]+>/g, '').trim();
      const levelNum = parseInt(level);
      const decoration = levelNum === 1 ? '=' : levelNum === 2 ? '-' : '';
      const decorationLine = decoration ? '\n' + decoration.repeat(Math.min(cleanContent.length, 50)) : '';
      return `\n\n${cleanContent}${decorationLine}\n`;
    });
    
    // 处理表格
    text = text.replace(/<table[^>]*>(.*?)<\/table>/gis, (match, tableContent) => {
      return this.convertTableToText(tableContent);
    });
    
    // 处理代码块
    text = text.replace(/<pre[^>]*><code[^>]*>(.*?)<\/code><\/pre>/gis, (match, code) => {
      const cleanCode = code.replace(/<[^>]+>/g, '')
        .replace(/&lt;/g, '<')
        .replace(/&gt;/g, '>')
        .replace(/&amp;/g, '&')
        .replace(/&quot;/g, '"')
        .replace(/&#39;/g, "'");
      return `\n代码块:\n${'─'.repeat(40)}\n${cleanCode.trim()}\n${'─'.repeat(40)}\n\n`;
    });
    
    // 处理行内代码
    text = text.replace(/<code[^>]*>(.*?)<\/code>/gi, '`$1`');
    
    // 处理列表
    text = text.replace(/<ul[^>]*>(.*?)<\/ul>/gis, (match, listContent) => {
      return this.convertListToText(listContent, false);
    });
    
    text = text.replace(/<ol[^>]*>(.*?)<\/ol>/gis, (match, listContent) => {
      return this.convertListToText(listContent, true);
    });
    
    // 处理段落
    text = text.replace(/<p[^>]*>(.*?)<\/p>/gi, '$1\n\n');
    
    // 处理粗体和斜体
    text = text.replace(/<strong[^>]*>(.*?)<\/strong>/gi, '**$1**');
    text = text.replace(/<b[^>]*>(.*?)<\/b>/gi, '**$1**');
    text = text.replace(/<em[^>]*>(.*?)<\/em>/gi, '*$1*');
    text = text.replace(/<i[^>]*>(.*?)<\/i>/gi, '*$1*');
    
    // 处理换行
    text = text.replace(/<br\s*\/?>/gi, '\n');
    
    // 清理剩余的HTML标签
    text = text.replace(/<[^>]+>/g, '');
    
    // 处理HTML实体
    text = text.replace(/&nbsp;/g, ' ');
    text = text.replace(/&amp;/g, '&');
    text = text.replace(/&lt;/g, '<');
    text = text.replace(/&gt;/g, '>');
    text = text.replace(/&quot;/g, '"');
    text = text.replace(/&#39;/g, "'");
    
    // 清理多余的空行
    text = text.replace(/\n\n\n+/g, '\n\n');
    
    return text.trim();
  }

  private convertTableToText(tableHtml: string): string {
    const rows: string[] = [];
    const headerMatch = tableHtml.match(/<thead[^>]*>(.*?)<\/thead>/is);
    const bodyMatch = tableHtml.match(/<tbody[^>]*>(.*?)<\/tbody>/is);
    
    let tableContent = tableHtml;
    if (headerMatch || bodyMatch) {
      tableContent = (headerMatch ? headerMatch[1] : '') + (bodyMatch ? bodyMatch[1] : '');
    }
    
    const rowMatches = tableContent.match(/<tr[^>]*>(.*?)<\/tr>/gis);
    if (!rowMatches) return '\n表格内容为空\n\n';
    
    let maxWidths: number[] = [];
    const processedRows: string[][] = [];
    
    // 第一遍：收集所有单元格内容并计算最大宽度
    for (const rowMatch of rowMatches) {
      const cellMatches = rowMatch.match(/<t[hd][^>]*>(.*?)<\/t[hd]>/gis);
      if (cellMatches) {
        const cells = cellMatches.map(cell => 
          cell.replace(/<t[hd][^>]*>(.*?)<\/t[hd]>/is, '$1')
              .replace(/<[^>]+>/g, '')
              .replace(/\n/g, ' ')
              .trim()
        );
        processedRows.push(cells);
        
        cells.forEach((cell, index) => {
          const width = this.getDisplayWidth(cell);
          maxWidths[index] = Math.max(maxWidths[index] || 0, width);
        });
      }
    }
    
    // 第二遍：格式化输出
    rows.push('\n表格:');
    rows.push('┌' + maxWidths.map(w => '─'.repeat(w + 2)).join('┬') + '┐');
    
    processedRows.forEach((cells, rowIndex) => {
      const paddedCells = cells.map((cell, cellIndex) => {
        const width = maxWidths[cellIndex] || 0;
        const displayWidth = this.getDisplayWidth(cell);
        const padding = width - displayWidth;
        return ' ' + cell + ' '.repeat(padding + 1);
      });
      rows.push('│' + paddedCells.join('│') + '│');
      
      if (rowIndex === 0 && processedRows.length > 1) {
        rows.push('├' + maxWidths.map(w => '─'.repeat(w + 2)).join('┼') + '┤');
      }
    });
    
    rows.push('└' + maxWidths.map(w => '─'.repeat(w + 2)).join('┴') + '┘');
    
    return rows.join('\n') + '\n\n';
  }

  private convertListToText(listHtml: string, ordered: boolean): string {
    const itemMatches = listHtml.match(/<li[^>]*>(.*?)<\/li>/gis);
    if (!itemMatches) return '';
    
    const items = itemMatches.map((item, index) => {
      const content = item.replace(/<li[^>]*>(.*?)<\/li>/is, '$1')
                         .replace(/<[^>]+>/g, '')
                         .replace(/\n/g, ' ')
                         .trim();
      const prefix = ordered ? `${index + 1}. ` : '• ';
      return '  ' + prefix + content;
    });
    
    return '\n' + items.join('\n') + '\n\n';
  }

  private getDisplayWidth(str: string): number {
    // 简单的中文字符宽度计算
    let width = 0;
    for (const char of str) {
      width += /[\u4e00-\u9fff]/.test(char) ? 2 : 1;
    }
    return width;
  }

  /**
  /**
   * 合并被分页分割的代码块
   * Word文档分页会将完整的代码块分割成多个片段，这是导致代码块格式异常的根本原因
   */
  private mergeFragmentedCodeBlocks(html: string): string {
    console.log('开始处理分页分割的代码块...');
    
    // 首先处理分页符和页面间隔
    html = this.removePageBreaks(html);
    
    // 匹配所有代码块（包括可能的片段）
    const codeBlockPattern = /<pre[^>]*><code[^>]*>(.*?)<\/code><\/pre>/gis;
    let matches = Array.from(html.matchAll(codeBlockPattern));
    
    if (matches.length <= 1) {
      return html;
    }

    console.log(`发现 ${matches.length} 个代码块，开始分析是否需要合并...`);
    
    let processedHtml = html;
    let mergeCount = 0;
    
    // 重新获取匹配项以确保索引正确
    let i = 0;
    while (i < matches.length - 1) {
      const currentMatch = matches[i];
      const nextMatch = matches[i + 1];
      
      if (!currentMatch || !nextMatch) {
        i++;
        continue;
      }

      // 获取两个代码块之间的内容
      const currentEnd = currentMatch.index! + currentMatch[0].length;
      const nextStart = nextMatch.index!;
      const betweenContent = processedHtml.substring(currentEnd, nextStart);
      
      // 检查是否应该合并这两个代码块
      if (this.shouldMergeCodeBlocks(betweenContent, currentMatch[1], nextMatch[1])) {
        console.log(`合并代码块 ${i} 和 ${i+1}`);
        
        // 合并代码内容
        const mergedCode = this.mergeCodeContent(currentMatch[1], nextMatch[1]);
        const mergedBlock = `<pre><code>${mergedCode}</code></pre>`;
        
        // 替换HTML中的两个代码块
        const beforeFirst = processedHtml.substring(0, currentMatch.index!);
        const afterSecond = processedHtml.substring(nextMatch.index! + nextMatch[0].length);
        
        processedHtml = beforeFirst + mergedBlock + afterSecond;
        mergeCount++;
        
        // 重新匹配更新后的HTML
        matches = Array.from(processedHtml.matchAll(codeBlockPattern));
        // 不增加i，因为我们合并了两个块，需要重新检查当前位置
      } else {
        i++;
      }
    }
    
    console.log(`代码块合并完成，共合并了 ${mergeCount} 个片段`);
    return processedHtml;
  }

  /**
   * 移除Word文档中的分页符和页面间隔
   * 这些是导致代码块被异常分割的主要原因
   */
  private removePageBreaks(html: string): string {
    // 移除各种分页相关的标签和内容
    return html
      // 移除分页符
      .replace(/<w:br\s+w:type="page"[^>]*>/gi, '')
      .replace(/<br[^>]*style="[^"]*page-break[^"]*"[^>]*>/gi, '')
      .replace(/<div[^>]*style="[^"]*page-break[^"]*"[^>]*>.*?<\/div>/gis, '')
      
      // 移除页面分隔符
      .replace(/<hr[^>]*style="[^"]*page-break[^"]*"[^>]*>/gi, '')
      .replace(/<div[^>]*class="[^"]*page-break[^"]*"[^>]*>.*?<\/div>/gis, '')
      
      // 移除空的段落和div（通常是分页产生的）
      .replace(/<p[^>]*>\s*<\/p>/gi, '')
      .replace(/<div[^>]*>\s*<\/div>/gi, '')
      
      // 移除多余的换行和空白
      .replace(/\n\s*\n\s*\n/g, '\n\n')
      .replace(/\s{3,}/g, ' ')
      
      // 移除Word特有的分页标记
      .replace(/<!--\s*PageBreak\s*-->/gi, '')
      .replace(/<span[^>]*style="[^"]*mso-[^"]*"[^>]*>.*?<\/span>/gis, '');
  }

  /**
   * 判断是否应该合并两个代码块
   * 重点关注分页导致的分割情况
   */
  private shouldMergeCodeBlocks(betweenContent: string, code1: string, code2: string): boolean {
    // 清理中间内容
    const cleanBetween = betweenContent
      .replace(/<[^>]+>/g, '')
      .replace(/&nbsp;/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
    
    console.log(`两个代码块之间的内容: "${cleanBetween}" (长度: ${cleanBetween.length})`);
    
    // 如果中间内容很少，很可能是分页分割
    if (cleanBetween.length <= 50) {
      console.log('中间内容很少，判断为分页分割');
      return true;
    }
    
    // 检查中间内容是否只包含分页相关的内容
    if (this.isPageBreakContent(cleanBetween)) {
      console.log('中间内容为分页相关，判断为分页分割');
      return true;
    }
    
    const cleanCode1 = this.cleanCodeContent(code1).trim();
    const cleanCode2 = this.cleanCodeContent(code2).trim();
    
    // 如果任一代码块为空，不合并
    if (!cleanCode1 || !cleanCode2) {
      return false;
    }
    
    // 检查代码的连续性
    if (this.hasCodeContinuity(cleanCode1, cleanCode2)) {
      console.log('代码具有连续性，判断为分页分割');
      return true;
    }
    
    // 检查是否是同一种编程语言且具有相似的缩进
    if (this.isSameProgrammingLanguage(cleanCode1, cleanCode2) && 
        this.hasSimilarIndentation(cleanCode1, cleanCode2)) {
      console.log('同种语言且缩进相似，判断为分页分割');
      return true;
    }
    
    // 检查是否是连续的代码结构（如类定义、函数定义等）
    if (this.isContinuousCodeStructure(cleanCode1, cleanCode2)) {
      console.log('检测到连续的代码结构，判断为分页分割');
      return true;
    }
    
    return false;
  }

  /**
   * 检查内容是否为分页相关内容
   */
  private isPageBreakContent(content: string): boolean {
    const pageBreakKeywords = [
      '第', '页', 'page', '章', 'chapter', '节', 'section',
      '续', '接上页', '接下页', '见下页', '转下页'
    ];
    
    return pageBreakKeywords.some(keyword => 
      content.toLowerCase().includes(keyword.toLowerCase())
    );
  }

  /**
   * 检查代码的连续性
   * 重点检查被分页分割的代码特征
   */
  private hasCodeContinuity(code1: string, code2: string): boolean {
    // 检查第一个代码块是否以不完整的语句结束
    const incompleteEndPatterns = [
      /\{\s*$/, /\(\s*$/, /\[\s*$/, // 开括号
      /,\s*$/, /\+\s*$/, /-\s*$/, /\*\s*$/, /\/\s*$/, // 操作符
      /=\s*$/, /:\s*$/, /\.\s*$/, // 赋值和访问
      /if\s*$/, /else\s*$/, /for\s*$/, /while\s*$/, // 控制结构
      /def\s*$/, /function\s*$/, /class\s*$/, // 定义关键字
      /import\s*$/, /from\s*$/, /return\s*$/, // 其他关键字
      /\\\s*$/, // 行继续符
    ];
    
    // 检查第二个代码块是否以完整语句的延续开始
    const continuationStartPatterns = [
      /^\s*\}/, /^\s*\)/, /^\s*\]/, // 闭括号
      /^\s*[a-zA-Z_$][\w$]*/, // 标识符
      /^\s*\d+/, // 数字
      /^\s*["']/, // 字符串
      /^\s*[+\-*/=<>!&|]/, // 操作符
      /^\s*(and|or|not|in|is)\b/, // Python逻辑操作符
      /^\s*(&&|\|\||!|==|!=|<=|>=)/, // JavaScript/C风格操作符
    ];
    
    const hasIncompleteEnd = incompleteEndPatterns.some(pattern => pattern.test(code1));
    const hasContinuationStart = continuationStartPatterns.some(pattern => pattern.test(code2));
    
    return hasIncompleteEnd || hasContinuationStart;
  }

  /**
   * 检查是否有相似的缩进模式
   */
  private hasSimilarIndentation(code1: string, code2: string): boolean {
    const getIndentationPattern = (code: string): number[] => {
      const lines = code.split('\n').filter(line => line.trim().length > 0);
      return lines.map(line => {
        const match = line.match(/^(\s*)/);
        return match ? match[1].length : 0;
      });
    };
    
    const indent1 = getIndentationPattern(code1);
    const indent2 = getIndentationPattern(code2);
    
    if (indent1.length === 0 || indent2.length === 0) return false;
    
    // 检查最后几行和开始几行的缩进是否相似
    const lastIndent1 = indent1[indent1.length - 1];
    const firstIndent2 = indent2[0];
    
    // 允许一定的缩进差异（比如4个空格以内）
    return Math.abs(lastIndent1 - firstIndent2) <= 4;
  }

  /**
   * 合并代码内容
   * 智能处理缩进和换行，确保代码块的完整性
   */
  private mergeCodeContent(code1: string, code2: string): string {
    const cleanCode1 = this.cleanCodeContent(code1);
    const cleanCode2 = this.cleanCodeContent(code2);
    
    if (!cleanCode1.trim()) return cleanCode2;
    if (!cleanCode2.trim()) return cleanCode1;
    
    // 检查第一个代码块是否以完整语句结束
    const endsWithCompleteStatement = this.endsWithCompleteStatement(cleanCode1);
    const startsWithCompleteStatement = this.startsWithCompleteStatement(cleanCode2);
    
    // 根据代码结构决定连接方式
    let separator = '';
    
    if (endsWithCompleteStatement && startsWithCompleteStatement) {
      // 两个都是完整语句，用双换行分隔
      separator = '\n\n';
    } else if (!endsWithCompleteStatement || !startsWithCompleteStatement) {
      // 其中一个不完整，直接连接或用单换行
      separator = cleanCode1.endsWith('\n') ? '' : '\n';
    } else {
      // 默认用单换行连接
      separator = '\n';
    }
    
    const result = cleanCode1.replace(/\n+$/, '') + separator + cleanCode2.replace(/^\n+/, '');
    
    console.log(`合并代码块: ${cleanCode1.split('\n').length}行 + ${cleanCode2.split('\n').length}行 = ${result.split('\n').length}行`);
    
    return result;
  }

  /**
   * 检查代码是否以完整语句结束
   */
  private endsWithCompleteStatement(code: string): boolean {
    const trimmedCode = code.trim();
    const lastLine = trimmedCode.split('\n').pop()?.trim() || '';
    
    // 完整语句的特征
    const completeStatementPatterns = [
      /[;}]\s*$/,           // 以分号或大括号结束
      /^\s*#.*$/,           // 注释行
      /^\s*\/\/.*$/,        // 单行注释
      /^\s*\/\*.*\*\/\s*$/, // 块注释
      /:\s*$/,              // Python风格的冒号结束
      /^\s*pass\s*$/,       // Python pass语句
      /^\s*return\b/,       // return语句
      /^\s*break\s*$/,      // break语句
      /^\s*continue\s*$/,   // continue语句
    ];
    
    return completeStatementPatterns.some(pattern => pattern.test(lastLine));
  }

  /**
   * 检查代码是否以完整语句开始
   */
  private startsWithCompleteStatement(code: string): boolean {
    const trimmedCode = code.trim();
    const firstLine = trimmedCode.split('\n')[0]?.trim() || '';
    
    // 完整语句开始的特征
    const completeStatementStartPatterns = [
      /^(def|class|if|for|while|try|with|import|from)\b/, // Python关键字
      /^(function|const|let|var|if|for|while|try|class)\b/, // JavaScript关键字
      /^(public|private|protected|static|final)\b/, // Java修饰符
      /^\w+\s*[=:]/,        // 变量赋值
      /^#/,                 // 注释
      /^\/\//,              // 单行注释
      /^\/\*/,              // 块注释开始
    ];
    
    return completeStatementStartPatterns.some(pattern => pattern.test(firstLine));
  }

  /**
   * 检查是否是连续的代码结构
   */
  private isContinuousCodeStructure(code1: string, code2: string): boolean {
    // 检查第一个代码块是否以未完成的结构结束
    const incompleteStructures = [
      /class\s+\w+.*:\s*$/,           // Python类定义
      /def\s+\w+.*:\s*$/,             // Python函数定义
      /function\s+\w+.*{\s*$/,        // JavaScript函数
      /if\s*\(.*\)\s*{\s*$/,          // 条件语句
      /for\s*\(.*\)\s*{\s*$/,         // 循环语句
      /while\s*\(.*\)\s*{\s*$/,       // while循环
      /try\s*{\s*$/,                  // try块
      /catch\s*\(.*\)\s*{\s*$/,       // catch块
      /else\s*{\s*$/,                 // else块
      /{\s*$/,                        // 单独的开括号
    ];
    
    // 检查第二个代码块是否以结构的延续开始
    const continuationStructures = [
      /^\s*}/,                        // 闭括号
      /^\s*else/,                     // else语句
      /^\s*elif/,                     // elif语句
      /^\s*except/,                   // except语句
      /^\s*finally/,                  // finally语句
      /^\s*catch/,                    // catch语句
      /^\s*[a-zA-Z_$][\w$]*\s*[=:]/,  // 变量赋值或属性定义
    ];
    
    const hasIncompleteStructure = incompleteStructures.some(pattern => pattern.test(code1));
    const hasContinuation = continuationStructures.some(pattern => pattern.test(code2));
    
    return hasIncompleteStructure || hasContinuation;
  }

  /**
   * 清理代码内容
   * 保持原有的换行和缩进结构，确保代码块的完整性
   */
  private cleanCodeContent(code: string): string {
    return code
      .replace(/<[^>]+>/g, '')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&amp;/g, '&')
      .replace(/&quot;/g, '"')
      .replace(/&#39;/g, "'")
      .replace(/&nbsp;/g, ' ')
      .replace(/&apos;/g, "'")
      // 保持换行结构，但移除过多的空行
      .replace(/\n{4,}/g, '\n\n\n')
      // 移除行首行尾的多余空白，但保持缩进
      .replace(/^[ \t]+$/gm, '')
      // 确保代码块不以空行开始或结束
      .replace(/^\n+/, '')
      .replace(/\n+$/, '');
  }

  /**
   * 检测代码语言
   */
  private detectCodeLanguage(code: string): string {
    const languagePatterns = {
      python: [
        /def\s+\w+/, /class\s+\w+/, /import\s+\w+/, /from\s+\w+/, 
        /if\s+__name__/, /print\s*\(/, /:\s*$/, /^\s*#/m
      ],
      javascript: [
        /function\s+\w+/, /const\s+\w+/, /let\s+\w+/, /var\s+\w+/, 
        /=>\s*{?/, /console\.log/, /\/\//, /\/\*.*\*\//
      ],
      java: [
        /public\s+class/, /private\s+\w+/, /public\s+static/, 
        /import\s+java/, /System\.out/, /\/\//
      ],
      csharp: [
        /public\s+class/, /private\s+\w+/, /using\s+System/, 
        /namespace\s+\w+/, /Console\.WriteLine/, /\/\//
      ],
      css: [
        /\w+\s*{/, /:\s*[^;]+;/, /@media/, /\.[\w-]+/, 
        /\/\*.*\*\//, /#[\w-]+/
      ],
      html: [
        /<\w+[^>]*>/, /<\/\w+>/, /<!DOCTYPE/, /<html/, 
        /<!--.*-->/, /class\s*=/
      ],
      sql: [
        /SELECT\s+/i, /FROM\s+/i, /WHERE\s+/i, /INSERT\s+/i, 
        /UPDATE\s+/i, /DELETE\s+/i, /CREATE\s+/i, /--/
      ],
      bash: [
        /#!/, /\$\w+/, /echo\s+/, /cd\s+/, /ls\s+/, /grep\s+/
      ],
      json: [
        /^\s*{/, /^\s*\[/, /"[\w-]+"\s*:/, /^\s*"[\w-]+"/
      ]
    };
    
    for (const [lang, patterns] of Object.entries(languagePatterns)) {
      if (patterns.some(pattern => pattern.test(code))) {
        return lang;
      }
    }
    
    return '';
  }

  /**
   * 检查是否是同一种编程语言
   * 增强的语言检测逻辑
   */
  private isSameProgrammingLanguage(code1: string, code2: string): boolean {
    const lang1 = this.detectCodeLanguage(code1);
    const lang2 = this.detectCodeLanguage(code2);
    
    if (lang1 && lang2 && lang1 === lang2) {
      console.log(`检测到相同的编程语言: ${lang1}`);
      return true;
    }
    
    return false;
  }
}