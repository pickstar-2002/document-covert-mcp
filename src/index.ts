#!/usr/bin/env node

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ErrorCode,
  ListToolsRequestSchema,
  McpError,
} from '@modelcontextprotocol/sdk/types.js';
import { DocumentConverter } from './converter/DocumentConverter';
import { ConversionOptions, SupportedFormat } from './types/index';
import { validateConversionParams } from './utils/validation';
import { logger } from './utils/logger';

class DocMcpServer {
  private server: Server;
  private converter: DocumentConverter;

  constructor() {
    this.server = new Server(
      {
        name: 'doc-mcp',
        version: '1.0.0'
      }
    );

    this.converter = new DocumentConverter();
    this.setupToolHandlers();
  }

  private setupToolHandlers() {
    // 列出可用工具
    this.server.setRequestHandler(ListToolsRequestSchema, async () => {
      return {
        tools: [
          {
            name: 'convert_document',
            description: '转换文档格式，支持Word、Markdown、PDF、HTML等格式互转',
            inputSchema: {
              type: 'object',
              properties: {
                inputPath: {
                  type: 'string',
                  description: '输入文件路径',
                },
                outputPath: {
                  type: 'string',
                  description: '输出文件路径',
                },
                outputFormat: {
                  type: 'string',
                  enum: ['docx', 'md', 'pdf', 'html', 'txt'],
                  description: '目标格式',
                },
                options: {
                  type: 'object',
                  properties: {
                    preserveFormatting: {
                      type: 'boolean',
                      description: '是否保持原格式',
                      default: true,
                    },
                    quality: {
                      type: 'string',
                      enum: ['low', 'medium', 'high'],
                      description: '转换质量',
                      default: 'medium',
                    },
                    includeImages: {
                      type: 'boolean',
                      description: '是否包含图片',
                      default: true,
                    },
                  },
                },
              },
              required: ['inputPath', 'outputPath', 'outputFormat'],
            },
          },
          {
            name: 'batch_convert_documents',
            description: '批量转换多个文档',
            inputSchema: {
              type: 'object',
              properties: {
                inputPaths: {
                  type: 'array',
                  items: { type: 'string' },
                  description: '输入文件路径数组',
                },
                outputDirectory: {
                  type: 'string',
                  description: '输出目录',
                },
                outputFormat: {
                  type: 'string',
                  enum: ['docx', 'md', 'pdf', 'html', 'txt'],
                  description: '目标格式',
                },
                options: {
                  type: 'object',
                  properties: {
                    preserveFormatting: {
                      type: 'boolean',
                      description: '是否保持原格式',
                      default: true,
                    },
                    quality: {
                      type: 'string',
                      enum: ['low', 'medium', 'high'],
                      description: '转换质量',
                      default: 'medium',
                    },
                    includeImages: {
                      type: 'boolean',
                      description: '是否包含图片',
                      default: true,
                    },
                  },
                },
              },
              required: ['inputPaths', 'outputDirectory', 'outputFormat'],
            },
          },
          {
            name: 'get_supported_formats',
            description: '获取支持的文档格式列表',
            inputSchema: {
              type: 'object',
              properties: {},
            },
          },
          {
            name: 'validate_document',
            description: '验证文档是否可以转换',
            inputSchema: {
              type: 'object',
              properties: {
                filePath: {
                  type: 'string',
                  description: '文件路径',
                },
              },
              required: ['filePath'],
            },
          },
        ],
      };
    });

    // 处理工具调用
    this.server.setRequestHandler(CallToolRequestSchema, async (request) => {
      const { name, arguments: args } = request.params;

      try {
        switch (name) {
          case 'convert_document':
            return await this.handleConvertDocument(args);
          case 'batch_convert_documents':
            return await this.handleBatchConvert(args);
          case 'get_supported_formats':
            return await this.handleGetSupportedFormats();
          case 'validate_document':
            return await this.handleValidateDocument(args);
          default:
            throw new McpError(
              ErrorCode.MethodNotFound,
              `未知工具: ${name}`
            );
        }
      } catch (error) {
        logger.error('工具调用失败:', error);
        throw new McpError(
          ErrorCode.InternalError,
          `工具执行失败: ${error instanceof Error ? error.message : String(error)}`
        );
      }
    });
  }

  private async handleConvertDocument(args: any) {
    const validation = validateConversionParams(args);
    if (!validation.isValid) {
      throw new McpError(ErrorCode.InvalidParams, validation.error!);
    }

    const { inputPath, outputPath, outputFormat, options = {} } = args;
    
    logger.info(`开始转换文档: ${inputPath} -> ${outputPath}`);
    
    const conversionOptions: ConversionOptions = {
      preserveFormatting: options.preserveFormatting ?? true,
      quality: options.quality ?? 'medium',
      includeImages: options.includeImages ?? true,
    };

    const result = await this.converter.convertDocument(
      inputPath,
      outputPath,
      outputFormat as SupportedFormat,
      conversionOptions
    );

    return {
      content: [
        {
          type: 'text',
          text: `文档转换成功！\n输入文件: ${inputPath}\n输出文件: ${outputPath}\n格式: ${outputFormat}\n文件大小: ${result.outputSize} 字节\n转换耗时: ${result.duration}ms`,
        },
      ],
    };
  }

  private async handleBatchConvert(args: any) {
    const { inputPaths, outputDirectory, outputFormat, options = {} } = args;
    
    if (!Array.isArray(inputPaths) || inputPaths.length === 0) {
      throw new McpError(ErrorCode.InvalidParams, '输入文件路径数组不能为空');
    }

    logger.info(`开始批量转换 ${inputPaths.length} 个文档`);
    
    const conversionOptions: ConversionOptions = {
      preserveFormatting: options.preserveFormatting ?? true,
      quality: options.quality ?? 'medium',
      includeImages: options.includeImages ?? true,
    };

    const results = await this.converter.batchConvert(
      inputPaths,
      outputDirectory,
      outputFormat as SupportedFormat,
      conversionOptions
    );

    const successCount = results.filter(r => r.success).length;
    const failureCount = results.length - successCount;

    return {
      content: [
        {
          type: 'text',
          text: `批量转换完成！\n总文件数: ${results.length}\n成功: ${successCount}\n失败: ${failureCount}\n输出目录: ${outputDirectory}`,
        },
      ],
    };
  }

  private async handleGetSupportedFormats() {
    const formats = this.converter.getSupportedFormats();
    
    return {
      content: [
        {
          type: 'text',
          text: `支持的文档格式:\n输入格式: ${formats.input.join(', ')}\n输出格式: ${formats.output.join(', ')}`,
        },
      ],
    };
  }

  private async handleValidateDocument(args: any) {
    const { filePath } = args;
    
    if (!filePath) {
      throw new McpError(ErrorCode.InvalidParams, '文件路径不能为空');
    }

    const validation = await this.converter.validateDocument(filePath);
    
    return {
      content: [
        {
          type: 'text',
          text: `文档验证结果:\n文件: ${filePath}\n有效: ${validation.isValid ? '是' : '否'}\n格式: ${validation.format || '未知'}\n大小: ${validation.size || 0} 字节\n${validation.error ? `错误: ${validation.error}` : ''}`,
        },
      ],
    };
  }

  async run() {
    const transport = new StdioServerTransport();
    await this.server.connect(transport);
    logger.info('Doc MCP 服务器已启动');
  }
}

// 启动服务器
if (require.main === module) {
  const server = new DocMcpServer();
  server.run().catch((error) => {
    logger.error('服务器启动失败:', error);
    process.exit(1);
  });
}

export { DocMcpServer };