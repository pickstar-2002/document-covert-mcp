# 📄 Document Convert MCP

[![npm version](https://badge.fury.io/js/@pickstar-2002%2Fdocument-covert-mcp.svg)](https://badge.fury.io/js/@pickstar-2002%2Fdocument-covert-mcp)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Node.js Version](https://img.shields.io/badge/node-%3E%3D18.0.0-brightgreen.svg)](https://nodejs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.3.0-blue.svg)](https://www.typescriptlang.org/)

> 🚀 基于 AI MCP 协议的智能文档转换工具，支持 Word、Markdown、PDF、HTML 等多种格式互转

## ✨ 特性

- 📝 **Markdown 转换** - 支持 Markdown 与其他格式的双向转换
- 📄 **Word 文档处理** - 完美支持 .docx 和 .doc 格式
- 🌐 **HTML 转换** - 智能处理 HTML 标签和样式
- 📋 **PDF 转换** - 高质量 PDF 生成和解析
- 🔧 **纯文本转换** - 智能格式识别和转换
- 🖼️ **图片处理** - 自动提取和转换文档中的图片
- 📦 **TypeScript 支持** - 完整的类型定义
- 🔄 **批量转换** - 支持多文档批量处理
- ⚡ **高性能引擎** - 优化的转换算法

## 📦 安装

```bash
npm install @pickstar-2002/document-covert-mcp@latest
```

## 🚀 快速开始

### 作为 MCP 服务器使用（推荐）

在您的 AI IDE 中配置 MCP 服务器：

```bash
npx @pickstar-2002/document-covert-mcp@latest
```

### 在 Cursor 中使用

在 Cursor 的设置中添加 MCP 服务器配置：

```json
{
  "mcpServers": {
    "document-convert": {
      "command": "npx",
      "args": ["@pickstar-2002/document-covert-mcp@latest"]
    }
  }
}
```

### 在 WindSurf 中使用

在 WindSurf 的 MCP 配置中添加：

```json
{
  "servers": {
    "document-convert": {
      "command": "npx",
      "args": ["@pickstar-2002/document-covert-mcp@latest"]
    }
  }
}
```

### 编程接口

```typescript
import { DocumentConverter } from '@pickstar-2002/document-covert-mcp';

const converter = new DocumentConverter();

// 转换 Word 文档到 Markdown
await converter.convertDocument('document.docx', 'output.md', 'md');

// 转换 HTML 到 PDF
await converter.convertDocument('page.html', 'output.pdf', 'pdf');

// 批量转换
await converter.batchConvert(
  ['doc1.docx', 'doc2.pdf'], 
  './output/', 
  'md'
);
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
    "outputDirectory": "./converted/",
    "outputFormat": "md",
    "options": {
      "preserveFormatting": true,
      "quality": "medium"
    }
  }
}
```

### get_supported_formats
获取支持的文档格式列表

```json
{
  "tool": "get_supported_formats",
  "arguments": {}
}
```

### validate_document
验证文档格式和完整性

```json
{
  "tool": "validate_document",
  "arguments": {
    "filePath": "./document.docx"
  }
}
```

## 📋 支持格式

| 输入格式 | 输出格式 | 状态 | 特性 |
|---------|---------|------|------|
| Word (.docx, .doc) | Markdown, HTML, PDF, TXT | ✅ | 保持格式、图片提取 |
| Markdown (.md) | Word, HTML, PDF, TXT | ✅ | 语法高亮、表格支持 |
| PDF (.pdf) | Word, Markdown, HTML, TXT | ✅ | 文本提取、布局识别 |
| HTML (.html) | Word, Markdown, PDF, TXT | ✅ | 样式保持、标签解析 |
| 纯文本 (.txt) | Word, Markdown, HTML, PDF | ✅ | 智能格式识别 |

## ⚙️ 配置选项

```typescript
interface ConversionOptions {
  preserveFormatting?: boolean;  // 保持原格式 (默认: true)
  quality?: 'low' | 'medium' | 'high';  // 转换质量 (默认: medium)
  includeImages?: boolean;       // 包含图片 (默认: true)
  customStyles?: string;         // 自定义样式
}
```

## 🏗️ 项目结构

```
document-covert-mcp/
├── src/
│   ├── index.ts                 # MCP 服务器入口
│   ├── converter/               # 转换器核心
│   │   ├── DocumentConverter.ts # 主转换器
│   │   └── formats/            # 格式转换器
│   │       ├── WordConverter.ts
│   │       ├── MarkdownConverter.ts
│   │       ├── PdfConverter.ts
│   │       ├── HtmlConverter.ts
│   │       └── TextConverter.ts
│   ├── types/                  # 类型定义
│   │   └── index.ts
│   └── utils/                  # 工具函数
│       ├── logger.ts
│       └── validation.ts
├── examples/                   # 示例文件
├── dist/                      # 编译输出
├── LICENSE                    # MIT 许可证
├── package.json              # 项目配置
└── README.md                 # 项目文档
```

## 🔧 开发

```bash
# 克隆项目
git clone https://github.com/pickstar-2002/document-covert-mcp.git
cd document-covert-mcp

# 安装依赖
npm install

# 开发模式
npm run dev

# 构建项目
npm run build

# 启动服务
npm start

# 代码格式化
npm run format

# 代码检查
npm run lint
```

## 📚 使用示例

### 基础转换

```typescript
// Word 转 Markdown
await converter.convertDocument(
  'report.docx', 
  'report.md', 
  'md',
  { preserveFormatting: true }
);

// Markdown 转 PDF
await converter.convertDocument(
  'readme.md', 
  'readme.pdf', 
  'pdf',
  { quality: 'high' }
);
```

### 批量处理

```typescript
// 批量转换多个文档
const results = await converter.batchConvert(
  ['doc1.docx', 'doc2.pdf', 'doc3.html'],
  './output/',
  'md',
  { includeImages: true }
);

console.log(`成功转换 ${results.filter(r => r.success).length} 个文档`);
```

### 格式验证

```typescript
// 验证文档
const validation = await converter.validateDocument('document.docx');
if (validation.isValid) {
  console.log(`文档有效，格式: ${validation.format}`);
} else {
  console.error(`文档无效: ${validation.error}`);
}
```

## 🤝 贡献

欢迎提交 Issue 和 Pull Request！

1. Fork 本项目
2. 创建特性分支 (`git checkout -b feature/AmazingFeature`)
3. 提交更改 (`git commit -m 'Add some AmazingFeature'`)
4. 推送到分支 (`git push origin feature/AmazingFeature`)
5. 开启 Pull Request

## 📄 许可证

本项目基于 MIT 许可证开源 - 查看 [LICENSE](LICENSE) 文件了解详情。

## 👨‍💻 作者

**pickstar-2002**

- 微信: pickstar_loveXX

---

**让文档转换变得简单高效！** 🚀✨