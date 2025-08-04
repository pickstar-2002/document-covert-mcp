import { SupportedFormat } from '../types/index';

export interface ValidationResult {
  isValid: boolean;
  error?: string;
}

export function validateConversionParams(params: any): ValidationResult {
  if (!params) {
    return {
      isValid: false,
      error: '参数不能为空'
    };
  }

  const { inputPath, outputPath, outputFormat } = params;

  if (!inputPath || typeof inputPath !== 'string') {
    return {
      isValid: false,
      error: '输入文件路径必须是有效的字符串'
    };
  }

  if (!outputPath || typeof outputPath !== 'string') {
    return {
      isValid: false,
      error: '输出文件路径必须是有效的字符串'
    };
  }

  if (!outputFormat || typeof outputFormat !== 'string') {
    return {
      isValid: false,
      error: '输出格式必须是有效的字符串'
    };
  }

  const supportedFormats: SupportedFormat[] = ['docx', 'md', 'pdf', 'html', 'txt'];
  if (!supportedFormats.includes(outputFormat as SupportedFormat)) {
    return {
      isValid: false,
      error: `不支持的输出格式: ${outputFormat}。支持的格式: ${supportedFormats.join(', ')}`
    };
  }

  return {
    isValid: true
  };
}

export function validateFilePath(filePath: string): ValidationResult {
  if (!filePath || typeof filePath !== 'string') {
    return {
      isValid: false,
      error: '文件路径必须是有效的字符串'
    };
  }

  if (filePath.trim().length === 0) {
    return {
      isValid: false,
      error: '文件路径不能为空'
    };
  }

  // 检查路径中的非法字符
  const invalidChars = /[<>:"|?*]/;
  if (invalidChars.test(filePath)) {
    return {
      isValid: false,
      error: '文件路径包含非法字符'
    };
  }

  return {
    isValid: true
  };
}

export function validateBatchParams(params: any): ValidationResult {
  if (!params) {
    return {
      isValid: false,
      error: '参数不能为空'
    };
  }

  const { inputPaths, outputDirectory, outputFormat } = params;

  if (!Array.isArray(inputPaths)) {
    return {
      isValid: false,
      error: '输入文件路径必须是数组'
    };
  }

  if (inputPaths.length === 0) {
    return {
      isValid: false,
      error: '输入文件路径数组不能为空'
    };
  }

  for (const path of inputPaths) {
    const pathValidation = validateFilePath(path);
    if (!pathValidation.isValid) {
      return {
        isValid: false,
        error: `无效的输入路径 "${path}": ${pathValidation.error}`
      };
    }
  }

  const dirValidation = validateFilePath(outputDirectory);
  if (!dirValidation.isValid) {
    return {
      isValid: false,
      error: `无效的输出目录: ${dirValidation.error}`
    };
  }

  const supportedFormats: SupportedFormat[] = ['docx', 'md', 'pdf', 'html', 'txt'];
  if (!supportedFormats.includes(outputFormat as SupportedFormat)) {
    return {
      isValid: false,
      error: `不支持的输出格式: ${outputFormat}。支持的格式: ${supportedFormats.join(', ')}`
    };
  }

  return {
    isValid: true
  };
}