# 📄 doc-mcp

[![npm version](https://badge.fury.io/js/@pickstar-2025%2Fdoc-mcp.svg)](https://badge.fury.io/js/@pickstar-2025%2Fdoc-mcp)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

> 🚀 基于AI MCP协议的文档转换工具，支持Word、Markdown、PDF等格式互转

## ✨ 特性

- 📝 支持 Markdown 转换
- 📄 支持 Word 文档处理  
- 🌐 支持 HTML 转换
- 📋 支持 PDF 转换
- 🔧 支持纯文本转换
- 🖼️ 自动处理图片提取和转换
- 📦 TypeScript 支持
- 🔄 批量文档转换
- ⚡ 高质量转换引擎

## 📦 安装

```bash
npm install @pickstar-2025/doc-mcp
```

## 🚀 快速开始

### 作为 MCP 服务器使用

```bash
npx @pickstar-2025/doc-mcp
```

### 编程接口

```typescript
import { DocumentConverter } from '@pickstar-2025/doc-mcp';

const converter = new DocumentConverter();

// 转换 Word 文档到 Markdown
await converter.convert('document.docx', 'output.md', 'markdown');

// 转换 HTML 到 PDF
await converter.convert('page.html', 'output.pdf', 'pdf');
```

## 🛠️ MCP 工具

本工具提供以下 MCP 工具：

### convert_document
转换单个文档格式

```json
{
  "tool": "convert_document",
  "arguments": {
    "inputPath": "./document.docx",
    "outputPath": "./document.md", 
    "outputFormat": "md",
    "options": {
      "preserveFormatting": true,
      "quality": "high",
      "includeImages": true
    }
  }
}
```

### batch_convert_documents
批量转换多个文档

```json
{
  "tool": "batch_convert_documents",
  "arguments": {
    "inputPaths": ["./doc1.docx", "./doc2.pdf"],
    "outputDir": "./converted/",
    "outputFormat": "md"
  }
}
```

### get_supported_formats
获取支持的文档格式列表

### validate_document
验证文档格式和完整性

## 📋 支持格式

| 输入格式 | 输出格式 | 状态 |
|---------|---------|------|
| Word (.docx, .doc) | Markdown, HTML, PDF, TXT | ✅ |
| Markdown (.md) | Word, HTML, PDF, TXT | ✅ |
| PDF (.pdf) | Word, Markdown, HTML, TXT | ✅ |
| HTML (.html) | Word, Markdown, PDF, TXT | ✅ |
| 纯文本 (.txt) | Word, Markdown, HTML, PDF | ✅ |

## ⚙️ 配置选项

```typescript
interface ConversionOptions {
  preserveFormatting?: boolean;  // 保持原格式
  quality?: 'low' | 'medium' | 'high';  // 转换质量
  includeImages?: boolean;       // 包含图片
  customStyles?: string;         // 自定义样式
}
```

## 🏗️ 项目结构

```
doc-mcp/
├── src/
│   ├── index.ts                 # MCP 服务器入口
│   ├── converter/               # 转换器核心
│   │   ├── DocumentConverter.ts
│   │   └── formats/            # 格式转换器
│   └── utils/                  # 工具函数
├── dist/                       # 编译输出
└── package.json
```

## 🔧 开发

```bash
# 安装依赖
npm install

# 开发模式
npm run dev

# 构建项目
npm run build

# 运行测试
npm test
```

## 📄 许可证

MIT © CodeBuddy

## 🤝 贡献

欢迎提交 Issue 和 Pull Request！

---

**让文档转换变得简单高效！** 🚀