# 示例文档

这是一个用于测试文档转换功能的示例 Markdown 文档。

## 功能介绍

Doc MCP 是一个强大的文档转换工具，支持以下格式：

- **Word 文档** (.docx)
- **Markdown** (.md) 
- **PDF** (.pdf)
- **HTML** (.html)
- **纯文本** (.txt)

## 使用示例

### 单文档转换

```bash
# 将 Word 文档转换为 Markdown
doc-mcp convert document.docx document.md

# 将 PDF 转换为 HTML
doc-mcp convert report.pdf report.html
```

### 批量转换

```bash
# 批量将多个文档转换为 PDF
doc-mcp batch-convert *.docx ./output pdf
```

## 特性列表

1. **高质量转换** - 保持原文档的格式和结构
2. **批量处理** - 一次处理多个文件
3. **智能识别** - 自动检测文档格式
4. **进度反馈** - 实时显示转换进度

## 代码示例

```javascript
// 使用 MCP 协议调用转换功能
const result = await mcpClient.callTool('convert_document', {
  inputPath: './input.docx',
  outputPath: './output.md',
  outputFormat: 'md',
  options: {
    preserveFormatting: true,
    quality: 'high'
  }
});
```

## 表格示例

| 格式 | 扩展名 | 支持读取 | 支持写入 |
|------|--------|----------|----------|
| Word | .docx | ✅ | ✅ |
| Markdown | .md | ✅ | ✅ |
| PDF | .pdf | ✅ | ⚠️ |
| HTML | .html | ✅ | ✅ |
| 文本 | .txt | ✅ | ✅ |

## 注意事项

> **重要提示**: PDF 格式的写入功能目前处于实验阶段，建议先进行小规模测试。

---

*这个示例文档展示了 Markdown 的各种语法元素，可以用来测试转换功能的完整性。*