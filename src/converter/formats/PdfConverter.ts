import { jsPDF } from 'jspdf';
import * as fs from 'fs';

export class PdfConverter {
  async convert(inputPath: string, outputPath: string): Promise<void> {
    const content = fs.readFileSync(inputPath, 'utf-8');
    
    // 检查输入内容类型
    if (content.includes('<html') || content.includes('<!DOCTYPE')) {
      // HTML内容，转换为PDF
      await this.generatePdfFromHtml(content, outputPath);
    } else {
      // 纯文本内容，转换为PDF
      await this.generatePdfFromText(content, outputPath);
    }
  }

  private async generatePdfFromHtml(htmlContent: string, outputPath: string): Promise<void> {
    console.log('调用generatePdfFromHtml，内容长度:', htmlContent.length);
    
    try {
      // 创建PDF文档
      const doc = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4'
      });

      // 将HTML转换为纯文本
      let textContent = this.htmlToText(htmlContent);
      
      // 限制内容长度，避免栈溢出
      if (textContent.length > 50000) {
        textContent = textContent.substring(0, 50000) + '\n\n[内容过长，已截断...]';
      }

      // 简化的分页处理
      const lines = textContent.split('\n');
      const pageHeight = 280;
      const lineHeight = 6;
      const margin = 20;
      let yPosition = margin;

      // 设置字体
      doc.setFont('helvetica');
      doc.setFontSize(10);

      for (let i = 0; i < lines.length && i < 1000; i++) { // 限制最大行数
        let line = lines[i];
        
        // 限制每行长度
        if (line.length > 80) {
          line = line.substring(0, 80) + '...';
        }
        
        // 检查是否需要新页面
        if (yPosition > pageHeight - margin) {
          doc.addPage();
          yPosition = margin;
        }
        
        try {
          // 添加文本，处理特殊字符
          const cleanLine = this.cleanTextForPdf(line);
          doc.text(cleanLine, margin, yPosition);
          yPosition += lineHeight;
        } catch (error) {
          // 如果某行出错，跳过该行
          console.warn('跳过问题行:', line.substring(0, 50));
          yPosition += lineHeight;
        }
      }

      // 保存PDF
      const pdfBuffer = doc.output('arraybuffer');
      fs.writeFileSync(outputPath, Buffer.from(pdfBuffer));
      
      console.log('jsPDF生成成功，PDF大小:', pdfBuffer.byteLength);
      console.log('PDF生成完成，大小:', pdfBuffer.byteLength);
      
    } catch (error) {
      console.error('PDF生成失败:', error);
      throw error;
    }
  }

  private async generatePdfFromText(textContent: string, outputPath: string): Promise<void> {
    const doc = new jsPDF();
    
    // 限制内容长度
    if (textContent.length > 50000) {
      textContent = textContent.substring(0, 50000) + '\n\n[内容过长，已截断...]';
    }
    
    const lines = textContent.split('\n');
    const pageHeight = 280;
    const lineHeight = 6;
    const margin = 20;
    let yPosition = margin;

    doc.setFont('helvetica');
    doc.setFontSize(10);

    for (let i = 0; i < lines.length && i < 1000; i++) {
      let line = lines[i];
      
      if (line.length > 80) {
        line = line.substring(0, 80) + '...';
      }
      
      if (yPosition > pageHeight - margin) {
        doc.addPage();
        yPosition = margin;
      }
      
      try {
        const cleanLine = this.cleanTextForPdf(line);
        doc.text(cleanLine, margin, yPosition);
        yPosition += lineHeight;
      } catch (error) {
        yPosition += lineHeight;
      }
    }

    const pdfBuffer = doc.output('arraybuffer');
    fs.writeFileSync(outputPath, Buffer.from(pdfBuffer));
  }

  private htmlToText(html: string): string {
    let text = html;
    
    // 简化的HTML到文本转换
    text = text.replace(/<h[1-6][^>]*>(.*?)<\/h[1-6]>/gi, '\n\n$1\n');
    text = text.replace(/<p[^>]*>(.*?)<\/p>/gi, '$1\n\n');
    text = text.replace(/<li[^>]*>(.*?)<\/li>/gi, '• $1\n');
    text = text.replace(/<[uo]l[^>]*>(.*?)<\/[uo]l>/gis, '$1\n');
    
    // 处理表格 - 简化版本
    text = text.replace(/<table[^>]*>(.*?)<\/table>/gis, '\n--- 表格内容 ---\n$1\n--- 表格结束 ---\n\n');
    text = text.replace(/<tr[^>]*>(.*?)<\/tr>/gis, '$1\n');
    text = text.replace(/<t[hd][^>]*>(.*?)<\/t[hd]>/gis, '$1 | ');
    
    // 处理代码块
    text = text.replace(/<pre[^>]*><code[^>]*>(.*?)<\/code><\/pre>/gis, '\n--- 代码 ---\n$1\n--- 代码结束 ---\n\n');
    text = text.replace(/<code[^>]*>(.*?)<\/code>/gi, '`$1`');
    
    // 处理强调
    text = text.replace(/<strong[^>]*>(.*?)<\/strong>/gi, '**$1**');
    text = text.replace(/<em[^>]*>(.*?)<\/em>/gi, '*$1*');
    
    // 处理链接
    text = text.replace(/<a[^>]*href="([^"]*)"[^>]*>(.*?)<\/a>/gi, '$2 ($1)');
    
    // 处理换行
    text = text.replace(/<br\s*\/?>/gi, '\n');
    
    // 清理HTML标签
    text = text.replace(/<[^>]+>/g, '');
    
    // 处理HTML实体
    text = text.replace(/&nbsp;/g, ' ');
    text = text.replace(/&amp;/g, '&');
    text = text.replace(/&lt;/g, '<');
    text = text.replace(/&gt;/g, '>');
    text = text.replace(/&quot;/g, '"');
    text = text.replace(/&#39;/g, "'");
    
    // 清理多余空行
    text = text.replace(/\n\n\n+/g, '\n\n');
    
    return text.trim();
  }

  private cleanTextForPdf(text: string): string {
    // 清理文本，移除可能导致PDF生成问题的字符
    return text
      .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, '') // 移除控制字符
      .replace(/[\uFEFF]/g, '') // 移除BOM
      .trim();
  }
}