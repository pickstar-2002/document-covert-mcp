import * as fs from 'fs-extra';
import * as path from 'path';
import * as mime from 'mime-types';
import { 
  SupportedFormat, 
  ConversionOptions, 
  ConversionResult, 
  DocumentValidation, 
  SupportedFormats,
  IDocumentConverter 
} from '../types/index';
import { WordConverter } from './formats/WordConverter';
import { MarkdownConverter } from './formats/MarkdownConverter';
import { PdfConverter } from './formats/PdfConverter';
import { HtmlConverter } from './formats/HtmlConverter';
import { TextConverter } from './formats/TextConverter';
import { logger } from '../utils/logger';

export class DocumentConverter implements IDocumentConverter {
  private converters: Map<string, any> = new Map();

  constructor() {
    this.initializeConverters();
  }

  private initializeConverters() {
    this.converters.set('docx', new WordConverter());
    this.converters.set('md', new MarkdownConverter());
    this.converters.set('pdf', new PdfConverter());
    this.converters.set('html', new HtmlConverter());
    this.converters.set('txt', new TextConverter());
  }

  async convertDocument(
    inputPath: string,
    outputPath: string,
    outputFormat: SupportedFormat,
    options: ConversionOptions = {}
  ): Promise<ConversionResult> {
    const startTime = Date.now();
    
    try {
      // 验证输入文件
      const validation = await this.validateDocument(inputPath);
      if (!validation.isValid) {
        throw new Error(`输入文件无效: ${validation.error}`);
      }

      const inputFormat = validation.format!;
      const inputStats = await fs.stat(inputPath);
      
      // 确保输出目录存在
      await fs.ensureDir(path.dirname(outputPath));

      // 获取合适的转换器
      const converter = this.getConverter(inputFormat, outputFormat);
      if (!converter) {
        throw new Error(`不支持从 ${inputFormat} 转换到 ${outputFormat}`);
      }

      // 执行转换
      logger.info(`开始转换: ${inputPath} (${inputFormat}) -> ${outputPath} (${outputFormat})`);
      await converter.convert(inputPath, outputPath, options);

      const outputStats = await fs.stat(outputPath);
      const duration = Date.now() - startTime;

      const result: ConversionResult = {
        success: true,
        inputPath,
        outputPath,
        inputFormat,
        outputFormat,
        inputSize: inputStats.size,
        outputSize: outputStats.size,
        duration,
      };

      logger.info(`转换完成: ${duration}ms`);
      return result;

    } catch (error) {
      const duration = Date.now() - startTime;
      const result: ConversionResult = {
        success: false,
        inputPath,
        outputPath,
        inputFormat: 'txt' as SupportedFormat,
        outputFormat,
        inputSize: 0,
        outputSize: 0,
        duration,
        error: error instanceof Error ? error.message : String(error),
      };

      logger.error(`转换失败: ${result.error}`);
      return result;
    }
  }

  async batchConvert(
    inputPaths: string[],
    outputDirectory: string,
    outputFormat: SupportedFormat,
    options: ConversionOptions = {}
  ): Promise<ConversionResult[]> {
    await fs.ensureDir(outputDirectory);
    
    const results: ConversionResult[] = [];
    
    for (const inputPath of inputPaths) {
      const fileName = path.parse(inputPath).name;
      const outputPath = path.join(outputDirectory, `${fileName}.${outputFormat}`);
      
      const result = await this.convertDocument(inputPath, outputPath, outputFormat, options);
      results.push(result);
    }

    return results;
  }

  async validateDocument(filePath: string): Promise<DocumentValidation> {
    try {
      if (!await fs.pathExists(filePath)) {
        return {
          isValid: false,
          error: '文件不存在',
        };
      }

      const stats = await fs.stat(filePath);
      if (!stats.isFile()) {
        return {
          isValid: false,
          error: '路径不是文件',
        };
      }

      const format = this.detectFormat(filePath);
      if (!format) {
        return {
          isValid: false,
          error: '不支持的文件格式',
        };
      }

      return {
        isValid: true,
        format,
        size: stats.size,
      };

    } catch (error) {
      return {
        isValid: false,
        error: error instanceof Error ? error.message : String(error),
      };
    }
  }

  getSupportedFormats(): SupportedFormats {
    return {
      input: ['docx', 'md', 'pdf', 'html', 'txt'],
      output: ['docx', 'md', 'pdf', 'html', 'txt'],
    };
  }

  private detectFormat(filePath: string): SupportedFormat | null {
    const ext = path.extname(filePath).toLowerCase().slice(1);
    const mimeType = mime.lookup(filePath);
    
    // 根据扩展名判断
    switch (ext) {
      case 'docx':
      case 'doc':
        return 'docx';
      case 'md':
      case 'markdown':
        return 'md';
      case 'pdf':
        return 'pdf';
      case 'html':
      case 'htm':
        return 'html';
      case 'txt':
        return 'txt';
      default:
        // 根据MIME类型判断
        if (mimeType) {
          if (mimeType.includes('word')) return 'docx';
          if (mimeType.includes('pdf')) return 'pdf';
          if (mimeType.includes('html')) return 'html';
          if (mimeType.includes('text')) return 'txt';
        }
        return null;
    }
  }

  private getConverter(inputFormat: SupportedFormat, outputFormat: SupportedFormat) {
    // 如果格式相同，直接复制文件
    if (inputFormat === outputFormat) {
      return {
        convert: async (inputPath: string, outputPath: string) => {
          await fs.copy(inputPath, outputPath);
        }
      };
    }

    // 特殊处理：从docx转换到其他格式需要两步转换
    if (inputFormat === 'docx') {
      const wordConverter = this.converters.get('docx');
      
      return {
        convert: async (inputPath: string, outputPath: string, options: ConversionOptions = {}) => {
          if (outputFormat === 'pdf') {
            // docx -> HTML -> PDF 的两步转换
            const tempHtmlPath = outputPath.replace('.pdf', '.temp.html');
            
            try {
              // 第一步：docx -> HTML
              await wordConverter.convert(inputPath, tempHtmlPath, { ...options, outputFormat: 'html' });
              
              // 第二步：HTML -> PDF
              const pdfConverter = this.converters.get('pdf');
              await pdfConverter.convert(tempHtmlPath, outputPath, options);
              
              // 清理临时文件
              await fs.remove(tempHtmlPath);
            } catch (error) {
              // 确保清理临时文件
              if (await fs.pathExists(tempHtmlPath)) {
                await fs.remove(tempHtmlPath);
              }
              throw error;
            }
          } else {
            // 其他格式直接使用WordConverter
            await wordConverter.convert(inputPath, outputPath, { ...options, outputFormat });
          }
        }
      };
    }

    // 其他情况根据输入格式选择转换器
    return this.converters.get(inputFormat);
  }
}