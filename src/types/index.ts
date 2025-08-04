// 支持的文档格式
export type SupportedFormat = 'docx' | 'md' | 'pdf' | 'html' | 'txt' | 'rtf';

// 转换质量选项
export type ConversionQuality = 'low' | 'medium' | 'high';

// 转换选项
export interface ConversionOptions {
  preserveFormatting?: boolean;
  quality?: ConversionQuality;
  includeImages?: boolean;
  customStyles?: Record<string, any>;
  metadata?: DocumentMetadata;
}

// 文档元数据
export interface DocumentMetadata {
  title?: string;
  author?: string;
  subject?: string;
  keywords?: string[];
  createdDate?: Date;
  modifiedDate?: Date;
}

// 转换结果
export interface ConversionResult {
  success: boolean;
  inputPath: string;
  outputPath: string;
  inputFormat: SupportedFormat;
  outputFormat: SupportedFormat;
  inputSize: number;
  outputSize: number;
  duration: number;
  error?: string;
  warnings?: string[];
}

// 批量转换结果
export interface BatchConversionResult {
  results: ConversionResult[];
  totalFiles: number;
  successCount: number;
  failureCount: number;
  totalDuration: number;
}

// 文档验证结果
export interface DocumentValidation {
  isValid: boolean;
  format?: SupportedFormat;
  size?: number;
  error?: string;
  metadata?: DocumentMetadata;
}

// 支持的格式信息
export interface SupportedFormats {
  input: SupportedFormat[];
  output: SupportedFormat[];
}

// 转换器接口
export interface IDocumentConverter {
  convertDocument(
    inputPath: string,
    outputPath: string,
    outputFormat: SupportedFormat,
    options?: ConversionOptions
  ): Promise<ConversionResult>;

  batchConvert(
    inputPaths: string[],
    outputDirectory: string,
    outputFormat: SupportedFormat,
    options?: ConversionOptions
  ): Promise<ConversionResult[]>;

  validateDocument(filePath: string): Promise<DocumentValidation>;
  getSupportedFormats(): SupportedFormats;
}

// 格式转换器基类接口
export interface IFormatConverter {
  canConvert(inputFormat: SupportedFormat, outputFormat: SupportedFormat): boolean;
  convert(
    inputPath: string,
    outputPath: string,
    options?: ConversionOptions
  ): Promise<ConversionResult>;
}