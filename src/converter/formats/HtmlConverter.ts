import * as fs from 'fs-extra';
import { marked } from 'marked';
import TurndownService from 'turndown';
import { ConversionOptions, ConversionResult, IFormatConverter, SupportedFormat } from '../../types/index';

export class HtmlConverter implements IFormatConverter {
  private turndownService: TurndownService;

  constructor() {
    this.turndownService = new TurndownService({
      headingStyle: 'atx',
      codeBlockStyle: 'fenced',
    });
  }

  canConvert(inputFormat: SupportedFormat, outputFormat: SupportedFormat): boolean {
    return inputFormat === 'html' || outputFormat === 'html';
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
          processedContent = this.turndownService.turndown(inputContent);
          break;
        case 'txt':
          processedContent = this.htmlToText(inputContent);
          break;
        case 'html':
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
        inputFormat: 'html',
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
        inputFormat: 'html',
        outputFormat: 'txt',
        inputSize: 0,
        outputSize: 0,
        duration: Date.now() - startTime,
        error: error instanceof Error ? error.message : String(error),
      };
    }
  }

  private htmlToText(html: string): string {
    return html
      .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
      .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
      .replace(/<br\s*\/?>/gi, '\n')
      .replace(/<\/p>/gi, '\n\n')
      .replace(/<\/h[1-6]>/gi, '\n\n')
      .replace(/<\/div>/gi, '\n')
      .replace(/<\/li>/gi, '\n')
      .replace(/<[^>]+>/g, '')
      .replace(/&nbsp;/g, ' ')
      .replace(/&amp;/g, '&')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&quot;/g, '"')
      .replace(/&#39;/g, "'")
      .replace(/\n\n+/g, '\n\n')
      .trim();
  }
}